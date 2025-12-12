import React from 'react';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { User, Clock, CheckCircle, XCircle, MessageSquare } from 'lucide-react';

interface PartnerCardProps {
  partner: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    activityLevel: string;
    status: 'REQUESTED' | 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'PAUSED' | 'ENDED';
    experience?: string;
    categories: string[];
    requestedAt: Date;
    message?: string;
  };
  onAccept?: (partnerId: string) => void;
  onReject?: (partnerId: string) => void;
  onMessage?: (partnerId: string) => void;
  onView?: (partnerId: string) => void;
  isCurrentUser?: boolean;
}

export function PartnerCard({
  partner,
  onAccept,
  onReject,
  onMessage,
  onView,
  isCurrentUser = false,
}: PartnerCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACCEPTED':
        return 'bg-green-100 text-green-800';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'REQUESTED':
        return 'bg-blue-100 text-blue-800';
      case 'REJECTED':
        return 'bg-red-100 text-red-800';
      case 'PAUSED':
        return 'bg-gray-100 text-gray-800';
      case 'ENDED':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACCEPTED':
        return <CheckCircle className="w-4 h-4" />;
      case 'REJECTED':
        return <XCircle className="w-4 h-4" />;
      case 'PENDING':
      case 'REQUESTED':
        return <Clock className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const showActionButtons = partner.status === 'REQUESTED' && !isCurrentUser;

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              {partner.avatar ? (
                <img
                  src={partner.avatar}
                  alt={partner.name}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <User className="w-6 h-6 text-primary" />
              )}
            </div>
            <div>
              <h3 className="font-semibold text-lg">{partner.name}</h3>
              <p className="text-sm text-muted-foreground">{partner.email}</p>
            </div>
          </div>
          <Badge className={`${getStatusColor(partner.status)} flex items-center gap-1`}>
            {getStatusIcon(partner.status)}
            {partner.status.replace('_', ' ').toLowerCase()}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Partner Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-700">Activity Level:</span>
            <p className="text-gray-600 capitalize">{partner.activityLevel.toLowerCase()}</p>
          </div>
          {partner.experience && (
            <div>
              <span className="font-medium text-gray-700">Experience:</span>
              <p className="text-gray-600 capitalize">{partner.experience}</p>
            </div>
          )}
        </div>

        {/* Categories */}
        {partner.categories.length > 0 && (
          <div>
            <span className="font-medium text-gray-700 text-sm">Focus Areas:</span>
            <div className="flex flex-wrap gap-2 mt-2">
              {partner.categories.map((category) => (
                <Badge key={category} variant="outline" className="text-xs">
                  {category}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Request Message */}
        {partner.message && (
          <div className="p-3 bg-gray-50 rounded-md">
            <p className="text-sm text-gray-700 italic">"{partner.message}"</p>
          </div>
        )}

        {/* Timestamp */}
        <div className="text-xs text-muted-foreground">
          Requested {partner.requestedAt.toLocaleDateString()}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          {showActionButtons && (
            <>
              <Button
                onClick={() => onAccept?.(partner.id)}
                size="sm"
                className="flex-1"
              >
                <CheckCircle className="w-4 h-4 mr-1" />
                Accept
              </Button>
              <Button
                onClick={() => onReject?.(partner.id)}
                variant="outline"
                size="sm"
                className="flex-1"
              >
                <XCircle className="w-4 h-4 mr-1" />
                Reject
              </Button>
            </>
          )}
          
          {partner.status === 'ACCEPTED' && onMessage && (
            <Button
              onClick={() => onMessage(partner.id)}
              variant="outline"
              size="sm"
              className="flex-1"
            >
              <MessageSquare className="w-4 h-4 mr-1" />
              Message
            </Button>
          )}

          <Button
            onClick={() => onView?.(partner.id)}
            variant="ghost"
            size="sm"
          >
            View Details
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}