import { TokenBalance, StreakCard, ActivityCard } from '@omnifit/ui';
import { StatsCards } from '@/components/dashboard/stats-cards';
import { RecentActivities } from '@/components/dashboard/recent-activities';

export default function DashboardPage() {
  // TODO: Fetch user data from API
  const mockUser = {
    totalTokens: 2500,
    pendingRewards: 150,
  };

  const mockStreak = {
    id: '1',
    userId: '1',
    type: 'DAILY' as const,
    category: 'FITNESS' as const,
    currentCount: 7,
    longestCount: 21,
    lastActiveDate: new Date(),
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    isActive: true,
    milestones: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Welcome back!</h1>
        <p className="text-muted-foreground">
          Here's your faith + fitness journey overview
        </p>
      </div>

      <StatsCards />

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-4">Recent Activities</h2>
            <RecentActivities />
          </div>
        </div>

        <div className="space-y-6">
          <TokenBalance
            balance={mockUser.totalTokens}
            pendingRewards={mockUser.pendingRewards}
            showUSDValue
          />

          <StreakCard
            streak={mockStreak}
            nextMilestone={{ days: 14, reward: 200 }}
          />
        </div>
      </div>
    </div>
  );
}