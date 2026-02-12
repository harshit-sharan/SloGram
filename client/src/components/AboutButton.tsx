import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";

export function AboutButton() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="fixed bottom-6 left-0 right-0 z-[9999] pointer-events-none" data-testid="about-button-widget">
      <div className="max-w-5xl mx-auto px-4">
        <Button
          asChild
          className="bg-primary text-primary-foreground shadow-lg pointer-events-auto"
          data-testid="button-about"
        >
          <Link href="/about">
            <Info className="h-4 w-4 mr-2" />
            About
          </Link>
        </Button>
      </div>
    </div>
  );
}
