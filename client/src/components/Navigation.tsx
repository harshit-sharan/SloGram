import { Heart, Home, PlusSquare, Search, Moon, Sun, MessageCircle, Bookmark, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTheme } from "./ThemeProvider";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { logout } from "@/lib/authUtils";

export function Navigation() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [location] = useLocation();

  const { data: unreadCountData } = useQuery<{ count: number }>({
    queryKey: ["/api/notifications", user?.id, "unread-count"],
    enabled: !!user,
    refetchInterval: 10000, // Refetch every 10 seconds
  });

  return (
    <nav className="sticky top-0 z-50 border-b bg-background">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        <Link href="/" data-testid="link-home">
          <h1 className="font-serif text-2xl text-foreground hover-elevate active-elevate-2 rounded-md px-2 py-1">
            Slogram
          </h1>
        </Link>

        <Button
          variant="ghost"
          className="hidden md:flex flex-1 max-w-md justify-start gap-2 px-3 bg-muted hover:bg-muted/80"
          asChild
          data-testid="button-search-navigate"
        >
          <Link href="/explore">
            <Search className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Search slow living...</span>
          </Link>
        </Button>

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
            asChild
            data-testid="button-notifications"
          >
            <Link href="/notifications" className="relative">
              <Heart className={location === "/notifications" ? "fill-current" : ""} />
              {unreadCountData && unreadCountData.count > 0 && (
                <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center font-semibold">
                  {unreadCountData.count > 9 ? "9+" : unreadCountData.count}
                </span>
              )}
            </Link>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            asChild
            data-testid="button-saved"
          >
            <Link href="/saved">
              <Bookmark className={location === "/saved" ? "fill-current" : ""} />
            </Link>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            data-testid="button-theme-toggle"
          >
            {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          </Button>

          {user ? (
            <>
              <Button
                variant="ghost"
                size="icon"
                asChild
                data-testid="button-profile"
              >
                <Link href={`/profile/${user.id}`}>
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.profileImageUrl || user.avatar || ""} />
                    <AvatarFallback>{user.firstName?.charAt(0) || user.displayName?.charAt(0) || "U"}</AvatarFallback>
                  </Avatar>
                </Link>
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => logout()}
                data-testid="button-logout"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </>
          ) : (
            <Button
              variant="default"
              onClick={() => window.location.href = '/api/login'}
              data-testid="button-login"
            >
              Log In
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
}
