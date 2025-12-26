import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, Mail, Phone, Globe, MapPin, FileText, Plus } from "lucide-react";

interface ClientCardProps {
  id: string;
  companyName: string;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  website?: string;
  address?: string;
  agreementSigned?: string;
  activePositions?: number;
  onViewDetails?: () => void;
  onAddPosition?: () => void;
  onContact?: () => void;
}

export default function ClientCard({
  companyName,
  contactName,
  contactEmail,
  contactPhone,
  website,
  address,
  agreementSigned,
  activePositions = 0,
  onViewDetails,
  onAddPosition,
  onContact,
}: ClientCardProps) {
  return (
    <Card className="hover-elevate">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg" data-testid="text-company-name">
                {companyName}
              </h3>
              <p className="text-sm text-muted-foreground" data-testid="text-contact-name">
                {contactName}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {agreementSigned && (
              <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" data-testid="status-agreement">
                Agreement Signed
              </Badge>
            )}
            {activePositions > 0 && (
              <Badge variant="secondary" data-testid="text-active-positions">
                {activePositions} active {activePositions === 1 ? 'position' : 'positions'}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Mail className="h-4 w-4" />
            <span data-testid="text-email">{contactEmail}</span>
          </div>
          {contactPhone && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="h-4 w-4" />
              <span data-testid="text-phone">{contactPhone}</span>
            </div>
          )}
          {website && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Globe className="h-4 w-4" />
              <a href={website} target="_blank" rel="noopener noreferrer" className="hover:text-primary" data-testid="link-website">
                {website.replace(/^https?:\/\//, '')}
              </a>
            </div>
          )}
          {address && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span data-testid="text-address">{address}</span>
            </div>
          )}
        </div>
        
        <div className="flex justify-between gap-2 pt-2">
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={onContact}
              data-testid="button-contact"
            >
              <Mail className="h-4 w-4 mr-1" />
              Contact
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onAddPosition}
              data-testid="button-add-position"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Position
            </Button>
          </div>
          <Button
            size="sm"
            onClick={onViewDetails}
            data-testid="button-details"
          >
            <FileText className="h-4 w-4 mr-1" />
            View Details
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}