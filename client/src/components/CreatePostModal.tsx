import { useState, useRef } from "react";
import { X, Image as ImageIcon, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export function CreatePostModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [caption, setCaption] = useState("");
  const [selectedMedia, setSelectedMedia] = useState<{ file: File; url: string; type: "image" | "video" } | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const createPostMutation = useMutation({
    mutationFn: async (postData: { userId: string; type: "image" | "video"; file: File; caption: string }) => {
      const formData = new FormData();
      formData.append("userId", postData.userId);
      formData.append("type", postData.type);
      formData.append("media", postData.file);
      formData.append("caption", postData.caption);
      
      const response = await fetch("/api/posts", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) throw new Error("Failed to create post");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts-with-authors"] });
      toast({
        title: "Post shared!",
        description: "Your slow living moment has been shared.",
      });
      if (selectedMedia) {
        URL.revokeObjectURL(selectedMedia.url);
      }
      setCaption("");
      setSelectedMedia(null);
      onOpenChange(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create post. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleImageSelect = () => {
    imageInputRef.current?.click();
  };

  const handleVideoSelect = () => {
    videoInputRef.current?.click();
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      if (selectedMedia) {
        URL.revokeObjectURL(selectedMedia.url);
      }
      const url = URL.createObjectURL(file);
      setSelectedMedia({ file, url, type: "image" });
    }
    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
  };

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("video/")) {
      if (selectedMedia) {
        URL.revokeObjectURL(selectedMedia.url);
      }
      const url = URL.createObjectURL(file);
      setSelectedMedia({ file, url, type: "video" });
    }
    if (videoInputRef.current) {
      videoInputRef.current.value = "";
    }
  };

  const handleRemoveMedia = () => {
    if (selectedMedia) {
      URL.revokeObjectURL(selectedMedia.url);
      setSelectedMedia(null);
    }
  };

  const handlePost = () => {
    if (!selectedMedia) return;
    
    const currentUserId = "ca1a588a-2f07-4b75-ad8a-2ac21444840e";
    
    createPostMutation.mutate({
      userId: currentUserId,
      type: selectedMedia.type,
      file: selectedMedia.file,
      caption: caption.trim(),
    });
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && selectedMedia) {
      URL.revokeObjectURL(selectedMedia.url);
      setSelectedMedia(null);
      setCaption("");
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl" data-testid="modal-create-post">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">Create new post</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src="" />
              <AvatarFallback>ME</AvatarFallback>
            </Avatar>
            <Textarea
              placeholder="Share your slow living moment..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="flex-1 min-h-24 resize-none border-0 focus-visible:ring-0 text-base"
              data-testid="input-caption"
            />
          </div>

          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageChange}
            data-testid="input-image-file"
          />
          <input
            ref={videoInputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={handleVideoChange}
            data-testid="input-video-file"
          />

          {selectedMedia ? (
            <div className="relative rounded-md overflow-hidden bg-muted">
              {selectedMedia.type === "image" ? (
                <img
                  src={selectedMedia.url}
                  alt="Selected"
                  className="w-full object-cover max-h-96"
                  data-testid="img-preview"
                />
              ) : (
                <video
                  src={selectedMedia.url}
                  className="w-full object-cover max-h-96"
                  controls
                  data-testid="video-preview"
                />
              )}
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 bg-background/80 backdrop-blur"
                onClick={handleRemoveMedia}
                data-testid="button-remove-media"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={handleImageSelect}
                className="p-8 border-2 border-dashed rounded-md hover-elevate flex flex-col items-center gap-2 text-muted-foreground"
                data-testid="button-select-image"
              >
                <ImageIcon className="h-8 w-8" />
                <span>Add photo</span>
              </button>
              <button
                onClick={handleVideoSelect}
                className="p-8 border-2 border-dashed rounded-md hover-elevate flex flex-col items-center gap-2 text-muted-foreground"
                data-testid="button-select-video"
              >
                <Video className="h-8 w-8" />
                <span>Add video</span>
              </button>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => handleOpenChange(false)}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button
              onClick={handlePost}
              disabled={!caption.trim() || !selectedMedia || createPostMutation.isPending}
              data-testid="button-share"
            >
              {createPostMutation.isPending ? "Sharing..." : "Share"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
