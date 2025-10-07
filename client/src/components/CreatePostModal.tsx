import { useState } from "react";
import { X, ImageIcon, Video, Upload } from "lucide-react";
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
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { ObjectUploader } from "@/components/ObjectUploader";
import type { UploadResult } from "@uppy/core";

export function CreatePostModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { user } = useAuth();
  const [caption, setCaption] = useState("");
  const [uploadedMediaURL, setUploadedMediaURL] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<"image" | "video" | null>(null);
  const { toast } = useToast();

  const setPostMediaMutation = useMutation({
    mutationFn: async (mediaURL: string) => {
      const response = await apiRequest("PUT", `/api/post-media`, {
        mediaURL,
      });
      return response.json();
    },
    onSuccess: (data) => {
      setUploadedMediaURL(data.objectPath);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to process media",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createPostMutation = useMutation({
    mutationFn: async (postData: { type: "image" | "video"; mediaUrl: string; caption: string }) => {
      const response = await apiRequest("POST", "/api/posts", {
        type: postData.type,
        mediaUrl: postData.mediaUrl,
        caption: postData.caption,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts-with-authors"] });
      toast({
        title: "Post shared!",
        description: "Your slow living moment has been shared.",
      });
      setCaption("");
      setUploadedMediaURL(null);
      setMediaType(null);
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

  const handleGetUploadParameters = async () => {
    const response = await apiRequest("POST", "/api/objects/upload", {});
    const data = await response.json();
    return {
      method: "PUT" as const,
      url: data.uploadURL,
    };
  };

  const handleMediaUploadComplete = (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    if (result.successful && result.successful.length > 0) {
      const uploadURL = result.successful[0].uploadURL;
      const file = result.successful[0];
      
      if (uploadURL) {
        // Determine media type from file mime type
        const mimeType = file.type || "";
        const isVideo = mimeType.startsWith("video/");
        setMediaType(isVideo ? "video" : "image");
        setPostMediaMutation.mutate(uploadURL);
      }
    }
  };

  const handleRemoveMedia = () => {
    setUploadedMediaURL(null);
    setMediaType(null);
  };

  const handlePost = () => {
    if (!uploadedMediaURL || !user || !mediaType) return;
    
    createPostMutation.mutate({
      type: mediaType,
      mediaUrl: uploadedMediaURL,
      caption: caption.trim(),
    });
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setUploadedMediaURL(null);
      setMediaType(null);
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
              <AvatarImage src={user?.profileImageUrl || ""} />
              <AvatarFallback>{user?.firstName?.charAt(0) || user?.displayName?.charAt(0) || "U"}</AvatarFallback>
            </Avatar>
            <Textarea
              placeholder="Share your slow living moment..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="flex-1 min-h-24 resize-none border-0 focus-visible:ring-0 text-base"
              data-testid="input-caption"
            />
          </div>

          {uploadedMediaURL ? (
            <div className="relative rounded-lg overflow-hidden bg-muted">
              {mediaType === "image" ? (
                <img
                  src={uploadedMediaURL}
                  alt="Selected"
                  className="w-full object-cover max-h-96"
                  data-testid="img-preview"
                />
              ) : (
                <video
                  src={uploadedMediaURL}
                  className="w-full object-cover max-h-96"
                  controls
                  data-testid="video-preview"
                />
              )}
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 bg-background/80 backdrop-blur hover:bg-background/90"
                onClick={handleRemoveMedia}
                data-testid="button-remove-media"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <ObjectUploader
              maxNumberOfFiles={1}
              maxFileSize={50 * 1024 * 1024}
              onGetUploadParameters={handleGetUploadParameters}
              onComplete={handleMediaUploadComplete}
              buttonClassName="w-full p-12 border-2 border-dashed rounded-lg hover-elevate active-elevate-2 transition-all group cursor-pointer"
            >
              <div className="flex flex-col items-center gap-4 text-muted-foreground pointer-events-none">
                <div className="relative">
                  <div className="absolute inset-0 bg-primary/10 rounded-full blur-xl group-hover:bg-primary/20 transition-colors" />
                  <div className="relative flex items-center justify-center w-16 h-16 rounded-full bg-muted">
                    <Upload className="h-8 w-8 text-primary" />
                  </div>
                </div>
                
                <div className="text-center space-y-2">
                  <p className="text-base font-medium text-foreground">
                    Drag and drop or click to upload
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Photos and videos up to 50MB
                  </p>
                </div>

                <div className="flex items-center gap-6 mt-2">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="h-5 w-5 text-primary" />
                    <span className="text-sm">Images</span>
                  </div>
                  <div className="h-4 w-px bg-border" />
                  <div className="flex items-center gap-2">
                    <Video className="h-5 w-5 text-primary" />
                    <span className="text-sm">Videos</span>
                  </div>
                </div>
              </div>
            </ObjectUploader>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => handleOpenChange(false)}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button
              onClick={handlePost}
              disabled={!caption.trim() || !uploadedMediaURL || createPostMutation.isPending}
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
