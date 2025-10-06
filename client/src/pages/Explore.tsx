import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "wouter";

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

export default function Explore() {
  const { user } = useAuth();

  const { data: exploreData, isLoading } = useQuery<{ posts: PostWithAuthor[]; hasMore: boolean }>({
    queryKey: ["/api/explore-posts?limit=30"],
    enabled: !!user,
  });

  const explorePosts = exploreData?.posts || [];

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <div className="max-w-5xl mx-auto px-4 pt-6">

        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading posts...</p>
          </div>
        ) : explorePosts.length === 0 ? (
          <div className="text-center py-12" data-testid="empty-explore">
            <p className="text-muted-foreground">
              No posts to explore at the moment.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1 md:gap-2" data-testid="explore-grid">
            {explorePosts.map((post) => (
              <Link
                key={post.id}
                href={`/post/${post.id}`}
                data-testid={`explore-post-${post.id}`}
              >
                <div className="relative aspect-square overflow-hidden bg-muted hover-elevate rounded-sm cursor-pointer">
                  {post.type === "image" ? (
                    <img
                      src={post.mediaUrl}
                      alt={post.caption || "Post"}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <video
                      src={post.mediaUrl}
                      className="w-full h-full object-cover"
                      muted
                    />
                  )}
                  <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
