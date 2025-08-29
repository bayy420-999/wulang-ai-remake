import { Message } from 'whatsapp-web.js';
import { ProcessMessageUseCase } from '../../application/use-cases/ProcessMessageUseCase';
import { ResetConversationUseCase } from '../../application/use-cases/ResetConversationUseCase';
import { ConversationManager } from '../../application/services/ConversationManager';

import { MessageRole } from '../../domain/entities/Message';
import { env } from '../../config/env';
import { logError, logInfo, logDebug } from '../../lib/logger';

export interface WhatsAppMessage {
  id: string;
  body: string;
  from: string;
  fromMe: boolean;
  timestamp: number;
  hasMedia: boolean;
  mediaType?: string;
  contact: {
    number: string;
    name?: string;
    pushname?: string;
  };
}

export interface MediaMessage {
  media: any;
  filename?: string;
  caption?: string;
}

export class MessageHandler {
  private processedMessageIds: Set<string> = new Set();

  constructor(
    private processMessageUseCase: ProcessMessageUseCase,
    private resetConversationUseCase: ResetConversationUseCase,
    private conversationManager: ConversationManager
  ) {}

  async handleMessage(message: Message): Promise<{ shouldRespond: boolean; response?: string }> {
    try {
      // Skip messages from groups and from self
      if (message.fromMe || message.from.includes('@g.us')) {
        return { shouldRespond: false };
      }

      // Prevent duplicate processing by checking message ID
      const messageId = message.id._serialized || message.id;
      if (this.processedMessageIds.has(messageId)) {
        logDebug(`Skipping duplicate message: ${messageId}`, 'MessageHandler');
        return { shouldRespond: false };
      }
      this.processedMessageIds.add(messageId);

      // Clean up old message IDs periodically
      this.cleanupOldMessageIds();

      logDebug(`Processing message from ${message.from}: ${message.body}`, 'MessageHandler');

      const contact = await message.getContact();
      const phoneNumber = this.extractPhoneNumber(message.from);
      const userName = contact.name || contact.pushname;

      // Check for reset command
      if (this.isResetCommand(message.body)) {
        const result = await this.resetConversationUseCase.execute({ phoneNumber });
        return { shouldRespond: true, response: result.message };
      }

      // Check if message contains "wulang" keyword
      const hasWulangKeyword = this.hasWulangKeyword(message.body);
      
      if (!hasWulangKeyword) {
        logDebug(`Ignoring message without "wulang" keyword from ${phoneNumber}`, 'MessageHandler');
        return { shouldRespond: true, response: 'Halo! Ada yang bisa saya bantu? tolong panggil saya dengan menyebut "wulang" dalam pesan' };
      }

      // Use message content as-is (no cleaning)
      const cleanMessage: string = message.body.trim();

      // Check if user has pending media and is now sending a text message
      if (this.conversationManager.hasPendingMedia(phoneNumber) && cleanMessage && !message.hasMedia) {
        logDebug(`Processing pending media for ${phoneNumber} with question: ${cleanMessage}`, 'MessageHandler');
        
        // User has pending media and is now asking about it
        const pendingMedia = this.conversationManager.getPendingMedia(phoneNumber);
        if (pendingMedia) {
          logDebug(`Found pending media: ${pendingMedia.filename} (${pendingMedia.mimeType})`, 'MessageHandler');
          
          // Process the pending media with the new message as caption
          const result = await this.processMessageUseCase.execute({
            phoneNumber,
            message: cleanMessage,
            userName,
            hasMedia: true,
            mediaType: this.getMediaType(pendingMedia.mimeType),
            mediaData: {
              buffer: pendingMedia.buffer,
              filename: pendingMedia.filename,
              mimeType: pendingMedia.mimeType,
              caption: cleanMessage
            }
          });

          // Remove the pending media after processing
          this.conversationManager.removePendingMedia(phoneNumber);

          if (result.success) {
            logInfo(`Successfully processed pending media with question for ${phoneNumber}`, 'MessageHandler');
            return { shouldRespond: true, response: result.response };
          } else {
            logError(`Failed to process pending media for ${phoneNumber}: ${result.error}`, undefined, 'MessageHandler');
            return { shouldRespond: true, response: result.response };
          }
        }
      }

      // Process media if present
      let mediaData: any = undefined;
      if (message.hasMedia) {
        try {
          const media = await message.downloadMedia();
          if (media) {
            mediaData = {
              buffer: Buffer.from(media.data, 'base64'),
              filename: media.filename || 'media_file',
              mimeType: media.mimetype,
              caption: message.body
            };
            logInfo(`Received media message: ${media.mimetype} (${media.filename || 'no filename'})`, 'MessageHandler');
          }
        } catch (error) {
          logError('Failed to download media', error as Error, 'MessageHandler');
          return { 
            shouldRespond: true, 
            response: '❌ Maaf, saya tidak bisa memproses file media Anda. Silakan coba lagi atau kirim dalam format yang berbeda.'
          };
        }
      }

      // If user sent media without text, store it and ask what they want
      if (message.hasMedia && mediaData && !cleanMessage) {
        this.conversationManager.storePendingMedia(phoneNumber, {
          buffer: mediaData.buffer,
          filename: mediaData.filename,
          mimeType: mediaData.mimeType
        });

        const mediaType = this.getMediaType(mediaData.mimeType);
        const mediaName = mediaType === 'image' ? 'gambar' : 'dokumen';
        const botResponse = `📎 Saya telah menerima ${mediaName} yang Anda kirim.\n\nApa yang ingin Anda ketahui tentang ${mediaName} ini? Silakan tanyakan apa saja yang ingin Anda analisis atau ketahui.`;
        
        return {
          shouldRespond: true,
          response: botResponse
        };
      }
      
      
      // Process the message with AI
      const messageToProcess = cleanMessage;
      logDebug(`Processing message for ${phoneNumber}: "${messageToProcess}"`, 'MessageHandler');
      
      const result = await this.processMessageUseCase.execute({
        phoneNumber,
        message: messageToProcess,
        userName,
        hasMedia: message.hasMedia,
        mediaType: message.type,
        mediaData
      });

      if (result.success) {
        logInfo(`Successfully processed message for ${phoneNumber}`, 'MessageHandler');
        return { shouldRespond: true, response: result.response };
      } else {
        logError(`Failed to process message for ${phoneNumber}: ${result.error}`, undefined, 'MessageHandler');
        return { shouldRespond: true, response: result.response };
      }

    } catch (error) {
      logError('Error handling message', error as Error, 'MessageHandler');
      return { 
        shouldRespond: true, 
        response: '❌ Maaf, saya mengalami kesalahan saat memproses pesan Anda. Silakan coba lagi nanti.'
      };
    }
  }

  private hasWulangKeyword(message: string): boolean {
    const lowerMessage = message.toLowerCase().trim();
    return lowerMessage.includes('wulang');
  }

  private isResetCommand(message: string): boolean {
    const lowerMessage = message.toLowerCase().trim();
    const resetKeyword = env.RESET_KEYWORD.toLowerCase();
    return lowerMessage === resetKeyword || lowerMessage.startsWith(resetKeyword);
  }

  private extractPhoneNumber(whatsappId: string): string {
    return whatsappId.replace('@c.us', '');
  }

  private getMediaType(mimeType: string): string {
    if (mimeType.startsWith('image/')) {
      return 'image';
    } else if (mimeType === 'application/pdf') {
      return 'pdf';
    } else {
      return 'document';
    }
  }

  // Clean up old message IDs to prevent memory leaks
  private cleanupOldMessageIds(): void {
    // Keep only the last 1000 message IDs to prevent memory leaks
    if (this.processedMessageIds.size > 1000) {
      const idsArray = Array.from(this.processedMessageIds);
      this.processedMessageIds = new Set(idsArray.slice(-500));
      logDebug(`Cleaned up message ID cache, kept last 500 IDs`, 'MessageHandler');
    }
  }
}
