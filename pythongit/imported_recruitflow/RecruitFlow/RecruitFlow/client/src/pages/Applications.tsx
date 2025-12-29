import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Eye, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertApplicationSchema, type Application, type Candidate, type Position } from "@shared/schema";
import { z } from "zod";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

type ApplicationFormData = z.infer<typeof insertApplicationSchema>;

const APPLICATION_STATUSES = [
  { value: "new", label: "New", color: "bg-blue-100 text-blue-800" },
  { value: "screening", label: "Screening", color: "bg-yellow-100 text-yellow-800" },
  { value: "interviewed", label: "Interviewed", color: "bg-purple-100 text-purple-800" },
  { value: "reference_check", label: "Reference Check", color: "bg-orange-100 text-orange-800" },
  { value: "offer_pending", label: "Offer Pending", color: "bg-cyan-100 text-cyan-800" },
  { value: "hired", label: "Hired", color: "bg-green-100 text-green-800" },
  { value: "rejected", label: "Rejected", color: "bg-red-100 text-red-800" },
  { value: "withdrawn", label: "Withdrawn", color: "bg-gray-100 text-gray-800" },
];

export default function Applications() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fixed recruiter ID for demo - in real app this would come from auth
  const DEMO_RECRUITER_ID = "c63b07a5-7323-4ae3-b3d5-e871d13526f0";

  const { data: applications = [], isLoading } = useQuery<Application[]>({
    queryKey: ['/api/applications', DEMO_RECRUITER_ID],
    queryFn: async () => {
      const response = await fetch(`/api/applications?recruiterId=${DEMO_RECRUITER_ID}`);
      if (!response.ok) throw new Error('Failed to fetch applications');
      return response.json();
    }
  });

  const { data: candidates = [] } = useQuery<Candidate[]>({
    queryKey: ['/api/candidates', DEMO_RECRUITER_ID],
    queryFn: async () => {
      const response = await fetch(`/api/candidates?recruiterId=${DEMO_RECRUITER_ID}`);
      if (!response.ok) throw new Error('Failed to fetch candidates');
      return response.json();
    }
  });

  const { data: positions = [] } = useQuery<Position[]>({
    queryKey: ['/api/positions'],
    queryFn: async () => {
      const response = await fetch('/api/positions');
      if (!response.ok) throw new Error('Failed to fetch positions');
      return response.json();
    }
  });

  const createApplicationMutation = useMutation({
    mutationFn: async (data: ApplicationFormData) => {
      const response = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || 'Failed to create application');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/applications'] });
      setIsCreateDialogOpen(false);
      reset();
      toast({ title: "Success", description: "Application created successfully!" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const response = await fetch(`/api/applications/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error('Failed to update application status');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/applications'] });
      toast({ title: "Success", description: "Application status updated!" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const deleteApplicationMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/applications/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete application');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/applications'] });
      toast({ title: "Success", description: "Application deleted successfully!" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ApplicationFormData>({
    resolver: zodResolver(insertApplicationSchema),
    defaultValues: {
      recruiterId: DEMO_RECRUITER_ID,
      status: "new",
    }
  });

  const onSubmit = (data: ApplicationFormData) => {
    createApplicationMutation.mutate(data);
  };

  const filteredApplications = applications.filter(app => {
    const candidate = candidates.find(c => c.id === app.candidateId);
    const position = positions.find(p => p.id === app.positionId);
    
    const matchesSearch = !searchTerm || 
      candidate?.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      candidate?.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      candidate?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      position?.title?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || app.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusConfig = (status: string) => {
    return APPLICATION_STATUSES.find(s => s.value === status) || APPLICATION_STATUSES[0];
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold" data-testid="text-page-title">Applications</h1>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-application">
              <Plus className="w-4 h-4 mr-2" />
              Add Application
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Application</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Label htmlFor="candidateId">Candidate</Label>
                <Select onValueChange={(value) => register("candidateId").onChange({ target: { value } })}>
                  <SelectTrigger data-testid="select-candidate">
                    <SelectValue placeholder="Select candidate" />
                  </SelectTrigger>
                  <SelectContent>
                    {candidates.map((candidate) => (
                      <SelectItem key={candidate.id} value={candidate.id}>
                        {candidate.firstName} {candidate.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.candidateId && <p className="text-sm text-red-600">{errors.candidateId.message}</p>}
              </div>

              <div>
                <Label htmlFor="positionId">Position</Label>
                <Select onValueChange={(value) => register("positionId").onChange({ target: { value } })}>
                  <SelectTrigger data-testid="select-position">
                    <SelectValue placeholder="Select position" />
                  </SelectTrigger>
                  <SelectContent>
                    {positions.map((position) => (
                      <SelectItem key={position.id} value={position.id}>
                        {position.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.positionId && <p className="text-sm text-red-600">{errors.positionId.message}</p>}
              </div>

              <div>
                <Label htmlFor="status">Status</Label>
                <Select defaultValue="new" onValueChange={(value) => register("status").onChange({ target: { value } })}>
                  <SelectTrigger data-testid="select-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {APPLICATION_STATUSES.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.status && <p className="text-sm text-red-600">{errors.status.message}</p>}
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  {...register("notes")}
                  placeholder="Application notes..."
                  data-testid="input-notes"
                />
                {errors.notes && <p className="text-sm text-red-600">{errors.notes.message}</p>}
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="submit" disabled={createApplicationMutation.isPending} data-testid="button-submit">
                  {createApplicationMutation.isPending ? "Creating..." : "Create Application"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filter Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Search & Filter</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search applications..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="input-search"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48" data-testid="select-filter-status">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {APPLICATION_STATUSES.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Applications List */}
      <div className="grid gap-4">
        {filteredApplications.length === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center">
                <p className="text-gray-500 mb-4" data-testid="text-no-applications">No applications found</p>
                <Button onClick={() => setIsCreateDialogOpen(true)} data-testid="button-create-first">
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Application
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredApplications.map((application) => {
            const candidate = candidates.find(c => c.id === application.candidateId);
            const position = positions.find(p => p.id === application.positionId);
            const statusConfig = getStatusConfig(application.status || 'new');

            return (
              <Card key={application.id} className="hover-elevate" data-testid={`card-application-${application.id}`}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg" data-testid={`text-candidate-${application.id}`}>
                          {candidate?.firstName} {candidate?.lastName}
                        </h3>
                        <Badge className={statusConfig.color} data-testid={`badge-status-${application.id}`}>
                          {statusConfig.label}
                        </Badge>
                      </div>
                      <p className="text-gray-600 mb-1" data-testid={`text-position-${application.id}`}>
                        <strong>Position:</strong> {position?.title}
                      </p>
                      <p className="text-gray-600 mb-1" data-testid={`text-email-${application.id}`}>
                        <strong>Email:</strong> {candidate?.email}
                      </p>
                      <p className="text-gray-600 mb-3" data-testid={`text-applied-date-${application.id}`}>
                        <strong>Applied:</strong> {application.appliedDate ? new Date(application.appliedDate).toLocaleDateString() : 'Not set'}
                      </p>
                      {application.notes && (
                        <p className="text-gray-700" data-testid={`text-notes-${application.id}`}>
                          <strong>Notes:</strong> {application.notes}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Select
                        value={application.status || 'new'}
                        onValueChange={(status) => updateStatusMutation.mutate({ id: application.id, status })}
                        disabled={updateStatusMutation.isPending}
                      >
                        <SelectTrigger className="w-40" data-testid={`select-status-${application.id}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {APPLICATION_STATUSES.map((status) => (
                            <SelectItem key={status.value} value={status.value}>
                              {status.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="icon" data-testid={`button-delete-${application.id}`}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Application</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this application? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteApplicationMutation.mutate(application.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}