import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Progress } from '../ui/progress';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';
import type { Streak } from '@omnifit/shared';

interface StreakCardProps {
  streak: Streak;
  nextMilestone?: { days: number; reward: number };
  className?: string;
}

const StreakCard = React.forwardRef<HTMLDivElement, StreakCardProps>(
  ({ streak, nextMilestone, className }, ref) => {
    const categoryColor = streak.category === 'FITNESS' ? 'fitness' : 'spiritual';
    const progressToNext = nextMilestone 
      ? (streak.currentCount / nextMilestone.days) * 100 
      : 100;
    
    const getStreakIcon = (category: string) => {
      switch (category) {
        case 'FITNESS': return '💪';
        case 'SPIRITUAL': return '🙏';
        case 'HYBRID': return '✨';
        default: return '🎯';
      }
    };
    
    return (
      <Card ref={ref} className={cn('w-full', className)}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <span className="text-xl">{getStreakIcon(streak.category)}</span>
              <span>{streak.category} Streak</span>
            </CardTitle>
            <Badge variant={categoryColor as any}>
              {streak.type}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="pt-0">
          <div className="space-y-4">
            <div className="text-center">
              <div className="text-4xl font-bold mb-1">
                {streak.currentCount}
              </div>
              <div className="text-sm text-muted-foreground">
                Current Streak
              </div>
            </div>
            
            {nextMilestone && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Next milestone</span>
                  <span className="font-medium">
                    {nextMilestone.days} days (+{nextMilestone.reward} OMF)
                  </span>
                </div>
                <Progress 
                  value={progressToNext} 
                  variant={categoryColor as any}
                  className="h-2"
                />
                <div className="text-xs text-muted-foreground text-center">
                  {Math.max(0, nextMilestone.days - streak.currentCount)} days to go
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4 pt-3 border-t">
              <div className="text-center">
                <div className="text-lg font-semibold">
                  {streak.longestCount}
                </div>
                <div className="text-xs text-muted-foreground">
                  Longest Streak
                </div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold">
                  {Math.floor((new Date().getTime() - new Date(streak.startDate).getTime()) / (1000 * 60 * 60 * 24))}
                </div>
                <div className="text-xs text-muted-foreground">
                  Days Active
                </div>
              </div>
            </div>
            
            {!streak.isActive && (
              <div className="text-center text-sm text-destructive bg-destructive/10 rounded-md p-2">
                Streak broken on {new Date(streak.endDate!).toLocaleDateString()}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }
);

StreakCard.displayName = 'StreakCard';

export { StreakCard };