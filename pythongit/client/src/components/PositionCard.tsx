import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, MapPin, DollarSign, Users, Calendar, Eye } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface PositionCardProps {
  id: string;
  title: string;
  companyName: string;
  location?: string;
  salary?: string;
  status: string;
  applicantCount?: number;
  createdAt: Date;
  onViewDetails?: () => void;
  onViewApplicants?: () => void;
  onEditPosition?: () => void;
}

export default function PositionCard({
  title,
  companyName,
  location,
  salary,
  status,
  applicantCount = 0,
  createdAt,
  onViewDetails,
  onViewApplicants,
  onEditPosition,
}: PositionCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "open": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "filled": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "on_hold": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "cancelled": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
    }
  };

  return (
    <Card className="hover-elevate">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-semibold text-lg mb-1" data-testid="text-position-title">
              {title}
            </h3>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Building2 className="h-4 w-4" />
              <span data-testid="text-company-name">{companyName}</span>
            </div>
          </div>
          <Badge className={getStatusColor(status)} data-testid={`status-${status}`}>
            {status.replace("_", " ")}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="space-y-2">
          {location && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span data-testid="text-location">{location}</span>
            </div>
          )}
          {salary && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <DollarSign className="h-4 w-4" />
              <span data-testid="text-salary">{salary}</span>
            </div>
          )}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span data-testid="text-applicant-count">{applicantCount} applicants</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span data-testid="text-created-at">
                Posted {formatDistanceToNow(createdAt, { addSuffix: true })}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex justify-between gap-2 pt-2">
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={onViewApplicants}
              data-testid="button-applicants"
            >
              <Users className="h-4 w-4 mr-1" />
              Applicants
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onEditPosition}
              data-testid="button-edit"
            >
              Edit
            </Button>
          </div>
          <Button
            size="sm"
            onClick={onViewDetails}
            data-testid="button-details"
          >
            <Eye className="h-4 w-4 mr-1" />
            View Details
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}