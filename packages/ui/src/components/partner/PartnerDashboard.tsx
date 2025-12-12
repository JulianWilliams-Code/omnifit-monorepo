import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/Table';
import { 
  Users, 
  Calendar, 
  CheckCircle, 
  Clock, 
  TrendingUp,
  Award,
  MessageSquare,
  Settings
} from 'lucide-react';

interface PartnerStats {
  totalPartners: number;
  activePartners: number;
  pendingRequests: number;
  eventsReviewed: number;
  weeklyReviews: number;
  approvalRate: number;
}

interface RecentEvent {
  id: string;
  userEmail: string;
  type: string;
  category: string;
  duration: number;
  intensity: number;
  submittedAt: Date;
  status: 'pending' | 'approved' | 'rejected';
  aiConfidence?: number;
}

interface PartnerDashboardProps {
  stats: PartnerStats;
  recentEvents: RecentEvent[];
  onReviewEvent?: (eventId: string) => void;
  onViewPartners?: () => void;
  onSettings?: () => void;
  isLoading?: boolean;
}

export function PartnerDashboard({
  stats,
  recentEvents,
  onReviewEvent,
  onViewPartners,
  onSettings,
  isLoading = false,
}: PartnerDashboardProps) {
  const [timeRange, setTimeRange] = useState('week');

  const getEventStatusBadge = (status: string, aiConfidence?: number) => {
    const statusColors = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    };

    return (
      <div className="flex items-center gap-2">
        <Badge className={statusColors[status as keyof typeof statusColors]}>
          {status}
        </Badge>
        {aiConfidence && (
          <span className="text-xs text-muted-foreground">
            AI: {(aiConfidence * 100).toFixed(0)}%
          </span>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Partner Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Manage accountability partnerships and review activities
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onViewPartners}>
            <Users className="w-4 h-4 mr-2" />
            View Partners
          </Button>
          <Button variant="outline" onClick={onSettings}>
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Partners</p>
                <p className="text-2xl font-bold">{stats.totalPartners}</p>
              </div>
              <Users className="w-8 h-8 text-blue-600" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {stats.activePartners} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending Requests</p>
                <p className="text-2xl font-bold">{stats.pendingRequests}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-600" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Awaiting your review
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Events Reviewed</p>
                <p className="text-2xl font-bold">{stats.eventsReviewed}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {stats.weeklyReviews} this week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Approval Rate</p>
                <p className="text-2xl font-bold">{stats.approvalRate}%</p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-600" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Last 30 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Partner Impact</p>
                <p className="text-2xl font-bold">
                  {Math.round((stats.eventsReviewed * stats.approvalRate) / 100)}
                </p>
              </div>
              <Award className="w-8 h-8 text-orange-600" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Events approved
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Quick Actions</p>
                <div className="mt-2 space-y-1">
                  <Button variant="ghost" size="sm" className="h-auto p-1 justify-start">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Messages
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Events for Review */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Recent Events for Review
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentEvents.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Activity</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Intensity</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentEvents.slice(0, 10).map((event) => (
                  <TableRow key={event.id}>
                    <TableCell className="font-medium">
                      {event.userEmail.split('@')[0]}
                    </TableCell>
                    <TableCell>
                      <div>
                        <span className="font-medium">{event.type}</span>
                        <div className="text-sm text-muted-foreground">
                          {event.category}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{event.duration} min</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {event.intensity}/10
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {event.submittedAt.toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {getEventStatusBadge(event.status, event.aiConfidence)}
                    </TableCell>
                    <TableCell>
                      {event.status === 'pending' && (
                        <Button
                          onClick={() => onReviewEvent?.(event.id)}
                          size="sm"
                          variant="outline"
                        >
                          Review
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No events to review
              </h3>
              <p className="text-gray-600">
                All recent events have been processed or there are no pending reviews.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}