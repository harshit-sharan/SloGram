import { Settings, Grid3x3, MessageCircle, Camera, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { VideoThumbnail } from "@/components/VideoThumbnail";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { updateUserProfileSchema, type UpdateUserProfile } from "@shared/schema";
import { useState } from "react";
import { UserListDrawer } from "@/components/UserListDrawer";
import { ObjectUploader } from "@/components/ObjectUploader";
import type { UploadResult } from "@uppy/core";

interface User {
  id: string;
  email?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  profileImageUrl?: string;
  story?: string;
  avatar?: string;
}

interface Post {
  id: string;
  userId: string;
  type: "image" | "video";
  mediaUrl: string;
  caption?: string;
  createdAt: string;
}

function EditProfileDialog({ user }: { user: User }) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<UpdateUserProfile>({
    resolver: zodResolver(updateUserProfileSchema),
    defaultValues: {
      displayName: user.displayName ?? "",
      story: user.story ?? "",
      username: user.username ?? "",
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: UpdateUserProfile) => {
      const response = await apiRequest("PATCH", `/api/users/${user.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users", user.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully",
      });
      setOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update profile",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: UpdateUserProfile) => {
    updateProfileMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm" data-testid="button-edit-profile">
          Edit Profile
        </Button>
      </DialogTrigger>
      <DialogContent data-testid="dialog-edit-profile">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value ?? ""}
                      placeholder="username"
                      data-testid="input-username"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="displayName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Display Name</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value ?? ""}
                      placeholder="Your display name"
                      data-testid="input-display-name"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="story"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Story</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      value={field.value ?? ""}
                      placeholder="Share your story"
                      rows={4}
                      data-testid="textarea-story"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateProfileMutation.isPending}
                data-testid="button-save"
              >
                {updateProfileMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function Profile() {
  const { user: currentUser } = useAuth();
  const [, params] = useRoute("/space/:userId");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const userIdOrUsername = params?.userId || "";
  const [drawerType, setDrawerType] = useState<"followers" | "following" | null>(null);

  const { data: user, isLoading: userLoading } = useQuery<User>({
    queryKey: ["/api/users", userIdOrUsername],
    enabled: !!userIdOrUsername,
  });

  const isOwnProfile = user?.id === currentUser?.id;

  const { data: moments = [], isLoading: momentsLoading } = useQuery<Post[]>({
    queryKey: ["/api/moments/user", user?.id],
    enabled: !!user?.id,
  });

  const { data: followData, isLoading: followLoading } = useQuery<{ following: boolean }>({
    queryKey: ["/api/users", user?.id, "is-following"],
    enabled: !!user?.id && !isOwnProfile,
  });

  const { data: followers = [] } = useQuery<User[]>({
    queryKey: ["/api/users", user?.id, "followers"],
    enabled: !!user?.id,
  });

  const { data: following = [] } = useQuery<User[]>({
    queryKey: ["/api/users", user?.id, "following"],
    enabled: !!user?.id,
  });

  const followMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("User not found");
      return await apiRequest("POST", `/api/users/${user.id}/follow`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users", user?.id, "is-following"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users", user?.id, "followers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users", user?.id, "following"] });
    },
  });

  const conversationMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("User not found");
      const response = await apiRequest("POST", `/api/conversations`, {
        otherUserId: user.id,
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations-with-details", currentUser?.id] });
      setLocation(`/conversations?conversation=${data.id}`);
    },
    onError: () => {
      toast({
        title: "Failed to start conversation",
        description: "Please try again",
        variant: "destructive",
      });
    },
  });

  const uploadProfilePictureMutation = useMutation({
    mutationFn: async (profileImageURL: string) => {
      const response = await apiRequest("PUT", `/api/profile-images`, {
        profileImageURL,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users", userIdOrUsername] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Profile picture updated",
        description: "Your profile picture has been updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update profile picture",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleShareProfile = async () => {
    if (!user?.username && !user?.id) {
      toast({
        title: "Unable to share profile",
        description: "User profile information is not available",
        variant: "destructive",
      });
      return;
    }
    
    // Prefer username, fallback to user ID
    const profileIdentifier = user.username || user.id;
    const profileUrl = `${window.location.origin}/space/${profileIdentifier}`;
    
    // Try to use native share on mobile devices
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${user.displayName || user.username || 'User'}'s profile`,
          text: user.story || `Check out ${user.displayName || user.username || 'this user'}'s profile on Slogram`,
          url: profileUrl,
        });
      } catch (error: any) {
        // User cancelled the share or it failed
        // Only show error if it's not a user cancellation
        if (error.name !== "AbortError") {
          toast({
            title: "Failed to share",
            description: "Could not open share options",
            variant: "destructive",
          });
        }
      }
    }
  };

  const isFollowing = followData?.following || false;

  const handleFollowClick = () => {
    followMutation.mutate();
  };

  const handleConversationClick = () => {
    conversationMutation.mutate();
  };

  const handleGetUploadParameters = async () => {
    const response = await apiRequest("POST", "/api/objects/upload", {});
    const data = await response.json();
    return {
      method: "PUT" as const,
      url: data.uploadURL,
    };
  };

  const handleUploadComplete = (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    if (result.successful && result.successful.length > 0) {
      const uploadURL = result.successful[0].uploadURL;
      if (uploadURL) {
        uploadProfilePictureMutation.mutate(uploadURL);
      }
    }
  };

  if (userLoading || momentsLoading) {
    return (
      <div className="min-h-screen bg-background pb-20 md:pb-0">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <p className="text-center text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background pb-20 md:pb-0">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <p className="text-center text-muted-foreground">User not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row gap-8 md:gap-12 items-center md:items-start mb-8">
          <div className="relative group">
            <Avatar 
              className="h-32 w-32"
              data-testid="img-avatar-profile"
            >
              <AvatarImage src={user.profileImageUrl || user.avatar} />
              <AvatarFallback>
                {user.firstName?.charAt(0) || user.displayName?.charAt(0) || user.username?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
            {isOwnProfile && (
              <div className="absolute inset-0 rounded-full flex items-center justify-center">
                <ObjectUploader
                  maxNumberOfFiles={1}
                  maxFileSize={5 * 1024 * 1024}
                  onGetUploadParameters={handleGetUploadParameters}
                  onComplete={handleUploadComplete}
                  buttonClassName="w-full h-full rounded-full bg-black/50 hover:bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Camera className="h-8 w-8 text-white" />
                </ObjectUploader>
              </div>
            )}
          </div>

          <div className="flex-1 text-center md:text-left">
            <div className="flex flex-col md:flex-row items-center gap-4 mb-4">
              <h1 className="font-serif text-2xl" data-testid="text-username">
                {user.username || user.email}
              </h1>
              <div className="flex gap-2">
                {isOwnProfile ? (
                  <>
                    <EditProfileDialog user={user} />
                    <Button variant="ghost" size="icon" asChild data-testid="button-settings">
                      <Link href="/settings">
                        <Settings className="h-5 w-5" />
                      </Link>
                    </Button>
                  </>
                ) : (
                  <>
                    {!followLoading && (
                      <Button
                        variant={isFollowing ? "secondary" : "default"}
                        size="sm"
                        onClick={handleFollowClick}
                        disabled={followMutation.isPending}
                        data-testid="button-follow"
                      >
                        {followMutation.isPending ? "..." : isFollowing ? "Following" : "Follow"}
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleConversationClick}
                      disabled={conversationMutation.isPending}
                      data-testid="button-conversation"
                    >
                      <MessageCircle className="h-4 w-4" />
                    </Button>
                  </>
                )}
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={handleShareProfile}
                  data-testid="button-share-profile"
                >
                  <Share2 className="h-5 w-5" />
                </Button>
              </div>
            </div>

            <div className="flex gap-8 justify-center md:justify-start mb-4">
              <div data-testid="text-moments-count">
                <span className="font-semibold">{moments.length}</span> moments
              </div>
              <button
                onClick={() => setDrawerType("followers")}
                className="hover:opacity-70 transition-opacity"
                data-testid="button-show-followers"
              >
                <div data-testid="text-followers-count">
                  <span className="font-semibold">{followers.length}</span> followers
                </div>
              </button>
              <button
                onClick={() => setDrawerType("following")}
                className="hover:opacity-70 transition-opacity"
                data-testid="button-show-following"
              >
                <div data-testid="text-following-count">
                  <span className="font-semibold">{following.length}</span> following
                </div>
              </button>
            </div>

            <div>
              <p className="font-semibold mb-1" data-testid="text-display-name">
                {user.displayName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email}
              </p>
              {user.story && (
                <p className="text-muted-foreground max-w-md whitespace-pre-line" data-testid="text-story">
                  {user.story}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="border-t">
          <div className="flex items-center justify-center gap-2 py-3 text-sm font-semibold">
            <Grid3x3 className="h-4 w-4" />
            MOMENTS
          </div>

          {moments.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              No moments yet
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1">
              {moments.map((moment, index) => (
                <Link
                  key={moment.id}
                  href={`/moment/${moment.id}`}
                  data-testid={`button-moment-${index}`}
                >
                  <div className="aspect-square hover-elevate overflow-hidden cursor-pointer">
                    {moment.type === "image" ? (
                      <img
                        src={moment.mediaUrl}
                        alt={`Moment ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <VideoThumbnail
                        src={moment.mediaUrl}
                        className="w-full h-full"
                      />
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <UserListDrawer
        open={drawerType === "followers"}
        onOpenChange={(open) => !open && setDrawerType(null)}
        title="Followers"
        users={followers}
        type="followers"
        sourceUserId={user?.id || ""}
      />

      <UserListDrawer
        open={drawerType === "following"}
        onOpenChange={(open) => !open && setDrawerType(null)}
        title="Following"
        users={following}
        type="following"
        sourceUserId={user?.id || ""}
      />
    </div>
  );
}
