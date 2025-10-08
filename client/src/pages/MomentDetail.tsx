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
    savors: number;
    reflects: number;
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

export default function MomentDetail() {
  const [, params] = useRoute("/post/:id");
  const momentId = params?.id;

  const { data: moment, isLoading, error } = useQuery<PostWithAuthor>({
    queryKey: [`/api/moments/${momentId}`],
    enabled: !!momentId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-2xl mx-auto pt-6 px-4">
          <p className="text-center text-muted-foreground">Loading moment...</p>
        </div>
      </div>
    );
  }

  if (!moment) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-2xl mx-auto pt-6 px-4">
          <p className="text-center text-muted-foreground">Moment not found</p>
        </div>
      </div>
    );
  }

  const formattedPost: PostData = {
    id: moment.id,
    author: {
      id: moment.user.id,
      name: moment.user.displayName || moment.user.username,
      username: moment.user.username,
      avatar: moment.user.avatar,
    },
    image: moment.type === "image" ? moment.mediaUrl : undefined,
    video: moment.type === "video" ? moment.mediaUrl : undefined,
    caption: moment.caption || "",
    savors: moment._count?.savors || 0,
    reflects: moment._count?.reflects || 0,
    timestamp: formatTimestamp(moment.createdAt),
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <div className="max-w-2xl mx-auto pt-6">
        <Post post={formattedPost} />
      </div>
    </div>
  );
}
