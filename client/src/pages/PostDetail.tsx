import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Post, type PostData } from "@/components/Post";

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
  const postId = params?.id;

  const { data: post, isLoading, error } = useQuery<PostWithAuthor>({
    queryKey: [`/api/posts/${postId}`],
    enabled: !!postId,
  });

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
        <Post post={formattedPost} />
      </div>
    </div>
  );
}
