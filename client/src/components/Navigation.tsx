import { useState, useEffect, useRef, useMemo } from "react";
import { Heart, Home, PlusSquare, Search, Moon, Sun, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTheme } from "./ThemeProvider";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";

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

export function Navigation() {
  const { theme, toggleTheme } = useTheme();
  const [location] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  const { data: searchResults = [] } = useQuery<SearchUser[]>({
    queryKey: ["/api/users/search?q=" + encodeURIComponent(debouncedSearchQuery)],
    enabled: debouncedSearchQuery.trim().length > 0,
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

  return (
    <nav className="sticky top-0 z-50 border-b bg-background">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        <Link href="/" data-testid="link-home">
          <h1 className="font-serif text-2xl text-foreground hover-elevate active-elevate-2 rounded-md px-2 py-1">
            Slogram
          </h1>
        </Link>

        <div className="hidden md:flex flex-1 max-w-md relative" ref={searchRef}>
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
                      <AvatarFallback>{user.displayName.charAt(0)}</AvatarFallback>
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

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            asChild
            data-testid="button-home"
          >
            <Link href="/">
              <Home className={location === "/" ? "fill-current" : ""} />
            </Link>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              console.log("Create post clicked");
              window.dispatchEvent(new Event('open-create-post'));
            }}
            data-testid="button-create"
          >
            <PlusSquare />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            asChild
            data-testid="button-messages"
          >
            <Link href="/messages">
              <MessageCircle className={location === "/messages" ? "fill-current" : ""} />
            </Link>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => console.log("Notifications clicked")}
            data-testid="button-notifications"
          >
            <Heart />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            data-testid="button-theme-toggle"
          >
            {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            asChild
            data-testid="button-profile"
          >
            <Link href="/profile/ca1a588a-2f07-4b75-ad8a-2ac21444840e">
              <Avatar className="h-8 w-8">
                <AvatarImage src="" />
                <AvatarFallback>ME</AvatarFallback>
              </Avatar>
            </Link>
          </Button>
        </div>
      </div>
    </nav>
  );
}
