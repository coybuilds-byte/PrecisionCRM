import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface ScheduleInterviewDialogProps {
  applicationId: string;
  candidateName: string;
  positionTitle: string;
  recruiterId: string;
  trigger?: React.ReactNode;
}

export function ScheduleInterviewDialog({
  applicationId,
  candidateName,
  positionTitle,
  recruiterId,
  trigger
}: ScheduleInterviewDialogProps) {
  const [open, setOpen] = useState(false);
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [duration, setDuration] = useState("60");
  const [interviewerName, setInterviewerName] = useState("");
  const [interviewerEmail, setInterviewerEmail] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [syncToCalendar, setSyncToCalendar] = useState(true);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createInterviewMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/interviews", data);
    },
    onSuccess: async (interview: any) => {
      if (syncToCalendar) {
        try {
          await apiRequest("POST", `/api/interviews/${interview.id}/sync-calendar`, {});
          toast({
            title: "Interview scheduled",
            description: "Interview created and synced to Outlook calendar successfully.",
          });
        } catch (error) {
          toast({
            title: "Interview created",
            description: "Interview created but calendar sync failed. You can sync it manually later.",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Interview scheduled",
          description: "Interview created successfully.",
        });
      }
      
      queryClient.invalidateQueries({ queryKey: ["/api/interviews"] });
      queryClient.invalidateQueries({ queryKey: ["/api/applications"] });
      setOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to schedule interview",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setScheduledDate("");
    setScheduledTime("");
    setDuration("60");
    setInterviewerName("");
    setInterviewerEmail("");
    setLocation("");
    setNotes("");
    setSyncToCalendar(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!scheduledDate || !scheduledTime) {
      toast({
        title: "Missing information",
        description: "Please provide date and time for the interview",
        variant: "destructive",
      });
      return;
    }

    const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}`);
    const endDateTime = new Date(scheduledDateTime.getTime() + parseInt(duration) * 60 * 1000);

    createInterviewMutation.mutate({
      applicationId,
      scheduledDate: scheduledDateTime.toISOString(),
      endDate: endDateTime.toISOString(),
      interviewerName: interviewerName || null,
      interviewerEmail: interviewerEmail || null,
      location: location || null,
      notes: notes || null,
      recruiterId,
      status: "scheduled",
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" data-testid="button-schedule-interview">
            <Calendar className="h-4 w-4 mr-2" />
            Schedule Interview
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Schedule Interview</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Candidate</Label>
            <Input value={candidateName} disabled />
          </div>

          <div className="space-y-2">
            <Label>Position</Label>
            <Input value={positionTitle} disabled />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2 col-span-2">
              <Label htmlFor="date">Date *</Label>
              <Input
                id="date"
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                required
                data-testid="input-interview-date"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time">Time *</Label>
              <Input
                id="time"
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                required
                data-testid="input-interview-time"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="duration">Duration (minutes)</Label>
            <Input
              id="duration"
              type="number"
              min="15"
              step="15"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              data-testid="input-interview-duration"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="interviewer-name">Interviewer Name</Label>
              <Input
                id="interviewer-name"
                value={interviewerName}
                onChange={(e) => setInterviewerName(e.target.value)}
                placeholder="John Smith"
                data-testid="input-interviewer-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="interviewer-email">Interviewer Email</Label>
              <Input
                id="interviewer-email"
                type="email"
                value={interviewerEmail}
                onChange={(e) => setInterviewerEmail(e.target.value)}
                placeholder="john@company.com"
                data-testid="input-interviewer-email"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Office, Zoom, Phone, etc."
              data-testid="input-interview-location"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional interview details..."
              rows={3}
              data-testid="input-interview-notes"
            />
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="sync-calendar"
              checked={syncToCalendar}
              onChange={(e) => setSyncToCalendar(e.target.checked)}
              className="rounded"
              data-testid="checkbox-sync-calendar"
            />
            <Label htmlFor="sync-calendar" className="cursor-pointer">
              Sync to Outlook Calendar
            </Label>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setOpen(false);
                resetForm();
              }}
              data-testid="button-cancel-interview"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createInterviewMutation.isPending}
              data-testid="button-create-interview"
            >
              {createInterviewMutation.isPending ? "Scheduling..." : "Schedule Interview"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
