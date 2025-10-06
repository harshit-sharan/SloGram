import {
  Heart,
  Home,
  PlusSquare,
  Search,
  MessageCircle,
  Bookmark,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { logout } from "@/lib/authUtils";
import logoImage from "@assets/Gemini_Generated_Image_86ggr486ggr486gg_1759784666715.png";

export function Navigation() {
  const { user } = useAuth();
  const [location] = useLocation();

  const { data: unreadCountData } = useQuery<{ count: number }>({
    queryKey: ["/api/notifications", user?.id, "unread-count"],
    enabled: !!user,
    refetchInterval: 10000,
  });

  const { data: unreadMessagesData } = useQuery<{ count: number }>({
    queryKey: ["/api/messages", user?.id, "unread-count"],
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
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        <Link
          href="/"
          onClick={(e) => handleNavigation("/", e)}
          data-testid="link-home"
        >
          <img
            src={logoImage}
            alt="Logo"
            className="h-12 w-12 hover-elevate active-elevate-2 rounded-md"
          />
        </Link>

        <div className="flex-1" />

        <div className="flex items-center gap-2">
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
            data-testid="button-explore"
          >
            <Link href="/explore" onClick={(e) => handleNavigation("/explore", e)}>
              <Search className={location === "/explore" ? "fill-current" : ""} />
            </Link>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            asChild
            data-testid="button-messages"
          >
            <Link
              href="/messages"
              onClick={(e) => handleNavigation("/messages", e)}
              className="relative"
            >
              <MessageCircle
                className={`${
                  location === "/messages" ? "fill-current" : ""
                } ${
                  unreadMessagesData && unreadMessagesData.count > 0
                    ? "text-primary fill-current"
                    : ""
                }`}
              />
              {unreadMessagesData && unreadMessagesData.count > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center font-semibold">
                  {unreadMessagesData.count > 9 ? "9+" : unreadMessagesData.count}
                </span>
              )}
            </Link>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            asChild
            data-testid="button-notifications"
          >
            <Link
              href="/notifications"
              onClick={(e) => handleNavigation("/notifications", e)}
              className="relative"
            >
              <Heart
                className={`${
                  location === "/notifications" ? "fill-current" : ""
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
            data-testid="button-saved"
          >
            <Link href="/saved" onClick={(e) => handleNavigation("/saved", e)}>
              <Bookmark
                className={location === "/saved" ? "fill-current" : ""}
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
                    data-testid="button-profile"
                  >
                    <Link
                      href={`/profile/${user.id}`}
                      onClick={(e) =>
                        handleNavigation(`/profile/${user.id}`, e)
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
