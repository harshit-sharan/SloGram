import { useEffect, useRef } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
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
  const observerTarget = useRef<HTMLDivElement>(null);

  const BATCH_SIZE = 12;

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ["/api/explore-posts"],
    queryFn: async ({ pageParam = 0 }) => {
      const res = await fetch(`/api/explore-posts?limit=${BATCH_SIZE}&offset=${pageParam}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch explore posts");
      return res.json() as Promise<{ posts: PostWithAuthor[]; hasMore: boolean }>;
    },
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.hasMore ? allPages.length * BATCH_SIZE : undefined;
    },
    enabled: !!user,
    initialPageParam: 0,
  });

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const explorePosts = data?.pages.flatMap((page) => page.posts) ?? [];

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
          <>
            <div className="grid grid-cols-3 gap-1 md:gap-2" data-testid="explore-grid">
              {explorePosts.map((post) => (
                <Link
                  key={post.id}
                  href={`/post/${post.id}`}
                  data-testid={`explore-post-${post.id}`}
                >
                  <div 
                    className="relative aspect-square overflow-hidden bg-muted hover-elevate rounded-sm cursor-pointer"
                    onMouseEnter={(e) => {
                      if (post.type === "video") {
                        const video = e.currentTarget.querySelector('video');
                        if (video) video.play();
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (post.type === "video") {
                        const video = e.currentTarget.querySelector('video');
                        if (video) video.pause();
                      }
                    }}
                  >
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
                        loop
                        playsInline
                      />
                    )}
                    <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors pointer-events-none" />
                  </div>
                </Link>
              ))}
            </div>
            
            {hasNextPage && (
              <div ref={observerTarget} className="py-8 text-center">
                {isFetchingNextPage && (
                  <p className="text-muted-foreground">Loading more posts...</p>
                )}
              </div>
            )}
            
            {!hasNextPage && explorePosts.length > 0 && (
              <div className="py-8 text-center">
                <p className="text-muted-foreground">No more posts to explore</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
