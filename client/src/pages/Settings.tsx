import { LogOut, HeadphonesIcon, Shield, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { logout } from "@/lib/authUtils";
import { Link } from "wouter";

export default function Settings() {
  const { user } = useAuth();

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="font-serif text-3xl mb-8" data-testid="text-settings-title">Settings</h1>

        <Card data-testid="card-account">
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>Manage your account settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Signed in as</p>
                <p className="text-sm text-muted-foreground" data-testid="text-user-email">
                  {user?.email || user?.username}
                </p>
              </div>
            </div>

            <div className="pt-4 border-t">
              <Button
                variant="destructive"
                onClick={handleLogout}
                data-testid="button-logout"
                className="w-full sm:w-auto"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Log Out
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-help" className="mt-6">
          <CardHeader>
            <CardTitle>Help & Support</CardTitle>
            <CardDescription>Get assistance with your account or report an issue</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Link href="/support">
              <Button variant="outline" className="w-full sm:w-auto" data-testid="button-contact-support">
                <HeadphonesIcon className="h-4 w-4 mr-2" />
                Contact Support
              </Button>
            </Link>
            <Link href="/privacy">
              <Button variant="outline" className="w-full sm:w-auto" data-testid="button-privacy-policy">
                <Shield className="h-4 w-4 mr-2" />
                Privacy Policy
              </Button>
            </Link>
            <Link href="/terms">
              <Button variant="outline" className="w-full sm:w-auto" data-testid="button-terms-of-service">
                <FileText className="h-4 w-4 mr-2" />
                Terms of Service
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
