import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertInterviewSchema, type Interview, type Application, type Candidate, type Position } from "@shared/schema";
import { format } from "date-fns";
import { Calendar, Clock, MapPin, Star, User, Building, Edit, Trash2, Plus, Phone, Video, Users, CalendarCheck, CalendarX } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

// Form schema for interview creation/editing
const interviewFormSchema = insertInterviewSchema.extend({
  scheduledDate: z.string().min(1, "Interview date is required"),
});

type InterviewFormData = z.infer<typeof interviewFormSchema>;


function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return "No date";
  try {
    return format(new Date(dateString), "MMM d, yyyy 'at' h:mm a");
  } catch {
    return "Invalid date";
  }
}

function getRatingStars(rating: number | null) {
  if (!rating) return "Not rated";
  return "★".repeat(rating) + "☆".repeat(5 - rating);
}

function InterviewForm({ interview, onSuccess }: { interview?: Interview; onSuccess: () => void }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const recruiterId = user?.recruiterId || "";
  const isEditing = !!interview;

  const form = useForm<InterviewFormData>({
    resolver: zodResolver(interviewFormSchema),
    defaultValues: {
      applicationId: interview?.applicationId || "",
      scheduledDate: interview?.scheduledDate 
        ? format(new Date(interview.scheduledDate), "yyyy-MM-dd'T'HH:mm")
        : "",
      interviewerName: interview?.interviewerName ?? "",
      interviewerEmail: interview?.interviewerEmail ?? "",
      location: interview?.location ?? "",
      notes: interview?.notes ?? "",
      feedback: interview?.feedback ?? "",
      rating: interview?.rating || undefined,
      // recruiterId omitted - will be set server-side when auth is implemented
    },
  });

  // Fetch applications for the dropdown
  const { data: applications = [] } = useQuery<Application[]>({
    queryKey: ['/api/applications'],
    enabled: !isEditing, // Only fetch for new interviews
  });

  // Fetch candidates and positions to show in application dropdown
  const { data: candidates = [] } = useQuery<Candidate[]>({
    queryKey: ['/api/candidates', { recruiterId }],
    enabled: !isEditing && !!recruiterId,
  });

  const { data: positions = [] } = useQuery<Position[]>({
    queryKey: ['/api/positions'],
    enabled: !isEditing,
  });

  const mutation = useMutation({
    mutationFn: async (data: InterviewFormData) => {
      const payload = {
        ...data,
        scheduledDate: new Date(data.scheduledDate).toISOString(),
        rating: data.rating || null,
        // recruiterId omitted - will be set server-side when auth is implemented
      };
      
      if (isEditing) {
        return apiRequest('PUT', `/api/interviews/${interview.id}`, payload);
      } else {
        return apiRequest('POST', '/api/interviews', payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/interviews'] });
      toast({
        title: isEditing ? "Interview updated" : "Interview scheduled",
        description: isEditing 
          ? "Interview details have been updated successfully."
          : "New interview has been scheduled successfully.",
      });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || `Failed to ${isEditing ? 'update' : 'schedule'} interview`,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InterviewFormData) => {
    mutation.mutate(data);
  };

  // Create maps for easy lookup
  const candidatesMap = (candidates as Candidate[]).reduce((acc, candidate) => {
    acc[candidate.id] = candidate;
    return acc;
  }, {} as Record<string, Candidate>);

  const positionsMap = positions.reduce((acc, position) => {
    acc[position.id] = position;
    return acc;
  }, {} as Record<string, Position>);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {!isEditing && (
          <FormField
            control={form.control}
            name="applicationId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Application</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-application">
                      <SelectValue placeholder="Select an application" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {applications.map((application) => {
                      const candidate = candidatesMap[application.candidateId];
                      const position = positionsMap[application.positionId];
                      return (
                        <SelectItem key={application.id} value={application.id}>
                          {candidate ? `${candidate.firstName} ${candidate.lastName}` : 'Unknown Candidate'} 
                          {' - '}
                          {position ? position.title : 'Unknown Position'}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="scheduledDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Interview Date & Time</FormLabel>
              <FormControl>
                <Input
                  type="datetime-local"
                  {...field}
                  data-testid="input-interview-date"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="interviewerName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Interviewer Name</FormLabel>
                <FormControl>
                  <Input placeholder="John Smith" {...field} value={field.value || ""} data-testid="input-interviewer-name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="interviewerEmail"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Interviewer Email</FormLabel>
                <FormControl>
                  <Input 
                    type="email" 
                    placeholder="john.smith@company.com" 
                    {...field} 
                    value={field.value || ""}
                    data-testid="input-interviewer-email" 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="location"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Location</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Conference Room A, Zoom, or Phone" 
                  {...field} 
                  value={field.value || ""}
                  data-testid="input-location" 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Preparation notes, questions to ask, etc."
                  {...field}
                  value={field.value || ""}
                  data-testid="textarea-notes"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {isEditing && (
          <>
            <FormField
              control={form.control}
              name="feedback"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Interview Feedback</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="How did the interview go? Candidate's strengths, areas for improvement, etc."
                      {...field}
                      value={field.value || ""}
                      data-testid="textarea-feedback"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="rating"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rating (1-5 stars)</FormLabel>
                  <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                    <FormControl>
                      <SelectTrigger data-testid="select-rating">
                        <SelectValue placeholder="Rate the candidate" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="1">1 Star - Poor</SelectItem>
                      <SelectItem value="2">2 Stars - Below Average</SelectItem>
                      <SelectItem value="3">3 Stars - Average</SelectItem>
                      <SelectItem value="4">4 Stars - Good</SelectItem>
                      <SelectItem value="5">5 Stars - Excellent</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}

        <div className="flex justify-end space-x-2">
          <Button
            type="submit"
            disabled={mutation.isPending}
            data-testid="button-save-interview"
          >
            {mutation.isPending 
              ? (isEditing ? "Updating..." : "Scheduling...")
              : (isEditing ? "Update Interview" : "Schedule Interview")
            }
          </Button>
        </div>
      </form>
    </Form>
  );
}

function InterviewCard({ interview }: { interview: Interview }) {
  const { toast } = useToast();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: () => apiRequest('DELETE', `/api/interviews/${interview.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/interviews'] });
      toast({
        title: "Interview deleted",
        description: "Interview has been successfully deleted.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete interview",
        variant: "destructive",
      });
    },
  });

  const syncCalendarMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/interviews/${interview.id}/sync-calendar`, {});
    },
    onSuccess: () => {
      toast({
        title: "Calendar synced",
        description: "Interview synced to Outlook calendar successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/interviews'] });
    },
    onError: (error: any) => {
      toast({
        title: "Sync failed",
        description: error.message || "Failed to sync to calendar",
        variant: "destructive",
      });
    },
  });

  const getLocationIcon = (location: string | null) => {
    if (!location) return <MapPin className="h-4 w-4" />;
    const lower = location.toLowerCase();
    if (lower.includes('zoom') || lower.includes('teams') || lower.includes('video')) {
      return <Video className="h-4 w-4" />;
    } else if (lower.includes('phone') || lower.includes('call')) {
      return <Phone className="h-4 w-4" />;
    } else {
      return <Building className="h-4 w-4" />;
    }
  };

  const getStatusBadge = () => {
    const now = new Date();
    const interviewDate = new Date(interview.scheduledDate);
    const isCompleted = interview.feedback || interview.rating;
    
    if (isCompleted) {
      return <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Completed</Badge>;
    } else if (interviewDate < now) {
      return <Badge variant="destructive">Overdue</Badge>;
    } else {
      return <Badge variant="secondary">Scheduled</Badge>;
    }
  };

  return (
    <Card className="hover-elevate" data-testid={`interview-card-${interview.id}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg">Interview #{interview.id.slice(-6)}</CardTitle>
            <CardDescription>
              Application ID: {interview.applicationId.slice(-6)}
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            {getStatusBadge()}
            {interview.outlookEventId && (
              <Badge variant="outline" className="text-green-600 border-green-600" data-testid={`badge-synced-${interview.id}`}>
                <CalendarCheck className="h-3 w-3 mr-1" />
                Synced
              </Badge>
            )}
            {!interview.outlookEventId && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => syncCalendarMutation.mutate()}
                disabled={syncCalendarMutation.isPending}
                data-testid={`button-sync-${interview.id}`}
              >
                <CalendarCheck className="h-4 w-4 mr-1" />
                Sync
              </Button>
            )}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" data-testid={`button-edit-${interview.id}`}>
                  <Edit className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Edit Interview</DialogTitle>
                  <DialogDescription>
                    Update interview details and add feedback after completion.
                  </DialogDescription>
                </DialogHeader>
                <InterviewForm 
                  interview={interview} 
                  onSuccess={() => setIsEditDialogOpen(false)} 
                />
              </DialogContent>
            </Dialog>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="outline" data-testid={`button-delete-${interview.id}`}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Interview</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this interview? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={() => deleteMutation.mutate()}
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
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm" data-testid={`text-date-${interview.id}`}>
              {formatDate(interview.scheduledDate?.toString())}
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            {getLocationIcon(interview.location)}
            <span className="text-sm text-muted-foreground" data-testid={`text-location-${interview.id}`}>
              {interview.location || "Location not specified"}
            </span>
          </div>
        </div>

        {interview.interviewerName && (
          <div className="flex items-center space-x-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm" data-testid={`text-interviewer-${interview.id}`}>
              {interview.interviewerName}
              {interview.interviewerEmail && (
                <span className="text-muted-foreground ml-1">({interview.interviewerEmail})</span>
              )}
            </span>
          </div>
        )}

        {interview.rating && (
          <div className="flex items-center space-x-2">
            <Star className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm" data-testid={`text-rating-${interview.id}`}>
              {getRatingStars(interview.rating)} ({interview.rating}/5)
            </span>
          </div>
        )}

        {interview.notes && (
          <div className="space-y-1">
            <h4 className="text-sm font-medium">Notes:</h4>
            <p className="text-sm text-muted-foreground" data-testid={`text-notes-${interview.id}`}>
              {interview.notes}
            </p>
          </div>
        )}

        {interview.feedback && (
          <div className="space-y-1">
            <h4 className="text-sm font-medium">Feedback:</h4>
            <p className="text-sm text-muted-foreground" data-testid={`text-feedback-${interview.id}`}>
              {interview.feedback}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Interviews() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { user } = useAuth();
  const recruiterId = user?.recruiterId || "";

  const { data: interviews = [], isLoading } = useQuery<Interview[]>({
    queryKey: ['/api/interviews', { recruiterId }],
    enabled: !!user?.recruiterId,
  });

  // Sort interviews by date (upcoming first, then past)
  const sortedInterviews = [...(interviews as Interview[])].sort((a, b) => {
    const dateA = new Date(a.scheduledDate);
    const dateB = new Date(b.scheduledDate);
    const now = new Date();
    
    // If both are in the future or both in the past, sort by date
    if ((dateA > now && dateB > now) || (dateA < now && dateB < now)) {
      return dateA.getTime() - dateB.getTime();
    }
    
    // Prioritize future dates over past dates
    return dateA > now ? -1 : 1;
  });

  // Get statistics
  const now = new Date();
  const upcomingInterviews = (interviews as Interview[]).filter((i: Interview) => new Date(i.scheduledDate) > now);
  const completedInterviews = (interviews as Interview[]).filter((i: Interview) => i.feedback || i.rating);

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-64 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="page-title">Interviews</h1>
          <p className="text-muted-foreground mt-1">
            Manage interview scheduling and capture feedback
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-interview">
              <Plus className="h-4 w-4 mr-2" />
              Schedule Interview
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Schedule New Interview</DialogTitle>
              <DialogDescription>
                Set up a new interview for a candidate application.
              </DialogDescription>
            </DialogHeader>
            <InterviewForm onSuccess={() => setIsCreateDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Interviews</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-total-interviews">
              {(interviews as Interview[]).length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400" data-testid="stat-upcoming-interviews">
              {upcomingInterviews.length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400" data-testid="stat-completed-interviews">
              {completedInterviews.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Interviews Grid */}
      {interviews.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No interviews scheduled</h3>
            <p className="text-muted-foreground mb-4">
              Get started by scheduling your first interview with a candidate.
            </p>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-schedule-first-interview">
                  <Plus className="h-4 w-4 mr-2" />
                  Schedule First Interview
                </Button>
              </DialogTrigger>
            </Dialog>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedInterviews.map((interview) => (
            <InterviewCard key={interview.id} interview={interview} />
          ))}
        </div>
      )}
    </div>
  );
}