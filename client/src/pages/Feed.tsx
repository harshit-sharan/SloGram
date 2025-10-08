import { Post, type PostData } from "@/components/Post";
import { PlusSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useRef } from "react";
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
    savors: number;
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
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ["/api/posts-with-authors"],
      queryFn: async ({ pageParam = 0 }) => {
        const response = await fetch(
          `/api/posts-with-authors?limit=10&offset=${pageParam}`,
        );
        if (!response.ok) throw new Error("Failed to fetch posts");
        return response.json();
      },
      getNextPageParam: (lastPage, allPages) => {
        if (!lastPage.hasMore) return undefined;
        return allPages.reduce((total, page) => total + page.posts.length, 0);
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
              <DialogTitle className="font-serif text-2xl text-center">
                Welcome to Slogram
              </DialogTitle>
              <DialogDescription className="text-center pt-2">
                A mindful space for slow living and intentional sharing. Please
                log in to continue.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-4 pt-4">
              <Button
                onClick={() => (window.location.href = "/api/login")}
                className="w-full"
                data-testid="button-login-dialog"
              >
                Log in with Replit
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                By logging in, you agree to our terms of service and privacy
                policy.
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

  // Flatten all posts from all pages
  const allPosts = data?.pages.flatMap((page) => page.posts) || [];

  const formattedPosts: PostData[] = allPosts.map((post) => ({
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
    savors: post._count?.savors || 0,
    comments: post._count?.comments || 0,
    timestamp: formatTimestamp(post.createdAt),
  }));

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <div className="max-w-2xl mx-auto pt-6">
        {formattedPosts.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-12 px-4"
            data-testid="empty-feed"
          >
            <p className="text-center text-muted-foreground">
              Your feed is empty. Follow other users to see their posts here.
            </p>
          </div>
        ) : (
          <>
            {formattedPosts.map((post) => (
              <Post key={post.id} post={post} />
            ))}

            {hasNextPage && (
              <div
                ref={loadMoreRef}
                className="flex justify-center py-8"
                data-testid="load-more-trigger"
              >
                {isFetchingNextPage ? (
                  <p className="text-muted-foreground">Loading more posts...</p>
                ) : null}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
