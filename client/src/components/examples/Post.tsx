import { Post } from "../Post";
import avatar from "@assets/generated_images/Peaceful_woman_profile_photo_8348405c.png";
import postImage from "@assets/generated_images/Morning_coffee_slow_living_2c7c7488.png";

export default function PostExample() {
  const mockPost = {
    id: "1",
    author: {
      name: "Emma Chen",
      username: "emma_mindful",
      avatar: avatar,
    },
    image: postImage,
    caption: "Morning rituals set the tone for the whole day. Taking time to brew the perfect cup and watch the sunrise reminds me that not everything needs to be rushed. ☕✨ #slowmorning #mindfulmoments",
    likes: 342,
    comments: 28,
    timestamp: "2 hours ago",
  };

  return <Post post={mockPost} />;
}
