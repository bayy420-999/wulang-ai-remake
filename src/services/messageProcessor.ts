import { Role } from '@prisma/client';
import { DatabaseService } from './database';
import { AIService, MediaContext } from './ai';
import { MediaService, MediaProcessingResult } from './media';
import { WhatsAppService, WhatsAppMessage, MediaMessage } from './whatsapp';
import { env } from '../config/env';
import { logError, logInfo, logWarn, logDebug } from '../lib/logger';

export class MessageProcessor {
  private db: DatabaseService;
  private ai: AIService;
  private media: MediaService;
  private whatsapp: WhatsAppService;

  constructor(whatsappService: WhatsAppService) {
    this.db = new DatabaseService();
    this.ai = new AIService();
    this.media = new MediaService();
    this.whatsapp = whatsappService;
  }

  /**
   * Process incoming message and generate appropriate response
   */
  async processMessage(message: WhatsAppMessage, mediaMessage?: MediaMessage): Promise<void> {
    const context = 'MessageProcessor';
    
    try {
      logDebug(`Processing message from ${message.contact.number}`, context);

      const phoneNumber = WhatsAppService.extractPhoneNumber(message.from);
      const userName = message.contact.name || message.contact.pushname;

      // Check content moderation
      const moderation = await this.ai.moderateContent(message.body);
      if (!moderation.isAppropriate) {
        logWarn(`Blocked inappropriate message from ${phoneNumber}: ${moderation.reason}`, context);
        await this.whatsapp.sendMessage(
          message.from,
          '⚠️ Your message was blocked due to inappropriate content. Please keep our conversation respectful.'
        );
        return;
      }

      // Check for reset command
      if (this.isResetCommand(message.body)) {
        await this.handleResetCommand(phoneNumber, message.from, userName);
        return;
      }

      // Find or create user
      const user = await this.db.findOrCreateUser(phoneNumber, userName);
      
      // Check for trigger keyword or existing conversation
      const hasTrigger = this.hasTriggerKeyword(message.body);
      const hasHistory = await this.db.hasConversationHistory(user.id);

      // Determine if we should process this message
      if (!hasTrigger && !hasHistory) {
        // No trigger keyword and no history - ignore message
        logDebug(`Ignoring message without trigger from ${phoneNumber}`, context);
        return;
      }

      // Process media if present - analyze with AI first
      let mediaAnalysis: string | null = null;
      let hasCaption = false;
      
      if (mediaMessage) {
        try {
          const processedMedia = await this.processMediaMessage(mediaMessage);
          if (processedMedia) {
            // Clean message content first to check if user provided a caption/question
            let cleanMessage = this.cleanMessageContent(message.body);
            hasCaption = cleanMessage.toLowerCase().trim() !== 'hi!'; // 'hi!' means no actual caption
            
            // First, analyze the media with AI
            const mediaContext: MediaContext = {
              type: processedMedia.type,
              content: processedMedia.content,
              filename: processedMedia.filename,
              mimeType: mediaMessage.media.mimetype,
              data: processedMedia.type === 'image' ? mediaMessage.media.data : undefined
            };

            // Get AI analysis of the media (with or without user caption)
            if (hasCaption) {
              // User provided a caption/question - analyze media in context of the question
              mediaAnalysis = await this.ai.analyzeMediaWithCaption(mediaContext, cleanMessage);
              logInfo(`Media analyzed with user caption: ${cleanMessage}`, context);
            } else {
              // No caption - do general media analysis
              mediaAnalysis = await this.ai.analyzeMedia(mediaContext);
              logInfo(`Media analyzed without caption`, context);
            }
            
            logInfo(`Media analysis result: ${mediaAnalysis.substring(0, 100)}...`, context);
          }
        } catch (error) {
          logError('Failed to process media', error as Error, context);
          await this.whatsapp.sendMessage(
            message.from,
            '❌ Sorry, I couldn\'t process your media file. Please try again or send it in a different format.'
          );
          return;
        }
      }

      // Get conversation history
      const conversationHistory = await this.db.getConversationHistory(user.id);

      // Clean message content (remove trigger keyword if present)
      let cleanMessage = this.cleanMessageContent(message.body);

      // Store user message
      await this.db.createMessage({
        role: Role.USER,
        content: cleanMessage,
        userId: user.id,
        metadata: mediaMessage ? {
          hasMedia: true,
          mediaType: mediaMessage.media.mimetype,
          filename: mediaMessage.filename,
          mediaSize: mediaMessage.media.data.length
        } : undefined
      });

      // Store media analysis as context if we have it
      if (mediaAnalysis) {
        await this.db.createMessage({
          role: Role.ASSISTANT,
          content: `📎 Media Analysis: ${mediaAnalysis}`,
          userId: user.id,
          metadata: {
            isMediaAnalysis: true,
            mediaType: mediaMessage?.media.mimetype,
            filename: mediaMessage?.filename
          }
        });
        
        logInfo(`Stored media analysis as context for user ${phoneNumber}`, context);
      }

      // Generate AI response
      let aiResponse: string;

      if (!hasHistory && hasTrigger) {
        // First interaction - welcome message (or media analysis if available)
        if (mediaAnalysis) {
          aiResponse = `${mediaAnalysis}\n\nWelcome to Wulang AI! 🤖 I've analyzed your media above. How can I help you with it?`;
        } else {
          aiResponse = await this.ai.generateWelcomeMessage(userName);
        }
      } else {
        // Continue conversation - get updated history including media analysis
        const updatedHistory = await this.db.getConversationHistory(user.id);
        const conversationContext = {
          messages: updatedHistory,
          userPhone: phoneNumber,
          userName
        };

        // Generate response based on the conversation with media context already in history
        if (mediaAnalysis && cleanMessage.toLowerCase().trim() === 'hi!') {
          // If user just sent media without text, focus on the media
          aiResponse = `${mediaAnalysis}\n\nI've analyzed your ${mediaMessage?.media.mimetype?.includes('image') ? 'image' : 'document'}! Is there anything specific you'd like to know about it?`;
        } else {
          aiResponse = await this.ai.generateResponse(cleanMessage, conversationContext);
        }
      }

      // Store AI response
      await this.db.createMessage({
        role: Role.ASSISTANT,
        content: aiResponse,
        userId: user.id
      });

      // Send response to user
      const success = await this.whatsapp.sendMessage(message.from, aiResponse);

      if (!success) {
        logError(`Failed to send response to ${phoneNumber}`, undefined, context);
      } else {
        logInfo(`Sent AI response to ${phoneNumber}`, context);
      }

    } catch (error) {
      logError('Error processing message', error as Error, context);
      
      // Send error message to user
      try {
        await this.whatsapp.sendMessage(
          message.from,
          '❌ Sorry, I encountered an error processing your message. Please try again later.'
        );
      } catch (sendError) {
        logError('Failed to send error message', sendError as Error, context);
      }
    }
  }

  /**
   * Handle reset command
   */
  private async handleResetCommand(phoneNumber: string, whatsappId: string, userName?: string): Promise<void> {
    const context = 'MessageProcessor';
    
    try {
      const user = await this.db.getUserByPhone(phoneNumber);
      
      if (!user) {
        await this.whatsapp.sendMessage(
          whatsappId,
          '❓ You don\'t have any conversation history to reset.'
        );
        return;
      }

      // Reset conversation history
      await this.db.resetUserConversation(user.id);

      // Generate and send reset confirmation
      const resetMessage = await this.ai.generateResetMessage();
      await this.whatsapp.sendMessage(whatsappId, resetMessage);

      logInfo(`Reset conversation for user ${phoneNumber}`, context);

    } catch (error) {
      logError('Error handling reset command', error as Error, context);
      await this.whatsapp.sendMessage(
        whatsappId,
        '❌ Failed to reset conversation. Please try again.'
      );
    }
  }

  /**
   * Process media message
   */
  private async processMediaMessage(mediaMessage: MediaMessage): Promise<MediaProcessingResult | null> {
    try {
      const buffer = Buffer.from(mediaMessage.media.data, 'base64');
      const filename = mediaMessage.filename || 'media_file';
      const mimeType = mediaMessage.media.mimetype;

      return await this.media.processMedia(buffer, filename, mimeType);
    } catch (error) {
      logError('Failed to process media message', error as Error, 'MessageProcessor');
      throw error;
    }
  }

  /**
   * Check if message contains trigger keyword
   */
  private hasTriggerKeyword(message: string): boolean {
    const lowerMessage = message.toLowerCase().trim();
    const triggerKeyword = env.TRIGGER_KEYWORD.toLowerCase();
    
    // Check if message starts with trigger keyword or contains it
    return lowerMessage.startsWith(triggerKeyword) || lowerMessage.includes(triggerKeyword);
  }

  /**
   * Check if message is a reset command
   */
  private isResetCommand(message: string): boolean {
    const lowerMessage = message.toLowerCase().trim();
    const resetKeyword = env.RESET_KEYWORD.toLowerCase();
    
    return lowerMessage === resetKeyword || lowerMessage.startsWith(resetKeyword);
  }

  /**
   * Clean message content by removing trigger keywords
   */
  private cleanMessageContent(message: string): string {
    let cleaned = message.trim();
    
    // Remove trigger keyword if present at the beginning
    const triggerKeyword = env.TRIGGER_KEYWORD.toLowerCase();
    if (cleaned.toLowerCase().startsWith(triggerKeyword)) {
      cleaned = cleaned.substring(env.TRIGGER_KEYWORD.length).trim();
    }

    // If message becomes empty after cleaning, provide default
    if (!cleaned) {
      cleaned = 'Hi!';
    }

    return cleaned;
  }

  /**
   * Get user statistics
   */
  async getUserStats(phoneNumber: string) {
    try {
      const user = await this.db.getUserByPhone(phoneNumber);
      if (!user) {
        return null;
      }

      const messageCount = await this.db.getMessageCount(user.id);
      const conversationHistory = await this.db.getConversationHistory(user.id, 5); // Last 5 messages

      return {
        userId: user.id,
        phone: user.phone,
        name: user.name,
        messageCount,
        lastMessageAt: user.lastMessageAt,
        createdAt: user.createdAt,
        recentMessages: conversationHistory.length
      };
    } catch (error) {
      logError('Error getting user stats', error as Error, 'MessageProcessor');
      return null;
    }
  }

  /**
   * Cleanup old conversations and temporary files
   */
  async performMaintenance(): Promise<void> {
    const context = 'MessageProcessor';
    
    try {
      logInfo('Starting maintenance tasks...', context);

      // Clean up old messages (older than 90 days)
      await this.db.cleanupOldMessages(90);

      // Clean up old temporary files
      await this.media.cleanupOldTempFiles(24);

      logInfo('Maintenance tasks completed', context);
    } catch (error) {
      logError('Error during maintenance', error as Error, context);
    }
  }

  /**
   * Get active users statistics
   */
  async getActiveUsersStats(days: number = 7) {
    try {
      const activeUsers = await this.db.getActiveUsers(days);
      
      return {
        totalActiveUsers: activeUsers.length,
        users: activeUsers.map(user => ({
          phone: user.phone,
          name: user.name,
          messageCount: user._count.messages,
          lastMessageAt: user.lastMessageAt
        }))
      };
    } catch (error) {
      logError('Error getting active users stats', error as Error, 'MessageProcessor');
      return null;
    }
  }

  /**
   * Shutdown the message processor
   */
  async shutdown(): Promise<void> {
    try {
      await this.db.disconnect();
      logInfo('Message processor shut down successfully', 'MessageProcessor');
    } catch (error) {
      logError('Error shutting down message processor', error as Error, 'MessageProcessor');
    }
  }
}
