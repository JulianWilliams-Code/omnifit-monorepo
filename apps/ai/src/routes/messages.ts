import { Router } from 'express';
import { MessageService } from '../services/message.service';
import { validateRequest } from '../middleware/validation';
import { authenticateUser } from '../middleware/auth';
import { schemas } from '@omnifit/shared';

const router = Router();
const messageService = new MessageService();

// Generate AI message for user
router.post('/generate', 
  authenticateUser,
  validateRequest(schemas.GenerateAIMessage),
  async (req, res) => {
    try {
      const { userId, type, context } = req.body;
      const message = await messageService.generateMessage(userId, type, context);
      
      res.json({
        success: true,
        data: message,
      });
    } catch (error) {
      console.error('Error generating message:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate message',
      });
    }
  }
);

// Get user's AI messages
router.get('/user/:userId',
  authenticateUser,
  async (req, res) => {
    try {
      const { userId } = req.params;
      const { page = 1, limit = 20 } = req.query;
      
      const messages = await messageService.getUserMessages(
        userId,
        Number(page),
        Number(limit)
      );
      
      res.json({
        success: true,
        data: messages,
      });
    } catch (error) {
      console.error('Error fetching messages:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch messages',
      });
    }
  }
);

// Mark message as read
router.patch('/:messageId/read',
  authenticateUser,
  async (req, res) => {
    try {
      const { messageId } = req.params;
      await messageService.markAsRead(messageId);
      
      res.json({
        success: true,
        message: 'Message marked as read',
      });
    } catch (error) {
      console.error('Error marking message as read:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to mark message as read',
      });
    }
  }
);

export { router as messagesRouter };