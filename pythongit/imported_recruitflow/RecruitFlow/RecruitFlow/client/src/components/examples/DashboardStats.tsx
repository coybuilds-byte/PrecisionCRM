import DashboardStats from '../DashboardStats';

export default function DashboardStatsExample() {
  // todo: remove mock functionality
  const mockStats = {
    totalCandidates: 847,
    activeCandidates: 234,
    totalClients: 28,
    openPositions: 42,
    scheduledInterviews: 15,
    placementsThisMonth: 8,
  };

  return (
    <div className="w-full">
      <DashboardStats
        stats={mockStats}
        onStatsClick={(statType) => console.log(`Clicked on ${statType}`)}
      />
    </div>
  );
}