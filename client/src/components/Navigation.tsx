import {
  Wind,
  Home,
  PlusSquare,
  Search,
  MessageCircle,
  Bookmark,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import logoImage from "@assets/slogram-logo.png";

export function Navigation() {
  const { user } = useAuth();
  const [location] = useLocation();

  const { data: unreadCountData } = useQuery<{ count: number }>({
    queryKey: ["/api/whispers", user?.id, "unread-count"],
    enabled: !!user,
    refetchInterval: 10000,
  });

  const { data: unreadNotesData } = useQuery<{ count: number }>({
    queryKey: ["/api/notes", user?.id, "unread-count"],
    enabled: !!user,
    refetchInterval: 10000,
  });

  const handleNavigation = (targetPath: string, e: React.MouseEvent) => {
    if (location === targetPath) {
      e.preventDefault();
      window.location.reload();
    }
  };

  return (
    <nav className="sticky top-0 z-50 border-b bg-background">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between gap-2 sm:gap-4">
        <Link
          href="/"
          onClick={(e) => handleNavigation("/", e)}
          data-testid="link-home"
        >
          <img
            src={logoImage}
            alt="Logo"
            className="h-10 w-10 sm:h-12 sm:w-12 hover-elevate active-elevate-2 rounded-md object-contain flex-shrink-0"
          />
        </Link>

        <div className="flex-1" />

        <div className="flex items-center gap-1 sm:gap-2">
          <Button variant="ghost" size="icon" asChild data-testid="button-home">
            <Link href="/" onClick={(e) => handleNavigation("/", e)}>
              <Home className={location === "/" ? "fill-current" : ""} />
            </Link>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              console.log("Create post clicked");
              window.dispatchEvent(new Event("open-create-post"));
            }}
            data-testid="button-create"
          >
            <PlusSquare />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            asChild
            data-testid="button-wander"
          >
            <Link href="/wander" onClick={(e) => handleNavigation("/wander", e)}>
              <Search className={location === "/wander" ? "fill-current" : ""} />
            </Link>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            asChild
            data-testid="button-conversations"
          >
            <Link
              href="/conversations"
              onClick={(e) => handleNavigation("/conversations", e)}
              className="relative"
            >
              <MessageCircle
                className={`${
                  location === "/conversations" ? "fill-current" : ""
                } ${
                  unreadNotesData && unreadNotesData.count > 0
                    ? "text-primary fill-current"
                    : ""
                }`}
              />
              {unreadNotesData && unreadNotesData.count > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center font-semibold">
                  {unreadNotesData.count > 9 ? "9+" : unreadNotesData.count}
                </span>
              )}
            </Link>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            asChild
            data-testid="button-whispers"
          >
            <Link
              href="/whispers"
              onClick={(e) => handleNavigation("/whispers", e)}
              className="relative"
            >
              <Wind
                className={`${
                  location === "/whispers" ? "fill-current" : ""
                } ${
                  unreadCountData && unreadCountData.count > 0
                    ? "text-destructive fill-current"
                    : ""
                }`}
              />
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
            data-testid="button-kept"
          >
            <Link href="/kept" onClick={(e) => handleNavigation("/kept", e)}>
              <Bookmark
                className={location === "/kept" ? "fill-current" : ""}
              />
            </Link>
          </Button>

          {user !== undefined && (
            <>
              {user ? (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    asChild
                    data-testid="button-space"
                  >
                    <Link
                      href={`/space/${user.id}`}
                      onClick={(e) =>
                        handleNavigation(`/space/${user.id}`, e)
                      }
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage
                          src={user.profileImageUrl || user.avatar || ""}
                        />
                        <AvatarFallback>
                          {user.firstName?.charAt(0) ||
                            user.displayName?.charAt(0) ||
                            "U"}
                        </AvatarFallback>
                      </Avatar>
                    </Link>
                  </Button>
                </>
              ) : (
                <Button
                  variant="default"
                  onClick={() => (window.location.href = "/api/login")}
                  data-testid="button-login"
                >
                  Log In
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
