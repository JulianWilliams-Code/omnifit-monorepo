import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { 
  Search, 
  Filter,
  Inbox,
  Clock,
  CheckCircle,
  XCircle,
  User,
  Calendar
} from 'lucide-react';
import { PartnerCard } from './PartnerCard';

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

interface PartnerInboxProps {
  requests: PartnerRequest[];
  onAccept?: (partnerId: string, response?: string) => void;
  onReject?: (partnerId: string, reason?: string) => void;
  onView?: (partnerId: string) => void;
  isLoading?: boolean;
}

export function PartnerInbox({
  requests,
  onAccept,
  onReject,
  onView,
  isLoading = false,
}: PartnerInboxProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Get unique categories from all requests
  const availableCategories = React.useMemo(() => {
    const categories = new Set<string>();
    requests.forEach(request => {
      request.categories.forEach(cat => categories.add(cat));
    });
    return Array.from(categories).sort();
  }, [requests]);

  // Filter requests based on search and filters
  const filteredRequests = React.useMemo(() => {
    return requests.filter(request => {
      const matchesSearch = 
        request.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.email.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
      
      const matchesCategory = 
        categoryFilter === 'all' || 
        request.categories.includes(categoryFilter);

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [requests, searchTerm, statusFilter, categoryFilter]);

  // Group requests by status
  const requestsByStatus = React.useMemo(() => {
    return {
      REQUESTED: filteredRequests.filter(r => r.status === 'REQUESTED'),
      PENDING: filteredRequests.filter(r => r.status === 'PENDING'),
      ACCEPTED: filteredRequests.filter(r => r.status === 'ACCEPTED'),
      REJECTED: filteredRequests.filter(r => r.status === 'REJECTED'),
    };
  }, [filteredRequests]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'REQUESTED':
        return <Inbox className="w-5 h-5" />;
      case 'PENDING':
        return <Clock className="w-5 h-5" />;
      case 'ACCEPTED':
        return <CheckCircle className="w-5 h-5" />;
      case 'REJECTED':
        return <XCircle className="w-5 h-5" />;
      default:
        return <Inbox className="w-5 h-5" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'REQUESTED':
        return 'text-blue-600';
      case 'PENDING':
        return 'text-yellow-600';
      case 'ACCEPTED':
        return 'text-green-600';
      case 'REJECTED':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-gray-200 rounded w-1/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Partner Inbox</h1>
          <p className="text-muted-foreground mt-1">
            Manage partnership requests and communications
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">All Status</option>
                <option value="REQUESTED">Requested</option>
                <option value="PENDING">Pending</option>
                <option value="ACCEPTED">Accepted</option>
                <option value="REJECTED">Rejected</option>
              </select>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">All Categories</option>
                {availableCategories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="flex gap-6 mt-4 pt-4 border-t">
            {Object.entries(requestsByStatus).map(([status, statusRequests]) => (
              <div key={status} className="flex items-center gap-2">
                <div className={getStatusColor(status)}>
                  {getStatusIcon(status)}
                </div>
                <span className="text-sm">
                  <span className="font-medium">{statusRequests.length}</span>{' '}
                  <span className="text-muted-foreground capitalize">
                    {status.toLowerCase()}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Requests by Status */}
      {Object.entries(requestsByStatus).map(([status, statusRequests]) => {
        if (statusRequests.length === 0) return null;

        return (
          <Card key={status}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className={getStatusColor(status)}>
                  {getStatusIcon(status)}
                </div>
                {status.charAt(0) + status.slice(1).toLowerCase()} Requests
                <Badge variant="outline">{statusRequests.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {statusRequests.map((request) => (
                <PartnerCard
                  key={request.id}
                  partner={{
                    ...request,
                    requestedAt: request.requestedAt,
                  }}
                  onAccept={onAccept}
                  onReject={onReject}
                  onView={onView}
                />
              ))}
            </CardContent>
          </Card>
        );
      })}

      {/* Empty State */}
      {filteredRequests.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Inbox className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {requests.length === 0 ? 'No partnership requests' : 'No requests match your filters'}
            </h3>
            <p className="text-gray-600 max-w-md mx-auto">
              {requests.length === 0
                ? 'When users request you as an accountability partner, they will appear here.'
                : 'Try adjusting your search terms or filters to see more requests.'
              }
            </p>
            {searchTerm || statusFilter !== 'all' || categoryFilter !== 'all' ? (
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setCategoryFilter('all');
                }}
              >
                Clear Filters
              </Button>
            ) : null}
          </CardContent>
        </Card>
      )}
    </div>
  );
}