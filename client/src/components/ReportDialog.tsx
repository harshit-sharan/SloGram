import { useState } from "react";
import { Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type ReportReason = "harassment" | "hate" | "explicit" | "spam" | "self_harm" | "other";

interface ReportDialogProps {
  targetType: "moment" | "user";
  targetId: string;
  targetName?: string;
  trigger?: React.ReactNode;
  onReported?: () => void;
}

const REPORT_REASONS: { value: ReportReason; label: string; description: string }[] = [
  { value: "harassment", label: "Harassment", description: "Bullying, threats, or intimidation" },
  { value: "hate", label: "Hate speech", description: "Discrimination or hateful content" },
  { value: "explicit", label: "Explicit content", description: "Inappropriate or adult content" },
  { value: "spam", label: "Spam", description: "Misleading or repetitive content" },
  { value: "self_harm", label: "Self-harm", description: "Content promoting self-harm" },
  { value: "other", label: "Other", description: "Another reason not listed above" },
];

export function ReportDialog({ targetType, targetId, targetName, trigger, onReported }: ReportDialogProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [notes, setNotes] = useState("");
  const { toast } = useToast();

  const reportMutation = useMutation({
    mutationFn: async () => {
      const endpoint = targetType === "moment" 
        ? `/api/reports/moments/${targetId}`
        : `/api/reports/users/${targetId}`;
      const response = await apiRequest("POST", endpoint, { reason, notes: notes || null });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Report submitted",
        description: "Thank you for helping keep our community peaceful. We'll review this shortly.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/reports/moments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reports/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/moments-with-authors"] });
      queryClient.invalidateQueries({ queryKey: ["/api/explore-posts"] });
      setOpen(false);
      setReason(null);
      setNotes("");
      onReported?.();
    },
    onError: (error: Error) => {
      toast({
        title: "Unable to submit report",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!reason) return;
    reportMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" className="text-muted-foreground" data-testid={`button-report-${targetType}`}>
            <Flag className="h-4 w-4 mr-1" />
            Report
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Report {targetType === "moment" ? "content" : "user"}</DialogTitle>
          <DialogDescription>
            {targetName 
              ? `Why are you reporting ${targetName}?`
              : `Why are you reporting this ${targetType === "moment" ? "content" : "user"}?`
            }
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <RadioGroup value={reason || ""} onValueChange={(value) => setReason(value as ReportReason)}>
            {REPORT_REASONS.map((item) => (
              <div key={item.value} className="flex items-start space-x-3 py-2">
                <RadioGroupItem value={item.value} id={item.value} data-testid={`radio-reason-${item.value}`} />
                <div className="space-y-1">
                  <Label htmlFor={item.value} className="font-medium cursor-pointer">
                    {item.label}
                  </Label>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
              </div>
            ))}
          </RadioGroup>

          {reason === "other" && (
            <div className="space-y-2">
              <Label htmlFor="notes">Additional details (optional)</Label>
              <Textarea
                id="notes"
                placeholder="Please describe what you're reporting..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="resize-none"
                data-testid="input-report-notes"
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} data-testid="button-cancel-report">
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!reason || reportMutation.isPending}
            data-testid="button-submit-report"
          >
            {reportMutation.isPending ? "Submitting..." : "Submit Report"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
