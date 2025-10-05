import { Post, type PostData } from "@/components/Post";
import { PlusSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
    profileImageUrl?: string;
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

export default function Feed() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { data: posts = [], isLoading } = useQuery<PostWithAuthor[]>({
    queryKey: ["/api/posts-with-authors"],
    enabled: !!user,
  });

  // Show login dialog when not authenticated
  if (!user && !isAuthLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Dialog open={true}>
          <DialogContent 
            className="sm:max-w-md" 
            data-testid="dialog-login-required"
            onInteractOutside={(e) => e.preventDefault()}
            onEscapeKeyDown={(e) => e.preventDefault()}
          >
            <DialogHeader>
              <DialogTitle className="font-serif text-2xl text-center">Welcome to Slogram</DialogTitle>
              <DialogDescription className="text-center pt-2">
                A mindful space for slow living and intentional sharing.
                Please log in to continue.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-4 pt-4">
              <Button
                onClick={() => window.location.href = '/api/login'}
                className="w-full"
                data-testid="button-login-dialog"
              >
                Log in with Replit
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                By logging in, you agree to our terms of service and privacy policy.
              </p>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  if (isLoading || isAuthLoading) {
    return (
      <div className="min-h-screen bg-background pb-20 md:pb-0">
        <div className="max-w-2xl mx-auto pt-6">
          <p className="text-center text-muted-foreground">Loading posts...</p>
        </div>
      </div>
    );
  }

  const formattedPosts: PostData[] = posts.map((post) => ({
    id: post.id,
    author: {
      id: post.user.id,
      name: post.user.displayName || post.user.username,
      username: post.user.username,
      avatar: post.user.profileImageUrl || post.user.avatar,
    },
    image: post.type === "image" ? post.mediaUrl : undefined,
    video: post.type === "video" ? post.mediaUrl : undefined,
    caption: post.caption || "",
    likes: post._count?.likes || 0,
    comments: post._count?.comments || 0,
    timestamp: formatTimestamp(post.createdAt),
  }));

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <div className="max-w-2xl mx-auto pt-6">
        {formattedPosts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4" data-testid="empty-feed">
            <p className="text-center text-muted-foreground">
              Your feed is empty. Follow other users to see their posts here.
            </p>
          </div>
        ) : (
          formattedPosts.map((post) => <Post key={post.id} post={post} />)
        )}
      </div>

      <Button
        size="icon"
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg md:hidden"
        onClick={() => window.dispatchEvent(new Event('open-create-post'))}
        data-testid="button-create-mobile"
      >
        <PlusSquare className="h-6 w-6" />
      </Button>
    </div>
  );
}
