import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "wouter";

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AuthDialog({ open, onOpenChange }: AuthDialogProps) {
  const { toast } = useToast();
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupFirstName, setSignupFirstName] = useState("");
  const [signupLastName, setSignupLastName] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);

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
      acceptedTerms: boolean;
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
    if (!acceptedTerms) {
      toast({
        title: "Terms Required",
        description: "Please accept the Terms of Service and Privacy Policy to continue.",
        variant: "destructive",
      });
      return;
    }
    signupMutation.mutate({
      email: signupEmail,
      password: signupPassword,
      firstName: signupFirstName || undefined,
      lastName: signupLastName || undefined,
      acceptedTerms: true,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-lg"
        data-testid="dialog-auth"
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
              <div className="flex items-start space-x-3 py-2">
                <Checkbox
                  id="accept-terms"
                  checked={acceptedTerms}
                  onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
                  data-testid="checkbox-accept-terms"
                />
                <label
                  htmlFor="accept-terms"
                  className="text-sm text-muted-foreground leading-tight cursor-pointer"
                >
                  I agree to the{" "}
                  <Link href="/terms" className="text-primary underline hover:text-primary/80">
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link href="/privacy" className="text-primary underline hover:text-primary/80">
                    Privacy Policy
                  </Link>
                </label>
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={signupMutation.isPending || !acceptedTerms}
                data-testid="button-signup-submit"
              >
                {signupMutation.isPending ? "Creating account..." : "Sign Up"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
