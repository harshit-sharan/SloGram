import { db } from "./db";
import { users, conversations, messages, posts } from "@shared/schema";

export async function seedDatabase() {
  console.log("Seeding database...");

  // Create test users
  const [user1] = await db.insert(users).values({
    username: "emma_mindful",
    password: "password123",
    displayName: "Emma Chen",
    bio: "Living slowly, loving deeply 🌿\nFinding beauty in everyday moments\nMindful living & slow living advocate",
    avatar: "/assets/generated_images/Peaceful_woman_profile_photo_8348405c.png",
  }).returning();

  const [user2] = await db.insert(users).values({
    username: "james.slow",
    password: "password123",
    displayName: "James River",
    bio: "Embracing the slow life\nNature lover & minimalist",
    avatar: "/assets/generated_images/Peaceful_man_profile_photo_581f44a8.png",
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

  // Create some posts
  await db.insert(posts).values([
    {
      userId: user1.id,
      type: "image",
      mediaUrl: "/assets/generated_images/Morning_coffee_slow_living_2c7c7488.png",
      caption: "Morning rituals set the tone for the whole day. Taking time to brew the perfect cup and watch the sunrise reminds me that not everything needs to be rushed. ☕✨ #slowmorning #mindfulmoments",
    },
    {
      userId: user2.id,
      type: "image",
      mediaUrl: "/assets/generated_images/Cozy_reading_corner_moment_85d546e5.png",
      caption: "Found my perfect reading corner. Sometimes the best moments are the quiet ones with a good book and natural light. 📚🌿",
    },
    {
      userId: user1.id,
      type: "image",
      mediaUrl: "/assets/generated_images/Bread_making_slow_living_949d5b0e.png",
      caption: "There's something deeply satisfying about making bread from scratch. The kneading, the waiting, the aroma filling the kitchen - it's meditation in motion. 🍞",
    },
    {
      userId: user2.id,
      type: "image",
      mediaUrl: "/assets/generated_images/Sunset_nature_walk_c18a36cc.png",
      caption: "Golden hour walks remind me to appreciate the simple beauty around us. Nature has its own perfect timing. 🌅",
    },
  ]);

  console.log("Database seeded successfully!");
  console.log(`User IDs: ${user1.id}, ${user2.id}, ${user3.id}`);
  console.log(`Conversation IDs: ${conv1.id}, ${conv2.id}`);

  return { user1, user2, user3, conv1, conv2 };
}
