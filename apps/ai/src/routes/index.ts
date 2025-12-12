import { Express } from 'express';
import { messagesRouter } from './messages';
import { coachingRouter } from './coaching';
import { analyticsRouter } from './analytics';
import { accountabilityRouter } from './accountability';
import { socialRouter } from './social';

export function setupRoutes(app: Express) {
  app.use('/api/v1/messages', messagesRouter);
  app.use('/api/v1/coaching', coachingRouter);
  app.use('/api/v1/analytics', analyticsRouter);
  app.use('/api/v1/accountability', accountabilityRouter);
  app.use('/api/v1/social', socialRouter);
}