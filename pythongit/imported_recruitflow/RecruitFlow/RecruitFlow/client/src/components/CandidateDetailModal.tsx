import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ContactTimeline from "./ContactTimeline";
import ContactForm from "./ContactForm";
import { SendEmailDialog } from "./SendEmailDialog";
import { ScheduleInterviewDialog } from "./ScheduleInterviewDialog";
import { ScheduleInterviewFromCandidateDialog } from "./ScheduleInterviewFromCandidateDialog";
import { Phone, Mail, MapPin, FileText, MessageSquare, Plus, Calendar } from "lucide-react";

interface CandidateDetailModalProps {
  candidateId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function CandidateDetailModal({ candidateId, isOpen, onClose }: CandidateDetailModalProps) {
  const [showContactForm, setShowContactForm] = useState(false);

  const { data: candidate } = useQuery({
    queryKey: ['/api/candidates', candidateId],
    queryFn: async () => {
      const response = await fetch(`/api/candidates/${candidateId}`);
      if (!response.ok) throw new Error('Failed to fetch candidate');
      return response.json();
    },
    enabled: isOpen && !!candidateId,
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ['/api/candidates', candidateId, 'contacts'],
    queryFn: async () => {
      const response = await fetch(`/api/candidates/${candidateId}/contacts`);
      if (!response.ok) throw new Error('Failed to fetch contacts');
      return response.json();
    },
    enabled: isOpen && !!candidateId,
  });

  const { data: emails = [] } = useQuery({
    queryKey: ['/api/candidates', candidateId, 'emails'],
    queryFn: async () => {
      const response = await fetch(`/api/candidates/${candidateId}/emails`);
      if (!response.ok) throw new Error('Failed to fetch emails');
      return response.json();
    },
    enabled: isOpen && !!candidateId,
  });

  const { data: applications = [] } = useQuery({
    queryKey: ['/api/applications', candidateId],
    queryFn: async () => {
      const response = await fetch(`/api/applications?candidateId=${candidateId}`);
      if (!response.ok) throw new Error('Failed to fetch applications');
      return response.json();
    },
    enabled: isOpen && !!candidateId,
  });

  const { data: user } = useQuery<any>({
    queryKey: ["/api/auth/me"],
  });

  if (!candidate) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl">
              {candidate.firstName} {candidate.lastName}
            </DialogTitle>
            <div className="flex gap-2">
              <ScheduleInterviewFromCandidateDialog
                candidateId={candidateId}
                candidateName={`${candidate.firstName} ${candidate.lastName}`}
                recruiterId={user?.recruiterId || ''}
              />
              <SendEmailDialog 
                candidateId={candidateId}
                candidateEmail={candidate.email}
                candidateName={`${candidate.firstName} ${candidate.lastName}`}
              />
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="contacts">Contact History</TabsTrigger>
            <TabsTrigger value="applications">Applications</TabsTrigger>
            <TabsTrigger value="emails">Email History</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{candidate.email}</span>
                  </div>
                  {candidate.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{candidate.phone}</span>
                    </div>
                  )}
                  {candidate.location && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{candidate.location}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Current Position</CardTitle>
                </CardHeader>
                <CardContent>
                  {candidate.currentPosition && (
                    <div className="space-y-2">
                      <p className="font-medium">{candidate.currentPosition}</p>
                      {candidate.currentCompany && (
                        <p className="text-muted-foreground">{candidate.currentCompany}</p>
                      )}
                      {candidate.expectedSalary && (
                        <p className="text-sm">Expected: {candidate.expectedSalary}</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {candidate.skills && candidate.skills.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Skills</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {candidate.skills.map((skill: string, index: number) => (
                      <Badge key={index} variant="secondary">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {candidate.notes && (
              <Card>
                <CardHeader>
                  <CardTitle>Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{candidate.notes}</p>
                </CardContent>
              </Card>
            )}

            {(candidate.resumeText || candidate.resumeUrl) && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Resume {candidate.resumeFilename && `(${candidate.resumeFilename})`}
                  </CardTitle>
                  {candidate.resumeUrl && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(candidate.resumeUrl, '_blank')}
                      data-testid="button-view-resume-pdf"
                    >
                      <FileText className="h-4 w-4 mr-1" />
                      View PDF
                    </Button>
                  )}
                </CardHeader>
                {candidate.resumeText && (
                  <CardContent>
                    <pre className="text-sm whitespace-pre-wrap bg-muted p-4 rounded-md max-h-64 overflow-y-auto">
                      {candidate.resumeText}
                    </pre>
                  </CardContent>
                )}
              </Card>
            )}
          </TabsContent>

          <TabsContent value="contacts" className="space-y-4">
            {showContactForm ? (
              <Card>
                <CardHeader>
                  <CardTitle>Log New Contact</CardTitle>
                </CardHeader>
                <CardContent>
                  <ContactForm
                    candidateId={candidateId}
                    onSuccess={() => setShowContactForm(false)}
                    onCancel={() => setShowContactForm(false)}
                  />
                </CardContent>
              </Card>
            ) : (
              <div className="flex justify-end mb-4">
                <Button
                  onClick={() => setShowContactForm(true)}
                  data-testid="button-add-contact"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Log Contact
                </Button>
              </div>
            )}

            <ContactTimeline
              contacts={contacts.map((contact: any) => ({
                id: contact.id,
                type: contact.type,
                subject: contact.subject,
                notes: contact.notes,
                contactDate: new Date(contact.contactDate),
                recruiterName: "John Smith", // todo: get from recruiter relation
                followUpDate: contact.followUpDate ? new Date(contact.followUpDate) : undefined,
              }))}
              onAddContact={() => setShowContactForm(true)}
            />
          </TabsContent>

          <TabsContent value="applications" className="space-y-4">
            {applications.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No applications for this candidate
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {applications.map((application: any) => (
                  <Card key={application.id} data-testid={`application-${application.id}`}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-lg">
                        {application.position?.title || 'Position'}
                      </CardTitle>
                      <Badge variant={
                        application.status === 'placed' ? 'default' :
                        application.status === 'rejected' ? 'destructive' :
                        'secondary'
                      } data-testid={`badge-status-${application.id}`}>
                        {application.status}
                      </Badge>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {application.position?.client && (
                        <p className="text-sm text-muted-foreground">
                          Client: {application.position.client.companyName}
                        </p>
                      )}
                      <p className="text-sm">
                        Applied: {new Date(application.appliedDate).toLocaleDateString()}
                      </p>
                      {application.notes && (
                        <p className="text-sm bg-muted p-2 rounded">
                          {application.notes}
                        </p>
                      )}
                      <div className="flex gap-2 pt-2">
                        <ScheduleInterviewDialog
                          applicationId={application.id}
                          candidateName={`${candidate.firstName} ${candidate.lastName}`}
                          positionTitle={application.position?.title || 'Position'}
                          recruiterId={user?.recruiterId || ''}
                          trigger={
                            <Button variant="outline" size="sm" data-testid={`button-schedule-${application.id}`}>
                              <Calendar className="h-4 w-4 mr-2" />
                              Schedule Interview
                            </Button>
                          }
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="emails" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Email History</CardTitle>
              </CardHeader>
              <CardContent>
                {emails.length === 0 ? (
                  <p className="text-muted-foreground">No emails sent yet.</p>
                ) : (
                  <div className="space-y-4">
                    {emails.map((email: any) => (
                      <div key={email.id} className="border-b pb-4 last:border-0" data-testid={`email-${email.id}`}>
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h4 className="font-medium" data-testid={`email-subject-${email.id}`}>{email.subject}</h4>
                            <p className="text-sm text-muted-foreground">
                              To: {email.recipientEmail}
                            </p>
                          </div>
                          <Badge variant={email.status === 'sent' ? 'default' : 'secondary'} data-testid={`email-status-${email.id}`}>
                            {email.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          Sent: {new Date(email.sentAt).toLocaleDateString()} at {new Date(email.sentAt).toLocaleTimeString()}
                        </p>
                        {email.openedAt && (
                          <p className="text-sm text-green-600">
                            Opened: {new Date(email.openedAt).toLocaleDateString()}
                          </p>
                        )}
                        {email.clickedAt && (
                          <p className="text-sm text-blue-600">
                            Clicked: {new Date(email.clickedAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}