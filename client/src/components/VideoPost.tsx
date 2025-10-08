import { useState, useRef } from "react";
import { Heart, MessageCircle, Share2, Bookmark, Volume2, VolumeX } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export interface VideoPostData {
  id: string;
  author: {
    name: string;
    username: string;
    avatar?: string;
  };
  video: string;
  caption: string;
  savors: number;
  comments: number;
  timestamp: string;
}

export function VideoPost({ post }: { post: VideoPostData }) {
  const [savored, setSavored] = useState(false);
  const [saved, setSaved] = useState(false);
  const [muted, setMuted] = useState(true);
  const [showFullCaption, setShowFullCaption] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { toast } = useToast();

  const handleSavor = () => {
    setSavored(!savored);
    console.log(`Post ${post.id} ${savored ? "unsavored" : "savored"}`);
  };

  const handleSave = () => {
    setSaved(!saved);
    console.log(`Post ${post.id} ${saved ? "unsaved" : "saved"}`);
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !muted;
      setMuted(!muted);
    }
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

  const captionPreview = post.caption.length > 120 
    ? post.caption.substring(0, 120) + "..."
    : post.caption;

  return (
    <article className="pb-6 border-b last:border-0" data-testid={`video-post-${post.id}`}>
      <div className="flex items-center gap-3 px-4 py-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={post.author?.avatar} />
          <AvatarFallback>{post.author?.name?.charAt(0) || post.author?.username?.charAt(0) || "U"}</AvatarFallback>
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

      <div 
        className="relative w-full bg-muted cursor-pointer"
      >
        <video
          ref={videoRef}
          src={post.video}
          className="w-full object-cover max-h-96"
          loop
          muted={muted}
          playsInline
          data-testid={`video-post-${post.id}`}
        />
        <Button
          variant="ghost"
          size="icon"
          className="absolute bottom-4 right-4 bg-background/80 backdrop-blur"
          onClick={toggleMute}
          data-testid={`button-mute-${post.id}`}
        >
          {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
        </Button>
      </div>

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
              onClick={() => console.log(`Comment on post ${post.id}`)}
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

        <p className="font-semibold text-sm mb-2" data-testid={`text-savors-${post.id}`}>
          {post.savors + (savored ? 1 : 0)} savors
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
