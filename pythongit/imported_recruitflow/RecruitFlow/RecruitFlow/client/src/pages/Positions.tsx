import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Briefcase, Plus, Edit, Trash2, Building2, MapPin, DollarSign, Users, Calendar, ExternalLink, Eye, Send, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ScheduleInterviewDialog } from "@/components/ScheduleInterviewDialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

import type { Position, InsertPosition, Client, Candidate, Application } from "@shared/schema";

const positionSchema = z.object({
  title: z.string().min(1, "Position title is required"),
  description: z.string().min(1, "Description is required"),
  requirements: z.string().optional(),
  salary: z.string().optional(),
  location: z.string().optional(),
  status: z.enum(["open", "on_hold", "filled", "cancelled"]).default("open"),
  clientId: z.string().min(1, "Client selection is required"),
  recruiterId: z.string().default("c63b07a5-7323-4ae3-b3d5-e871d13526f0"),
});

type PositionFormData = z.infer<typeof positionSchema>;

interface PositionFormProps {
  position?: Position;
  onSuccess?: () => void;
}

function PositionForm({ position, onSuccess }: PositionFormProps) {
  const { toast } = useToast();
  
  const form = useForm<PositionFormData>({
    resolver: zodResolver(positionSchema),
    defaultValues: {
      title: position?.title || "",
      description: position?.description || "",
      requirements: position?.requirements || "",
      salary: position?.salary || "",
      location: position?.location || "",
      status: position?.status || "open",
      clientId: position?.clientId || "",
      recruiterId: position?.recruiterId || "c63b07a5-7323-4ae3-b3d5-e871d13526f0",
    },
  });

  // Fetch clients for dropdown
  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ['/api/clients', 'c63b07a5-7323-4ae3-b3d5-e871d13526f0'],
    queryFn: async () => {
      const response = await fetch('/api/clients?recruiterId=c63b07a5-7323-4ae3-b3d5-e871d13526f0', {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch clients');
      }
      return response.json();
    },
    staleTime: 30000,
  });

  const mutation = useMutation({
    mutationFn: async (data: PositionFormData) => {
      const url = position ? `/api/positions/${position.id}` : '/api/positions';
      const method = position ? 'PUT' : 'POST';
      
      const response = await apiRequest(method, url, data);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || `Failed to ${position ? 'update' : 'create'} position`);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/positions'] });
      toast({ 
        title: "Success", 
        description: `Position ${position ? 'updated' : 'created'} successfully!` 
      });
      form.reset();
      onSuccess?.();
    },
    onError: (error) => {
      toast({ 
        title: "Error", 
        description: error.message, 
        variant: "destructive" 
      });
    }
  });

  const onSubmit = (data: PositionFormData) => {
    mutation.mutate(data);
  };

  const statusOptions = [
    { value: "open", label: "Open", color: "bg-green-500" },
    { value: "on_hold", label: "On Hold", color: "bg-yellow-500" },
    { value: "filled", label: "Filled", color: "bg-blue-500" },
    { value: "cancelled", label: "Cancelled", color: "bg-red-500" },
  ];

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Position Title</FormLabel>
                <FormControl>
                  <Input {...field} data-testid="input-position-title" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="clientId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Client</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-client">
                      <SelectValue placeholder="Select a client" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.companyName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="salary"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Salary</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="$80,000 - $120,000" data-testid="input-salary" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="location"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Location</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Remote, San Francisco, CA" data-testid="input-location" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-status">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {statusOptions.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        <div className="flex items-center space-x-2">
                          <div className={`w-2 h-2 rounded-full ${status.color}`} />
                          <span>{status.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea 
                  {...field} 
                  placeholder="Detailed job description, responsibilities, and what the role entails..."
                  data-testid="input-description"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="requirements"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Requirements</FormLabel>
              <FormControl>
                <Textarea 
                  {...field} 
                  placeholder="Required skills, experience, education, certifications..."
                  data-testid="input-requirements"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-2">
          <Button 
            type="submit" 
            disabled={mutation.isPending}
            data-testid="button-submit-position"
          >
            {mutation.isPending ? "Saving..." : (position ? "Update Position" : "Create Position")}
          </Button>
        </div>
      </form>
    </Form>
  );
}

interface SendCandidateDialogProps {
  candidate: Candidate;
  position: Position;
  client: Client;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function SendCandidateDialog({ candidate, position, client, open, onOpenChange }: SendCandidateDialogProps) {
  const { toast } = useToast();
  const [recipientEmail, setRecipientEmail] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");

  const sendEmailMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/send-candidate-submission', {
        candidateId: candidate.id,
        positionId: position.id,
        clientId: client.id,
        recipientEmail,
        additionalNotes,
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send candidate submission');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ 
        title: "Success", 
        description: "Candidate details sent to hiring manager!" 
      });
      onOpenChange(false);
      setRecipientEmail("");
      setAdditionalNotes("");
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const handleSend = () => {
    if (!recipientEmail) {
      toast({ 
        title: "Error", 
        description: "Please enter a recipient email", 
        variant: "destructive" 
      });
      return;
    }
    sendEmailMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Send Candidate to Hiring Manager</DialogTitle>
          <DialogDescription>
            Send {candidate.firstName} {candidate.lastName}'s details to the hiring manager
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-medium mb-2">Candidate Details</h4>
            <div className="bg-muted p-3 rounded-md space-y-2 text-sm">
              <p><strong>Name:</strong> {candidate.firstName} {candidate.lastName}</p>
              <p><strong>Email:</strong> {candidate.email}</p>
              <p><strong>Current Position:</strong> {candidate.currentPosition || 'N/A'}</p>
              <p><strong>Current Company:</strong> {candidate.currentCompany || 'N/A'}</p>
            </div>
          </div>

          {candidate.skills && candidate.skills.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">Skills</h4>
              <div className="flex flex-wrap gap-2">
                {candidate.skills.map((skill, idx) => (
                  <Badge key={idx} variant="secondary">{skill}</Badge>
                ))}
              </div>
            </div>
          )}

          <div>
            <h4 className="text-sm font-medium mb-2">Position Details</h4>
            <div className="bg-muted p-3 rounded-md text-sm">
              <p><strong>Position:</strong> {position.title}</p>
              <p><strong>Client:</strong> {client.companyName}</p>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Recipient Email</label>
            <Input
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              placeholder="hiring.manager@company.com"
              className="mt-1"
              data-testid="input-recipient-email"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Additional Notes (Optional)</label>
            <Textarea
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)}
              placeholder="Add any additional context or notes..."
              className="mt-1"
              data-testid="input-additional-notes"
            />
          </div>

          {candidate.resumeUrl && (
            <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-md text-sm">
              <p className="text-blue-900 dark:text-blue-100">
                📎 Resume will be automatically attached to the email
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              data-testid="button-cancel-send"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSend}
              disabled={sendEmailMutation.isPending}
              data-testid="button-send-candidate"
            >
              <Send className="h-4 w-4 mr-2" />
              {sendEmailMutation.isPending ? "Sending..." : "Send to Hiring Manager"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface AddCandidateToPositionDialogProps {
  position: Position;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

function AddCandidateToPositionDialog({ position, open, onOpenChange, onSuccess }: AddCandidateToPositionDialogProps) {
  const { toast } = useToast();
  const [selectedCandidateId, setSelectedCandidateId] = useState("");
  const [notes, setNotes] = useState("");

  const { data: candidates = [] } = useQuery<Candidate[]>({
    queryKey: ['/api/candidates'],
    enabled: open,
  });

  const addCandidateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/applications', {
        candidateId: selectedCandidateId,
        positionId: position.id,
        status: 'new',
        notes,
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add candidate to position');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ 
        title: "Success", 
        description: "Candidate added to position!" 
      });
      onOpenChange(false);
      setSelectedCandidateId("");
      setNotes("");
      onSuccess();
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const handleAdd = () => {
    if (!selectedCandidateId) {
      toast({ 
        title: "Error", 
        description: "Please select a candidate", 
        variant: "destructive" 
      });
      return;
    }
    addCandidateMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Candidate to Position</DialogTitle>
          <DialogDescription>
            Submit a candidate for {position.title}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Select Candidate</label>
            <Select value={selectedCandidateId} onValueChange={setSelectedCandidateId}>
              <SelectTrigger className="mt-1" data-testid="select-candidate">
                <SelectValue placeholder="Choose a candidate" />
              </SelectTrigger>
              <SelectContent>
                {candidates.map((candidate) => (
                  <SelectItem key={candidate.id} value={candidate.id}>
                    {candidate.firstName} {candidate.lastName} - {candidate.currentPosition || 'No position'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium">Notes (Optional)</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any submission notes..."
              className="mt-1"
              data-testid="input-submission-notes"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              data-testid="button-cancel-add"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleAdd}
              disabled={addCandidateMutation.isPending}
              data-testid="button-confirm-add"
            >
              {addCandidateMutation.isPending ? "Adding..." : "Add Candidate"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface PositionCardProps {
  position: Position;
  client?: Client;
  onUpdate: () => void;
  onSyncToPSM: (positionId: string) => void;
  isSyncingToPSM: boolean;
}

function PositionCard({ position, client, onUpdate, onSyncToPSM, isSyncingToPSM }: PositionCardProps) {
  const { toast } = useToast();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isAddCandidateDialogOpen, setIsAddCandidateDialogOpen] = useState(false);
  const [sendCandidateState, setSendCandidateState] = useState<{
    open: boolean;
    candidate: Candidate | null;
  }>({ open: false, candidate: null });

  // Fetch applications for this position with candidate details
  const { data: applicationsData = [], refetch: refetchApplications } = useQuery<Array<Application & { candidate: Candidate }>>({
    queryKey: ['/api/applications', position.id],
    queryFn: async () => {
      const response = await fetch(`/api/applications?positionId=${position.id}`, {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch applications');
      }
      return response.json();
    },
    enabled: isDetailsDialogOpen,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('DELETE', `/api/positions/${id}`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete position');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/positions'] });
      toast({ title: "Success", description: "Position deleted successfully!" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const handleEdit = () => {
    setIsEditDialogOpen(false);
    onUpdate();
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      open: { label: "Open", variant: "default" as const, color: "bg-green-500" },
      on_hold: { label: "On Hold", variant: "secondary" as const, color: "bg-yellow-500" },
      filled: { label: "Filled", variant: "outline" as const, color: "bg-blue-500" },
      cancelled: { label: "Cancelled", variant: "destructive" as const, color: "bg-red-500" },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.open;
    
    return (
      <Badge variant={config.variant} data-testid={`badge-status-${position.id}`}>
        <div className={`w-2 h-2 rounded-full ${config.color} mr-1`} />
        {config.label}
      </Badge>
    );
  };

  return (
    <Card className="hover-elevate" data-testid={`card-position-${position.id}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-2">
            <Briefcase className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle className="text-lg" data-testid={`text-position-title-${position.id}`}>
                {position.title}
              </CardTitle>
              <CardDescription data-testid={`text-client-name-${position.id}`}>
                {client?.companyName || 'Unknown Client'}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            {getStatusBadge(position.status)}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground line-clamp-3" data-testid={`text-description-${position.id}`}>
          {position.description}
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          {position.salary && (
            <div className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span data-testid={`text-salary-${position.id}`}>{position.salary}</span>
            </div>
          )}
          
          {position.location && (
            <div className="flex items-center space-x-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span data-testid={`text-location-${position.id}`}>{position.location}</span>
            </div>
          )}
          
          <div className="flex items-center space-x-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground" data-testid={`text-client-${position.id}`}>
              {client?.companyName || 'Unknown Client'}
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground" data-testid={`text-created-${position.id}`}>
              Posted {formatDate(position.createdAt?.toString() || "")}
            </span>
          </div>
        </div>
        
        {position.requirements && (
          <div className="border-t pt-3">
            <h4 className="text-sm font-medium mb-1">Requirements</h4>
            <p className="text-sm text-muted-foreground line-clamp-2" data-testid={`text-requirements-${position.id}`}>
              {position.requirements}
            </p>
          </div>
        )}
        
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center space-x-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground" data-testid={`text-applications-${position.id}`}>
              0 applications
            </span>
          </div>
          
          <div className="flex items-center space-x-1">
            <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm"
                  data-testid={`button-view-details-${position.id}`}
                  title="View Job Order Details"
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Job Order Details</DialogTitle>
                  <DialogDescription>
                    Complete details for {position.title}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-6">
                  {/* Position Details */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-medium mb-1 text-muted-foreground">Position Title</h4>
                      <p className="text-sm">{position.title}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium mb-1 text-muted-foreground">Status</h4>
                      {getStatusBadge(position.status)}
                    </div>
                    <div>
                      <h4 className="text-sm font-medium mb-1 text-muted-foreground">Client</h4>
                      <p className="text-sm">{client?.companyName || 'Unknown Client'}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium mb-1 text-muted-foreground">Posted Date</h4>
                      <p className="text-sm">{formatDate(position.createdAt?.toString() || "")}</p>
                    </div>
                    {position.salary && (
                      <div>
                        <h4 className="text-sm font-medium mb-1 text-muted-foreground">Salary</h4>
                        <p className="text-sm">{position.salary}</p>
                      </div>
                    )}
                    {position.location && (
                      <div>
                        <h4 className="text-sm font-medium mb-1 text-muted-foreground">Location</h4>
                        <p className="text-sm">{position.location}</p>
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium mb-2 text-muted-foreground">Description</h4>
                    <p className="text-sm whitespace-pre-wrap">{position.description}</p>
                  </div>
                  
                  {position.requirements && (
                    <div>
                      <h4 className="text-sm font-medium mb-2 text-muted-foreground">Requirements</h4>
                      <p className="text-sm whitespace-pre-wrap">{position.requirements}</p>
                    </div>
                  )}

                  {/* Submitted Candidates Section */}
                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-sm font-medium">Submitted Candidates ({applicationsData.length})</h4>
                      <Button
                        size="sm"
                        onClick={() => setIsAddCandidateDialogOpen(true)}
                        data-testid="button-add-candidate-to-position"
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        Add Candidate
                      </Button>
                    </div>

                    {applicationsData.length === 0 ? (
                      <div className="text-center py-8 bg-muted rounded-lg">
                        <Users className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">No candidates submitted yet</p>
                        <p className="text-xs text-muted-foreground mt-1">Add candidates to start tracking submissions</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {applicationsData.map((app) => (
                          <Card key={app.id} className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <h5 className="font-medium">
                                    {app.candidate.firstName} {app.candidate.lastName}
                                  </h5>
                                  <Badge variant="outline">{app.status}</Badge>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                                  <p>📧 {app.candidate.email}</p>
                                  {app.candidate.phone && <p>📱 {app.candidate.phone}</p>}
                                  {app.candidate.currentPosition && (
                                    <p>💼 {app.candidate.currentPosition}</p>
                                  )}
                                  {app.candidate.currentCompany && (
                                    <p>🏢 {app.candidate.currentCompany}</p>
                                  )}
                                </div>
                                {app.candidate.skills && app.candidate.skills.length > 0 && (
                                  <div className="mt-2 flex flex-wrap gap-1">
                                    {app.candidate.skills.map((skill, idx) => (
                                      <Badge key={idx} variant="secondary" className="text-xs">
                                        {skill}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                                {app.notes && (
                                  <p className="text-xs text-muted-foreground mt-2 italic">
                                    Note: {app.notes}
                                  </p>
                                )}
                              </div>
                              <div className="flex gap-2">
                                <ScheduleInterviewDialog
                                  applicationId={app.id}
                                  candidateName={`${app.candidate.firstName} ${app.candidate.lastName}`}
                                  positionTitle={position.title}
                                  recruiterId={position.recruiterId || ""}
                                />
                                <Button
                                  size="sm"
                                  onClick={() => setSendCandidateState({ open: true, candidate: app.candidate })}
                                  data-testid={`button-send-candidate-${app.candidate.id}`}
                                >
                                  <Send className="h-4 w-4 mr-2" />
                                  Send to Client
                                </Button>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm"
                  data-testid={`button-edit-position-${position.id}`}
                >
                  <Edit className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl">
                <DialogHeader>
                  <DialogTitle>Edit Position</DialogTitle>
                  <DialogDescription>
                    Update position details and requirements.
                  </DialogDescription>
                </DialogHeader>
                <PositionForm position={position} onSuccess={handleEdit} />
              </DialogContent>
            </Dialog>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onSyncToPSM(position.id)}
              disabled={isSyncingToPSM}
              data-testid={`button-sync-psm-${position.id}`}
              title="Sync to Precision Source Management"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm"
                  data-testid={`button-delete-position-${position.id}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Position</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete "{position.title}"? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => deleteMutation.mutate(position.id)}
                    disabled={deleteMutation.isPending}
                    data-testid="button-confirm-delete"
                  >
                    {deleteMutation.isPending ? "Deleting..." : "Delete"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardContent>

      {/* Add Candidate Dialog */}
      {client && (
        <>
          <AddCandidateToPositionDialog
            position={position}
            open={isAddCandidateDialogOpen}
            onOpenChange={setIsAddCandidateDialogOpen}
            onSuccess={refetchApplications}
          />

          {sendCandidateState.candidate && (
            <SendCandidateDialog
              candidate={sendCandidateState.candidate}
              position={position}
              client={client}
              open={sendCandidateState.open}
              onOpenChange={(open) => setSendCandidateState({ open, candidate: null })}
            />
          )}
        </>
      )}
    </Card>
  );
}

export default function Positions() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<string>("");
  const recruiterId = "c63b07a5-7323-4ae3-b3d5-e871d13526f0";

  const { data: positions = [], isLoading } = useQuery<Position[]>({
    queryKey: ['/api/positions'],
    queryFn: async () => {
      const response = await fetch('/api/positions', {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch positions');
      }
      return response.json();
    },
    staleTime: 30000,
  });

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ['/api/clients', recruiterId],
    queryFn: async () => {
      const response = await fetch(`/api/clients?recruiterId=${recruiterId}`, {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch clients');
      }
      return response.json();
    },
    staleTime: 30000,
  });

  const syncToPSMMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('POST', `/api/integration/psm/sync-position/${id}`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to sync position to PSM');
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({ 
        title: "Success", 
        description: `Position synced to Precision Source Management! PSM ID: ${data.psmId}` 
      });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const handleCreate = () => {
    setIsCreateDialogOpen(false);
  };

  const handleUpdate = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/positions'] });
  };

  // Filter positions by selected client
  const filteredPositions = selectedClient && selectedClient !== "all"
    ? positions.filter(position => position.clientId === selectedClient)
    : positions;

  // Create a map of clients for easy lookup
  const clientsMap = clients.reduce((acc, client) => {
    acc[client.id] = client;
    return acc;
  }, {} as Record<string, Client>);

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold">Positions</h1>
            <p className="text-muted-foreground">Manage job positions and track applications</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-80 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6" data-testid="page-positions">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-page-title">Positions</h1>
          <p className="text-muted-foreground" data-testid="text-page-description">
            Manage job positions and track applications
          </p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-position">
              <Plus className="h-4 w-4 mr-2" />
              Add Position
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Add New Position</DialogTitle>
              <DialogDescription>
                Create a new job position for a client.
              </DialogDescription>
            </DialogHeader>
            <PositionForm onSuccess={handleCreate} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Filter by client */}
      {clients.length > 0 && (
        <div className="mb-6">
          <Select onValueChange={setSelectedClient} value={selectedClient}>
            <SelectTrigger className="w-64" data-testid="select-filter-client">
              <SelectValue placeholder="Filter by client" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Clients</SelectItem>
              {clients.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.companyName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {filteredPositions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Briefcase className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2" data-testid="text-no-positions">
              {selectedClient ? "No positions for this client" : "No positions yet"}
            </h3>
            <p className="text-muted-foreground text-center mb-4">
              {selectedClient 
                ? "This client doesn't have any job positions yet." 
                : "Start building your job portfolio by adding your first position."
              }
            </p>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-first-position">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Position
                </Button>
              </DialogTrigger>
            </Dialog>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPositions.map((position) => (
            <PositionCard 
              key={position.id} 
              position={position} 
              client={clientsMap[position.clientId]}
              onUpdate={handleUpdate}
              onSyncToPSM={(positionId) => syncToPSMMutation.mutate(positionId)}
              isSyncingToPSM={syncToPSMMutation.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}