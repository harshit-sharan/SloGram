import { LogOut, HeadphonesIcon, Shield, FileText, Trash2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { logout } from "@/lib/authUtils";
import { Link } from "wouter";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleLogout = () => {
    logout();
  };

  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("DELETE", "/api/account");
      if (!response.ok) {
        throw new Error("Failed to delete account");
      }
      return response.json();
    },
    onSuccess: () => {
      setDeleteDialogOpen(false);
      toast({
        title: "Account deleted",
        description: "Your account and all data have been permanently deleted.",
      });
      window.location.href = "/";
    },
    onError: () => {
      toast({
        title: "Failed to delete account",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleDeleteAccount = () => {
    deleteAccountMutation.mutate();
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
            <Link href="/about">
              <Button variant="outline" className="w-full sm:w-auto" data-testid="button-about">
                <Info className="h-4 w-4 mr-2" />
                About Slogram
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card data-testid="card-danger-zone" className="mt-6 border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
            <CardDescription>Irreversible actions that affect your account</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Deleting your account will permanently remove all your data including moments, 
                messages, followers, and saved content. This action cannot be undone.
              </p>
              <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    className="w-full sm:w-auto"
                    data-testid="button-delete-account"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Account
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete your account
                      and remove all your data from our servers, including:
                      <ul className="list-disc list-inside mt-2 space-y-1">
                        <li>All your moments and media</li>
                        <li>Your messages and conversations</li>
                        <li>Your followers and following lists</li>
                        <li>Your saved moments and preferences</li>
                      </ul>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel 
                      disabled={deleteAccountMutation.isPending}
                      data-testid="button-cancel-delete"
                    >
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteAccount}
                      disabled={deleteAccountMutation.isPending}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      data-testid="button-confirm-delete"
                    >
                      {deleteAccountMutation.isPending ? "Deleting..." : "Delete Account"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
