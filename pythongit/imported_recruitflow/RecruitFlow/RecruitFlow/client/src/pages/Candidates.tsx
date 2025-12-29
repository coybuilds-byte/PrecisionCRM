import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import CandidateCard from "@/components/CandidateCard";
import CandidateDetailModal from "@/components/CandidateDetailModal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Filter, Upload, FileText } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CSVUpload } from "@/components/CSVUpload";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertCandidateSchema } from "@shared/schema";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";

type CandidateFormData = z.infer<typeof insertCandidateSchema>;

export default function Candidates() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get logged-in user from auth context
  const { data: authData } = useQuery({
    queryKey: ['/api/auth/me'],
    queryFn: async () => {
      const response = await fetch('/api/auth/me', { credentials: 'include' });
      if (!response.ok) return null;
      return response.json();
    }
  });
  
  const recruiterId = authData?.user?.id || "";
  const isOwner = authData?.user?.email === "jesse@precisionsourcemanagement.com";

  const { data: candidates = [], isLoading } = useQuery({
    queryKey: ['/api/candidates', isOwner ? 'all' : recruiterId],
    queryFn: async () => {
      if (!recruiterId) return [];
      // Owner sees all candidates, others see only their own
      const url = isOwner 
        ? '/api/candidates' 
        : `/api/candidates?recruiterId=${recruiterId}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch candidates');
      return response.json();
    },
    enabled: !!recruiterId
  });

  const createCandidateMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch('/api/candidates', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || 'Failed to create candidate');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/candidates'] });
      setIsDialogOpen(false);
      reset();
      toast({ title: "Success", description: "Candidate created successfully!" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const bulkUploadMutation = useMutation({
    mutationFn: async (csvData: any[]) => {
      const response = await fetch('/api/candidates/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          candidates: csvData.map(row => ({
            ...row,
            recruiterId: recruiterId,
            skills: row.skills ? row.skills.split(',').map((s: string) => s.trim()) : []
          }))
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to bulk upload candidates');
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/candidates'] });
      setIsBulkUploadOpen(false);
      toast({ 
        title: "Success", 
        description: `Successfully uploaded ${data.count} candidates!` 
      });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<CandidateFormData>({
    resolver: zodResolver(insertCandidateSchema),
    defaultValues: {
      recruiterId: recruiterId,
    }
  });

  const onSubmit = async (data: CandidateFormData) => {
    try {
      const response = await apiRequest('POST', '/api/candidates', data);
      const result = await response.json();
      queryClient.invalidateQueries({ queryKey: ['/api/candidates'] });
      setIsDialogOpen(false);
      reset();
      toast({ title: "Success", description: "Candidate created successfully!" });
    } catch (error) {
      toast({ title: "Error", description: (error as Error).message, variant: "destructive" });
    }
  };

  const filteredCandidates = candidates.filter((candidate: any) =>
    `${candidate.firstName} ${candidate.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    candidate.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    candidate.currentCompany?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="page-title">
            Candidates
          </h1>
          <p className="text-muted-foreground">
            Manage your candidate pipeline and track recruitment progress.
          </p>
        </div>
        <div className="flex gap-3">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-candidate">
                <Plus className="h-4 w-4 mr-2" />
                Add Candidate
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Candidate</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    {...register("firstName")}
                    data-testid="input-first-name"
                  />
                  {errors.firstName && (
                    <p className="text-sm text-destructive">{errors.firstName.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    {...register("lastName")}
                    data-testid="input-last-name"
                  />
                  {errors.lastName && (
                    <p className="text-sm text-destructive">{errors.lastName.message}</p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  {...register("email")}
                  data-testid="input-email"
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    {...register("phone")}
                    data-testid="input-phone"
                  />
                </div>
                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    {...register("location")}
                    data-testid="input-location"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="currentPosition">Current Position</Label>
                  <Input
                    id="currentPosition"
                    {...register("currentPosition")}
                    data-testid="input-current-position"
                  />
                </div>
                <div>
                  <Label htmlFor="currentCompany">Current Company</Label>
                  <Input
                    id="currentCompany"
                    {...register("currentCompany")}
                    data-testid="input-current-company"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="expectedSalary">Expected Salary</Label>
                <Input
                  id="expectedSalary"
                  {...register("expectedSalary")}
                  data-testid="input-expected-salary"
                  placeholder="e.g., $80,000 - $100,000"
                />
              </div>

              <div>
                <Label htmlFor="skills">Skills (comma-separated)</Label>
                <Input
                  id="skills"
                  {...register("skills", {
                    setValueAs: (value) => {
                      // Handle both string and array inputs
                      if (!value) return [];
                      if (Array.isArray(value)) return value;
                      return value.split(',').map((s: string) => s.trim());
                    }
                  })}
                  data-testid="input-skills"
                  placeholder="e.g., React, TypeScript, Node.js"
                />
              </div>

              <div>
                <Label>Resume Upload (Direct)</Label>
                <p className="text-sm text-muted-foreground mb-2">
                  Upload a PDF or DOCX resume to automatically extract contact info and skills
                </p>
                <input
                  type="file"
                  accept=".pdf,.docx,.doc"
                  className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;

                    try {
                      toast({ title: "Uploading", description: "Processing your resume..." });
                      
                      const formData = new FormData();
                      formData.append('file', file);
                      
                      const response = await fetch('/api/upload/resume', {
                        method: 'POST',
                        body: formData,
                        credentials: 'include'
                      });
                      
                      if (!response.ok) {
                        throw new Error('Upload failed');
                      }
                      
                      const parseResult = await response.json();
                      console.log('[FRONTEND] Received parse result:', parseResult);
                      
                      // Auto-fill form with extracted data (data is nested in parseResult.data)
                      const data = parseResult.data || parseResult;
                      
                      if (data.firstName) {
                        setValue("firstName", data.firstName);
                      }
                      if (data.lastName) {
                        setValue("lastName", data.lastName);
                      }
                      if (data.email) {
                        setValue("email", data.email);
                      }
                      if (data.phone) {
                        setValue("phone", data.phone);
                      }
                      if (data.location || data.address) {
                        setValue("location", data.location || data.address);
                      }
                      if (data.skills && data.skills.length > 0) {
                        setValue("skills", data.skills.join(', '));
                      }
                      
                      toast({
                        title: "Resume Parsed Successfully",
                        description: `Auto-filled contact info and ${data.skills?.length || 0} skills from resume`,
                      });
                    } catch (error) {
                      toast({
                        title: "Error",
                        description: "Failed to parse resume",
                        variant: "destructive",
                      });
                    }
                  }}
                />
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  {...register("notes")}
                  data-testid="input-notes"
                  placeholder="Any additional notes about the candidate..."
                />
              </div>

              {/* Hidden fields for resume data */}
              <input type="hidden" {...register("resumeUrl")} />
              <input type="hidden" {...register("resumeText")} />
              <input type="hidden" {...register("resumeFilename")} />

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createCandidateMutation.isPending}
                  data-testid="button-submit"
                >
                  {createCandidateMutation.isPending ? "Creating..." : "Create Candidate"}
                </Button>
              </div>
            </form>
          </DialogContent>
          </Dialog>
          
          <Dialog open={isBulkUploadOpen} onOpenChange={setIsBulkUploadOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" data-testid="button-bulk-upload-candidates">
                <Upload className="h-4 w-4 mr-2" />
                Bulk Upload
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Bulk Upload Candidates</DialogTitle>
              </DialogHeader>
              <CSVUpload
                onUpload={bulkUploadMutation.mutate}
                expectedFields={['firstName', 'lastName', 'email', 'phone', 'location', 'skills', 'experience', 'summary']}
                title="Upload Candidate CSV"
                description="Upload a CSV file with candidate information. Expected columns: firstName, lastName, email, phone, location, skills, experience, summary"
                isUploading={bulkUploadMutation.isPending}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search candidates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="input-search"
          />
        </div>
        <Button variant="outline" data-testid="button-filter">
          <Filter className="h-4 w-4 mr-2" />
          Filter
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Candidates ({filteredCandidates.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <p>Loading candidates...</p>
            </div>
          ) : filteredCandidates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No candidates found.</p>
              <p className="text-sm">Add your first candidate to get started.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredCandidates.map((candidate: any) => (
                <CandidateCard
                  key={candidate.id}
                  id={candidate.id}
                  firstName={candidate.firstName}
                  lastName={candidate.lastName}
                  email={candidate.email}
                  phone={candidate.phone}
                  currentPosition={candidate.currentPosition}
                  currentCompany={candidate.currentCompany}
                  location={candidate.location}
                  skills={candidate.skills || []}
                  applicationStatus="new" // todo: get from applications
                  onContact={() => setSelectedCandidateId(candidate.id)}
                  onViewResume={() => setSelectedCandidateId(candidate.id)}
                  onViewDetails={() => setSelectedCandidateId(candidate.id)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedCandidateId && (
        <CandidateDetailModal
          candidateId={selectedCandidateId}
          isOpen={!!selectedCandidateId}
          onClose={() => setSelectedCandidateId(null)}
        />
      )}
    </div>
  );
}