import { Router, Request, Response } from 'express';
import { SocialPosterService } from '../social-poster';
import { SchedulerService } from '../scheduler';

const router = Router();
const socialPoster = new SocialPosterService();
const scheduler = new SchedulerService();

// Generate and post content
router.post('/generate-post', async (req: Request, res: Response) => {
  try {
    const { platform, topic, content, isThread = false } = req.body;

    if (!platform || !content) {
      return res.status(400).json({
        error: 'Platform and content are required'
      });
    }

    let result = false;

    switch (platform) {
      case 'twitter':
        result = await socialPoster.postToTwitter(content, isThread);
        break;
      case 'telegram':
        result = await socialPoster.postToTelegram(content);
        break;
      case 'linkedin':
        result = await socialPoster.postToLinkedIn(content, topic);
        break;
      default:
        return res.status(400).json({
          error: 'Unsupported platform'
        });
    }

    res.json({
      success: result,
      platform,
      posted_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Failed to generate post:', error);
    res.status(500).json({
      error: 'Failed to generate and post content'
    });
  }
});

// Schedule content for later posting
router.post('/schedule-post', async (req: Request, res: Response) => {
  try {
    const { platform, content, scheduledFor, isThread = false } = req.body;

    // TODO: Implement scheduling logic
    // Store in database with scheduled time
    // Use cron job or queue system to post later

    res.json({
      success: true,
      scheduled_for: scheduledFor,
      platform,
      message: 'Post scheduled successfully'
    });

  } catch (error) {
    console.error('Failed to schedule post:', error);
    res.status(500).json({
      error: 'Failed to schedule post'
    });
  }
});

// Generate AI summary for community digest
router.post('/generate-summary', async (req: Request, res: Response) => {
  try {
    const { type, timeframe, data } = req.body;

    // TODO: Implement AI content generation
    // Use OpenAI to create summaries based on community data

    const summary = `AI-generated ${type} summary for ${timeframe}`;

    res.json({
      summary,
      type,
      timeframe,
      generated_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Failed to generate summary:', error);
    res.status(500).json({
      error: 'Failed to generate summary'
    });
  }
});

// Review event for AI approval
router.post('/review-event', async (req: Request, res: Response) => {
  try {
    const { event, user, context } = req.body;

    // TODO: Implement AI event review
    // Analyze event details and user context
    // Return confidence score and reasoning

    const reviewResult = {
      confidence: 0.75, // Placeholder
      approved: true,
      reasoning: 'Event appears legitimate based on user history and details',
      flagged_concerns: []
    };

    res.json(reviewResult);

  } catch (error) {
    console.error('Failed to review event:', error);
    res.status(500).json({
      error: 'Failed to review event'
    });
  }
});

// Manual triggers for testing
router.post('/trigger/daily-motivation', async (req: Request, res: Response) => {
  try {
    await scheduler.triggerDailyMotivation();
    res.json({ success: true, message: 'Daily motivation triggered' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to trigger daily motivation' });
  }
});

router.post('/trigger/weekly-digest', async (req: Request, res: Response) => {
  try {
    await scheduler.triggerWeeklyDigest();
    res.json({ success: true, message: 'Weekly digest triggered' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to trigger weekly digest' });
  }
});

router.post('/trigger/educational-content', async (req: Request, res: Response) => {
  try {
    await scheduler.triggerEducationalContent();
    res.json({ success: true, message: 'Educational content triggered' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to trigger educational content' });
  }
});

export { router as socialRouter };