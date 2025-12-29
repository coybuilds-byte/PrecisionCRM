import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Building2, Briefcase, Calendar, TrendingUp, TrendingDown } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  change?: {
    value: string;
    trend: 'up' | 'down' | 'neutral';
  };
  onClick?: () => void;
}

function StatsCard({ title, value, icon, change, onClick }: StatsCardProps) {
  const getTrendIcon = () => {
    if (!change) return null;
    return change.trend === 'up' ? (
      <TrendingUp className="h-4 w-4 text-green-600" />
    ) : change.trend === 'down' ? (
      <TrendingDown className="h-4 w-4 text-red-600" />
    ) : null;
  };

  const getTrendColor = () => {
    if (!change) return '';
    return change.trend === 'up' ? 'text-green-600' : change.trend === 'down' ? 'text-red-600' : 'text-muted-foreground';
  };

  return (
    <Card className="hover-elevate cursor-pointer" onClick={onClick}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold" data-testid={`stat-${title.toLowerCase().replace(' ', '-')}`}>
          {value}
        </div>
        {change && (
          <div className={`flex items-center gap-1 text-xs ${getTrendColor()}`}>
            {getTrendIcon()}
            <span>{change.value}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface DashboardStatsProps {
  stats: {
    totalCandidates: number;
    activeCandidates: number;
    totalClients: number;
    openPositions: number;
    scheduledInterviews: number;
    placementsThisMonth: number;
  };
  onStatsClick?: (statType: string) => void;
}

export default function DashboardStats({ stats, onStatsClick }: DashboardStatsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      <StatsCard
        title="Total Candidates"
        value={stats.totalCandidates}
        icon={<Users className="h-4 w-4" />}
        change={{ value: "+12% from last month", trend: "up" }}
        onClick={() => onStatsClick?.('candidates')}
      />
      <StatsCard
        title="Active Candidates"
        value={stats.activeCandidates}
        icon={<Users className="h-4 w-4" />}
        change={{ value: "+8% from last month", trend: "up" }}
        onClick={() => onStatsClick?.('active-candidates')}
      />
      <StatsCard
        title="Total Clients"
        value={stats.totalClients}
        icon={<Building2 className="h-4 w-4" />}
        change={{ value: "+2 this month", trend: "up" }}
        onClick={() => onStatsClick?.('clients')}
      />
      <StatsCard
        title="Open Positions"
        value={stats.openPositions}
        icon={<Briefcase className="h-4 w-4" />}
        change={{ value: "+5 this week", trend: "up" }}
        onClick={() => onStatsClick?.('positions')}
      />
      <StatsCard
        title="Scheduled Interviews"
        value={stats.scheduledInterviews}
        icon={<Calendar className="h-4 w-4" />}
        change={{ value: "This week", trend: "neutral" }}
        onClick={() => onStatsClick?.('interviews')}
      />
      <StatsCard
        title="Placements"
        value={stats.placementsThisMonth}
        icon={<TrendingUp className="h-4 w-4" />}
        change={{ value: "This month", trend: "up" }}
        onClick={() => onStatsClick?.('placements')}
      />
    </div>
  );
}