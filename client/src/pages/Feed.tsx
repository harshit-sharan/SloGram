import { useState, useEffect } from "react";
import { Post, type PostData } from "@/components/Post";
import { CreatePostModal } from "@/components/CreatePostModal";
import { PlusSquare } from "lucide-react";
import { Button } from "@/components/ui/button";

import avatar1 from "@assets/generated_images/Peaceful_woman_profile_photo_8348405c.png";
import avatar2 from "@assets/generated_images/Peaceful_man_profile_photo_581f44a8.png";
import post1 from "@assets/generated_images/Morning_coffee_slow_living_2c7c7488.png";
import post2 from "@assets/generated_images/Cozy_reading_corner_moment_85d546e5.png";
import post3 from "@assets/generated_images/Bread_making_slow_living_949d5b0e.png";
import post4 from "@assets/generated_images/Sunset_nature_walk_c18a36cc.png";

const mockPosts: PostData[] = [
  {
    id: "1",
    author: {
      name: "Emma Chen",
      username: "emma_mindful",
      avatar: avatar1,
    },
    image: post1,
    caption: "Morning rituals set the tone for the whole day. Taking time to brew the perfect cup and watch the sunrise reminds me that not everything needs to be rushed. ☕✨ #slowmorning #mindfulmoments",
    likes: 342,
    comments: 28,
    timestamp: "2 hours ago",
  },
  {
    id: "2",
    author: {
      name: "James River",
      username: "james.slow",
      avatar: avatar2,
    },
    image: post2,
    caption: "Found my perfect reading corner. Sometimes the best moments are the quiet ones with a good book and natural light. 📚🌿",
    likes: 256,
    comments: 15,
    timestamp: "5 hours ago",
  },
  {
    id: "3",
    author: {
      name: "Emma Chen",
      username: "emma_mindful",
      avatar: avatar1,
    },
    image: post3,
    caption: "There's something deeply satisfying about making bread from scratch. The kneading, the waiting, the aroma filling the kitchen - it's meditation in motion. 🍞",
    likes: 489,
    comments: 42,
    timestamp: "1 day ago",
  },
  {
    id: "4",
    author: {
      name: "James River",
      username: "james.slow",
      avatar: avatar2,
    },
    image: post4,
    caption: "Golden hour walks remind me to appreciate the simple beauty around us. Nature has its own perfect timing. 🌅",
    likes: 521,
    comments: 37,
    timestamp: "2 days ago",
  },
];

export default function Feed() {
  const [createPostOpen, setCreatePostOpen] = useState(false);

  // Listen for create post trigger from navigation
  useEffect(() => {
    const handleCreatePost = () => {
      setCreatePostOpen(true);
    };

    window.addEventListener('open-create-post', handleCreatePost);
    return () => {
      window.removeEventListener('open-create-post', handleCreatePost);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <div className="max-w-2xl mx-auto pt-6">
        {mockPosts.map((post) => (
          <Post key={post.id} post={post} />
        ))}
      </div>

      <Button
        size="icon"
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg md:hidden"
        onClick={() => setCreatePostOpen(true)}
        data-testid="button-create-mobile"
      >
        <PlusSquare className="h-6 w-6" />
      </Button>

      <CreatePostModal open={createPostOpen} onOpenChange={setCreatePostOpen} />
    </div>
  );
}
