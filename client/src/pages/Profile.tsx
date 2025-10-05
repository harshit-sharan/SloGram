import { Settings, Grid3x3, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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

export default function Profile() {
  const { user: currentUser } = useAuth();
  const [, params] = useRoute("/profile/:userId");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const userId = params?.userId || "";

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

  const followMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/users/${userId}/follow`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users", userId, "is-following"] });
    },
  });

  const messageMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/conversations`, {
        otherUserId: userId,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations-with-details", currentUser?.id] });
      setLocation("/messages");
    },
    onError: () => {
      toast({
        title: "Failed to start conversation",
        description: "Please try again",
        variant: "destructive",
      });
    },
  });

  const isFollowing = followData?.following || false;

  const handleFollowClick = () => {
    followMutation.mutate();
  };

  const handleMessageClick = () => {
    messageMutation.mutate();
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
          <Avatar className="h-32 w-32" data-testid="img-avatar-profile">
            <AvatarImage src={user.profileImageUrl || user.avatar} />
            <AvatarFallback>
              {user.firstName?.charAt(0) || user.displayName?.charAt(0) || user.username?.charAt(0) || "U"}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 text-center md:text-left">
            <div className="flex flex-col md:flex-row items-center gap-4 mb-4">
              <h1 className="font-serif text-2xl" data-testid="text-username">
                {user.username || user.email}
              </h1>
              {isOwnProfile ? (
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" data-testid="button-edit-profile">
                    Edit Profile
                  </Button>
                  <Button variant="ghost" size="icon" data-testid="button-settings">
                    <Settings className="h-5 w-5" />
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Button
                    variant={isFollowing ? "secondary" : "default"}
                    size="sm"
                    onClick={handleFollowClick}
                    disabled={followMutation.isPending || followLoading}
                    data-testid="button-follow"
                  >
                    {followMutation.isPending ? "..." : isFollowing ? "Following" : "Follow"}
                  </Button>
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
                <span className="font-semibold">0</span> followers
              </div>
              <div data-testid="text-following-count">
                <span className="font-semibold">0</span> following
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
