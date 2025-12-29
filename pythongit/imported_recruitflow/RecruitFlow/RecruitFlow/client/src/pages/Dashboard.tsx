import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import DashboardStats from "@/components/DashboardStats";
import CandidateCard from "@/components/CandidateCard";
import ClientCard from "@/components/ClientCard";
import PositionCard from "@/components/PositionCard";
import ContactTimeline from "@/components/ContactTimeline";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, ArrowRight, Search } from "lucide-react";
import type { Candidate, Client, Position, Contact } from "@shared/schema";

export default function Dashboard() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  
  // Fetch dashboard statistics
  const { data: stats = {
    totalCandidates: 0,
    activeCandidates: 0,
    totalClients: 0,
    openPositions: 0,
    scheduledInterviews: 0,
    placementsThisMonth: 0,
  }, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/dashboard/stats'],
  });

  // Fetch recent candidates
  const { data: allCandidates = [], isLoading: candidatesLoading } = useQuery({
    queryKey: ['/api/candidates'],
    select: (data) => (data as Candidate[]).slice(0, 5) || [],
  });

  // Fetch recent clients
  const { data: allClients = [], isLoading: clientsLoading } = useQuery({
    queryKey: ['/api/clients'],
    select: (data) => (data as Client[]).slice(0, 5) || [],
  });

  // Fetch recent positions
  const { data: allPositions = [], isLoading: positionsLoading } = useQuery({
    queryKey: ['/api/positions'],
    select: (data) => (data as Position[]).slice(0, 5) || [],
  });

  // Filter and search functionality
  const filteredCandidates = allCandidates.filter(candidate => {
    const matchesSearch = searchQuery === "" || 
      `${candidate.firstName} ${candidate.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      candidate.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      candidate.currentPosition?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });
  
  const filteredClients = allClients.filter(client => {
    const matchesSearch = searchQuery === "" ||
      client.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.contactName?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });
  
  const filteredPositions = allPositions.filter(position => {
    const matchesSearch = searchQuery === "" ||
      position.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      position.location?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterType === "all" || position.status === filterType;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="page-title">
            Dashboard
          </h1>
          <p className="text-muted-foreground">
            Welcome back! Here's what's happening with your recruiting pipeline.
          </p>
        </div>
        <Button data-testid="button-quick-add">
          <Plus className="h-4 w-4 mr-2" />
          Quick Add
        </Button>
      </div>

      {statsLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : (
        <DashboardStats
          stats={stats}
          onStatsClick={(statType) => console.log(`Navigate to ${statType}`)}
        />
      )}

      {/* Search and Filter Controls */}
      <Card>
        <CardContent className="py-4">
          <div className="flex gap-4 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search candidates, clients, or positions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-48" data-testid="select-filter">
                <SelectValue placeholder="Filter positions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Positions</SelectItem>
                <SelectItem value="open">Open Positions</SelectItem>
                <SelectItem value="closed">Closed Positions</SelectItem>
                <SelectItem value="on_hold">On Hold</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Candidates</CardTitle>
              <Button variant="ghost" size="sm" data-testid="link-all-candidates">
                View All
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {candidatesLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-20" />
                ))}
              </div>
            ) : filteredCandidates.length > 0 ? (
              filteredCandidates.map((candidate) => (
                <CandidateCard
                  key={candidate.id}
                  {...candidate}
                  phone={candidate.phone || undefined}
                  currentPosition={candidate.currentPosition || undefined}
                  currentCompany={candidate.currentCompany || undefined}
                  location={candidate.location || undefined}
                  applicationStatus="active"
                  skills={candidate.skills || []}
                  onContact={() => console.log('Contact candidate')}
                  onViewResume={() => console.log('View resume')}
                  onViewDetails={() => console.log('View candidate details')}
                />
              ))
            ) : (
              <div className="text-center text-muted-foreground py-8">
                No candidates found
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Activity</CardTitle>
              <Button variant="ghost" size="sm" data-testid="link-all-activity">
                View All
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-center text-muted-foreground py-8">
              Contact timeline coming soon...
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Active Clients</CardTitle>
              <Button variant="ghost" size="sm" data-testid="link-all-clients">
                View All
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {clientsLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-20" />
                ))}
              </div>
            ) : filteredClients.length > 0 ? (
              filteredClients.map((client) => (
                <ClientCard
                  key={client.id}
                  {...client}
                  contactPhone={client.contactPhone || undefined}
                  website={client.website || undefined}
                  agreementSigned={client.agreementSigned ? (typeof client.agreementSigned === 'string' ? client.agreementSigned : client.agreementSigned.toISOString()) : undefined}
                  activePositions={0}
                  onViewDetails={() => console.log('View client details')}
                  onAddPosition={() => console.log('Add position')}
                  onContact={() => console.log('Contact client')}
                />
              ))
            ) : (
              <div className="text-center text-muted-foreground py-8">
                No clients found
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Open Positions</CardTitle>
              <Button variant="ghost" size="sm" data-testid="link-all-positions">
                View All
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {positionsLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-20" />
                ))}
              </div>
            ) : filteredPositions.length > 0 ? (
              filteredPositions.map((position) => (
                <PositionCard
                  key={position.id}
                  {...position}
                  location={position.location || undefined}
                  salary={position.salary || undefined}
                  companyName={'Unknown Company'}
                  applicantCount={0}
                  onViewDetails={() => console.log('View position details')}
                  onViewApplicants={() => console.log('View applicants')}
                  onEditPosition={() => console.log('Edit position')}
                />
              ))
            ) : (
              <div className="text-center text-muted-foreground py-8">
                No positions found
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}