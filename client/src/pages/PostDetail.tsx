import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Post, type PostData } from "@/components/Post";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigation } from "@/contexts/NavigationContext";

interface PostWithAuthor {
  id: string;
  userId: string;
  type: "image" | "video";
  mediaUrl: string;
  caption?: string;
  createdAt: string;
  user: {
    id: string;
    username: string;
    displayName: string;
    avatar?: string;
  };
  _count?: {
    likes: number;
    comments: number;
  };
}

function formatTimestamp(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) return "Just now";
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString();
}

export default function PostDetail() {
  const [, params] = useRoute("/post/:id");
  const [, setLocation] = useLocation();
  const { previousLocation } = useNavigation();
  const postId = params?.id;

  const { data: post, isLoading, error } = useQuery<PostWithAuthor>({
    queryKey: [`/api/posts/${postId}`],
    enabled: !!postId,
  });

  // Determine back button text based on previous location
  const getBackButtonText = (): string => {
    if (!previousLocation) return "Back";
    
    if (previousLocation === "/") return "Back to Feed";
    if (previousLocation === "/explore") return "Back to Explore";
    if (previousLocation.startsWith("/profile/")) return "Back to Profile";
    if (previousLocation === "/saved") return "Back to Saved";
    if (previousLocation === "/notifications") return "Back to Notifications";
    
    return "Back";
  };

  const handleBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      setLocation('/');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-2xl mx-auto pt-6 px-4">
          <p className="text-center text-muted-foreground">Loading post...</p>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-2xl mx-auto pt-6 px-4">
          <Button 
            variant="ghost" 
            size="sm" 
            className="mb-4" 
            onClick={handleBack}
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {getBackButtonText()}
          </Button>
          <p className="text-center text-muted-foreground">Post not found</p>
        </div>
      </div>
    );
  }

  const formattedPost: PostData = {
    id: post.id,
    author: {
      id: post.user.id,
      name: post.user.displayName || post.user.username,
      username: post.user.username,
      avatar: post.user.avatar,
    },
    image: post.type === "image" ? post.mediaUrl : undefined,
    video: post.type === "video" ? post.mediaUrl : undefined,
    caption: post.caption || "",
    likes: post._count?.likes || 0,
    comments: post._count?.comments || 0,
    timestamp: formatTimestamp(post.createdAt),
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <div className="max-w-2xl mx-auto pt-6">
        <div className="px-4 mb-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleBack}
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {getBackButtonText()}
          </Button>
        </div>
        <Post post={formattedPost} />
      </div>
    </div>
  );
}
