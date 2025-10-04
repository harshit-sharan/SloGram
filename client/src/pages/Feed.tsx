import { useState, useEffect } from "react";
import { Post, type PostData } from "@/components/Post";
import { CreatePostModal } from "@/components/CreatePostModal";
import { PlusSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";

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

export default function Feed() {
  const [createPostOpen, setCreatePostOpen] = useState(false);

  const { data: posts = [], isLoading } = useQuery<PostWithAuthor[]>({
    queryKey: ["/api/posts-with-authors"],
  });

  useEffect(() => {
    const handleCreatePost = () => {
      setCreatePostOpen(true);
    };

    window.addEventListener('open-create-post', handleCreatePost);
    return () => {
      window.removeEventListener('open-create-post', handleCreatePost);
    };
  }, []);

  if (isLoading) {
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
  }));

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <div className="max-w-2xl mx-auto pt-6">
        {formattedPosts.length === 0 ? (
          <p className="text-center text-muted-foreground">No posts yet. Create the first one!</p>
        ) : (
          formattedPosts.map((post) => <Post key={post.id} post={post} />)
        )}
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
