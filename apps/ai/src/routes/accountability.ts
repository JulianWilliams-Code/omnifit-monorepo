import { Router } from 'express';
import { AccountabilityService } from '../services/accountability.service';
import { validateRequest } from '../middleware/validation';
import { authenticateUser } from '../middleware/auth';
import { schemas } from '@omnifit/shared';

const router = Router();
const accountabilityService = new AccountabilityService();

// Generate daily summary for a user
router.post('/daily-summary',
  authenticateUser,
  validateRequest(schemas.GenerateDailySummary),
  async (req, res) => {
    try {
      const { userId, date, forceRegenerate } = req.body;
      
      // TODO: Validate that requesting user is partner of target user
      // or is the target user themselves
      
      const summary = await accountabilityService.generateDailySummary(
        userId,
        new Date(date),
        forceRegenerate
      );
      
      res.json({
        success: true,
        data: summary,
      });
    } catch (error) {
      console.error('Error generating daily summary:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate daily summary',
      });
    }
  }
);

// Draft a reply for partner based on daily summary
router.post('/draft-reply',
  authenticateUser,
  validateRequest(schemas.DraftPartnerReply),
  async (req, res) => {
    try {
      const { summaryId, context } = req.body;
      
      const draftReply = await accountabilityService.draftPartnerReply(
        summaryId,
        context,
        req.user.id
      );
      
      res.json({
        success: true,
        data: draftReply,
      });
    } catch (error) {
      console.error('Error drafting partner reply:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to draft partner reply',
      });
    }
  }
);

// Get daily summaries for a user (for partners to view)
router.get('/daily-summaries/:userId',
  authenticateUser,
  async (req, res) => {
    try {
      const { userId } = req.params;
      const { page = 1, limit = 10, startDate, endDate } = req.query;
      
      // TODO: Validate that requesting user is partner of target user
      
      const summaries = await accountabilityService.getDailySummaries(
        userId,
        Number(page),
        Number(limit),
        startDate as string,
        endDate as string
      );
      
      res.json({
        success: true,
        data: summaries,
      });
    } catch (error) {
      console.error('Error fetching daily summaries:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch daily summaries',
      });
    }
  }
);

// Get activity insights for partner review
router.get('/activity-insights/:eventId',
  authenticateUser,
  async (req, res) => {
    try {
      const { eventId } = req.params;
      
      const insights = await accountabilityService.generateActivityInsights(
        eventId,
        req.user.id
      );
      
      res.json({
        success: true,
        data: insights,
      });
    } catch (error) {
      console.error('Error generating activity insights:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate activity insights',
      });
    }
  }
);

// Generate weekly progress report
router.post('/weekly-report',
  authenticateUser,
  async (req, res) => {
    try {
      const { userId, startDate, endDate } = req.body;
      
      const report = await accountabilityService.generateWeeklyReport(
        userId,
        new Date(startDate),
        new Date(endDate)
      );
      
      res.json({
        success: true,
        data: report,
      });
    } catch (error) {
      console.error('Error generating weekly report:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate weekly report',
      });
    }
  }
);

// Generate encouragement message based on recent activity
router.post('/encouragement',
  authenticateUser,
  async (req, res) => {
    try {
      const { userId, tone = 'supportive' } = req.body;
      
      const encouragement = await accountabilityService.generateEncouragement(
        userId,
        tone
      );
      
      res.json({
        success: true,
        data: encouragement,
      });
    } catch (error) {
      console.error('Error generating encouragement:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate encouragement',
      });
    }
  }
);

export { router as accountabilityRouter };