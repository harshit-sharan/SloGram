import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { logout } from "@/lib/authUtils";

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
      </div>
    </div>
  );
}
