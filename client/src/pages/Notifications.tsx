import { useQuery, useMutation } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle, UserPlus } from "lucide-react";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";

interface NotificationData {
  id: string;
  userId: string;
  type: "savor" | "comment" | "follow";
  actorId: string;
  postId: string | null;
  read: boolean;
  createdAt: string;
  actor: {
    id: string;
    username: string;
    displayName: string | null;
    avatar: string | null;
  };
  post?: {
    id: string;
    userId: string;
    type: "image" | "video";
    mediaUrl: string;
    caption: string | null;
    createdAt: string;
  };
}

export default function Notifications() {
  const { user } = useAuth();

  const { data: notifications = [], isLoading } = useQuery<NotificationData[]>({
    queryKey: ["/api/notifications", user?.id],
    enabled: !!user,
    refetchOnMount: true,
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      return apiRequest("POST", `/api/notifications/${notificationId}/read`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/notifications", user?.id],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/notifications", user?.id, "unread-count"],
      });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/notifications/${user?.id}/read-all`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/notifications", user?.id],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/notifications", user?.id, "unread-count"],
      });
    },
  });

  const handleNotificationClick = (notificationId: string) => {
    if (!notifications.find(n => n.id === notificationId)?.read) {
      markAsReadMutation.mutate(notificationId);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="sticky top-16 z-40 bg-background border-b">
        <div className="px-4 py-4 flex items-center justify-between">
          <h1 className="font-serif text-2xl text-foreground">Notifications</h1>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAllAsReadMutation.mutate()}
              data-testid="button-mark-all-read"
            >
              Mark all as read
            </Button>
          )}
        </div>
      </div>

      <div className="divide-y">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">
            Loading notifications...
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            No notifications yet
          </div>
        ) : (
          notifications.map((notification) => {
            const isFollowNotification = notification.type === "follow";
            const linkHref = isFollowNotification 
              ? `/profile/${notification.actorId}` 
              : `/post/${notification.postId}`;
            
            return (
              <Link
                key={notification.id}
                href={linkHref}
                onClick={() => handleNotificationClick(notification.id)}
              >
                <div
                  className={`px-4 py-4 flex items-start gap-3 hover-elevate cursor-pointer ${
                    !notification.read ? "bg-accent/20" : ""
                  }`}
                  data-testid={`notification-${notification.id}`}
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={notification.actor.avatar || undefined} />
                    <AvatarFallback>
                      {(notification.actor.displayName || notification.actor.username).charAt(0)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      <span className="font-semibold">
                        {notification.actor.displayName || notification.actor.username}
                      </span>
                      {notification.type === "savor" 
                        ? " savored your post" 
                        : notification.type === "comment"
                        ? " commented on your post"
                        : " started following you"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {notification.type === "savor" ? (
                      <Heart className="h-5 w-5 fill-current text-destructive" />
                    ) : notification.type === "comment" ? (
                      <MessageCircle className="h-5 w-5 text-primary" />
                    ) : (
                      <UserPlus className="h-5 w-5 text-primary" />
                    )}
                    {notification.post && (
                      <>
                        {notification.post.type === "image" ? (
                          <img
                            src={notification.post.mediaUrl}
                            alt="Post"
                            className="h-12 w-12 object-cover rounded"
                          />
                        ) : (
                          <video
                            src={notification.post.mediaUrl}
                            className="h-12 w-12 object-cover rounded"
                            muted
                          />
                        )}
                      </>
                    )}
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
