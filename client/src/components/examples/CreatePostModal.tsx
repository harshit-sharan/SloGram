import { useState } from "react";
import { CreatePostModal } from "../CreatePostModal";
import { Button } from "@/components/ui/button";

export default function CreatePostModalExample() {
  const [open, setOpen] = useState(false);

  return (
    <div className="p-4">
      <Button onClick={() => setOpen(true)}>Open Create Post Modal</Button>
      <CreatePostModal open={open} onOpenChange={setOpen} />
    </div>
  );
}
