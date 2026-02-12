import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";

export function AboutButton() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="fixed bottom-6 left-6 z-[9999]" data-testid="about-button-widget">
      <Button
        asChild
        className="bg-primary text-primary-foreground shadow-lg"
        data-testid="button-about"
      >
        <Link href="/about">
          <Info className="h-4 w-4 mr-2" />
          About
        </Link>
      </Button>
    </div>
  );
}
