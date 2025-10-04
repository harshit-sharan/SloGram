import { Settings, Grid3x3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";

interface User {
  id: string;
  username: string;
  displayName: string;
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
  const [, params] = useRoute("/profile/:userId");
  const userId = params?.userId || "";

  const { data: user, isLoading: userLoading } = useQuery<User>({
    queryKey: ["/api/users", userId],
    enabled: !!userId,
  });

  const { data: posts = [], isLoading: postsLoading } = useQuery<Post[]>({
    queryKey: ["/api/posts/user", userId],
    enabled: !!userId,
  });

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

  const currentUserId = "ca1a588a-2f07-4b75-ad8a-2ac21444840e";
  const isOwnProfile = userId === currentUserId;

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row gap-8 md:gap-12 items-center md:items-start mb-8">
          <Avatar className="h-32 w-32" data-testid="img-avatar-profile">
            <AvatarImage src={user.avatar} />
            <AvatarFallback>{user.displayName.charAt(0)}</AvatarFallback>
          </Avatar>

          <div className="flex-1 text-center md:text-left">
            <div className="flex flex-col md:flex-row items-center gap-4 mb-4">
              <h1 className="font-serif text-2xl" data-testid="text-username">
                {user.username}
              </h1>
              {isOwnProfile && (
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" data-testid="button-edit-profile">
                    Edit Profile
                  </Button>
                  <Button variant="ghost" size="icon" data-testid="button-settings">
                    <Settings className="h-5 w-5" />
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
                {user.displayName}
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
                <button
                  key={post.id}
                  className="aspect-square hover-elevate overflow-hidden"
                  onClick={() => console.log(`View post ${post.id}`)}
                  data-testid={`button-post-${index}`}
                >
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
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
