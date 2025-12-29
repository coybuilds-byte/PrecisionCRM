import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Phone, Mail, MapPin, FileText, MessageSquare } from "lucide-react";

interface CandidateCardProps {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  currentPosition?: string;
  currentCompany?: string;
  location?: string;
  skills?: string[];
  applicationStatus?: string;
  onContact?: () => void;
  onViewResume?: () => void;
  onViewDetails?: () => void;
}

export default function CandidateCard({
  firstName,
  lastName,
  email,
  phone,
  currentPosition,
  currentCompany,
  location,
  skills = [],
  applicationStatus = "new",
  onContact,
  onViewResume,
  onViewDetails,
}: CandidateCardProps) {
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`;
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case "hired": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "interviewed": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "screening": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "rejected": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
    }
  };

  return (
    <Card className="hover-elevate">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="bg-primary text-primary-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold text-lg" data-testid="text-candidate-name">
                {firstName} {lastName}
              </h3>
              {currentPosition && (
                <p className="text-sm text-muted-foreground" data-testid="text-current-position">
                  {currentPosition} {currentCompany && `at ${currentCompany}`}
                </p>
              )}
            </div>
          </div>
          <Badge className={getStatusColor(applicationStatus)} data-testid={`status-${applicationStatus}`}>
            {applicationStatus.replace("_", " ")}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Mail className="h-4 w-4" />
            <span data-testid="text-email">{email}</span>
          </div>
          {phone && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="h-4 w-4" />
              <span data-testid="text-phone">{phone}</span>
            </div>
          )}
          {location && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span data-testid="text-location">{location}</span>
            </div>
          )}
        </div>
        
        {skills.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Skills</p>
            <div className="flex flex-wrap gap-1">
              {skills.slice(0, 4).map((skill, index) => (
                <Badge key={index} variant="secondary" className="text-xs" data-testid={`skill-${index}`}>
                  {skill}
                </Badge>
              ))}
              {skills.length > 4 && (
                <Badge variant="secondary" className="text-xs">
                  +{skills.length - 4} more
                </Badge>
              )}
            </div>
          </div>
        )}
        
        <div className="flex justify-between gap-2 pt-2">
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={onContact}
              data-testid="button-contact"
            >
              <MessageSquare className="h-4 w-4 mr-1" />
              Contact
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onViewResume}
              data-testid="button-resume"
            >
              <FileText className="h-4 w-4 mr-1" />
              Resume
            </Button>
          </div>
          <Button
            size="sm"
            onClick={onViewDetails}
            data-testid="button-details"
          >
            View Details
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}