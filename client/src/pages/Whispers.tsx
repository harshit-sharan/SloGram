import { useQuery, useMutation } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle, UserPlus } from "lucide-react";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";

interface WhisperData {
  id: string;
  userId: string;
  type: "savor" | "reflect" | "follow";
  actorId: string;
  momentId: string | null;
  read: boolean;
  createdAt: string;
  actor: {
    id: string;
    username: string;
    displayName: string | null;
    avatar: string | null;
  };
  moment?: {
    id: string;
    userId: string;
    type: "image" | "video";
    mediaUrl: string;
    caption: string | null;
    createdAt: string;
  };
}

export default function Whispers() {
  const { user } = useAuth();

  const { data: whispers = [], isLoading } = useQuery<WhisperData[]>({
    queryKey: ["/api/whispers", user?.id],
    enabled: !!user,
    refetchOnMount: true,
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (whisperId: string) => {
      return apiRequest("POST", `/api/whispers/${whisperId}/read`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/whispers", user?.id],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/whispers", user?.id, "unread-count"],
      });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/whispers/${user?.id}/read-all`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/whispers", user?.id],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/whispers", user?.id, "unread-count"],
      });
    },
  });

  const handleWhisperClick = (whisperId: string) => {
    if (!whispers.find(n => n.id === whisperId)?.read) {
      markAsReadMutation.mutate(whisperId);
    }
  };

  // Track if we've already marked whispers as read to avoid repeated calls
  const hasMarkedAsRead = useRef(false);

  // Automatically mark all unread whispers as read when page is first viewed
  useEffect(() => {
    if (!hasMarkedAsRead.current && whispers.length > 0 && user) {
      const unreadWhispers = whispers.filter(n => !n.read);
      if (unreadWhispers.length > 0) {
        hasMarkedAsRead.current = true;
        markAllAsReadMutation.mutate();
      }
    }
  }, [whispers, user]);

  const unreadCount = whispers.filter(n => !n.read).length;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="sticky top-16 z-40 bg-background border-b">
        <div className="px-4 py-4 flex items-center justify-between">
          <h1 className="font-serif text-2xl text-foreground">Whispers</h1>
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
            Loading whispers...
          </div>
        ) : whispers.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            No whispers yet
          </div>
        ) : (
          whispers.map((whisper) => {
            const isFollowWhisper = whisper.type === "follow";
            const linkHref = isFollowWhisper 
              ? `/space/${whisper.actorId}` 
              : `/moment/${whisper.momentId}`;
            
            return (
              <Link
                key={whisper.id}
                href={linkHref}
                onClick={() => handleWhisperClick(whisper.id)}
              >
                <div
                  className={`px-4 py-4 flex items-start gap-3 hover-elevate cursor-pointer ${
                    !whisper.read ? "bg-accent/20" : ""
                  }`}
                  data-testid={`whisper-${whisper.id}`}
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={whisper.actor.avatar || undefined} />
                    <AvatarFallback>
                      {(whisper.actor.displayName || whisper.actor.username).charAt(0)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      <span className="font-semibold">
                        {whisper.actor.displayName || whisper.actor.username}
                      </span>
                      {whisper.type === "savor" 
                        ? " savored your moment" 
                        : whisper.type === "reflect"
                        ? " reflected on your moment"
                        : " started following you"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(whisper.createdAt), { addSuffix: true })}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {whisper.type === "savor" ? (
                      <Heart className="h-5 w-5 fill-current text-destructive" />
                    ) : whisper.type === "reflect" ? (
                      <MessageCircle className="h-5 w-5 text-primary" />
                    ) : (
                      <UserPlus className="h-5 w-5 text-primary" />
                    )}
                    {whisper.moment && (
                      <>
                        {whisper.moment.type === "image" ? (
                          <img
                            src={whisper.moment.mediaUrl}
                            alt="Moment"
                            className="h-12 w-12 object-cover rounded"
                          />
                        ) : (
                          <video
                            src={whisper.moment.mediaUrl}
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
