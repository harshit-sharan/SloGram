import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Link } from "wouter";

interface User {
  id: string;
  username?: string;
  displayName?: string;
  avatar?: string;
  profileImageUrl?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  isFollowing?: boolean;
}

interface UserListDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  users: User[];
  type: "followers" | "following" | "savorers";
  sourceUserId?: string;
  postId?: string;
}

export function UserListDrawer({
  open,
  onOpenChange,
  title,
  users,
  type,
  sourceUserId,
  postId,
}: UserListDrawerProps) {
  const { user: currentUser } = useAuth();
  const [followingStates, setFollowingStates] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!open) {
      setFollowingStates({});
    }
  }, [open]);

  const getIsFollowing = (user: User) => {
    if (followingStates[user.id] !== undefined) {
      return followingStates[user.id];
    }
    return user.isFollowing || false;
  };

  const followMutation = useMutation({
    mutationFn: async (userId: string) => {
      return apiRequest("POST", `/api/users/${userId}/follow`, {});
    },
    onMutate: async (userId: string) => {
      const user = users.find(u => u.id === userId);
      const currentState = user ? getIsFollowing(user) : false;
      setFollowingStates((prev) => ({ ...prev, [userId]: !currentState }));
    },
    onSuccess: (_, userId) => {
      queryClient.invalidateQueries({
        queryKey: ["/api/users", userId, "is-following", currentUser?.id],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/users", currentUser?.id, "following"],
      });
      if (sourceUserId) {
        queryClient.invalidateQueries({
          queryKey: ["/api/users", sourceUserId, "followers"],
        });
        queryClient.invalidateQueries({
          queryKey: ["/api/users", sourceUserId, "following"],
        });
      }
      if (postId) {
        queryClient.invalidateQueries({
          queryKey: ["/api/posts", postId, "savorers"],
        });
      }
    },
    onError: (_, userId) => {
      const user = users.find(u => u.id === userId);
      const currentState = user ? getIsFollowing(user) : false;
      setFollowingStates((prev) => ({ ...prev, [userId]: !currentState }));
      queryClient.invalidateQueries({
        queryKey: ["/api/users", currentUser?.id, "following"],
      });
      if (sourceUserId) {
        queryClient.invalidateQueries({
          queryKey: ["/api/users", sourceUserId, "followers"],
        });
        queryClient.invalidateQueries({
          queryKey: ["/api/users", sourceUserId, "following"],
        });
      }
      if (postId) {
        queryClient.invalidateQueries({
          queryKey: ["/api/posts", postId, "savorers"],
        });
      }
    },
  });

  const handleFollow = (userId: string) => {
    followMutation.mutate(userId);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[80vh]" data-testid={`drawer-${type}`}>
        <DrawerHeader>
          <DrawerTitle data-testid={`drawer-title-${type}`}>{title}</DrawerTitle>
        </DrawerHeader>
        <ScrollArea className="flex-1 px-4 pb-4">
          {users.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground" data-testid="text-no-users">
              No users to show
            </div>
          ) : (
            <div className="space-y-3">
              {users.map((user) => {
                const isCurrentUser = user.id === currentUser?.id;
                const isFollowing = getIsFollowing(user);

                return (
                  <div
                    key={user.id}
                    className="flex items-center justify-between gap-3"
                    data-testid={`user-item-${user.id}`}
                  >
                    <Link
                      href={`/profile/${user.id}`}
                      className="flex items-center gap-3 flex-1 min-w-0"
                      onClick={() => onOpenChange(false)}
                    >
                      <Avatar className="h-10 w-10 flex-shrink-0">
                        <AvatarImage
                          src={user.profileImageUrl || user.avatar}
                          alt={user.displayName || user.email || 'User'}
                        />
                        <AvatarFallback>
                          {(user.displayName || user.email || 'U').slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold truncate">
                          {user.displayName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'User'}
                        </div>
                        <div className="text-sm text-muted-foreground truncate">
                          @{user.username || user.id}
                        </div>
                      </div>
                    </Link>
                    {!isCurrentUser && (
                      <Button
                        size="sm"
                        variant={isFollowing ? "outline" : "default"}
                        onClick={() => handleFollow(user.id)}
                        disabled={followMutation.isPending}
                        data-testid={`button-follow-${user.id}`}
                      >
                        {isFollowing ? "Following" : "Follow"}
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DrawerContent>
    </Drawer>
  );
}
