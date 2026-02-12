import OpenAI from "openai";
import { storage } from "./storage";
import type { User, Moment } from "@shared/schema";
import { findSimilarMoments, hasUserEmbedding } from "./embeddings";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

interface UserProfile {
  userId: string;
  interests: string;
  updatedAt: number;
}

interface PostScore {
  momentId: string;
  score: number;
  reason?: string;
}

interface CachedPostScore extends PostScore {
  cachedAt: number;
}

const userProfileCache = new Map<string, UserProfile>();
const postScoreCache = new Map<string, Map<string, CachedPostScore>>();

const PROFILE_CACHE_TTL = 1000 * 60 * 60;
const SCORE_CACHE_TTL = 1000 * 60 * 30;

async function buildUserInterestProfile(user: User, recentMoments: Moment[]): Promise<string> {
  const cacheKey = user.id;
  const cached = userProfileCache.get(cacheKey);
  
  if (cached && Date.now() - cached.updatedAt < PROFILE_CACHE_TTL) {
    return cached.interests;
  }
  
  const userInfo = [
    user.story ? `Bio: ${user.story}` : "",
    user.displayName ? `Name: ${user.displayName}` : "",
  ].filter(Boolean).join("\n");
  
  const recentCaptions = recentMoments
    .filter(m => m.caption)
    .slice(0, 10)
    .map(m => m.caption)
    .join("\n- ");
  
  if (!userInfo && !recentCaptions) {
    return "";
  }
  
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a content recommendation system for a mindfulness-focused social platform called Slogram. 
Analyze the user's profile and recent posts to identify their interests, themes they engage with, and content preferences.
Focus on topics like: mindfulness, slow living, nature, creativity, wellness, hobbies, lifestyle, art, photography themes.
Respond with a concise summary of their interests (max 200 words) that can be used to match relevant content.`
        },
        {
          role: "user",
          content: `User Profile:
${userInfo}

Recent post captions:
- ${recentCaptions || "No recent posts"}

Summarize this user's interests and content preferences:`
        }
      ],
      max_completion_tokens: 300,
    });
    
    const interests = response.choices[0]?.message?.content || "";
    
    userProfileCache.set(cacheKey, {
      userId: user.id,
      interests,
      updatedAt: Date.now(),
    });
    
    return interests;
  } catch (error) {
    console.error("Error building user interest profile:", error);
    return "";
  }
}

async function scorePostsForUser(
  userInterests: string,
  userId: string,
  posts: Array<Moment & { user?: Partial<User> }>
): Promise<PostScore[]> {
  if (!userInterests || posts.length === 0) {
    return posts.map(p => ({ momentId: p.id, score: 0.5 }));
  }
  
  let userScoreCache = postScoreCache.get(userId);
  if (!userScoreCache) {
    userScoreCache = new Map();
    postScoreCache.set(userId, userScoreCache);
  }
  
  const now = Date.now();
  const postsToScore: typeof posts = [];
  const cachedScores: PostScore[] = [];
  
  for (const post of posts) {
    const cached = userScoreCache.get(post.id);
    if (cached && cached.cachedAt && now - cached.cachedAt < SCORE_CACHE_TTL) {
      cachedScores.push({ momentId: cached.momentId, score: cached.score });
    } else {
      postsToScore.push(post);
    }
  }
  
  if (postsToScore.length === 0) {
    return cachedScores;
  }
  
  const batchSize = 10;
  const newScores: PostScore[] = [];
  
  for (let i = 0; i < postsToScore.length; i += batchSize) {
    const batch = postsToScore.slice(i, i + batchSize);
    
    const postDescriptions = batch.map((post, idx) => {
      const authorInfo = post.user?.displayName || post.user?.username || "Unknown";
      return `Post ${idx + 1} (ID: ${post.id}):
- Author: ${authorInfo}
- Caption: ${post.caption || "No caption"}
- Type: ${post.type}`;
    }).join("\n\n");
    
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a content recommendation system for Slogram, a mindfulness-focused social platform.
Score each post on relevance to the user's interests on a scale of 0.0 to 1.0.
Consider thematic alignment, mood compatibility, and content quality.
Respond in JSON format: { "scores": [{"id": "post_id", "score": 0.8}, ...] }`
          },
          {
            role: "user",
            content: `User Interests:
${userInterests}

Posts to score:
${postDescriptions}

Return JSON with scores for each post ID:`
          }
        ],
        max_completion_tokens: 500,
        response_format: { type: "json_object" },
      });
      
      const content = response.choices[0]?.message?.content || "{}";
      let parsed: { scores?: Array<{ id: string; score: number }> } = {};
      
      try {
        parsed = JSON.parse(content);
      } catch (parseError) {
        console.error("Error parsing GPT response:", parseError);
      }
      
      const scoredIds = new Set<string>();
      
      if (parsed.scores && Array.isArray(parsed.scores)) {
        for (const scoreItem of parsed.scores) {
          if (scoreItem.id) {
            const score: PostScore = {
              momentId: scoreItem.id,
              score: Math.max(0, Math.min(1, parseFloat(String(scoreItem.score)) || 0.5)),
            };
            newScores.push(score);
            scoredIds.add(scoreItem.id);
            
            const cachedScore: CachedPostScore = {
              ...score,
              cachedAt: now,
            };
            userScoreCache.set(scoreItem.id, cachedScore);
          }
        }
      }
      
      for (const post of batch) {
        if (!scoredIds.has(post.id)) {
          newScores.push({ momentId: post.id, score: 0.5 });
        }
      }
    } catch (error) {
      console.error("Error scoring posts batch:", error);
      for (const post of batch) {
        newScores.push({ momentId: post.id, score: 0.5 });
      }
    }
  }
  
  return [...cachedScores, ...newScores];
}

async function getVectorRecommendedPosts<T extends Moment & { user?: Partial<User> }>(
  userId: string,
  posts: T[]
): Promise<T[] | null> {
  try {
    const hasEmb = await hasUserEmbedding(userId);
    if (!hasEmb) return null;

    const postIds = posts.map(p => p.id);
    const similarities = await findSimilarMoments(userId, posts.length, []);

    if (similarities.length === 0) return null;

    const simMap = new Map(similarities.map(s => [s.momentId, s.similarity]));

    const postIdsSet = new Set(postIds);
    const relevantSims = similarities.filter(s => postIdsSet.has(s.momentId));
    if (relevantSims.length < posts.length * 0.3) return null;

    const now = Date.now();
    const scoredPosts = posts.map(post => {
      const similarity = simMap.get(post.id) || 0.5;
      const relevanceScore = Math.max(0, Math.min(1, (similarity + 1) / 2));
      const ageInHours = (now - new Date(post.createdAt).getTime()) / (1000 * 60 * 60);
      const recencyScore = Math.exp(-ageInHours / 48);
      const combinedScore = (relevanceScore * 0.6) + (recencyScore * 0.4);

      return { post, score: combinedScore };
    });

    scoredPosts.sort((a, b) => b.score - a.score);
    return scoredPosts.map(sp => sp.post);
  } catch (error) {
    console.error("Vector recommendation error, falling back:", error);
    return null;
  }
}

export async function getRecommendedPosts<T extends Moment & { user?: Partial<User> }>(
  userId: string,
  posts: T[]
): Promise<T[]> {
  if (posts.length <= 1) {
    return posts;
  }
  
  try {
    const vectorResult = await getVectorRecommendedPosts(userId, posts);
    if (vectorResult) {
      return vectorResult;
    }

    const user = await storage.getUser(userId);
    if (!user) {
      return posts;
    }
    
    const userMoments = await storage.getMomentsByUserId(userId);
    const userInterests = await buildUserInterestProfile(user, userMoments);
    
    if (!userInterests) {
      return posts;
    }
    
    const scores = await scorePostsForUser(userInterests, userId, posts);
    const scoreMap = new Map(scores.map(s => [s.momentId, s.score]));
    
    const now = Date.now();
    const scoredPosts = posts.map(post => {
      const relevanceScore = scoreMap.get(post.id) || 0.5;
      const ageInHours = (now - new Date(post.createdAt).getTime()) / (1000 * 60 * 60);
      const recencyScore = Math.exp(-ageInHours / 48);
      const combinedScore = (relevanceScore * 0.6) + (recencyScore * 0.4);
      
      return { post, score: combinedScore };
    });
    
    scoredPosts.sort((a, b) => b.score - a.score);
    
    return scoredPosts.map(sp => sp.post);
  } catch (error) {
    console.error("Error in recommendation service:", error);
    return posts;
  }
}

export function clearUserProfileCache(userId: string): void {
  userProfileCache.delete(userId);
  postScoreCache.delete(userId);
}

export function clearAllCaches(): void {
  userProfileCache.clear();
  postScoreCache.clear();
}
