import OpenAI from "openai";

// This is using Replit's AI Integrations service, which provides OpenAI-compatible API access without requiring your own OpenAI API key.
// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY
});

export async function analyzeImageContent(imageUrl: string): Promise<string> {
  try {
    console.log("[VISUAL MODERATION] Analyzing image:", imageUrl);
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are analyzing images for Slogram, a mindfulness-focused social platform for slow, intentional living. 

Describe the image focusing on:
- Energy level (calm/slow vs. fast/intense)
- Motion and speed (static, gentle motion, rapid motion, speed)
- Emotional tone (peaceful, energetic, aggressive, rushed)
- Visual elements (colors, lighting, composition)
- Subject matter (nature, technology, people, activities)

Be specific about any elements that suggest urgency, speed, hustle, or intensity.`
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Please analyze this image for a mindfulness-focused social platform. Describe what you see with focus on the energy, pace, and mood."
            },
            {
              type: "image_url",
              image_url: {
                url: imageUrl
              }
            }
          ]
        }
      ],
      max_completion_tokens: 300
    });

    const description = response.choices[0].message.content || "Unable to analyze image";
    console.log("[VISUAL MODERATION] Analysis result:", description);
    return description;
  } catch (error) {
    console.error("[VISUAL MODERATION] Error analyzing image:", error);
    // Return empty string on error - moderation will still check the caption
    return "";
  }
}

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
- Urgent or high-pressure language: "Hurry," "Now," "Don't wait," "Limited time," "Go go go", "Quick", "Fast", "Rush"
- Self-promotion or attention-seeking: "Smash that follow," "Hit like," "Check my page"
- Excessive exclamation marks, all caps, or loud energy
- Ranting, reactive, or emotionally charged without reflection
- Aggressive, judgmental, or comparison-based statements
- Political, confrontational, or polarizing language
- Advertising or product pitches (unless calm, mindful, and transparent)

VISUAL DESCRIPTIONS - Flag if mentioned:
- Rapid motion, fast cuts, flashing lights, speed, speeding
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
- Vibrant (51-75): Energetic but respectful - REVIEW & REJECT
- Loud (76-100): Fast, jarring, attention-grabbing - REJECT

CRITICAL: You MUST respond with valid JSON in this EXACT format:
{
  "approved": true or false,
  "tone": "Still" or "Flow" or "Vibrant" or "Loud",
  "scores": {
    "peacefulness": number from 0 to 100,
    "mindfulness": number from 0 to 100,
    "harmony": number from 0 to 100
  },
  "flags": ["array of specific issues like urgent_language, high_pressure, promotional, loud_tone, rapid_motion"],
  "feedback": "gentle, kind explanation if not approved, otherwise omit this field"
}

EXAMPLE RESPONSES:

For calm content:
{
  "approved": true,
  "tone": "Flow",
  "scores": {
    "peacefulness": 85,
    "mindfulness": 90,
    "harmony": 88
  },
  "flags": []
}

For urgent content:
{
  "approved": false,
  "tone": "Loud",
  "scores": {
    "peacefulness": 15,
    "mindfulness": 20,
    "harmony": 10
  },
  "flags": ["urgent_language", "high_pressure", "loud_tone"],
  "feedback": "This content feels rushed and pressured. Slogram is a space for calm, unhurried sharing. Consider slowing down and sharing from a more grounded place."
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

    // Validate that we got a proper response with all required fields
    if (
      !result || 
      typeof result.approved !== 'boolean' || 
      !result.tone || 
      !result.scores ||
      typeof result.scores.peacefulness !== 'number' ||
      typeof result.scores.mindfulness !== 'number' ||
      typeof result.scores.harmony !== 'number'
    ) {
      console.error("[MODERATION] Invalid AI response - missing required fields. Rejecting content for safety.");
      console.error("[MODERATION] Received:", result);
      // When we get an invalid response, fail-closed (reject) for safety
      return {
        approved: false,
        tone: "Loud",
        scores: {
          peacefulness: 0,
          mindfulness: 0,
          harmony: 0
        },
        flags: ["moderation_error"],
        feedback: "We couldn't properly review this content at the moment. Please try sharing again in a moment, or reach out if this continues. 🌿"
      };
    }

    const moderationResult = {
      approved: result.approved,
      tone: result.tone,
      scores: {
        peacefulness: result.scores.peacefulness,
        mindfulness: result.scores.mindfulness,
        harmony: result.scores.harmony
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
    // On error, reject content (fail-closed) to maintain community standards
    return {
      approved: false,
      tone: "Loud",
      scores: {
        peacefulness: 0,
        mindfulness: 0,
        harmony: 0
      },
      flags: ["moderation_service_error"],
      feedback: "We're experiencing a temporary issue with our content review system. Please try sharing again in a moment. If this continues, reach out to our support team. 🌿"
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
