import { ActivityCard } from '@omnifit/ui';
import type { Event } from '@omnifit/shared';

export function RecentActivities() {
  // TODO: Fetch real activities from API
  const mockActivities: Event[] = [
    {
      id: '1',
      userId: '1',
      type: 'WORKOUT',
      category: 'FITNESS',
      title: 'Morning Strength Training',
      description: 'Full body workout focusing on compound movements',
      duration: 45,
      intensity: 8,
      mood: 'GOOD',
      energy: 'HIGH',
      tags: ['strength', 'morning'],
      completedAt: new Date(),
      createdAt: new Date(),
      caloriesBurned: 320,
      exercises: [
        {
          id: '1',
          name: 'Deadlifts',
          sets: 3,
          reps: 8,
          weight: 80,
        },
        {
          id: '2', 
          name: 'Squats',
          sets: 3,
          reps: 12,
          weight: 60,
        },
      ],
    },
    {
      id: '2',
      userId: '1', 
      type: 'MEDITATION',
      category: 'SPIRITUAL',
      title: 'Morning Meditation',
      description: 'Focused breathing and gratitude practice',
      duration: 20,
      intensity: 5,
      mood: 'VERY_GOOD',
      energy: 'MODERATE',
      tags: ['mindfulness', 'gratitude'],
      completedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      technique: 'Breath awareness',
      reflection: 'Felt very centered and peaceful after the session',
      gratitude: ['Good health', 'Supportive family', 'Beautiful weather'],
    },
  ];

  return (
    <div className="space-y-4">
      {mockActivities.map((activity) => (
        <ActivityCard key={activity.id} event={activity} />
      ))}
    </div>
  );
}