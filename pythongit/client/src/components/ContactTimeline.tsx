import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Phone, Mail, MessageSquare, Calendar, User, Plus } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ContactEntry {
  id: string;
  type: 'phone' | 'email' | 'in_person' | 'video_call';
  subject?: string;
  notes: string;
  contactDate: Date;
  recruiterName: string;
  followUpDate?: Date;
}

interface ContactTimelineProps {
  contacts: ContactEntry[];
  onAddContact?: () => void;
}

export default function ContactTimeline({ contacts, onAddContact }: ContactTimelineProps) {
  const getContactIcon = (type: string) => {
    switch (type) {
      case 'phone': return <Phone className="h-4 w-4" />;
      case 'email': return <Mail className="h-4 w-4" />;
      case 'video_call': return <MessageSquare className="h-4 w-4" />;
      case 'in_person': return <User className="h-4 w-4" />;
      default: return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getContactColor = (type: string) => {
    switch (type) {
      case 'phone': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'email': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'video_call': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'in_person': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Contact History</CardTitle>
          <Button
            size="sm"
            onClick={onAddContact}
            data-testid="button-add-contact"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Contact
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {contacts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No contact history yet</p>
            <p className="text-sm">Start by adding your first contact interaction</p>
          </div>
        ) : (
          <div className="space-y-4">
            {contacts.map((contact, index) => (
              <div key={contact.id} className="flex gap-3 group" data-testid={`contact-${index}`}>
                <div className="flex flex-col items-center">
                  <div className={`p-2 rounded-full ${getContactColor(contact.type)}`}>
                    {getContactIcon(contact.type)}
                  </div>
                  {index < contacts.length - 1 && (
                    <div className="w-px h-8 bg-border mt-2" />
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="capitalize" data-testid={`contact-type-${index}`}>
                        {contact.type.replace('_', ' ')}
                      </Badge>
                      {contact.subject && (
                        <span className="font-medium text-sm" data-testid={`contact-subject-${index}`}>
                          {contact.subject}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground" data-testid={`contact-date-${index}`}>
                      {formatDistanceToNow(contact.contactDate, { addSuffix: true })}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground" data-testid={`contact-notes-${index}`}>
                    {contact.notes}
                  </p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span data-testid={`contact-recruiter-${index}`}>by {contact.recruiterName}</span>
                    {contact.followUpDate && (
                      <div className="flex items-center gap-1" data-testid={`contact-followup-${index}`}>
                        <Calendar className="h-3 w-3" />
                        Follow up: {contact.followUpDate.toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}