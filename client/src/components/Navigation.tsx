import { Heart, Home, PlusSquare, Search, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTheme } from "./ThemeProvider";
import { Link, useLocation } from "wouter";

export function Navigation() {
  const { theme, toggleTheme } = useTheme();
  const [location] = useLocation();

  return (
    <nav className="sticky top-0 z-50 border-b bg-background">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        <Link href="/" data-testid="link-home">
          <h1 className="font-serif text-2xl text-foreground hover-elevate active-elevate-2 rounded-md px-2 py-1">
            Slogram
          </h1>
        </Link>

        <div className="hidden md:flex flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search slow living..."
              className="pl-10 bg-muted border-0"
              data-testid="input-search"
            />
          </div>
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
            onClick={() => console.log("Create post clicked")}
            data-testid="button-create"
          >
            <PlusSquare />
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
            <Link href="/profile">
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
