import { useState, useEffect, useRef } from "react";
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
  const [allPosts, setAllPosts] = useState<PostWithAuthor[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const observerTarget = useRef<HTMLDivElement>(null);

  const BATCH_SIZE = 12;

  const { data: exploreData, isLoading } = useQuery<{ posts: PostWithAuthor[]; hasMore: boolean }>({
    queryKey: [`/api/explore-posts?limit=${BATCH_SIZE}&offset=${offset}`],
    enabled: !!user,
  });

  useEffect(() => {
    if (exploreData) {
      if (offset === 0) {
        setAllPosts(exploreData.posts);
      } else {
        setAllPosts(prev => [...prev, ...exploreData.posts]);
      }
      setHasMore(exploreData.hasMore);
      setIsLoadingMore(false);
    }
  }, [exploreData, offset]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading && !isLoadingMore) {
          setIsLoadingMore(true);
          setOffset(prev => prev + BATCH_SIZE);
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [hasMore, isLoading, isLoadingMore]);

  const explorePosts = allPosts;

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <div className="max-w-5xl mx-auto px-4 pt-6">

        {isLoading && offset === 0 ? (
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
                        loop
                        playsInline
                        onMouseEnter={(e) => e.currentTarget.play()}
                        onMouseLeave={(e) => e.currentTarget.pause()}
                      />
                    )}
                    <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
            
            {hasMore && (
              <div ref={observerTarget} className="py-8 text-center">
                {isLoadingMore && (
                  <p className="text-muted-foreground">Loading more posts...</p>
                )}
              </div>
            )}
            
            {!hasMore && explorePosts.length > 0 && (
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
