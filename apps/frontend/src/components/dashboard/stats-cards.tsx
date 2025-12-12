import { Card, CardContent, CardHeader, CardTitle } from '@omnifit/ui';

export function StatsCards() {
  // TODO: Fetch real stats from API
  const stats = [
    {
      title: 'Total Activities',
      value: '42',
      change: '+12%',
      icon: '📊',
    },
    {
      title: 'Active Streaks',
      value: '3',
      change: '+1',
      icon: '🔥',
    },
    {
      title: 'OMF Earned',
      value: '2,500',
      change: '+150',
      icon: '🪙',
    },
    {
      title: 'Level Progress',
      value: 'Level 5',
      change: '75% to next',
      icon: '⭐',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {stat.title}
            </CardTitle>
            <span className="text-2xl">{stat.icon}</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            <p className="text-xs text-muted-foreground">
              {stat.change}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}