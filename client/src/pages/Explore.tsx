import { useState, useEffect, useRef } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "wouter";

interface SearchUser {
  id: string;
  username: string;
  displayName: string;
  avatar?: string;
}

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

export default function Explore() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  const { data: searchResults = [] } = useQuery<SearchUser[]>({
    queryKey: ["/api/users/search?q=" + encodeURIComponent(debouncedSearchQuery)],
    enabled: debouncedSearchQuery.trim().length > 0,
  });

  const { data: exploreData, isLoading } = useQuery<{ posts: PostWithAuthor[]; hasMore: boolean }>({
    queryKey: ["/api/explore-posts?limit=30"],
    enabled: !!user,
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
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

  const explorePosts = exploreData?.posts || [];

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <div className="max-w-5xl mx-auto px-4 pt-6">
        <div className="mb-8">
          <div className="max-w-2xl mx-auto relative" ref={searchRef}>
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search slow living..."
                className="pl-10 bg-muted border-0"
                data-testid="input-search"
                value={searchQuery}
                onChange={handleSearchChange}
                onFocus={() => searchQuery.trim().length > 0 && setShowResults(true)}
              />
            </div>

            {showResults && searchResults.length > 0 && (
              <div 
                className="absolute top-full mt-2 w-full bg-card border rounded-md shadow-lg overflow-hidden z-50"
                data-testid="search-results"
              >
                {searchResults.map((user) => (
                  <Link
                    key={user.id}
                    href={`/profile/${user.id}`}
                    onClick={handleResultClick}
                    data-testid={`search-result-${user.id}`}
                  >
                    <div className="flex items-center gap-3 px-4 py-3 hover-elevate cursor-pointer">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={user.avatar} />
                        <AvatarFallback>{user.displayName?.charAt(0) || user.username?.charAt(0) || "U"}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold text-sm">{user.displayName}</p>
                        <p className="text-xs text-muted-foreground">@{user.username}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {showResults && searchQuery.trim().length > 0 && searchResults.length === 0 && (
              <div 
                className="absolute top-full mt-2 w-full bg-card border rounded-md shadow-lg p-4 z-50"
                data-testid="search-no-results"
              >
                <p className="text-sm text-muted-foreground text-center">No users found</p>
              </div>
            )}
          </div>
        </div>

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
