import { Post, type PostData } from "@/components/Post";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useRef } from "react";
import About from "@/pages/About";

interface MomentWithAuthor {
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


export default function Flow() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ["/api/moments-with-authors"],
      queryFn: async ({ pageParam = 0 }) => {
        const response = await fetch(
          `/api/moments-with-authors?limit=10&offset=${pageParam}`,
        );
        if (!response.ok) throw new Error("Failed to fetch moments");
        return response.json();
      },
      getNextPageParam: (lastPage, allPages) => {
        if (!lastPage.hasMore) return undefined;
        return allPages.reduce((total, page) => total + page.moments.length, 0);
      },
      initialPageParam: 0,
      enabled: !!user,
    });

  // Infinite scroll observer
  useEffect(() => {
    if (!loadMoreRef.current || !hasNextPage || isFetchingNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(loadMoreRef.current);

    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (!user && !isAuthLoading) {
    return <About />;
  }

  if (isLoading || isAuthLoading) {
    return (
      <div className="min-h-screen bg-background pb-20 md:pb-0">
        <div className="max-w-2xl mx-auto pt-6">
          <p className="text-center text-muted-foreground">
            Loading moments...
          </p>
        </div>
      </div>
    );
  }

  // Flatten all moments from all pages
  const allMoments = data?.pages.flatMap((page) => page.moments) || [];

  const formattedMoments: PostData[] = allMoments.map((moment) => ({
    id: moment.id,
    author: {
      id: moment.user.id,
      name: moment.user.displayName || moment.user.username,
      username: moment.user.username,
      avatar: moment.user.profileImageUrl || moment.user.avatar,
    },
    image: moment.type === "image" ? moment.mediaUrl : undefined,
    video: moment.type === "video" ? moment.mediaUrl : undefined,
    caption: moment.caption || "",
    savors: moment._count?.savors || 0,
    reflects: moment._count?.reflects || 0,
    timestamp: formatTimestamp(moment.createdAt),
  }));

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <div className="max-w-2xl mx-auto pt-6">
        {formattedMoments.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-12 px-4"
            data-testid="empty-flow"
          >
            <p className="text-center text-muted-foreground">
              Your flow is empty. Follow other users to see their moments here.
            </p>
          </div>
        ) : (
          <>
            {formattedMoments.map((moment) => (
              <Post key={moment.id} post={moment} />
            ))}

            {hasNextPage && (
              <div
                ref={loadMoreRef}
                className="flex justify-center py-8"
                data-testid="load-more-trigger"
              >
                {isFetchingNextPage ? (
                  <p className="text-muted-foreground">
                    Loading more moments...
                  </p>
                ) : null}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
