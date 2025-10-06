import { db } from "../server/db";
import { users } from "../shared/schema";
import { eq } from "drizzle-orm";

// Random beautiful people photos from Unsplash (portrait category)
const beautyPhotos = [
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1557862921-37829c790f19?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1521119989659-a83eee488004?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1502685104226-ee32379fefbe?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1499952127939-9bbf5af6c51c?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&h=400&fit=crop",
];

async function updateAvatars() {
  try {
    // Get all users
    const allUsers = await db.select().from(users);
    
    console.log(`Found ${allUsers.length} users`);
    
    // Update most users (leave a couple with original avatars)
    const usersToUpdate = allUsers.slice(0, Math.min(allUsers.length, beautyPhotos.length));
    
    for (let i = 0; i < usersToUpdate.length; i++) {
      const user = usersToUpdate[i];
      const newAvatar = beautyPhotos[i % beautyPhotos.length];
      
      await db
        .update(users)
        .set({
          avatar: newAvatar,
          profileImageUrl: newAvatar,
        })
        .where(eq(users.id, user.id));
      
      console.log(`Updated ${user.username} with new avatar`);
    }
    
    console.log(`✓ Updated ${usersToUpdate.length} users with beautiful people photos`);
  } catch (error) {
    console.error("Error updating avatars:", error);
  }
  
  process.exit(0);
}

updateAvatars();
