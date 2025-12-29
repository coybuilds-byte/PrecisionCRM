import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface ScheduleInterviewFromCandidateDialogProps {
  candidateId: string;
  candidateName: string;
  recruiterId: string;
}

export function ScheduleInterviewFromCandidateDialog({
  candidateId,
  candidateName,
  recruiterId,
}: ScheduleInterviewFromCandidateDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedPositionId, setSelectedPositionId] = useState("");
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

  // Fetch clients
  const { data: clients = [] } = useQuery<any[]>({
    queryKey: ["/api/clients"],
    enabled: open,
  });

  // Fetch positions for selected client
  const { data: allPositions = [] } = useQuery<any[]>({
    queryKey: ["/api/positions"],
    enabled: open,
  });

  // Fetch client employees for selected client
  const { data: clientEmployees = [] } = useQuery<any[]>({
    queryKey: ["/api/clients", selectedClientId, "employees"],
    enabled: open && !!selectedClientId,
  });

  const clientPositions = allPositions.filter(
    (position) => {
      const matches = position.clientId === selectedClientId || position.client_id === selectedClientId;
      if (selectedClientId) {
        console.log('Position:', position.title, 'clientId:', position.clientId, 'client_id:', position.client_id, 'selectedClientId:', selectedClientId, 'matches:', matches);
      }
      return matches;
    }
  );

  const selectedClient = clients.find((c) => c.id === selectedClientId);
  
  if (selectedClientId && open) {
    console.log('Selected Client ID:', selectedClientId);
    console.log('All Positions:', allPositions);
    console.log('Filtered Client Positions:', clientPositions);
  }

  const scheduleInterviewMutation = useMutation({
    mutationFn: async (data: any) => {
      // First, check if application exists
      const existingApps = await fetch(
        `/api/applications?candidateId=${candidateId}&positionId=${data.positionId}`
      ).then((res) => res.json());

      let applicationId = existingApps.find(
        (app: any) => app.candidateId === candidateId && app.positionId === data.positionId
      )?.id;

      // If no application exists, create one
      if (!applicationId) {
        const newApplication: any = await apiRequest("POST", "/api/applications", {
          candidateId,
          positionId: data.positionId,
          status: "interviewing",
          recruiterId,
        });
        applicationId = newApplication.id;
      } else {
        // Update application status to interviewing if it's not already
        await apiRequest("PUT", `/api/applications/${applicationId}`, {
          status: "interviewing",
        });
      }

      // Create interview
      const interview: any = await apiRequest("POST", "/api/interviews", {
        applicationId,
        scheduledDate: data.scheduledDate,
        endDate: data.endDate,
        interviewerName: data.interviewerName || null,
        interviewerEmail: data.interviewerEmail || null,
        location: data.location || null,
        notes: data.notes || null,
        recruiterId,
        status: "scheduled",
      });

      return { interview, applicationId };
    },
    onSuccess: async ({ interview, applicationId }) => {
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
      queryClient.invalidateQueries({ queryKey: ["/api/applications", candidateId] });
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
    setSelectedClientId("");
    setSelectedPositionId("");
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

    if (!selectedClientId || !selectedPositionId) {
      toast({
        title: "Missing information",
        description: "Please select a client and position",
        variant: "destructive",
      });
      return;
    }

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

    scheduleInterviewMutation.mutate({
      positionId: selectedPositionId,
      scheduledDate: scheduledDateTime.toISOString(),
      endDate: endDateTime.toISOString(),
      interviewerName,
      interviewerEmail,
      location,
      notes,
    });
  };

  const selectedPosition = allPositions.find((p) => p.id === selectedPositionId);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="button-schedule-interview-candidate">
          <Calendar className="h-4 w-4 mr-2" />
          Schedule Interview
        </Button>
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
            <Label htmlFor="client">Client *</Label>
            <Select value={selectedClientId} onValueChange={(value) => {
              setSelectedClientId(value);
              setSelectedPositionId(""); // Reset position when client changes
              setInterviewerName(""); // Reset interviewer when client changes
              setInterviewerEmail("");
            }}>
              <SelectTrigger id="client" data-testid="select-client">
                <SelectValue placeholder="Select a client" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.companyName || client.company_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="position">Position *</Label>
            <Select
              value={selectedPositionId}
              onValueChange={setSelectedPositionId}
              disabled={!selectedClientId}
            >
              <SelectTrigger id="position" data-testid="select-position">
                <SelectValue placeholder={selectedClientId ? "Select a position" : "Select a client first"} />
              </SelectTrigger>
              <SelectContent>
                {clientPositions.map((position) => (
                  <SelectItem key={position.id} value={position.id}>
                    {position.title} - {position.location}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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

          <div className="space-y-2">
            <Label htmlFor="interviewer">Interviewer (Client Employee)</Label>
            <Select
              value={interviewerEmail}
              onValueChange={(value) => {
                const employee = clientEmployees.find((e: any) => e.email === value);
                if (employee) {
                  setInterviewerEmail(employee.email || employee.contact_email);
                  setInterviewerName(`${employee.firstName || employee.first_name} ${employee.lastName || employee.last_name}`);
                }
              }}
              disabled={!selectedClientId}
            >
              <SelectTrigger id="interviewer" data-testid="select-interviewer">
                <SelectValue placeholder={selectedClientId ? (clientEmployees.length > 0 ? "Select an interviewer" : "No employees added to client") : "Select a client first"} />
              </SelectTrigger>
              <SelectContent>
                {clientEmployees.map((employee: any) => (
                  <SelectItem key={employee.id} value={employee.email || employee.contact_email}>
                    {(employee.firstName || employee.first_name)} {(employee.lastName || employee.last_name)} {employee.title ? `- ${employee.title}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedClientId && clientEmployees.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No employees added to this client. Add employees from the client record first.
              </p>
            )}
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
              disabled={scheduleInterviewMutation.isPending}
              data-testid="button-create-interview"
            >
              {scheduleInterviewMutation.isPending ? "Scheduling..." : "Schedule Interview"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
