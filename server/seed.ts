import { db } from "./db";
import { users, conversations, messages, posts } from "@shared/schema";

export async function seedDatabase() {
  console.log("Seeding database...");

  // Create test users
  const [user1] = await db.insert(users).values({
    username: "emma_mindful",
    password: "password123",
    displayName: "Emma Chen",
    bio: "Living slowly, loving deeply\nFinding beauty in everyday moments\nMindful living & slow living advocate",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop",
  }).returning();

  const [user2] = await db.insert(users).values({
    username: "james.slow",
    password: "password123",
    displayName: "James River",
    bio: "Embracing the slow life\nNature lover & minimalist",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop",
  }).returning();

  const [user3] = await db.insert(users).values({
    username: "current_user",
    password: "password123",
    displayName: "You",
    bio: "My slow living journey",
    avatar: "",
  }).returning();

  // Create conversations
  const [conv1] = await db.insert(conversations).values({
    user1Id: user3.id,
    user2Id: user2.id,
  }).returning();

  const [conv2] = await db.insert(conversations).values({
    user1Id: user3.id,
    user2Id: user1.id,
  }).returning();

  // Add some initial messages
  await db.insert(messages).values([
    {
      conversationId: conv1.id,
      senderId: user2.id,
      text: "That sounds wonderful!",
    },
    {
      conversationId: conv2.id,
      senderId: user1.id,
      text: "Let's connect tomorrow",
    },
  ]);

  // Create some posts with real, accessible images
  await db.insert(posts).values([
    {
      userId: user1.id,
      type: "image",
      mediaUrl: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&h=800&fit=crop",
      caption: "Morning rituals set the tone for the whole day. Taking time to brew the perfect cup and watch the sunrise reminds me that not everything needs to be rushed.",
    },
    {
      userId: user2.id,
      type: "image",
      mediaUrl: "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=800&h=800&fit=crop",
      caption: "Found my perfect reading corner. Sometimes the best moments are the quiet ones with a good book and natural light.",
    },
    {
      userId: user1.id,
      type: "image",
      mediaUrl: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&h=800&fit=crop",
      caption: "There's something deeply satisfying about making bread from scratch. The kneading, the waiting, the aroma filling the kitchen - it's meditation in motion.",
    },
    {
      userId: user2.id,
      type: "image",
      mediaUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=800&fit=crop",
      caption: "Golden hour walks remind me to appreciate the simple beauty around us. Nature has its own perfect timing.",
    },
  ]);

  console.log("Database seeded successfully!");
  console.log(`User IDs: ${user1.id}, ${user2.id}, ${user3.id}`);
  console.log(`Conversation IDs: ${conv1.id}, ${conv2.id}`);

  return { user1, user2, user3, conv1, conv2 };
}
