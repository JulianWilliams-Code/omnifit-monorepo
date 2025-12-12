import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';
import type { Event } from '@omnifit/shared';

interface ActivityCardProps {
  event: Event;
  showRewards?: boolean;
  className?: string;
}

const ActivityCard = React.forwardRef<HTMLDivElement, ActivityCardProps>(
  ({ event, showRewards = true, className }, ref) => {
    const categoryColor = event.category === 'FITNESS' ? 'fitness' : 'spiritual';
    
    return (
      <Card ref={ref} className={cn('w-full', className)}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{event.title}</CardTitle>
            <Badge variant={categoryColor as any}>
              {event.category}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{event.type}</span>
            {event.duration && (
              <>
                <span>•</span>
                <span>{event.duration} min</span>
              </>
            )}
            {event.intensity && (
              <>
                <span>•</span>
                <span>Intensity: {event.intensity}/10</span>
              </>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="pt-0">
          {event.description && (
            <p className="text-sm text-muted-foreground mb-3">
              {event.description}
            </p>
          )}
          
          {event.exercises && event.exercises.length > 0 && (
            <div className="mb-3">
              <h4 className="font-medium mb-2 text-sm">Exercises</h4>
              <div className="space-y-1">
                {event.exercises.map((exercise, index) => (
                  <div key={index} className="text-sm text-muted-foreground">
                    <span className="font-medium">{exercise.name}</span>
                    {exercise.sets && exercise.reps && (
                      <span> - {exercise.sets} sets × {exercise.reps} reps</span>
                    )}
                    {exercise.weight && (
                      <span> @ {exercise.weight}kg</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {(event.gratitude && event.gratitude.length > 0) && (
            <div className="mb-3">
              <h4 className="font-medium mb-2 text-sm">Gratitude</h4>
              <div className="space-y-1">
                {event.gratitude.map((item, index) => (
                  <p key={index} className="text-sm text-muted-foreground">
                    • {item}
                  </p>
                ))}
              </div>
            </div>
          )}
          
          {event.reflection && (
            <div className="mb-3">
              <h4 className="font-medium mb-2 text-sm">Reflection</h4>
              <p className="text-sm text-muted-foreground">{event.reflection}</p>
            </div>
          )}
          
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{new Date(event.completedAt).toLocaleDateString()}</span>
            {event.location && <span>{event.location}</span>}
          </div>
        </CardContent>
      </Card>
    );
  }
);

ActivityCard.displayName = 'ActivityCard';

export { ActivityCard };