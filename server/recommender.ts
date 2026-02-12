import OpenAI from "openai";
import { storage } from "./storage";
import { pool } from "./db";
import type { User, Moment } from "@shared/schema";
import { findSimilarMoments, hasUserEmbedding } from "./embeddings";
import crypto from "crypto";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

interface PostScore {
  momentId: string;
  score: number;
}

interface CachedPostScore extends PostScore {
  cachedAt: number;
}

const postScoreCache = new Map<string, Map<string, CachedPostScore>>();
const SCORE_CACHE_TTL = 1000 * 60 * 30;

function computeHash(content: string): string {
  return crypto.createHash("sha256").update(content).digest("hex").slice(0, 16);
}

export async function generateAndStoreMomentSummary(momentId: string, caption: string): Promise<void> {
  if (!caption || caption.trim().length === 0) return;

  const captionHash = computeHash(caption);

  const existing = await pool.query(
    "SELECT caption_hash FROM moment_summaries WHERE moment_id = $1",
    [momentId]
  );
  if (existing.rows.length > 0 && existing.rows[0].caption_hash === captionHash) {
    return;
  }

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a content analysis system for Slogram, a mindfulness-focused social platform.
Summarize the following post caption into key themes, mood, and topics (max 100 words).
Focus on: mindfulness, slow living, nature, creativity, wellness, hobbies, lifestyle, art, photography themes.`
        },
        {
          role: "user",
          content: `Caption: ${caption}\n\nSummarize the themes and mood:`
        }
      ],
      max_completion_tokens: 150,
    });

    const summary = response.choices[0]?.message?.content || "";
    if (!summary) return;

    await pool.query(
      `INSERT INTO moment_summaries (moment_id, summary, caption_hash, created_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (moment_id) DO UPDATE SET summary = $2, caption_hash = $3, created_at = NOW()`,
      [momentId, summary, captionHash]
    );
  } catch (error) {
    console.error("Error generating moment summary:", error);
  }
}

export async function generateAndStoreUserInterests(userId: string): Promise<void> {
  const user = await storage.getUser(userId);
  if (!user) return;

  const userMoments = await storage.getMomentsByUserId(userId);

  const userInfo = [
    user.story ? `Bio: ${user.story}` : "",
    user.displayName ? `Name: ${user.displayName}` : "",
  ].filter(Boolean).join("\n");

  const recentCaptions = userMoments
    .filter(m => m.caption)
    .slice(0, 10)
    .map(m => m.caption)
    .join("\n- ");

  if (!userInfo && !recentCaptions) return;

  const profileContent = `${userInfo}\n${recentCaptions}`;
  const profileHash = computeHash(profileContent);

  const existing = await pool.query(
    "SELECT profile_hash FROM user_interest_profiles WHERE user_id = $1",
    [userId]
  );
  if (existing.rows.length > 0 && existing.rows[0].profile_hash === profileHash) {
    return;
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
          content: `User Profile:\n${userInfo}\n\nRecent post captions:\n- ${recentCaptions || "No recent posts"}\n\nSummarize this user's interests and content preferences:`
        }
      ],
      max_completion_tokens: 300,
    });

    const interests = response.choices[0]?.message?.content || "";
    if (!interests) return;

    await pool.query(
      `INSERT INTO user_interest_profiles (user_id, interests, profile_hash, created_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW())
       ON CONFLICT (user_id) DO UPDATE SET interests = $2, profile_hash = $3, updated_at = NOW()`,
      [userId, interests, profileHash]
    );
  } catch (error) {
    console.error("Error generating user interest profile:", error);
  }
}

async function getStoredUserInterests(userId: string): Promise<string | null> {
  const result = await pool.query(
    "SELECT interests FROM user_interest_profiles WHERE user_id = $1",
    [userId]
  );
  return result.rows.length > 0 ? result.rows[0].interests : null;
}

async function getStoredMomentSummaries(momentIds: string[]): Promise<Map<string, string>> {
  if (momentIds.length === 0) return new Map();
  const placeholders = momentIds.map((_, i) => `$${i + 1}`).join(",");
  const result = await pool.query(
    `SELECT moment_id, summary FROM moment_summaries WHERE moment_id IN (${placeholders})`,
    momentIds
  );
  const map = new Map<string, string>();
  for (const row of result.rows) {
    map.set(row.moment_id, row.summary);
  }
  return map;
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

  const summaryMap = await getStoredMomentSummaries(postsToScore.map(p => p.id));

  const batchSize = 10;
  const newScores: PostScore[] = [];

  for (let i = 0; i < postsToScore.length; i += batchSize) {
    const batch = postsToScore.slice(i, i + batchSize);

    const postDescriptions = batch.map((post, idx) => {
      const authorInfo = post.user?.displayName || post.user?.username || "Unknown";
      const summary = summaryMap.get(post.id);
      return `Post ${idx + 1} (ID: ${post.id}):
- Author: ${authorInfo}
- Caption: ${post.caption || "No caption"}
- Summary: ${summary || "Not available"}
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
            content: `User Interests:\n${userInterests}\n\nPosts to score:\n${postDescriptions}\n\nReturn JSON with scores for each post ID:`
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

    const userInterests = await getStoredUserInterests(userId);

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

export function clearPostScoreCache(userId: string): void {
  postScoreCache.delete(userId);
}

export function clearAllCaches(): void {
  postScoreCache.clear();
}
