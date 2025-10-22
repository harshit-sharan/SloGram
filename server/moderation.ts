import OpenAI from "openai";

// This is using Replit's AI Integrations service, which provides OpenAI-compatible API access without requiring your own OpenAI API key.
// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY
});

export interface ModerationResult {
  approved: boolean;
  tone: "Still" | "Flow" | "Vibrant" | "Loud";
  scores: {
    peacefulness: number; // 0-100
    mindfulness: number; // 0-100
    harmony: number; // 0-100
  };
  flags: string[];
  feedback?: string;
}

const MODERATION_PROMPT = `You are a content moderator for Slogram, a mindfulness-focused social media platform for slow, intentional living.

Your role is to act as a gentle gardener, protecting the calm, reflective atmosphere of this sanctuary space.

CORE PRINCIPLES:
🌿 Peacefulness: Does the content make viewers feel calm or anxious?
☀️ Mindfulness: Was it shared with care, reflection, or awareness?
🕊️ Harmony: Does it align with Slogram's visual and emotional tone?

CONTENT THAT BELONGS:
- Calm, slow, or mindful living
- Nature, quiet spaces, minimalism, stillness
- Personal reflections, gratitude, intentional habits
- Art, craft, or movement done slowly and thoughtfully
- Journaling, slow travel, slow food, meditative practices
- Honest, unfiltered emotional authenticity
- Gentle colors, natural soundscapes, soft pacing

CONTENT TO FLAG:
TEXT CONTENT - Flag if it includes:
- Urgent or high-pressure language: "Hurry," "Now," "Don't wait," "Limited time," "Go go go"
- Self-promotion or attention-seeking: "Smash that follow," "Hit like," "Check my page"
- Excessive exclamation marks, all caps, or loud energy
- Ranting, reactive, or emotionally charged without reflection
- Aggressive, judgmental, or comparison-based statements
- Political, confrontational, or polarizing language
- Advertising or product pitches (unless calm, mindful, and transparent)

VISUAL DESCRIPTIONS - Flag if mentioned:
- Rapid motion, fast cuts, flashing lights
- Aggressive dancing, energetic transitions, jump edits
- Loud, upbeat, or jarring music
- Overly saturated colors, harsh contrast, neon tones
- Shouting, yelling, agitated gestures
- Hustle culture, competition, urgency themes
- Promotional/performative/influencer-style content
- Visual clutter, excessive overlays, filters

TONE COMPASS:
- Still (0-25): Peaceful, meditative, grounded - APPROVE
- Flow (26-50): Calm motion, thoughtful, balanced - APPROVE
- Vibrant (51-75): Energetic but respectful - REVIEW
- Loud (76-100): Fast, jarring, attention-grabbing - REMOVE

Analyze the content and respond with JSON containing:
{
  "approved": boolean,
  "tone": "Still" | "Flow" | "Vibrant" | "Loud",
  "scores": {
    "peacefulness": 0-100,
    "mindfulness": 0-100,
    "harmony": 0-100
  },
  "flags": ["list of specific issues found"],
  "feedback": "gentle, kind explanation if not approved"
}

When in doubt, err on the side of calm and approve borderline cases if the intent feels genuine.`;

export async function moderateContent(
  caption: string | null,
  contentType: "image" | "video",
  mediaDescription?: string
): Promise<ModerationResult> {
  try {
    const contentToAnalyze = `
Content Type: ${contentType}
Caption: ${caption || "(no caption)"}
${mediaDescription ? `Visual Description: ${mediaDescription}` : ""}
`.trim();

    console.log("[MODERATION] Analyzing content:", { contentType, captionLength: caption?.length, hasDescription: !!mediaDescription });
    console.log("[MODERATION] Caption text:", caption);

    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: MODERATION_PROMPT
        },
        {
          role: "user",
          content: `Please analyze this content for Slogram:\n\n${contentToAnalyze}`
        }
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 1000
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    console.log("[MODERATION] AI Response:", result);

    const moderationResult = {
      approved: result.approved ?? true,
      tone: result.tone || "Flow",
      scores: {
        peacefulness: result.scores?.peacefulness ?? 75,
        mindfulness: result.scores?.mindfulness ?? 75,
        harmony: result.scores?.harmony ?? 75
      },
      flags: result.flags || [],
      feedback: result.feedback
    };

    console.log("[MODERATION] Final result:", { approved: moderationResult.approved, tone: moderationResult.tone, flags: moderationResult.flags });

    return moderationResult;
  } catch (error) {
    console.error("[MODERATION] Error occurred:", error);
    console.error("[MODERATION] Error details:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    // On error, default to approving content (fail open to not block users)
    return {
      approved: true,
      tone: "Flow",
      scores: {
        peacefulness: 75,
        mindfulness: 75,
        harmony: 75
      },
      flags: [],
      feedback: undefined
    };
  }
}

export function generateGentleFeedback(result: ModerationResult): string {
  if (result.approved) {
    return "Your moment has been shared with the community 🌿";
  }

  const baseMessage = "Hi there 🌿 We've gently paused your post because it felt a bit too fast or intense for our mindful community.";
  
  const suggestions: string[] = [];
  
  if (result.flags.includes("urgent_language") || result.flags.includes("high_pressure")) {
    suggestions.push("Try removing urgent or time-pressured language");
  }
  
  if (result.flags.includes("promotional") || result.flags.includes("attention_seeking")) {
    suggestions.push("Share from the heart rather than for attention");
  }
  
  if (result.flags.includes("loud_tone") || result.flags.includes("excessive_caps")) {
    suggestions.push("Consider a softer, more reflective tone");
  }

  if (result.flags.includes("aggressive") || result.flags.includes("confrontational")) {
    suggestions.push("Approach the topic with more gentleness and understanding");
  }

  const suggestionText = suggestions.length > 0 
    ? `\n\nSome gentle suggestions:\n${suggestions.map(s => `• ${s}`).join('\n')}`
    : "";

  return `${baseMessage}

Slogram is a space for unhurried, calm sharing — moments that breathe.

You're always welcome to reshare something that reflects your slower rhythm.${suggestionText}

With appreciation,
The Slogram Team 🌸`;
}
