import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "wouter";

interface SavedPost {
  id: string;
  userId: string;
  type: "image" | "video";
  mediaUrl: string;
  caption: string | null;
  createdAt: string;
  savedAt: string;
}

export default function Saved() {
  const { user } = useAuth();

  const { data: savedPosts = [], isLoading } = useQuery<SavedPost[]>({
    queryKey: ["/api/saved-posts"],
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-20 md:pb-0">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <h1 className="font-serif text-2xl mb-6" data-testid="text-page-title">Saved Posts</h1>
          <p className="text-center text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="font-serif text-2xl mb-6" data-testid="text-page-title">Saved Posts</h1>

        {savedPosts.length === 0 ? (
          <div className="text-center py-12" data-testid="empty-saved">
            <p className="text-muted-foreground">No saved posts yet</p>
            <p className="text-sm text-muted-foreground mt-2">
              Posts you save will appear here
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1" data-testid="saved-posts-grid">
            {savedPosts.map((post) => (
              <Link
                key={post.id}
                href={`/post/${post.id}`}
                data-testid={`link-saved-post-${post.id}`}
              >
                <div className="relative aspect-square bg-muted cursor-pointer hover-elevate overflow-hidden">
                  {post.type === "video" ? (
                    <video
                      src={post.mediaUrl}
                      className="w-full h-full object-cover"
                      data-testid={`video-saved-${post.id}`}
                      muted
                      loop
                      playsInline
                      onMouseEnter={(e) => e.currentTarget.play()}
                      onMouseLeave={(e) => e.currentTarget.pause()}
                    />
                  ) : (
                    <img
                      src={post.mediaUrl}
                      alt="Saved post"
                      className="w-full h-full object-cover"
                      data-testid={`img-saved-${post.id}`}
                    />
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
