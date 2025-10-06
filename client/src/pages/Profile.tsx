import { Settings, Grid3x3, MessageCircle, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
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
import { useState, useRef } from "react";

interface User {
  id: string;
  email?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  profileImageUrl?: string;
  bio?: string;
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
      bio: user.bio ?? "",
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
              name="bio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bio</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      value={field.value ?? ""}
                      placeholder="Tell us about yourself"
                      rows={4}
                      data-testid="textarea-bio"
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
  const [, params] = useRoute("/profile/:userId");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const userId = params?.userId || "";
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isOwnProfile = userId === currentUser?.id;

  const { data: user, isLoading: userLoading } = useQuery<User>({
    queryKey: ["/api/users", userId],
    enabled: !!userId,
  });

  const { data: posts = [], isLoading: postsLoading } = useQuery<Post[]>({
    queryKey: ["/api/posts/user", userId],
    enabled: !!userId,
  });

  const { data: followData, isLoading: followLoading } = useQuery<{ following: boolean }>({
    queryKey: ["/api/users", userId, "is-following"],
    enabled: !!userId && !isOwnProfile,
  });

  const { data: followers = [] } = useQuery<User[]>({
    queryKey: ["/api/users", userId, "followers"],
    enabled: !!userId,
  });

  const { data: following = [] } = useQuery<User[]>({
    queryKey: ["/api/users", userId, "following"],
    enabled: !!userId,
  });

  const followMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/users/${userId}/follow`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users", userId, "is-following"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users", userId, "followers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users", userId, "following"] });
    },
  });

  const messageMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/conversations`, {
        otherUserId: userId,
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations-with-details", currentUser?.id] });
      setLocation(`/messages?conversation=${data.id}`);
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
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("profilePicture", file);
      
      const response = await fetch(`/api/users/${userId}/profile-picture`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to upload profile picture");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users", userId] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Profile picture updated",
        description: "Your profile picture has been updated successfully",
      });
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update profile picture",
        description: error.message,
        variant: "destructive",
      });
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
  });

  const isFollowing = followData?.following || false;

  const handleFollowClick = () => {
    followMutation.mutate();
  };

  const handleMessageClick = () => {
    messageMutation.mutate();
  };

  const handleAvatarClick = () => {
    if (isOwnProfile) {
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        toast({
          title: "Invalid file type",
          description: "Please select an image file",
          variant: "destructive",
        });
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select an image smaller than 5MB",
          variant: "destructive",
        });
        return;
      }
      
      uploadProfilePictureMutation.mutate(file);
    }
  };

  if (userLoading || postsLoading) {
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
              className={`h-32 w-32 ${isOwnProfile ? 'cursor-pointer' : ''}`}
              onClick={handleAvatarClick}
              data-testid="img-avatar-profile"
            >
              <AvatarImage src={user.profileImageUrl || user.avatar} />
              <AvatarFallback>
                {user.firstName?.charAt(0) || user.displayName?.charAt(0) || user.username?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
            {isOwnProfile && (
              <div 
                className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                onClick={handleAvatarClick}
                data-testid="overlay-change-picture"
              >
                <Camera className="h-8 w-8 text-white" />
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
              data-testid="input-profile-picture"
            />
          </div>

          <div className="flex-1 text-center md:text-left">
            <div className="flex flex-col md:flex-row items-center gap-4 mb-4">
              <h1 className="font-serif text-2xl" data-testid="text-username">
                {user.username || user.email}
              </h1>
              {isOwnProfile ? (
                <div className="flex gap-2">
                  <EditProfileDialog user={user} />
                  <Button variant="ghost" size="icon" asChild data-testid="button-settings">
                    <Link href="/settings">
                      <Settings className="h-5 w-5" />
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
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
                    onClick={handleMessageClick}
                    disabled={messageMutation.isPending}
                    data-testid="button-message"
                  >
                    <MessageCircle className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            <div className="flex gap-8 justify-center md:justify-start mb-4">
              <div data-testid="text-posts-count">
                <span className="font-semibold">{posts.length}</span> posts
              </div>
              <div data-testid="text-followers-count">
                <span className="font-semibold">{followers.length}</span> followers
              </div>
              <div data-testid="text-following-count">
                <span className="font-semibold">{following.length}</span> following
              </div>
            </div>

            <div>
              <p className="font-semibold mb-1" data-testid="text-display-name">
                {user.displayName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email}
              </p>
              {user.bio && (
                <p className="text-muted-foreground max-w-md whitespace-pre-line" data-testid="text-bio">
                  {user.bio}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="border-t">
          <div className="flex items-center justify-center gap-2 py-3 text-sm font-semibold">
            <Grid3x3 className="h-4 w-4" />
            POSTS
          </div>

          {posts.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              No posts yet
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1">
              {posts.map((post, index) => (
                <Link
                  key={post.id}
                  href={`/post/${post.id}`}
                  data-testid={`button-post-${index}`}
                >
                  <div className="aspect-square hover-elevate overflow-hidden cursor-pointer">
                    {post.type === "image" ? (
                      <img
                        src={post.mediaUrl}
                        alt={`Post ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <video
                        src={post.mediaUrl}
                        className="w-full h-full object-cover"
                        muted
                        loop
                        playsInline
                        onMouseEnter={(e) => e.currentTarget.play()}
                        onMouseLeave={(e) => e.currentTarget.pause()}
                      />
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
