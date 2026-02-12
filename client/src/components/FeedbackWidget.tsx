import { useState } from "react";
import { MessageSquarePlus, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export function FeedbackWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!message.trim()) return;

    setIsSubmitting(true);
    try {
      await apiRequest("POST", "/api/feedback", { message: message.trim() });
      toast({ title: "Thank you for your feedback!" });
      setMessage("");
      setIsOpen(false);
    } catch {
      toast({ title: "Failed to send feedback", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[9999]" data-testid="feedback-widget">
      {isOpen && (
        <div
          className="mb-3 w-80 rounded-md border bg-card p-4 shadow-lg"
          data-testid="feedback-panel"
        >
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="text-sm font-medium text-card-foreground">
              Share your feedback
            </span>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setIsOpen(false)}
              data-testid="button-close-feedback"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <Textarea
            placeholder="Tell us what you think..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="resize-none text-sm mb-3"
            rows={4}
            data-testid="input-feedback-message"
          />
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !message.trim()}
            className="w-full"
            data-testid="button-send-feedback"
          >
            <Send className="h-4 w-4 mr-2" />
            {isSubmitting ? "Sending..." : "Send"}
          </Button>
        </div>
      )}

      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="bg-primary text-primary-foreground shadow-lg"
          data-testid="button-open-feedback"
        >
          <MessageSquarePlus className="h-4 w-4 mr-2" />
          Feedback
        </Button>
      )}
    </div>
  );
}
