import { useState } from "react";
import { Heart, MessageCircle, Share2, Bookmark } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

export interface PostData {
  id: string;
  author: {
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
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showFullCaption, setShowFullCaption] = useState(false);

  const handleLike = () => {
    setLiked(!liked);
    console.log(`Post ${post.id} ${liked ? "unliked" : "liked"}`);
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
        <Avatar className="h-10 w-10">
          <AvatarImage src={post.author.avatar} />
          <AvatarFallback>{post.author.name.charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <p className="font-serif font-semibold text-foreground" data-testid={`text-author-${post.id}`}>
            {post.author.name}
          </p>
          <p className="text-xs text-muted-foreground" data-testid={`text-timestamp-${post.id}`}>
            {post.timestamp}
          </p>
        </div>
      </div>

      <div className="relative w-full bg-muted">
        {post.video ? (
          <video
            src={post.video}
            controls
            className="w-full object-cover"
            data-testid={`video-post-${post.id}`}
          />
        ) : (
          <img
            src={post.image}
            alt="Post content"
            className="w-full object-cover"
            data-testid={`img-post-${post.id}`}
          />
        )}
      </div>

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
          {post.likes + (liked ? 1 : 0)} likes
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
