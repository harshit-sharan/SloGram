import { useState, useEffect } from "react";
import { Heart, MessageCircle, Share2, Bookmark } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

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
  const currentUserId = "ca1a588a-2f07-4b75-ad8a-2ac21444840e"; // Hardcoded user ID
  const [saved, setSaved] = useState(false);
  const [showFullCaption, setShowFullCaption] = useState(false);

  // Fetch initial like status
  const { data: likeData } = useQuery<{ liked: boolean }>({
    queryKey: ["/api/posts", post.id, "liked", currentUserId],
    queryFn: async () => {
      const response = await fetch(`/api/posts/${post.id}/liked?userId=${currentUserId}`);
      if (!response.ok) throw new Error("Failed to fetch like status");
      return response.json();
    },
    staleTime: 0, // Always fetch fresh like status
    refetchOnMount: true,
  });

  const [liked, setLiked] = useState(false);

  // Update local state when query data is available
  useEffect(() => {
    if (likeData !== undefined) {
      setLiked(likeData.liked);
    }
  }, [likeData]);

  // Mutation to toggle like
  const likeMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/posts/${post.id}/like`, { userId: currentUserId });
    },
    onMutate: async () => {
      // Optimistically update the UI
      setLiked(!liked);
    },
    onSuccess: () => {
      // Invalidate and refetch like status
      queryClient.invalidateQueries({
        queryKey: ["/api/posts", post.id, "liked", currentUserId],
      });
      // Invalidate posts queries to update like count
      queryClient.invalidateQueries({
        queryKey: ["/api/posts-with-authors"],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/posts"],
      });
    },
    onError: () => {
      // Revert on error
      setLiked(liked);
    },
  });

  const handleLike = () => {
    likeMutation.mutate();
  };

  const handleSave = () => {
    setSaved(!saved);
    console.log(`Post ${post.id} ${saved ? "unsaved" : "saved"}`);
  };

  const captionPreview = post.caption.length > 120 
    ? post.caption.substring(0, 120) + "..."
    : post.caption;

  return (
    <article className="pb-6 border-b last:border-0" data-testid={`post-${post.id}`}>
      <div className="flex items-center gap-3 px-4 py-3">
        <Link href={`/profile/${post.author.id}`} data-testid={`link-author-avatar-${post.id}`}>
          <Avatar className="h-10 w-10 cursor-pointer hover-elevate">
            <AvatarImage src={post.author.avatar} />
            <AvatarFallback>{post.author.name.charAt(0)}</AvatarFallback>
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
      </div>

      {(post.video || post.image) && (
        <Link href={`/post/${post.id}`} data-testid={`link-post-media-${post.id}`}>
          <div className="relative w-full bg-muted cursor-pointer">
            {post.video ? (
              <video
                src={post.video}
                controls
                className="w-full object-cover"
                data-testid={`video-post-${post.id}`}
              />
            ) : post.image ? (
              <img
                src={post.image}
                alt="Post content"
                className="w-full object-cover"
                data-testid={`img-post-${post.id}`}
              />
            ) : null}
          </div>
        </Link>
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
              onClick={() => console.log(`Comment on post ${post.id}`)}
              data-testid={`button-comment-${post.id}`}
            >
              <MessageCircle />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => console.log(`Share post ${post.id}`)}
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
          {post.likes} likes
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

        {post.comments > 0 && (
          <button
            className="text-sm text-muted-foreground mt-2 hover-elevate rounded px-1"
            onClick={() => console.log(`View comments for post ${post.id}`)}
            data-testid={`button-view-comments-${post.id}`}
          >
            View all {post.comments} comments
          </button>
        )}
      </div>
    </article>
  );
}
