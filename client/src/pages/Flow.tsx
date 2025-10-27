import { Post, type PostData } from "@/components/Post";
import { PlusSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useInfiniteQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface MomentWithAuthor {
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

function AuthDialog() {
  const { toast } = useToast();
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupFirstName, setSignupFirstName] = useState("");
  const [signupLastName, setSignupLastName] = useState("");

  const loginMutation = useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      const response = await apiRequest(
        "POST",
        "/api/local/login",
        credentials,
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      window.location.reload();
    },
    onError: (error: Error) => {
      const errorMsg = error.message;
      const match = errorMsg.match(/^\d+:\s*(.+)$/);
      let message = "Login failed";
      if (match) {
        try {
          const errorData = JSON.parse(match[1]);
          message = errorData.error || message;
        } catch (e) {
          message = match[1];
        }
      }
      toast({
        title: "Login failed",
        description: message,
        variant: "destructive",
      });
    },
  });

  const signupMutation = useMutation({
    mutationFn: async (credentials: {
      email: string;
      password: string;
      firstName?: string;
      lastName?: string;
    }) => {
      const response = await apiRequest(
        "POST",
        "/api/local/signup",
        credentials,
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      window.location.reload();
    },
    onError: (error: Error) => {
      const errorMsg = error.message;
      const match = errorMsg.match(/^\d+:\s*(.+)$/);
      let message = "Signup failed";
      if (match) {
        try {
          const errorData = JSON.parse(match[1]);
          message = errorData.error || message;
        } catch (e) {
          message = match[1];
        }
      }
      toast({
        title: "Signup failed",
        description: message,
        variant: "destructive",
      });
    },
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate({ email: loginEmail, password: loginPassword });
  };

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    signupMutation.mutate({
      email: signupEmail,
      password: signupPassword,
      firstName: signupFirstName || undefined,
      lastName: signupLastName || undefined,
    });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Dialog open={true}>
        <DialogContent
          className="sm:max-w-lg"
          data-testid="dialog-auth"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl text-center">
              Welcome to Slogram
            </DialogTitle>
            <DialogDescription className="text-center pt-2">
              A mindful space for slow living and intentional sharing
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login" data-testid="tab-login">
                Log In
              </TabsTrigger>
              <TabsTrigger value="signup" data-testid="tab-signup">
                Sign Up
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="space-y-4">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="your@email.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                    data-testid="input-login-email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                    data-testid="input-login-password"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={loginMutation.isPending}
                  data-testid="button-login-submit"
                >
                  {loginMutation.isPending ? "Logging in..." : "Log In"}
                </Button>
              </form>

              {/* <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Or continue with
                  </span>
                </div>
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => (window.location.href = "/api/login")}
                data-testid="button-replit-login"
              >
                Log in with Replit
              </Button> */}
            </TabsContent>

            <TabsContent value="signup" className="space-y-4">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-firstname">First Name</Label>
                    <Input
                      id="signup-firstname"
                      type="text"
                      placeholder="Optional"
                      value={signupFirstName}
                      onChange={(e) => setSignupFirstName(e.target.value)}
                      data-testid="input-signup-firstname"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-lastname">Last Name</Label>
                    <Input
                      id="signup-lastname"
                      type="text"
                      placeholder="Optional"
                      value={signupLastName}
                      onChange={(e) => setSignupLastName(e.target.value)}
                      data-testid="input-signup-lastname"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="your@email.com"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    required
                    data-testid="input-signup-email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="At least 6 characters"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    required
                    minLength={6}
                    data-testid="input-signup-password"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={signupMutation.isPending}
                  data-testid="button-signup-submit"
                >
                  {signupMutation.isPending ? "Creating account..." : "Sign Up"}
                </Button>
              </form>

              {/* <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Or continue with
                  </span>
                </div>
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => (window.location.href = "/api/login")}
                data-testid="button-replit-signup"
              >
                Sign up with Replit
              </Button> */}
            </TabsContent>
          </Tabs>

          <p className="text-xs text-muted-foreground text-center pt-2">
            By continuing, you agree to our terms of service and privacy policy.
          </p>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function Flow() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ["/api/moments-with-authors"],
      queryFn: async ({ pageParam = 0 }) => {
        const response = await fetch(
          `/api/moments-with-authors?limit=10&offset=${pageParam}`,
        );
        if (!response.ok) throw new Error("Failed to fetch moments");
        return response.json();
      },
      getNextPageParam: (lastPage, allPages) => {
        if (!lastPage.hasMore) return undefined;
        return allPages.reduce((total, page) => total + page.moments.length, 0);
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
    return <AuthDialog />;
  }

  if (isLoading || isAuthLoading) {
    return (
      <div className="min-h-screen bg-background pb-20 md:pb-0">
        <div className="max-w-2xl mx-auto pt-6">
          <p className="text-center text-muted-foreground">
            Loading moments...
          </p>
        </div>
      </div>
    );
  }

  // Flatten all moments from all pages
  const allMoments = data?.pages.flatMap((page) => page.moments) || [];

  const formattedMoments: PostData[] = allMoments.map((moment) => ({
    id: moment.id,
    author: {
      id: moment.user.id,
      name: moment.user.displayName || moment.user.username,
      username: moment.user.username,
      avatar: moment.user.profileImageUrl || moment.user.avatar,
    },
    image: moment.type === "image" ? moment.mediaUrl : undefined,
    video: moment.type === "video" ? moment.mediaUrl : undefined,
    caption: moment.caption || "",
    savors: moment._count?.savors || 0,
    reflects: moment._count?.reflects || 0,
    timestamp: formatTimestamp(moment.createdAt),
  }));

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <div className="max-w-2xl mx-auto pt-6">
        {formattedMoments.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-12 px-4"
            data-testid="empty-flow"
          >
            <p className="text-center text-muted-foreground">
              Your flow is empty. Follow other users to see their moments here.
            </p>
          </div>
        ) : (
          <>
            {formattedMoments.map((moment) => (
              <Post key={moment.id} post={moment} />
            ))}

            {hasNextPage && (
              <div
                ref={loadMoreRef}
                className="flex justify-center py-8"
                data-testid="load-more-trigger"
              >
                {isFetchingNextPage ? (
                  <p className="text-muted-foreground">
                    Loading more moments...
                  </p>
                ) : null}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
