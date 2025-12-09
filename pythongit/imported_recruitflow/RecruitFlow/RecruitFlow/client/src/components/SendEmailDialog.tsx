import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Mail, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface SendEmailDialogProps {
  candidateId: string;
  candidateEmail: string;
  candidateName: string;
}

export function SendEmailDialog({ candidateId, candidateEmail, candidateName }: SendEmailDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [emailType, setEmailType] = useState<"job_opportunity" | "follow_up">("job_opportunity");
  const [selectedPositionId, setSelectedPositionId] = useState<string>("");
  const [customSubject, setCustomSubject] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: positions = [] } = useQuery({
    queryKey: ['/api/positions'],
    enabled: isOpen && emailType === "job_opportunity"
  });

  const sendEmailMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/email/send', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/candidates', candidateId, 'emails'] });
      queryClient.invalidateQueries({ queryKey: ['/api/emails'] });
      setIsOpen(false);
      setSelectedPositionId("");
      setCustomSubject("");
      toast({
        title: "Email sent!",
        description: "Your email has been sent successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send email",
        variant: "destructive",
      });
    },
  });

  const handleSend = () => {
    const emailData = {
      candidateId,
      recipientEmail: candidateEmail,
      subject: emailType === "job_opportunity" ? "" : customSubject,
      htmlContent: "",
      textContent: "",
      positionId: emailType === "job_opportunity" ? selectedPositionId : null,
    };

    if (emailType === "job_opportunity" && !selectedPositionId) {
      toast({
        title: "Position required",
        description: "Please select a position for this opportunity email.",
        variant: "destructive",
      });
      return;
    }

    if (emailType === "follow_up" && !customSubject) {
      toast({
        title: "Subject required",
        description: "Please enter a subject for the follow-up email.",
        variant: "destructive",
      });
      return;
    }

    sendEmailMutation.mutate(emailData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" data-testid="button-send-email">
          <Mail className="h-4 w-4 mr-2" />
          Send Email
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]" data-testid="dialog-send-email">
        <DialogHeader>
          <DialogTitle>Send Email to {candidateName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="recipient">Recipient</Label>
            <Input
              id="recipient"
              value={candidateEmail}
              disabled
              data-testid="input-recipient-email"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="emailType">Email Type</Label>
            <Select value={emailType} onValueChange={(value: any) => setEmailType(value)}>
              <SelectTrigger id="emailType" data-testid="select-email-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="job_opportunity" data-testid="option-job-opportunity">Job Opportunity</SelectItem>
                <SelectItem value="follow_up" data-testid="option-follow-up">Follow Up</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {emailType === "job_opportunity" && (
            <div className="space-y-2">
              <Label htmlFor="position">Position</Label>
              <Select value={selectedPositionId} onValueChange={setSelectedPositionId}>
                <SelectTrigger id="position" data-testid="select-position">
                  <SelectValue placeholder="Select a position" />
                </SelectTrigger>
                <SelectContent>
                  {positions.map((position: any) => (
                    <SelectItem key={position.id} value={position.id} data-testid={`option-position-${position.id}`}>
                      {position.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {emailType === "follow_up" && (
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={customSubject}
                onChange={(e) => setCustomSubject(e.target.value)}
                placeholder="Enter email subject"
                data-testid="input-subject"
              />
            </div>
          )}

          <div className="text-sm text-muted-foreground">
            {emailType === "job_opportunity" 
              ? "A professional job opportunity email will be sent with position details."
              : "A follow-up email will be sent to check on their interest."}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setIsOpen(false)} data-testid="button-cancel">
            Cancel
          </Button>
          <Button 
            onClick={handleSend} 
            disabled={sendEmailMutation.isPending}
            data-testid="button-confirm-send"
          >
            {sendEmailMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Mail className="h-4 w-4 mr-2" />
                Send Email
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
