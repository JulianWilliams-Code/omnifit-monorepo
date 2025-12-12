'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@omnifit/ui';
import { Button } from '@omnifit/ui';
import { Badge } from '@omnifit/ui';
import { 
  Bot, 
  Sparkles, 
  Calendar, 
  TrendingUp, 
  RefreshCw,
  MessageCircle,
  Target,
  Clock
} from 'lucide-react';

interface DailyMessage {
  id: string;
  type: 'motivation' | 'coaching' | 'reminder' | 'celebration';
  title: string;
  content: string;
  actionable?: string;
  generatedAt: Date;
  category: 'fitness' | 'spiritual' | 'hybrid';
}

interface CoachWidgetProps {
  userId?: string;
  className?: string;
}

export function CoachWidget({ userId, className }: CoachWidgetProps) {
  const [dailyMessage, setDailyMessage] = useState<DailyMessage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadDailyMessage();
  }, [userId]);

  const loadDailyMessage = async () => {
    try {
      setIsLoading(true);
      
      // TODO: Replace with actual API call
      const response = await fetch(`/api/ai/daily-message?userId=${userId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const message = await response.json();
        setDailyMessage({
          ...message,
          generatedAt: new Date(message.generatedAt),
        });
      } else {
        // Mock message for development
        setDailyMessage({
          id: '1',
          type: 'motivation',
          title: 'Your Daily Inspiration',
          content: 'Remember that every small step counts! Today is a perfect opportunity to honor your body as a temple and strengthen your spirit through movement and prayer. You\'ve got the strength within you to make today amazing.',
          actionable: 'Try combining your morning workout with a brief prayer or meditation session.',
          generatedAt: new Date(),
          category: 'hybrid',
        });
      }
    } catch (error) {
      console.error('Failed to load daily message:', error);
      setDailyMessage(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefreshMessage = async () => {
    try {
      setIsRefreshing(true);
      
      // TODO: Replace with actual API call
      const response = await fetch(`/api/ai/daily-message/regenerate?userId=${userId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const message = await response.json();
        setDailyMessage({
          ...message,
          generatedAt: new Date(message.generatedAt),
        });
      }
    } catch (error) {
      console.error('Failed to refresh message:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const getMessageIcon = (type: string) => {
    switch (type) {
      case 'motivation':
        return <Sparkles className="w-5 h-5 text-yellow-500" />;
      case 'coaching':
        return <Target className="w-5 h-5 text-blue-500" />;
      case 'reminder':
        return <Clock className="w-5 h-5 text-orange-500" />;
      case 'celebration':
        return <TrendingUp className="w-5 h-5 text-green-500" />;
      default:
        return <MessageCircle className="w-5 h-5 text-primary" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'fitness':
        return 'bg-blue-100 text-blue-800';
      case 'spiritual':
        return 'bg-purple-100 text-purple-800';
      case 'hybrid':
        return 'bg-gradient-to-r from-blue-100 to-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
              <div className="h-4 bg-gray-200 rounded w-1/3"></div>
            </div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded w-full"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
              <div className="h-4 bg-gray-200 rounded w-4/6"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!dailyMessage) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center">
          <Bot className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="font-medium text-gray-900 mb-2">No Message Today</h3>
          <p className="text-gray-600 text-sm mb-4">
            Unable to load your daily coaching message. Try refreshing.
          </p>
          <Button variant="outline" onClick={loadDailyMessage}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="w-6 h-6 text-primary" />
            <span className="text-lg">Today's Coach</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={getCategoryColor(dailyMessage.category)}>
              {dailyMessage.category}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefreshMessage}
              disabled={isRefreshing}
              className="p-2"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Message Header */}
        <div className="flex items-center gap-2">
          {getMessageIcon(dailyMessage.type)}
          <h3 className="font-medium text-gray-900">{dailyMessage.title}</h3>
        </div>

        {/* Message Content */}
        <div className="prose prose-sm max-w-none">
          <p className="text-gray-700 leading-relaxed">
            {dailyMessage.content}
          </p>
        </div>

        {/* Actionable Suggestion */}
        {dailyMessage.actionable && (
          <div className="p-3 bg-primary/5 border border-primary/20 rounded-md">
            <div className="flex items-start gap-2">
              <Target className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-primary mb-1">Try This:</p>
                <p className="text-sm text-gray-700">{dailyMessage.actionable}</p>
              </div>
            </div>
          </div>
        )}

        {/* Timestamp */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            <span>Generated {dailyMessage.generatedAt.toLocaleDateString()}</span>
          </div>
          <span className="capitalize">{dailyMessage.type} message</span>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button variant="outline" size="sm" className="flex-1">
            <MessageCircle className="w-4 h-4 mr-1" />
            Share Feedback
          </Button>
          <Button variant="outline" size="sm" className="flex-1">
            <Sparkles className="w-4 h-4 mr-1" />
            More Tips
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}