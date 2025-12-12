'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { PartnerInbox } from '@omnifit/ui';
import { Button } from '@omnifit/ui';
import { Plus, Users } from 'lucide-react';

interface PartnerRequest {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  activityLevel: string;
  status: 'REQUESTED' | 'PENDING' | 'ACCEPTED' | 'REJECTED';
  experience?: string;
  categories: string[];
  requestedAt: Date;
  message?: string;
  preferredGender?: string;
  preferredAgeRange?: string;
}

export default function PartnersPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<PartnerRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPartnerRequests();
  }, []);

  const loadPartnerRequests = async () => {
    try {
      setIsLoading(true);
      
      // TODO: Replace with actual API call
      const response = await fetch('/api/partnerships/requests', {
        headers: {
          'Authorization': `Bearer ${user?.token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setRequests(data.map((req: any) => ({
          ...req,
          requestedAt: new Date(req.requestedAt),
        })));
      } else {
        console.error('Failed to load partner requests');
        // Mock data for development
        setRequests([
          {
            id: '1',
            name: 'John Smith',
            email: 'john.smith@example.com',
            activityLevel: 'MODERATE',
            status: 'REQUESTED',
            experience: 'intermediate',
            categories: ['FITNESS', 'SPIRITUAL'],
            requestedAt: new Date('2024-01-15'),
            message: 'Looking for someone to help me stay consistent with my morning workouts and prayer time. I\'ve been struggling with accountability lately.',
            preferredGender: 'MALE',
            preferredAgeRange: '25-35',
          },
          {
            id: '2',
            name: 'Sarah Johnson',
            email: 'sarah.j@example.com',
            activityLevel: 'ACTIVE',
            status: 'PENDING',
            experience: 'advanced',
            categories: ['HYBRID', 'MEDITATION'],
            requestedAt: new Date('2024-01-12'),
            message: 'Hi! I\'m training for a marathon and would love a partner who can help me balance physical training with spiritual growth.',
          },
          {
            id: '3',
            name: 'Mike Davis',
            email: 'mike.davis@example.com',
            activityLevel: 'LIGHT',
            status: 'ACCEPTED',
            experience: 'beginner',
            categories: ['FITNESS', 'PRAYER'],
            requestedAt: new Date('2024-01-10'),
            message: 'New to fitness and faith journey. Would appreciate gentle guidance and encouragement.',
          },
        ]);
      }
    } catch (error) {
      console.error('Error loading partner requests:', error);
      // Use mock data on error
      setRequests([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptRequest = async (partnerId: string, response?: string) => {
    try {
      // TODO: Replace with actual API call
      const apiResponse = await fetch(`/api/partnerships/requests/${partnerId}/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.token}`,
        },
        body: JSON.stringify({ response }),
      });

      if (apiResponse.ok) {
        // Update local state
        setRequests(prev => prev.map(req => 
          req.id === partnerId 
            ? { ...req, status: 'ACCEPTED' as const }
            : req
        ));
        
        // TODO: Show success toast
        console.log('Partnership request accepted');
      } else {
        throw new Error('Failed to accept request');
      }
    } catch (error) {
      console.error('Error accepting partnership request:', error);
      // TODO: Show error toast
    }
  };

  const handleRejectRequest = async (partnerId: string, reason?: string) => {
    try {
      // TODO: Replace with actual API call
      const response = await fetch(`/api/partnerships/requests/${partnerId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.token}`,
        },
        body: JSON.stringify({ reason }),
      });

      if (response.ok) {
        // Update local state
        setRequests(prev => prev.map(req => 
          req.id === partnerId 
            ? { ...req, status: 'REJECTED' as const }
            : req
        ));
        
        // TODO: Show success toast
        console.log('Partnership request rejected');
      } else {
        throw new Error('Failed to reject request');
      }
    } catch (error) {
      console.error('Error rejecting partnership request:', error);
      // TODO: Show error toast
    }
  };

  const handleViewRequest = (partnerId: string) => {
    // TODO: Open detailed view modal or navigate to detail page
    console.log('View request details for partner:', partnerId);
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Please Log In</h2>
          <p className="text-muted-foreground">
            You need to be logged in to view partnership requests.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Partnership Center</h1>
            <p className="text-muted-foreground mt-2">
              Connect with accountability partners in your faith and fitness journey
            </p>
          </div>
          <Button 
            onClick={() => window.location.href = '/partners/request'}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Find Partner
          </Button>
        </div>

        <PartnerInbox
          requests={requests}
          onAccept={handleAcceptRequest}
          onReject={handleRejectRequest}
          onView={handleViewRequest}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}