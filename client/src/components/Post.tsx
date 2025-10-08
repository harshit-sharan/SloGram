import { useState, useEffect, useRef } from "react";
import { Heart, MessageCircle, Share2, Bookmark, MoreVertical, Trash2, Play, Pause, Volume2, VolumeX } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { UserListDrawer } from "@/components/UserListDrawer";

interface ReflectWithUser {
  id: string;
  userId: string;
  momentId: string;
  text: string;
  createdAt: string;
  user: {
    id: string;
    username: string;
    displayName: string | null;
    avatar: string | null;
  };
}

export interface PostData {
  id: string;
  author: {
    id: string;
    name: string;
    username: string;
    avatar?: string;
  };
  image?: string;
  video?: string;
  caption: string;
  savors: number;
  reflects: number;
  timestamp: string;
}

export function Post({ post }: { post: PostData }) {
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const [kept, setKept] = useState(false);
  const [showFullCaption, setShowFullCaption] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [following, setFollowing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showSavorersDrawer, setShowSavorersDrawer] = useState(false);
  const { toast } = useToast();
  
  // Video controls state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(true);
  
  const isOwnPost = user?.id === post.author.id;

  // Intersection Observer for auto-play videos when visible
  useEffect(() => {
    if (!post.video || !videoRef.current || !videoContainerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            videoRef.current?.play().then(() => {
              setIsPlaying(true);
            }).catch(() => {
              // Auto-play failed, likely due to browser policy
            });
          } else {
            videoRef.current?.pause();
            setIsPlaying(false);
          }
        });
      },
      { threshold: 0.5 }
    );

    observer.observe(videoContainerRef.current);

    return () => observer.disconnect();
  }, [post.video]);

  // Fetch initial savor status
  const { data: savorData } = useQuery<{ savored: boolean }>({
    queryKey: ["/api/moments", post.id, "savored", user?.id],
    queryFn: async () => {
      const response = await fetch(`/api/moments/${post.id}/savored?userId=${user?.id}`);
      if (!response.ok) throw new Error("Failed to fetch savor status");
      return response.json();
    },
    enabled: !!user,
    staleTime: 0, // Always fetch fresh savor status
    refetchOnMount: true,
  });

  const [savored, setSavored] = useState(false);
  const [savorCount, setSavorCount] = useState(post.savors);

  // Update local state when query data is available
  useEffect(() => {
    if (savorData !== undefined) {
      setSavored(savorData.savored);
    }
  }, [savorData]);

  // Update savor count when post data changes
  useEffect(() => {
    setSavorCount(post.savors);
  }, [post.savors]);

  // Fetch initial keep status
  const { data: keepData } = useQuery<{ kept: boolean }>({
    queryKey: ["/api/moments", post.id, "kept", user?.id],
    queryFn: async () => {
      const response = await fetch(`/api/moments/${post.id}/kept?userId=${user?.id}`);
      if (!response.ok) throw new Error("Failed to fetch keep status");
      return response.json();
    },
    enabled: !!user,
    staleTime: 0, // Always fetch fresh keep status
    refetchOnMount: true,
  });

  // Update local state when keep query data is available
  useEffect(() => {
    if (keepData !== undefined) {
      setKept(keepData.kept);
    }
  }, [keepData]);

  // Fetch follow status
  const { data: followData, isLoading: followLoading } = useQuery<{ following: boolean }>({
    queryKey: ["/api/users", post.author.id, "is-following", user?.id],
    queryFn: async () => {
      const response = await fetch(`/api/users/${post.author.id}/is-following`);
      if (!response.ok) throw new Error("Failed to fetch follow status");
      return response.json();
    },
    enabled: !!user && !isOwnPost,
    staleTime: 0,
    refetchOnMount: true,
  });

  // Update local state when follow query data is available
  useEffect(() => {
    if (followData !== undefined) {
      setFollowing(followData.following);
    }
  }, [followData]);

  // Fetch reflects
  const { data: reflects = [] } = useQuery<ReflectWithUser[]>({
    queryKey: ["/api/moments", post.id, "reflects"],
    queryFn: async () => {
      const response = await fetch(`/api/moments/${post.id}/reflects`);
      if (!response.ok) throw new Error("Failed to fetch reflects");
      return response.json();
    },
    enabled: showComments,
  });

  // Fetch users who savored the moment
  const { data: savorers = [] } = useQuery<any[]>({
    queryKey: ["/api/moments", post.id, "savorers"],
    queryFn: async () => {
      const response = await fetch(`/api/moments/${post.id}/savorers`);
      if (!response.ok) throw new Error("Failed to fetch savorers");
      return response.json();
    },
    enabled: showSavorersDrawer,
  });

  // Mutation to toggle savor
  const savorMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/moments/${post.id}/savor`, { userId: user?.id });
    },
    onMutate: async () => {
      // Optimistically update the UI
      const newSavoredState = !savored;
      setSavored(newSavoredState);
      // Update savor count optimistically
      setSavorCount(prev => newSavoredState ? prev + 1 : prev - 1);
    },
    onSuccess: () => {
      // Invalidate and refetch savor status
      queryClient.invalidateQueries({
        queryKey: ["/api/moments", post.id, "savored", user?.id],
      });
    },
    onError: () => {
      // Revert on error
      setSavored(savored);
      setSavorCount(post.savors);
    },
  });

  const handleSavor = () => {
    savorMutation.mutate();
  };

  // Mutation to toggle keep
  const keepMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/moments/${post.id}/keep`, { userId: user?.id });
    },
    onMutate: async () => {
      // Optimistically update the UI
      setKept(!kept);
    },
    onSuccess: () => {
      // Invalidate and refetch keep status
      queryClient.invalidateQueries({
        queryKey: ["/api/moments", post.id, "kept", user?.id],
      });
    },
    onError: () => {
      // Revert on error
      setKept(kept);
    },
  });

  const handleKeep = () => {
    keepMutation.mutate();
  };

  // Mutation to submit reflect
  const reflectMutation = useMutation({
    mutationFn: async (text: string) => {
      return apiRequest("POST", `/api/moments/${post.id}/reflects`, {
        userId: user?.id,
        text,
      });
    },
    onSuccess: () => {
      setCommentText("");
      queryClient.invalidateQueries({
        queryKey: ["/api/moments", post.id, "reflects"],
      });
    },
    onError: (error: any) => {
      toast({
        title: "Reflect failed",
        description: error.message || "Your reflection could not be posted. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (commentText.trim()) {
      reflectMutation.mutate(commentText);
    }
  };

  // Mutation to toggle follow
  const followMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/users/${post.author.id}/follow`, {});
    },
    onMutate: async () => {
      setFollowing(!following);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/users", post.author.id, "is-following", user?.id],
      });
    },
    onError: () => {
      setFollowing(following);
      toast({
        title: "Failed to update follow status",
        description: "Please try again",
        variant: "destructive",
      });
    },
  });

  const handleFollow = () => {
    followMutation.mutate();
  };

  // Mutation to delete moment
  const deleteMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", `/api/moments/${post.id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/moments-with-authors"] });
      queryClient.invalidateQueries({ queryKey: ["/api/moments/user", post.author.id] });
      toast({
        title: "Moment deleted",
        description: "Your moment has been deleted successfully",
      });
      setShowDeleteDialog(false);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete moment",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const handleDelete = () => {
    deleteMutation.mutate();
  };

  const handleShare = async () => {
    const momentUrl = `${window.location.origin}/moment/${post.id}`;
    
    // Try to use native share on mobile devices
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${post.author.name}'s moment`,
          text: post.caption || "Check out this moment on Slogram",
          url: momentUrl,
        });
      } catch (error: any) {
        // User cancelled the share or it failed
        // Only show error if it's not a user cancellation
        if (error.name !== 'AbortError') {
          toast({
            title: "Failed to share",
            description: "Could not open share options",
            variant: "destructive",
          });
        }
      }
    } else {
      // Fallback to clipboard for desktop
      try {
        await navigator.clipboard.writeText(momentUrl);
        toast({
          title: "Link copied!",
          description: "Moment link has been copied to your clipboard",
        });
      } catch (error) {
        toast({
          title: "Failed to copy",
          description: "Could not copy link to clipboard",
          variant: "destructive",
        });
      }
    }
  };

  // Video control handlers
  const togglePlay = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
      setVolume(newVolume);
      if (newVolume > 0) {
        setIsMuted(false);
        videoRef.current.muted = false;
      }
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const captionPreview = post.caption.length > 120 
    ? post.caption.substring(0, 120) + "..."
    : post.caption;

  return (
    <article className="pb-6 border-b last:border-0" data-testid={`post-${post.id}`}>
      <div className="flex items-center gap-3 px-4 py-3">
        <Link href={`/space/${post.author.id}`} data-testid={`link-author-avatar-${post.id}`}>
          <Avatar className="h-10 w-10 cursor-pointer hover-elevate">
            <AvatarImage src={post.author?.avatar} />
            <AvatarFallback>{post.author?.name?.charAt(0) || post.author?.username?.charAt(0) || "U"}</AvatarFallback>
          </Avatar>
        </Link>
        <div className="flex-1">
          <Link href={`/space/${post.author.id}`} data-testid={`link-author-name-${post.id}`}>
            <p className="font-serif font-semibold text-foreground cursor-pointer hover-elevate inline-block rounded px-1">
              {post.author.name}
            </p>
          </Link>
          <p className="text-xs text-muted-foreground" data-testid={`text-timestamp-${post.id}`}>
            {post.timestamp}
          </p>
        </div>
        {!isOwnPost && !followLoading && (
          <Button
            variant={following ? "outline" : "default"}
            size="sm"
            onClick={handleFollow}
            disabled={followMutation.isPending}
            data-testid={`button-follow-${post.id}`}
          >
            {followMutation.isPending ? "..." : following ? "Following" : "Follow"}
          </Button>
        )}
        {isOwnPost && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" data-testid={`button-menu-${post.id}`}>
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => setShowDeleteDialog(true)}
                className="text-destructive focus:text-destructive"
                data-testid={`button-delete-${post.id}`}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Post
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {(post.video || post.image) && (
        <div className="relative w-full bg-muted">
          {post.video ? (
            <Link href={`/moment/${post.id}`} data-testid={`link-post-media-${post.id}`}>
              <div ref={videoContainerRef} className="relative cursor-pointer">
                <video
                  ref={videoRef}
                  src={post.video}
                  muted={isMuted}
                  loop
                  playsInline
                  className="w-full object-cover"
                  data-testid={`video-post-${post.id}`}
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleLoadedMetadata}
                />
                
                <div 
                  className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-white hover:bg-white/20"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        togglePlay(e);
                      }}
                      data-testid={`button-play-pause-${post.id}`}
                    >
                      {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                    </Button>
                    
                    <input
                      type="range"
                      min="0"
                      max={duration || 0}
                      value={currentTime}
                      onChange={handleSeek}
                      className="flex-1 h-1 bg-white/30 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-0"
                      data-testid={`input-seek-${post.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                      }}
                    />
                    
                    <span className="text-white text-xs font-mono min-w-[80px] text-right" data-testid={`text-time-${post.id}`}>
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-white hover:bg-white/20"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        toggleMute(e);
                      }}
                      data-testid={`button-mute-${post.id}`}
                    >
                      {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                    </Button>
                    
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={isMuted ? 0 : volume}
                      onChange={handleVolumeChange}
                      className="w-24 h-1 bg-white/30 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-0"
                      data-testid={`input-volume-${post.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                      }}
                    />
                  </div>
                </div>
              </div>
            </Link>
          ) : post.image ? (
            <Link href={`/moment/${post.id}`} data-testid={`link-post-media-${post.id}`}>
              <img
                src={post.image}
                alt="Post content"
                className="w-full object-cover cursor-pointer"
                data-testid={`img-post-${post.id}`}
              />
            </Link>
          ) : null}
        </div>
      )}

      <div className="px-4">
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSavor}
              data-testid={`button-savor-${post.id}`}
            >
              <Heart className={savored ? "fill-current text-destructive" : ""} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowComments(!showComments)}
              data-testid={`button-reflect-${post.id}`}
            >
              <MessageCircle />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleShare}
              data-testid={`button-share-${post.id}`}
            >
              <Share2 />
            </Button>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleKeep}
            data-testid={`button-keep-${post.id}`}
          >
            <Bookmark className={kept ? "fill-current" : ""} />
          </Button>
        </div>

        <button
          onClick={() => setShowSavorersDrawer(true)}
          className="font-semibold text-sm mb-2 hover:opacity-70 transition-opacity"
          data-testid={`button-show-savorers-${post.id}`}
        >
          <span data-testid={`text-savors-${post.id}`}>
            {savorCount} {savorCount === 1 ? 'savor' : 'savors'}
          </span>
        </button>

        <div className="text-sm">
          <span className="font-serif font-semibold mr-2">{post.author.username}</span>
          <span className="text-foreground" data-testid={`text-caption-${post.id}`}>
            {showFullCaption ? post.caption : captionPreview}
          </span>
          {post.caption.length > 120 && (
            <button
              className="text-muted-foreground ml-1 hover-elevate rounded px-1"
              onClick={() => setShowFullCaption(!showFullCaption)}
              data-testid={`button-toggle-caption-${post.id}`}
            >
              {showFullCaption ? "less" : "more"}
            </button>
          )}
        </div>

        {post.reflects > 0 && !showComments && (
          <button
            className="text-sm text-muted-foreground mt-2 hover-elevate rounded px-1"
            onClick={() => setShowComments(true)}
            data-testid={`button-view-reflects-${post.id}`}
          >
            View all {post.reflects} reflection{post.reflects !== 1 ? 's' : ''}
          </button>
        )}

        {showComments && (
          <div className="mt-4 space-y-3" data-testid={`reflects-section-${post.id}`}>
            {reflects.map((reflect) => (
              <div key={reflect.id} className="flex gap-2" data-testid={`reflect-${reflect.id}`}>
                <Avatar className="h-6 w-6 flex-shrink-0">
                  <AvatarImage src={reflect.user.avatar || undefined} />
                  <AvatarFallback>
                    {(reflect.user.displayName || reflect.user.username)?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 text-sm">
                  <span className="font-serif font-semibold mr-2" data-testid={`reflect-author-${reflect.id}`}>
                    {reflect.user.username}
                  </span>
                  <span className="text-foreground" data-testid={`reflect-text-${reflect.id}`}>
                    {reflect.text}
                  </span>
                </div>
              </div>
            ))}

            <form onSubmit={handleCommentSubmit} className="flex gap-2 mt-3">
              <Input
                type="text"
                placeholder="Add a reflection..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                disabled={reflectMutation.isPending}
                className="flex-1 text-sm"
                data-testid={`input-reflect-${post.id}`}
              />
              <Button
                type="submit"
                size="sm"
                disabled={!commentText.trim() || reflectMutation.isPending}
                data-testid={`button-submit-reflect-${post.id}`}
              >
                Share
              </Button>
            </form>
          </div>
        )}
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent data-testid="dialog-delete-post">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Post</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this post? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <UserListDrawer
        open={showSavorersDrawer}
        onOpenChange={setShowSavorersDrawer}
        title="Savors"
        users={savorers}
        type="savorers"
        postId={post.id}
      />
    </article>
  );
}
