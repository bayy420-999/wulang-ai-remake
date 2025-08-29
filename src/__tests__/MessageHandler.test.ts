import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { MessageHandler } from '../presentation/handlers/MessageHandler';
import { ProcessMessageUseCase } from '../application/use-cases/ProcessMessageUseCase';
import { ConversationManager } from '../application/services/ConversationManager';
import { ResetConversationUseCase } from '../application/use-cases/ResetConversationUseCase';
import { env } from '../config/env';

// Mock dependencies
const mockProcessMessageUseCase = {
  execute: jest.fn(),
} as any;

const mockConversationManager = {
  storePendingMedia: jest.fn(),
  getPendingMedia: jest.fn(),
  clearPendingMedia: jest.fn(),
  buildConversationContext: jest.fn(),
} as any;

const mockResetConversationUseCase = {
  execute: jest.fn(),
} as any;

const mockWhatsAppClient = {
  downloadMedia: jest.fn(),
  sendMessage: jest.fn(),
} as any;

// Helper function for creating mock messages
const createMockMessage = (overrides: any = {}) => ({
  id: { _serialized: 'msg-123' },
  from: '6281234567890@c.us',
  body: 'Hello Wulang',
  hasMedia: false,
  type: 'chat',
  timestamp: Date.now(),
  ...overrides,
});

describe('MessageHandler', () => {
  let handler: MessageHandler;

  beforeEach(() => {
    jest.clearAllMocks();
    handler = new MessageHandler(
      mockProcessMessageUseCase as any,
      mockConversationManager as any,
      mockResetConversationUseCase as any
    );
  });

  describe('handleMessage()', () => {

    describe('Message Validation', () => {
      it('should skip duplicate messages', async () => {
        // Arrange
        const message = createMockMessage();
        
        // Act - First call
        await handler.handleMessage(message as any);
        
        // Act - Second call (duplicate)
        const result = await handler.handleMessage(message as any);

        // Assert
        expect(result.shouldRespond).toBe(false);
      });

      it('should skip messages without Wulang keyword', async () => {
        // Arrange
        const message = createMockMessage({ body: 'Hello world' });

        // Act
        const result = await handler.handleMessage(message as any);

        // Assert
        expect(result.shouldRespond).toBe(false);
      });

      it('should handle reset commands', async () => {
        // Arrange
        const message = createMockMessage({ body: env.RESET_KEYWORD });
        mockResetConversationUseCase.execute.mockResolvedValue({
          success: true,
          message: 'Conversation reset successfully',
        });

        // Act
        const result = await handler.handleMessage(message as any);

        // Assert
        expect(mockResetConversationUseCase.execute).toHaveBeenCalledWith({
          phoneNumber: '6281234567890',
        });
        expect(result.shouldRespond).toBe(true);
        expect(result.response).toBe('Conversation reset successfully');
      });

      it('should handle reset command errors', async () => {
        // Arrange
        const message = createMockMessage({ body: env.RESET_KEYWORD });
        mockResetConversationUseCase.execute.mockResolvedValue({
          success: false,
          message: 'Failed to reset conversation',
        });

        // Act
        const result = await handler.handleMessage(message as any);

        // Assert
        expect(result.shouldRespond).toBe(true);
        expect(result.response).toBe('Failed to reset conversation');
      });
    });

    describe('Media Handling', () => {
      it('should handle media messages with text', async () => {
        // Arrange
        const message = createMockMessage({
          body: 'Wulang, analyze this image',
          hasMedia: true,
          type: 'image',
        });

        const mediaData = {
          buffer: Buffer.from('image data'),
          filename: 'test.jpg',
          mimeType: 'image/jpeg',
          caption: 'Wulang, analyze this image',
        };

        mockWhatsAppClient.downloadMedia.mockResolvedValue(mediaData);
        mockProcessMessageUseCase.execute.mockResolvedValue({
          success: true,
          response: 'Image analysis result',
        });

        // Act
        const result = await handler.handleMessage(message as any);

        // Assert
        expect(mockWhatsAppClient.downloadMedia).toHaveBeenCalledWith(message);
        expect(mockProcessMessageUseCase.execute).toHaveBeenCalledWith(
          expect.objectContaining({
            phoneNumber: '6281234567890',
            message: 'Wulang, analyze this image',
            hasMedia: true,
            mediaType: 'image',
            mediaData,
          })
        );
        expect(result.shouldRespond).toBe(true);
        expect(result.response).toBe('Image analysis result');
      });

      it('should handle media messages without text', async () => {
        // Arrange
        const message = createMockMessage({
          body: '',
          hasMedia: true,
          type: 'image',
        });

        const mediaData = {
          buffer: Buffer.from('image data'),
          filename: 'test.jpg',
          mimeType: 'image/jpeg',
        };

        mockWhatsAppClient.downloadMedia.mockResolvedValue(mediaData);
        mockConversationManager.storePendingMedia.mockImplementation(() => {});

        // Act
        const result = await handler.handleMessage(message as any);

        // Assert
        expect(mockConversationManager.storePendingMedia).toHaveBeenCalledWith(
          '6281234567890',
          expect.objectContaining({
            buffer: mediaData.buffer,
            filename: mediaData.filename,
            mimeType: mediaData.mimeType,
          })
        );
        expect(result.shouldRespond).toBe(true);
        expect(result.response).toContain('gambar');
        expect(result.response).toContain('Apa yang ingin Anda ketahui');
      });

      it('should handle PDF media messages', async () => {
        // Arrange
        const message = createMockMessage({
          body: 'Wulang, analyze this PDF',
          hasMedia: true,
          type: 'document',
        });

        const mediaData = {
          buffer: Buffer.from('pdf data'),
          filename: 'test.pdf',
          mimeType: 'application/pdf',
          caption: 'Wulang, analyze this PDF',
        };

        mockWhatsAppClient.downloadMedia.mockResolvedValue(mediaData);
        mockProcessMessageUseCase.execute.mockResolvedValue({
          success: true,
          response: 'PDF analysis result',
        });

        // Act
        const result = await handler.handleMessage(message as any);

        // Assert
        expect(result.shouldRespond).toBe(true);
        expect(result.response).toBe('PDF analysis result');
      });

      it('should handle media download errors', async () => {
        // Arrange
        const message = createMockMessage({
          body: 'Wulang, analyze this',
          hasMedia: true,
          type: 'image',
        });

        mockWhatsAppClient.downloadMedia.mockRejectedValue(new Error('Download failed'));

        // Act
        const result = await handler.handleMessage(message as any);

        // Assert
        expect(result.shouldRespond).toBe(true);
        expect(result.response).toContain('Maaf, saya tidak bisa memproses file media Anda');
      });
    });

    describe('Text Message Processing', () => {
      it('should process text messages with Wulang keyword', async () => {
        // Arrange
        const message = createMockMessage({ body: 'Wulang, help me' });
        mockProcessMessageUseCase.execute.mockResolvedValue({
          success: true,
          response: 'How can I help you?',
        });

        // Act
        const result = await handler.handleMessage(message as any);

        // Assert
        expect(mockProcessMessageUseCase.execute).toHaveBeenCalledWith(
          expect.objectContaining({
            phoneNumber: '6281234567890',
            message: 'Wulang, help me',
            hasMedia: false,
          })
        );
        expect(result.shouldRespond).toBe(true);
        expect(result.response).toBe('How can I help you?');
      });

      it('should handle processing errors', async () => {
        // Arrange
        const message = createMockMessage({ body: 'Wulang, help me' });
        mockProcessMessageUseCase.execute.mockResolvedValue({
          success: false,
          response: 'Processing failed',
          error: 'Some error',
        });

        // Act
        const result = await handler.handleMessage(message as any);

        // Assert
        expect(result.shouldRespond).toBe(true);
        expect(result.response).toBe('Processing failed');
      });

      it('should handle processing exceptions', async () => {
        // Arrange
        const message = createMockMessage({ body: 'Wulang, help me' });
        mockProcessMessageUseCase.execute.mockRejectedValue(new Error('Service error'));

        // Act
        const result = await handler.handleMessage(message as any);

        // Assert
        expect(result.shouldRespond).toBe(true);
        expect(result.response).toContain('Maaf, saya mengalami kesalahan');
      });
    });

    describe('User Information Extraction', () => {
      it('should extract user name from message', async () => {
        // Arrange
        const message = createMockMessage({
          body: 'Wulang, help me',
          _data: { notifyName: 'John Doe' },
        });
        mockProcessMessageUseCase.execute.mockResolvedValue({
          success: true,
          response: 'Hello!',
        });

        // Act
        await handler.handleMessage(message as any);

        // Assert
        expect(mockProcessMessageUseCase.execute).toHaveBeenCalledWith(
          expect.objectContaining({
            userName: 'John Doe',
          })
        );
      });

      it('should use fallback name when notifyName is not available', async () => {
        // Arrange
        const message = createMockMessage({
          body: 'Wulang, help me',
          _data: { notifyName: undefined },
        });
        mockProcessMessageUseCase.execute.mockResolvedValue({
          success: true,
          response: 'Hello!',
        });

        // Act
        await handler.handleMessage(message as any);

        // Assert
        expect(mockProcessMessageUseCase.execute).toHaveBeenCalledWith(
          expect.objectContaining({
            userName: undefined,
          })
        );
      });
    });
  });

  describe('Utility Methods', () => {
    describe('hasWulangKeyword()', () => {
      it('should detect Wulang keyword in various cases', () => {
        expect(handler['hasWulangKeyword']('Wulang, help me')).toBe(true);
        expect(handler['hasWulangKeyword']('Hello Wulang!')).toBe(true);
        expect(handler['hasWulangKeyword']('WULANG test')).toBe(true);
        expect(handler['hasWulangKeyword']('wulang test')).toBe(true);
        expect(handler['hasWulangKeyword']('Hello world')).toBe(false);
        expect(handler['hasWulangKeyword']('')).toBe(false);
      });
    });

    describe('isResetCommand()', () => {
      it('should detect reset commands', () => {
        expect(handler['isResetCommand'](env.RESET_KEYWORD)).toBe(true);
        expect(handler['isResetCommand'](env.RESET_KEYWORD + ' something')).toBe(true);
        expect(handler['isResetCommand']('reset')).toBe(false);
        expect(handler['isResetCommand']('Hello')).toBe(false);
      });
    });

    describe('extractPhoneNumber()', () => {
      it('should extract phone number from WhatsApp ID', () => {
        expect(handler['extractPhoneNumber']('6281234567890@c.us')).toBe('6281234567890');
        expect(handler['extractPhoneNumber']('1234567890@c.us')).toBe('1234567890');
        expect(handler['extractPhoneNumber']('6281234567890')).toBe('6281234567890');
      });
    });

    describe('getMediaType()', () => {
      it('should identify image types', () => {
        expect(handler['getMediaType']('image/jpeg')).toBe('image');
        expect(handler['getMediaType']('image/png')).toBe('image');
        expect(handler['getMediaType']('image/gif')).toBe('image');
      });

      it('should identify PDF type', () => {
        expect(handler['getMediaType']('application/pdf')).toBe('pdf');
      });

      it('should return document for other types', () => {
        expect(handler['getMediaType']('text/plain')).toBe('document');
        expect(handler['getMediaType']('application/json')).toBe('document');
      });
    });

    describe('cleanupOldMessageIds()', () => {
      it('should clean up old message IDs when cache is too large', () => {
        // Arrange - Add many message IDs to trigger cleanup
        for (let i = 0; i < 1100; i++) {
          handler['processedMessageIds'].add(`msg-${i}`);
        }

        // Act
        handler['cleanupOldMessageIds']();

        // Assert
        expect(handler['processedMessageIds'].size).toBeLessThanOrEqual(500);
      });

      it('should not clean up when cache is small', () => {
        // Arrange
        handler['processedMessageIds'].add('msg-1');
        handler['processedMessageIds'].add('msg-2');
        const originalSize = handler['processedMessageIds'].size;

        // Act
        handler['cleanupOldMessageIds']();

        // Assert
        expect(handler['processedMessageIds'].size).toBe(originalSize);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle general errors gracefully', async () => {
      // Arrange
      const message = createMockMessage({ body: 'Wulang, help me' });
      mockProcessMessageUseCase.execute.mockRejectedValue(new Error('Unexpected error'));

      // Act
      const result = await handler.handleMessage(message as any);

      // Assert
      expect(result.shouldRespond).toBe(true);
      expect(result.response).toContain('Maaf, saya mengalami kesalahan');
    });

    it('should handle media download errors', async () => {
      // Arrange
      const message = createMockMessage({
        body: 'Wulang, analyze this',
        hasMedia: true,
        type: 'image',
      });
      mockWhatsAppClient.downloadMedia.mockRejectedValue(new Error('Download failed'));

      // Act
      const result = await handler.handleMessage(message as any);

      // Assert
      expect(result.shouldRespond).toBe(true);
      expect(result.response).toContain('Maaf, saya tidak bisa memproses file media Anda');
    });
  });

  describe('Memory Management', () => {
    it('should prevent memory leaks by cleaning up message IDs', async () => {
      // Arrange - Add many messages to trigger cleanup
      for (let i = 0; i < 1100; i++) {
        const message = createMockMessage({
          id: { _serialized: `msg-${i}` },
          body: 'Wulang, test',
        });
        mockProcessMessageUseCase.execute.mockResolvedValue({
          success: true,
          response: 'Test response',
        });

        // Act
        await handler.handleMessage(message as any);
      }

      // Assert
      expect(handler['processedMessageIds'].size).toBeLessThanOrEqual(500);
    });
  });
});
