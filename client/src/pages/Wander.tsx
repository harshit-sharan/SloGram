import { useEffect, useRef, useState } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "wouter";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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
    reflects: number;
  };
}

interface SearchUser {
  id: string;
  username: string;
  displayName: string;
  avatar?: string;
}

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

function ExploreVideoThumbnail({ post }: { post: PostWithAuthor }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!videoRef.current || !containerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            videoRef.current?.play().catch(() => {
              // Auto-play failed
            });
          } else {
            videoRef.current?.pause();
          }
        });
      },
      { threshold: 0.5 },
    );

    observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, []);

  return (
    <Link href={`/moment/${post.id}`} data-testid={`explore-moment-${post.id}`}>
      <div
        ref={containerRef}
        className="relative aspect-square overflow-hidden bg-muted hover-elevate rounded-sm cursor-pointer"
      >
        <video
          ref={videoRef}
          src={post.mediaUrl}
          className="w-full h-full object-cover"
          muted
          loop
          playsInline
        />
        <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors pointer-events-none" />
      </div>
    </Link>
  );
}

export default function Explore() {
  const { user } = useAuth();
  const observerTarget = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showResults, setShowResults] = useState(false);

  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  const BATCH_SIZE = 12;

  const { data: searchResults = [] } = useQuery<SearchUser[]>({
    queryKey: [
      "/api/users/search?q=" + encodeURIComponent(debouncedSearchQuery),
    ],
    enabled: debouncedSearchQuery.trim().length > 0,
  });

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useInfiniteQuery({
      queryKey: ["/api/explore-posts"],
      queryFn: async ({ pageParam = 0 }) => {
        const res = await fetch(
          `/api/explore-posts?limit=${BATCH_SIZE}&offset=${pageParam}`,
          {
            credentials: "include",
          },
        );
        if (!res.ok) throw new Error("Failed to fetch explore posts");
        return res.json() as Promise<{
          moments: PostWithAuthor[];
          hasMore: boolean;
        }>;
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
      { threshold: 0.1 },
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setShowResults(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    setShowResults(value.trim().length > 0);
  };

  const handleResultClick = () => {
    setSearchQuery("");
    setShowResults(false);
  };

  const exploreMoments = data?.pages.flatMap((page) => page.moments) ?? [];

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <div className="max-w-5xl mx-auto px-4 pt-6">
        <div className="mb-6 relative" ref={searchRef}>
          <div className="relative w-full max-w-2xl mx-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search friends on Slogram..."
              className="pl-10 bg-muted border-0"
              data-testid="input-search"
              value={searchQuery}
              onChange={handleSearchChange}
              onFocus={() =>
                searchQuery.trim().length > 0 && setShowResults(true)
              }
            />
          </div>

          {showResults && searchResults.length > 0 && (
            <div
              className="absolute top-full mt-2 w-full max-w-2xl mx-auto left-0 right-0 bg-card border rounded-md shadow-lg overflow-hidden z-50"
              data-testid="search-results"
            >
              {searchResults.map((searchUser) => (
                <Link
                  key={searchUser.id}
                  href={`/space/${searchUser.id}`}
                  onClick={handleResultClick}
                  data-testid={`search-result-${searchUser.id}`}
                >
                  <div className="flex items-center gap-3 px-4 py-3 hover-elevate cursor-pointer">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={searchUser.avatar} />
                      <AvatarFallback>
                        {searchUser.displayName?.charAt(0) ||
                          searchUser.username?.charAt(0) ||
                          "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-sm">
                        {searchUser.displayName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        @{searchUser.username}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {showResults &&
            searchQuery.trim().length > 0 &&
            searchResults.length === 0 && (
              <div
                className="absolute top-full mt-2 w-full max-w-2xl mx-auto left-0 right-0 bg-card border rounded-md shadow-lg p-4 z-50"
                data-testid="search-no-results"
              >
                <p className="text-sm text-muted-foreground text-center">
                  No users found
                </p>
              </div>
            )}
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading moments...</p>
          </div>
        ) : exploreMoments.length === 0 ? (
          <div className="text-center py-12" data-testid="empty-explore">
            <p className="text-muted-foreground">
              No moments to explore at the moment.
            </p>
          </div>
        ) : (
          <>
            <div
              className="grid grid-cols-3 gap-1 md:gap-2"
              data-testid="explore-grid"
            >
              {exploreMoments.map((moment) =>
                moment.type === "video" ? (
                  <ExploreVideoThumbnail key={moment.id} post={moment} />
                ) : (
                  <Link
                    key={moment.id}
                    href={`/moment/${moment.id}`}
                    data-testid={`explore-moment-${moment.id}`}
                  >
                    <div className="relative aspect-square overflow-hidden bg-muted hover-elevate rounded-sm cursor-pointer">
                      <img
                        src={moment.mediaUrl}
                        alt={moment.caption || "Moment"}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors pointer-events-none" />
                    </div>
                  </Link>
                ),
              )}
            </div>

            {hasNextPage && (
              <div ref={observerTarget} className="py-8 text-center">
                {isFetchingNextPage && (
                  <p className="text-muted-foreground">Loading more moments...</p>
                )}
              </div>
            )}

            {!hasNextPage && exploreMoments.length > 0 && (
              <div className="py-8 text-center">
                <p className="text-muted-foreground">
                  No more moments to explore
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
