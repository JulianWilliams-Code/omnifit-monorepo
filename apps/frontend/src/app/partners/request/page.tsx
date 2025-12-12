'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { PartnerRequestModal } from '@omnifit/ui';
import { Card, CardContent, CardHeader, CardTitle } from '@omnifit/ui';
import { Button } from '@omnifit/ui';
import { Badge } from '@omnifit/ui';
import { 
  Users, 
  Heart, 
  Target, 
  MessageSquare, 
  ArrowLeft,
  CheckCircle,
  Clock,
  User
} from 'lucide-react';

interface Partner {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  activityLevel: string;
  experience: string;
  categories: string[];
  rating: number;
  totalPartners: number;
  bio?: string;
}

interface PartnerRequestData {
  partnerId?: string;
  message?: string;
  allowsEventReview: boolean;
  allowsPlanCreation: boolean;
  allowsGoalSetting: boolean;
  preferredGender?: 'MALE' | 'FEMALE' | 'OTHER';
  preferredAgeRange?: string;
  preferredExperience?: 'beginner' | 'intermediate' | 'advanced';
  preferredCategories: string[];
}

export default function RequestPartnerPage() {
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [availablePartners, setAvailablePartners] = useState<Partner[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadAvailablePartners();
  }, []);

  const loadAvailablePartners = async () => {
    try {
      setIsLoading(true);
      
      // TODO: Replace with actual API call
      const response = await fetch('/api/partnerships/available-partners', {
        headers: {
          'Authorization': `Bearer ${user?.token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAvailablePartners(data);
      } else {
        console.error('Failed to load available partners');
        // Mock data for development
        setAvailablePartners([
          {
            id: '1',
            name: 'Maria Rodriguez',
            email: 'maria.r@example.com',
            activityLevel: 'VERY_ACTIVE',
            experience: 'advanced',
            categories: ['FITNESS', 'SPIRITUAL', 'HYBRID'],
            rating: 4.8,
            totalPartners: 12,
            bio: 'Certified trainer and spiritual mentor with 5+ years helping others achieve holistic wellness.',
          },
          {
            id: '2',
            name: 'David Kim',
            email: 'david.kim@example.com',
            activityLevel: 'ACTIVE',
            experience: 'intermediate',
            categories: ['FITNESS', 'MEDITATION'],
            rating: 4.6,
            totalPartners: 8,
            bio: 'Marathon runner and meditation practitioner focused on building sustainable habits.',
          },
          {
            id: '3',
            name: 'Jennifer Thomas',
            email: 'jen.thomas@example.com',
            activityLevel: 'MODERATE',
            experience: 'intermediate',
            categories: ['SPIRITUAL', 'PRAYER', 'STUDY'],
            rating: 4.9,
            totalPartners: 15,
            bio: 'Seminary graduate passionate about combining faith with daily wellness practices.',
          },
        ]);
      }
    } catch (error) {
      console.error('Error loading available partners:', error);
      setAvailablePartners([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitRequest = async (requestData: PartnerRequestData) => {
    try {
      setIsSubmitting(true);
      
      // TODO: Replace with actual API call
      const response = await fetch('/api/partnerships/requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.token}`,
        },
        body: JSON.stringify(requestData),
      });

      if (response.ok) {
        setShowModal(false);
        // TODO: Show success toast
        console.log('Partnership request submitted successfully');
        
        // Redirect to partners page
        setTimeout(() => {
          window.location.href = '/partners';
        }, 1000);
      } else {
        throw new Error('Failed to submit partnership request');
      }
    } catch (error) {
      console.error('Error submitting partnership request:', error);
      // TODO: Show error toast
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Please Log In</h2>
          <p className="text-muted-foreground">
            You need to be logged in to request a partnership.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button 
            variant="ghost" 
            onClick={() => window.history.back()}
            className="p-2"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Find Your Accountability Partner</h1>
            <p className="text-muted-foreground mt-2">
              Connect with someone who shares your commitment to faith and fitness
            </p>
          </div>
        </div>

        {/* Benefits Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Target className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-semibold mb-2">Stay Accountable</h3>
              <p className="text-sm text-muted-foreground">
                Get support and encouragement from someone who understands your journey
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Heart className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="font-semibold mb-2">Mutual Support</h3>
              <p className="text-sm text-muted-foreground">
                Build meaningful relationships while pursuing your wellness goals
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="font-semibold mb-2">Proven Results</h3>
              <p className="text-sm text-muted-foreground">
                Users with partners are 3x more likely to reach their goals
              </p>
            </CardContent>
          </Card>
        </div>

        {/* How It Works */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>How Partnership Works</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-bold">
                  1
                </div>
                <div>
                  <h4 className="font-medium mb-1">Request a Partner</h4>
                  <p className="text-sm text-muted-foreground">
                    Choose a specific partner or let us match you based on your preferences
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-bold">
                  2
                </div>
                <div>
                  <h4 className="font-medium mb-1">Connect & Plan</h4>
                  <p className="text-sm text-muted-foreground">
                    Work together to create accountability systems and goals
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-bold">
                  3
                </div>
                <div>
                  <h4 className="font-medium mb-1">Stay Accountable</h4>
                  <p className="text-sm text-muted-foreground">
                    Regular check-ins, activity reviews, and mutual encouragement
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Featured Partners */}
        {!isLoading && availablePartners.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Featured Community Partners
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {availablePartners.slice(0, 3).map((partner) => (
                  <div key={partner.id} className="p-4 border rounded-lg">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        {partner.avatar ? (
                          <img src={partner.avatar} alt={partner.name} className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <User className="w-5 h-5" />
                        )}
                      </div>
                      <div>
                        <h4 className="font-medium">{partner.name}</h4>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          ⭐ {partner.rating} • {partner.totalPartners} partners
                        </div>
                      </div>
                    </div>
                    
                    {partner.bio && (
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {partner.bio}
                      </p>
                    )}
                    
                    <div className="flex flex-wrap gap-1">
                      {partner.categories.slice(0, 3).map(category => (
                        <Badge key={category} variant="outline" className="text-xs">
                          {category}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Call to Action */}
        <Card>
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Ready to Start Your Journey?</h3>
            <p className="text-muted-foreground mb-6">
              Take the first step towards accountability and lasting change
            </p>
            <Button 
              onClick={() => setShowModal(true)}
              size="lg"
              className="px-8"
            >
              Request Partnership
            </Button>
          </CardContent>
        </Card>

        {/* Partnership Request Modal */}
        <PartnerRequestModal
          open={showModal}
          onClose={() => setShowModal(false)}
          onSubmit={handleSubmitRequest}
          availablePartners={availablePartners}
          isLoading={isSubmitting}
        />
      </div>
    </div>
  );
}