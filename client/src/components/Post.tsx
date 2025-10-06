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

interface CommentWithUser {
  id: string;
  userId: string;
  postId: string;
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
  likes: number;
  comments: number;
  timestamp: string;
}

export function Post({ post }: { post: PostData }) {
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const [saved, setSaved] = useState(false);
  const [showFullCaption, setShowFullCaption] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [following, setFollowing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
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

  // Fetch initial like status
  const { data: likeData } = useQuery<{ liked: boolean }>({
    queryKey: ["/api/posts", post.id, "liked", user?.id],
    queryFn: async () => {
      const response = await fetch(`/api/posts/${post.id}/liked?userId=${user?.id}`);
      if (!response.ok) throw new Error("Failed to fetch like status");
      return response.json();
    },
    enabled: !!user,
    staleTime: 0, // Always fetch fresh like status
    refetchOnMount: true,
  });

  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.likes);

  // Update local state when query data is available
  useEffect(() => {
    if (likeData !== undefined) {
      setLiked(likeData.liked);
    }
  }, [likeData]);

  // Update like count when post data changes
  useEffect(() => {
    setLikeCount(post.likes);
  }, [post.likes]);

  // Fetch initial save status
  const { data: saveData } = useQuery<{ saved: boolean }>({
    queryKey: ["/api/posts", post.id, "saved", user?.id],
    queryFn: async () => {
      const response = await fetch(`/api/posts/${post.id}/saved?userId=${user?.id}`);
      if (!response.ok) throw new Error("Failed to fetch save status");
      return response.json();
    },
    enabled: !!user,
    staleTime: 0, // Always fetch fresh save status
    refetchOnMount: true,
  });

  // Update local state when save query data is available
  useEffect(() => {
    if (saveData !== undefined) {
      setSaved(saveData.saved);
    }
  }, [saveData]);

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

  // Fetch comments
  const { data: comments = [] } = useQuery<CommentWithUser[]>({
    queryKey: ["/api/posts", post.id, "comments"],
    queryFn: async () => {
      const response = await fetch(`/api/posts/${post.id}/comments`);
      if (!response.ok) throw new Error("Failed to fetch comments");
      return response.json();
    },
    enabled: showComments,
  });

  // Mutation to toggle like
  const likeMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/posts/${post.id}/like`, { userId: user?.id });
    },
    onMutate: async () => {
      // Optimistically update the UI
      const newLikedState = !liked;
      setLiked(newLikedState);
      // Update like count optimistically
      setLikeCount(prev => newLikedState ? prev + 1 : prev - 1);
    },
    onSuccess: () => {
      // Invalidate and refetch like status
      queryClient.invalidateQueries({
        queryKey: ["/api/posts", post.id, "liked", user?.id],
      });
    },
    onError: () => {
      // Revert on error
      setLiked(liked);
      setLikeCount(post.likes);
    },
  });

  const handleLike = () => {
    likeMutation.mutate();
  };

  // Mutation to toggle save
  const saveMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/posts/${post.id}/save`, { userId: user?.id });
    },
    onMutate: async () => {
      // Optimistically update the UI
      setSaved(!saved);
    },
    onSuccess: () => {
      // Invalidate and refetch save status
      queryClient.invalidateQueries({
        queryKey: ["/api/posts", post.id, "saved", user?.id],
      });
    },
    onError: () => {
      // Revert on error
      setSaved(saved);
    },
  });

  const handleSave = () => {
    saveMutation.mutate();
  };

  // Mutation to submit comment
  const commentMutation = useMutation({
    mutationFn: async (text: string) => {
      return apiRequest("POST", `/api/posts/${post.id}/comments`, {
        userId: user?.id,
        text,
      });
    },
    onSuccess: () => {
      setCommentText("");
      queryClient.invalidateQueries({
        queryKey: ["/api/posts", post.id, "comments"],
      });
    },
  });

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (commentText.trim()) {
      commentMutation.mutate(commentText);
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

  // Mutation to delete post
  const deleteMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", `/api/posts/${post.id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts-with-authors"] });
      queryClient.invalidateQueries({ queryKey: ["/api/posts/user", post.author.id] });
      toast({
        title: "Post deleted",
        description: "Your post has been deleted successfully",
      });
      setShowDeleteDialog(false);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete post",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const handleDelete = () => {
    deleteMutation.mutate();
  };

  const handleShare = async () => {
    const postUrl = `${window.location.origin}/post/${post.id}`;
    try {
      await navigator.clipboard.writeText(postUrl);
      toast({
        title: "Link copied!",
        description: "Post link has been copied to your clipboard",
      });
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Could not copy link to clipboard",
        variant: "destructive",
      });
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
        <Link href={`/profile/${post.author.id}`} data-testid={`link-author-avatar-${post.id}`}>
          <Avatar className="h-10 w-10 cursor-pointer hover-elevate">
            <AvatarImage src={post.author?.avatar} />
            <AvatarFallback>{post.author?.name?.charAt(0) || post.author?.username?.charAt(0) || "U"}</AvatarFallback>
          </Avatar>
        </Link>
        <div className="flex-1">
          <Link href={`/profile/${post.author.id}`} data-testid={`link-author-name-${post.id}`}>
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
            <Link href={`/post/${post.id}`} data-testid={`link-post-media-${post.id}`}>
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
            <Link href={`/post/${post.id}`} data-testid={`link-post-media-${post.id}`}>
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
              onClick={handleLike}
              data-testid={`button-like-${post.id}`}
            >
              <Heart className={liked ? "fill-current text-destructive" : ""} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowComments(!showComments)}
              data-testid={`button-comment-${post.id}`}
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
            onClick={handleSave}
            data-testid={`button-save-${post.id}`}
          >
            <Bookmark className={saved ? "fill-current" : ""} />
          </Button>
        </div>

        <p className="font-semibold text-sm mb-2" data-testid={`text-likes-${post.id}`}>
          {likeCount} {likeCount === 1 ? 'like' : 'likes'}
        </p>

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

        {post.comments > 0 && !showComments && (
          <button
            className="text-sm text-muted-foreground mt-2 hover-elevate rounded px-1"
            onClick={() => setShowComments(true)}
            data-testid={`button-view-comments-${post.id}`}
          >
            View all {post.comments} comments
          </button>
        )}

        {showComments && (
          <div className="mt-4 space-y-3" data-testid={`comments-section-${post.id}`}>
            {comments.map((comment) => (
              <div key={comment.id} className="flex gap-2" data-testid={`comment-${comment.id}`}>
                <Avatar className="h-6 w-6 flex-shrink-0">
                  <AvatarImage src={comment.user.avatar || undefined} />
                  <AvatarFallback>
                    {(comment.user.displayName || comment.user.username)?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 text-sm">
                  <span className="font-serif font-semibold mr-2" data-testid={`comment-author-${comment.id}`}>
                    {comment.user.username}
                  </span>
                  <span className="text-foreground" data-testid={`comment-text-${comment.id}`}>
                    {comment.text}
                  </span>
                </div>
              </div>
            ))}

            <form onSubmit={handleCommentSubmit} className="flex gap-2 mt-3">
              <Input
                type="text"
                placeholder="Add a comment..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                disabled={commentMutation.isPending}
                className="flex-1 text-sm"
                data-testid={`input-comment-${post.id}`}
              />
              <Button
                type="submit"
                size="sm"
                disabled={!commentText.trim() || commentMutation.isPending}
                data-testid={`button-submit-comment-${post.id}`}
              >
                Post
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
    </article>
  );
}
