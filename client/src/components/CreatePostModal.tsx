import { useState } from "react";
import { X, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function CreatePostModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [caption, setCaption] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const handleImageSelect = () => {
    console.log("Image upload clicked");
    setSelectedImage("https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800");
  };

  const handlePost = () => {
    console.log("Post created:", { caption, image: selectedImage });
    setCaption("");
    setSelectedImage(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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

          {selectedImage ? (
            <div className="relative rounded-md overflow-hidden bg-muted">
              <img
                src={selectedImage}
                alt="Selected"
                className="w-full object-cover max-h-96"
                data-testid="img-preview"
              />
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 bg-background/80 backdrop-blur"
                onClick={() => setSelectedImage(null)}
                data-testid="button-remove-image"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <button
              onClick={handleImageSelect}
              className="w-full p-8 border-2 border-dashed rounded-md hover-elevate flex flex-col items-center gap-2 text-muted-foreground"
              data-testid="button-select-image"
            >
              <ImageIcon className="h-8 w-8" />
              <span>Add photo</span>
            </button>
          )}

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button
              onClick={handlePost}
              disabled={!caption.trim() || !selectedImage}
              data-testid="button-share"
            >
              Share
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
