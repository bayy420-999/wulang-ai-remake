import { MessageHandler } from '../MessageHandler';
import { ProcessMessageUseCase } from '../../../application/use-cases/ProcessMessageUseCase';
import { ResetConversationUseCase } from '../../../application/use-cases/ResetConversationUseCase';
import { ConversationManager } from '../../../application/services/ConversationManager';
import { ResponseFormatter } from '../../../infrastructure/utils/ResponseFormatter';
import { Message } from 'whatsapp-web.js';
import { logError, logInfo, logDebug } from '../../../lib/logger';
import { ProcessMessageResult } from '../../../application/dto/ProcessMessageDto';

// Mock dependencies
jest.mock('../../../application/use-cases/ProcessMessageUseCase');
jest.mock('../../../application/use-cases/ResetConversationUseCase');
jest.mock('../../../application/services/ConversationManager');
jest.mock('../../../infrastructure/utils/ResponseFormatter');
jest.mock('../../../lib/logger', () => ({
  logError: jest.fn(),
  logInfo: jest.fn(),
  logDebug: jest.fn(),
}));

// Mock environment variables
jest.mock('../../../config/env', () => ({
  env: {
    RESET_KEYWORD: '!reset',
    ENABLE_GROUP_MESSAGES: true,
    // Add other required env vars
    DATABASE_URL: 'test-db-url',
    OPENAI_API_KEY: 'test-api-key',
    OPENAI_MODEL: 'gpt-4o-mini',
    TEMPERATURE: 0.7,
    BOT_NAME: 'Wulang - Kelas Inovatif',
    MAX_CONTEXT_MESSAGES: 10,
    SESSION_NAME: 'wulang-ai-session',
    LOG_LEVEL: 'info',
  }
}));

describe('MessageHandler', () => {
  let messageHandler: MessageHandler;
  let mockProcessMessageUseCase: jest.Mocked<ProcessMessageUseCase>;
  let mockResetConversationUseCase: jest.Mocked<ResetConversationUseCase>;
  let mockConversationManager: jest.Mocked<ConversationManager>;
  let mockResponseFormatter: jest.Mocked<ResponseFormatter>;
  let mockMessage: any;

  // Helper function to create valid ProcessMessageResult
  const createMockProcessResult = (success: boolean, response: string, error?: string): ProcessMessageResult => ({
    success,
    response,
    conversationId: 'test-conversation-id',
    error
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mocks
    mockProcessMessageUseCase = {
      execute: jest.fn(),
    } as any;

    mockResetConversationUseCase = {
      execute: jest.fn(),
    } as any;

    mockConversationManager = {
      hasPendingMedia: jest.fn(),
      getPendingMedia: jest.fn(),
      removePendingMedia: jest.fn(),
      storePendingMedia: jest.fn(),
    } as any;

    mockResponseFormatter = {
      formatForWhatsApp: jest.fn(),
      formatError: jest.fn(),
    } as any;

    // Mock ResponseFormatter constructor
    (ResponseFormatter as jest.MockedClass<typeof ResponseFormatter>).mockImplementation(() => mockResponseFormatter);

    // Create message handler
    messageHandler = new MessageHandler(
      mockProcessMessageUseCase,
      mockResetConversationUseCase,
      mockConversationManager
    );

    // Setup default mock message
    mockMessage = {
      id: { _serialized: 'test-message-id' },
      body: 'Hello wulang, how are you?',
      from: '6281234567890@c.us',
      fromMe: false,
      timestamp: Date.now(),
      hasMedia: false,
      type: 'chat',
      getContact: jest.fn().mockResolvedValue({
        number: '6281234567890',
        name: 'John Doe',
        pushname: 'John'
      }),
      downloadMedia: jest.fn(),
    };
  });

  describe('handleMessage', () => {
    it('should process messages from groups with wulang keyword', async () => {
      mockMessage.from = 'group-id@g.us';
      mockMessage.body = 'wulang hello from group';
      
      mockProcessMessageUseCase.execute.mockResolvedValue(
        createMockProcessResult(true, 'Hello from group!')
      );

      const result = await messageHandler.handleMessage(mockMessage as Message);

      expect(result.shouldRespond).toBe(true);
      expect(result.response).toBe('Hello from group!');
      expect(mockProcessMessageUseCase.execute).toHaveBeenCalledWith({
        phoneNumber: 'group-id@g.us',
        message: 'wulang hello from group',
        userName: 'John Doe',
        hasMedia: false,
        mediaType: 'chat',
        mediaData: undefined
      });
    });

    it('should skip messages from self', async () => {
      mockMessage.fromMe = true;

      const result = await messageHandler.handleMessage(mockMessage as Message);

      expect(result.shouldRespond).toBe(false);
    });

    it('should skip duplicate messages', async () => {
      // First call
      await messageHandler.handleMessage(mockMessage as Message);
      
      // Second call with same ID
      const result = await messageHandler.handleMessage(mockMessage as Message);

      expect(result.shouldRespond).toBe(false);
      expect(logDebug).toHaveBeenCalledWith(
        'Skipping duplicate message: test-message-id',
        'MessageHandler'
      );
    });

    it('should handle reset command', async () => {
      mockMessage.body = '!reset';
      const resetResponse = 'Conversation reset successfully';
      
      mockResetConversationUseCase.execute.mockResolvedValue({
        success: true,
        message: resetResponse
      });

      const result = await messageHandler.handleMessage(mockMessage as Message);

      expect(mockResetConversationUseCase.execute).toHaveBeenCalledWith({
        phoneNumber: '6281234567890'
      });
      expect(result.shouldRespond).toBe(true);
      expect(result.response).toBe(resetResponse);
    });

    it('should handle reset command with different casing', async () => {
      mockMessage.body = '!RESET';
      
      mockResetConversationUseCase.execute.mockResolvedValue({
        success: true,
        message: 'Conversation reset successfully'
      });

      const result = await messageHandler.handleMessage(mockMessage as Message);

      expect(result.shouldRespond).toBe(true);
    });

    it('should respond to individual messages without wulang keyword', async () => {
      mockMessage.body = 'Hello, how are you?';
      mockMessage.from = '6281234567890@c.us'; // Individual message
      const defaultResponse = 'Halo! Ada yang bisa saya bantu? tolong panggil saya dengan menyebut "wulang" dalam pesan';
      
      mockResponseFormatter.formatForWhatsApp.mockReturnValue(defaultResponse);

      const result = await messageHandler.handleMessage(mockMessage as Message);

      expect(result.shouldRespond).toBe(true);
      expect(result.response).toBe(defaultResponse);
      expect(mockResponseFormatter.formatForWhatsApp).toHaveBeenCalledWith(
        'Halo! Ada yang bisa saya bantu? tolong panggil saya dengan menyebut "wulang" dalam pesan'
      );
    });

    it('should ignore group messages without wulang keyword', async () => {
      mockMessage.body = 'Hello, how are you?';
      mockMessage.from = 'group-id@g.us'; // Group message

      const result = await messageHandler.handleMessage(mockMessage as Message);

      expect(result.shouldRespond).toBe(false);
      expect(mockResponseFormatter.formatForWhatsApp).not.toHaveBeenCalled();
      expect(mockProcessMessageUseCase.execute).not.toHaveBeenCalled();
    });

    it('should process messages with wulang keyword', async () => {
      mockMessage.body = 'Hello wulang, how are you?';
      const aiResponse = 'Hello! I am doing well, thank you for asking.';
      
      mockProcessMessageUseCase.execute.mockResolvedValue(
        createMockProcessResult(true, aiResponse)
      );

      const result = await messageHandler.handleMessage(mockMessage as Message);

      expect(mockProcessMessageUseCase.execute).toHaveBeenCalledWith({
        phoneNumber: '6281234567890',
        message: 'Hello wulang, how are you?',
        userName: 'John Doe',
        hasMedia: false,
        mediaType: 'chat',
        mediaData: undefined
      });
      expect(result.shouldRespond).toBe(true);
      expect(result.response).toBe(aiResponse);
    });

    it('should handle media messages with caption', async () => {
      mockMessage.body = 'wulang, analyze this image';
      mockMessage.hasMedia = true;
      mockMessage.type = 'image';
      
      const mediaBuffer = Buffer.from('fake-image-data');
      mockMessage.downloadMedia.mockResolvedValue({
        data: mediaBuffer.toString('base64'),
        filename: 'test-image.jpg',
        mimetype: 'image/jpeg'
      });

      const aiResponse = 'I can see this is an image of...';
      mockProcessMessageUseCase.execute.mockResolvedValue(
        createMockProcessResult(true, aiResponse)
      );

      const result = await messageHandler.handleMessage(mockMessage as Message);

      expect(mockProcessMessageUseCase.execute).toHaveBeenCalledWith({
        phoneNumber: '6281234567890',
        message: 'wulang, analyze this image',
        userName: 'John Doe',
        hasMedia: true,
        mediaType: 'image',
        mediaData: {
          buffer: expect.any(Buffer),
          filename: 'test-image.jpg',
          mimeType: 'image/jpeg',
          caption: 'wulang, analyze this image'
        }
      });
      expect(result.shouldRespond).toBe(true);
      expect(result.response).toBe(aiResponse);
    });

    it('should handle media messages without caption for individual messages', async () => {
      mockMessage.body = 'wulang'; // Include wulang keyword
      mockMessage.from = '6281234567890@c.us'; // Individual message
      mockMessage.hasMedia = true;
      mockMessage.type = 'image';
      
      const mediaBuffer = Buffer.from('fake-image-data');
      mockMessage.downloadMedia.mockResolvedValue({
        data: mediaBuffer.toString('base64'),
        filename: 'test-image.jpg',
        mimetype: 'image/jpeg'
      });

      const aiResponse = 'I can see this image...';
      mockProcessMessageUseCase.execute.mockResolvedValue(
        createMockProcessResult(true, aiResponse)
      );

      const result = await messageHandler.handleMessage(mockMessage as Message);

      expect(mockProcessMessageUseCase.execute).toHaveBeenCalledWith({
        phoneNumber: '6281234567890',
        message: 'wulang',
        userName: 'John Doe',
        hasMedia: true,
        mediaType: 'image',
        mediaData: {
          buffer: expect.any(Buffer),
          filename: 'test-image.jpg',
          mimeType: 'image/jpeg',
          caption: 'wulang'
        }
      });
      expect(result.shouldRespond).toBe(true);
      expect(result.response).toBe(aiResponse);
    });

    it('should handle media messages without caption for group messages', async () => {
      mockMessage.body = 'wulang'; // Include wulang keyword for group
      mockMessage.from = 'group-id@g.us'; // Group message
      mockMessage.hasMedia = true;
      mockMessage.type = 'image';
      
      const mediaBuffer = Buffer.from('fake-image-data');
      mockMessage.downloadMedia.mockResolvedValue({
        data: mediaBuffer.toString('base64'),
        filename: 'test-image.jpg',
        mimetype: 'image/jpeg'
      });

      const aiResponse = 'I can see this image...';
      mockProcessMessageUseCase.execute.mockResolvedValue(
        createMockProcessResult(true, aiResponse)
      );

      const result = await messageHandler.handleMessage(mockMessage as Message);

      expect(mockProcessMessageUseCase.execute).toHaveBeenCalledWith({
        phoneNumber: 'group-id@g.us',
        message: 'wulang',
        userName: 'John Doe',
        hasMedia: true,
        mediaType: 'image',
        mediaData: {
          buffer: expect.any(Buffer),
          filename: 'test-image.jpg',
          mimeType: 'image/jpeg',
          caption: 'wulang'
        }
      });
      expect(result.shouldRespond).toBe(true);
      expect(result.response).toBe(aiResponse);
    });

    it('should handle PDF media messages for individual messages', async () => {
      mockMessage.body = '';
      mockMessage.from = '6281234567890@c.us'; // Individual message
      mockMessage.hasMedia = true;
      mockMessage.type = 'document';
      
      const mediaBuffer = Buffer.from('fake-pdf-data');
      mockMessage.downloadMedia.mockResolvedValue({
        data: mediaBuffer.toString('base64'),
        filename: 'document.pdf',
        mimetype: 'application/pdf'
      });

      const mediaResponse = '📎 Saya telah menerima dokumen yang Anda kirim.\n\nApa yang ingin Anda ketahui tentang dokumen ini? Silakan tanyakan apa saja yang ingin Anda analisis atau ketahui.';
      mockResponseFormatter.formatForWhatsApp.mockReturnValue(mediaResponse);

      const result = await messageHandler.handleMessage(mockMessage as Message);

      expect(result.shouldRespond).toBe(true);
      expect(result.response).toBe(mediaResponse);
    });

    it('should handle pending media with question for individual messages', async () => {
      mockMessage.body = 'wulang What is in this image?';
      mockMessage.from = '6281234567890@c.us'; // Individual message
      mockMessage.hasMedia = false;
      
      const pendingMedia = {
        buffer: Buffer.from('fake-image-data'),
        filename: 'pending-image.jpg',
        mimeType: 'image/jpeg',
        timestamp: Date.now()
      };

      mockConversationManager.hasPendingMedia.mockReturnValue(true);
      mockConversationManager.getPendingMedia.mockReturnValue(pendingMedia);

      const aiResponse = 'This image shows...';
      mockProcessMessageUseCase.execute.mockResolvedValue(
        createMockProcessResult(true, aiResponse)
      );

      const result = await messageHandler.handleMessage(mockMessage as Message);

      expect(mockProcessMessageUseCase.execute).toHaveBeenCalledWith({
        phoneNumber: '6281234567890',
        message: 'wulang What is in this image?',
        userName: 'John Doe',
        hasMedia: true,
        mediaType: 'image',
        mediaData: {
          buffer: pendingMedia.buffer,
          filename: pendingMedia.filename,
          mimeType: pendingMedia.mimeType,
          caption: 'wulang What is in this image?'
        }
      });
      expect(mockConversationManager.removePendingMedia).toHaveBeenCalledWith('6281234567890');
      expect(result.shouldRespond).toBe(true);
      expect(result.response).toBe(aiResponse);
    });

    it('should handle media download errors', async () => {
      mockMessage.body = 'wulang, analyze this';
      mockMessage.hasMedia = true;
      mockMessage.downloadMedia.mockRejectedValue(new Error('Download failed'));

      const errorResponse = 'Maaf, saya tidak bisa memproses file media Anda. Silakan coba lagi atau kirim dalam format yang berbeda.';
      mockResponseFormatter.formatError.mockReturnValue(errorResponse);

      const result = await messageHandler.handleMessage(mockMessage as Message);

      expect(result.shouldRespond).toBe(true);
      expect(result.response).toBe(errorResponse);
      expect(logError).toHaveBeenCalledWith(
        'Failed to download media',
        expect.any(Error),
        'MessageHandler'
      );
    });

    it('should handle process message use case errors', async () => {
      mockMessage.body = 'wulang, help me';
      
      mockProcessMessageUseCase.execute.mockResolvedValue(
        createMockProcessResult(false, 'Sorry, I encountered an error', 'Processing failed')
      );

      const result = await messageHandler.handleMessage(mockMessage as Message);

      expect(result.shouldRespond).toBe(true);
      expect(result.response).toBe('Sorry, I encountered an error');
      expect(logError).toHaveBeenCalledWith(
        'Failed to process message for 6281234567890: Processing failed',
        undefined,
        'MessageHandler'
      );
    });

    it('should handle general errors gracefully', async () => {
      mockMessage.body = 'wulang, help me';
      mockMessage.getContact.mockRejectedValue(new Error('Contact error'));

      const errorResponse = 'Maaf, saya mengalami kesalahan saat memproses pesan Anda. Silakan coba lagi nanti.';
      mockResponseFormatter.formatError.mockReturnValue(errorResponse);

      const result = await messageHandler.handleMessage(mockMessage as Message);

      expect(result.shouldRespond).toBe(true);
      expect(result.response).toBe(errorResponse);
      expect(logError).toHaveBeenCalledWith(
        'Error handling message',
        expect.any(Error),
        'MessageHandler'
      );
    });

    it('should handle string message ID', async () => {
      mockMessage.id = 'string-message-id';
      mockMessage.body = 'wulang, test message';

      mockProcessMessageUseCase.execute.mockResolvedValue(
        createMockProcessResult(true, 'Test response')
      );

      const result = await messageHandler.handleMessage(mockMessage as Message);

      expect(result.shouldRespond).toBe(true);
      expect(result.response).toBe('Test response');
    });

    it('should handle numeric message ID', async () => {
      mockMessage.id = 12345;
      mockMessage.body = 'wulang, test message';

      mockProcessMessageUseCase.execute.mockResolvedValue(
        createMockProcessResult(true, 'Test response')
      );

      const result = await messageHandler.handleMessage(mockMessage as Message);

      expect(result.shouldRespond).toBe(true);
      expect(result.response).toBe('Test response');
    });

    it('should extract phone number correctly', async () => {
      mockMessage.from = '6281234567890@c.us';
      mockMessage.body = 'wulang, test';

      mockProcessMessageUseCase.execute.mockResolvedValue(
        createMockProcessResult(true, 'Test response')
      );

      await messageHandler.handleMessage(mockMessage as Message);

      expect(mockProcessMessageUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          phoneNumber: '6281234567890'
        })
      );
    });

    it('should handle contact without name', async () => {
      mockMessage.body = 'wulang, test';
      mockMessage.getContact.mockResolvedValue({
        number: '6281234567890',
        pushname: 'John'
      });

      mockProcessMessageUseCase.execute.mockResolvedValue(
        createMockProcessResult(true, 'Test response')
      );

      await messageHandler.handleMessage(mockMessage as Message);

      expect(mockProcessMessageUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          userName: 'John'
        })
      );
    });

    it('should handle contact without name or pushname', async () => {
      mockMessage.body = 'wulang, test';
      mockMessage.getContact.mockResolvedValue({
        number: '6281234567890'
      });

      mockProcessMessageUseCase.execute.mockResolvedValue(
        createMockProcessResult(true, 'Test response')
      );

      await messageHandler.handleMessage(mockMessage as Message);

      expect(mockProcessMessageUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          userName: undefined
        })
      );
    });
  });

  describe('Private methods', () => {
    it('should detect wulang keyword correctly for individual messages', async () => {
      const testCases = [
        { message: 'wulang help me', expected: true },
        { message: 'WULANG help me', expected: true },
        { message: 'Hello wulang', expected: true },
        { message: 'Hello Wulang', expected: true },
        { message: 'Hello', expected: false },
        { message: 'wulang', expected: true },
        { message: '  wulang  ', expected: true },
        { message: '', expected: false },
      ];

      for (let i = 0; i < testCases.length; i++) {
        const testCase = testCases[i];
        mockMessage.body = testCase.message;
        mockMessage.from = '6281234567890@c.us'; // Individual message
        mockMessage.id = { _serialized: `test-message-id-${i}` };
        mockProcessMessageUseCase.execute.mockResolvedValue(
          createMockProcessResult(true, 'Test response')
        );

        const result = await messageHandler.handleMessage(mockMessage as Message);
        expect(result.shouldRespond).toBe(true);
        
        if (testCase.expected) {
          expect(mockProcessMessageUseCase.execute).toHaveBeenCalled();
        } else {
          expect(mockResponseFormatter.formatForWhatsApp).toHaveBeenCalledWith(
            'Halo! Ada yang bisa saya bantu? tolong panggil saya dengan menyebut "wulang" dalam pesan'
          );
        }
        
        jest.clearAllMocks();
      }
    });

    it('should detect wulang keyword correctly for group messages', async () => {
      const testCases = [
        { message: 'wulang help me', expected: true },
        { message: 'WULANG help me', expected: true },
        { message: 'Hello wulang', expected: true },
        { message: 'Hello Wulang', expected: true },
        { message: 'Hello', expected: false },
        { message: 'wulang', expected: true },
        { message: '  wulang  ', expected: true },
        { message: '', expected: false },
      ];

      for (let i = 0; i < testCases.length; i++) {
        const testCase = testCases[i];
        mockMessage.body = testCase.message;
        mockMessage.from = 'group-id@g.us'; // Group message
        mockMessage.id = { _serialized: `test-group-message-id-${i}` };
        mockProcessMessageUseCase.execute.mockResolvedValue(
          createMockProcessResult(true, 'Test response')
        );

        const result = await messageHandler.handleMessage(mockMessage as Message);
        
        if (testCase.expected) {
          expect(result.shouldRespond).toBe(true);
          expect(mockProcessMessageUseCase.execute).toHaveBeenCalled();
        } else {
          expect(result.shouldRespond).toBe(false);
          expect(mockProcessMessageUseCase.execute).not.toHaveBeenCalled();
          expect(mockResponseFormatter.formatForWhatsApp).not.toHaveBeenCalled();
        }
        
        jest.clearAllMocks();
      }
    });

    it('should detect reset command correctly for individual messages', async () => {
      const testCases = [
        { message: '!reset', expected: true },
        { message: '!RESET', expected: true },
        { message: '!reset conversation', expected: true },
        { message: 'reset', expected: false },
        { message: '!resetme', expected: false },
        { message: '  !reset  ', expected: true },
      ];

      for (let i = 0; i < testCases.length; i++) {
        const testCase = testCases[i];
        mockMessage.body = testCase.message;
        mockMessage.from = '6281234567890@c.us'; // Individual message
        mockMessage.id = { _serialized: `reset-test-message-id-${i}` };
        mockResetConversationUseCase.execute.mockResolvedValue({
          success: true,
          message: 'Reset response'
        });

        const result = await messageHandler.handleMessage(mockMessage as Message);
        
        if (testCase.expected) {
          expect(mockResetConversationUseCase.execute).toHaveBeenCalled();
          expect(result.shouldRespond).toBe(true);
        } else {
          expect(mockResetConversationUseCase.execute).not.toHaveBeenCalled();
        }
        
        jest.clearAllMocks();
      }
    });

    it('should determine media type correctly for individual messages', async () => {
      const testCases = [
        { mimeType: 'image/jpeg', expected: 'image' },
        { mimeType: 'image/png', expected: 'image' },
        { mimeType: 'image/gif', expected: 'image' },
        { mimeType: 'application/pdf', expected: 'pdf' },
        { mimeType: 'application/msword', expected: 'document' },
        { mimeType: 'text/plain', expected: 'document' },
      ];

      for (let i = 0; i < testCases.length; i++) {
        const testCase = testCases[i];
        mockMessage.body = 'wulang'; // Include wulang keyword
        mockMessage.from = '6281234567890@c.us'; // Individual message
        mockMessage.hasMedia = true;
        mockMessage.id = { _serialized: `media-test-message-id-${i}` };
        mockMessage.downloadMedia.mockResolvedValue({
          data: Buffer.from('test').toString('base64'),
          filename: 'test.file',
          mimetype: testCase.mimeType
        });

        mockProcessMessageUseCase.execute.mockResolvedValue(
          createMockProcessResult(true, 'Media response')
        );

        await messageHandler.handleMessage(mockMessage as Message);

        expect(mockProcessMessageUseCase.execute).toHaveBeenCalledWith(
          expect.objectContaining({
            phoneNumber: '6281234567890',
            message: 'wulang',
            hasMedia: true,
            mediaData: expect.objectContaining({
              mimeType: testCase.mimeType
            })
          })
        );

        jest.clearAllMocks();
      }
    });
  });

  describe('Message ID cleanup', () => {
    it('should clean up old message IDs when cache gets too large', async () => {
      // Add many messages to trigger cleanup
      for (let i = 0; i < 1001; i++) {
        const message = {
          ...mockMessage,
          id: { _serialized: `message-${i}` },
          body: `wulang message ${i}`
        };

        mockProcessMessageUseCase.execute.mockResolvedValue(
          createMockProcessResult(true, `Response ${i}`)
        );

        await messageHandler.handleMessage(message as Message);
      }

      // Verify cleanup was logged
      expect(logDebug).toHaveBeenCalledWith(
        'Cleaned up message ID cache, kept last 500 IDs',
        'MessageHandler'
      );
    });
  });

  describe('Edge cases', () => {
    it('should handle empty message body for individual messages', async () => {
      mockMessage.body = '';
      mockMessage.from = '6281234567890@c.us'; // Individual message
      mockMessage.hasMedia = false;

      const result = await messageHandler.handleMessage(mockMessage as Message);

      expect(result.shouldRespond).toBe(true);
      expect(mockResponseFormatter.formatForWhatsApp).toHaveBeenCalledWith(
        'Halo! Ada yang bisa saya bantu? tolong panggil saya dengan menyebut "wulang" dalam pesan'
      );
    });

    it('should handle empty message body for group messages', async () => {
      mockMessage.body = '';
      mockMessage.from = 'group-id@g.us'; // Group message
      mockMessage.hasMedia = false;

      const result = await messageHandler.handleMessage(mockMessage as Message);

      expect(result.shouldRespond).toBe(false);
      expect(mockResponseFormatter.formatForWhatsApp).not.toHaveBeenCalled();
    });

    it('should handle whitespace-only message body for individual messages', async () => {
      mockMessage.body = '   ';
      mockMessage.from = '6281234567890@c.us'; // Individual message
      mockMessage.hasMedia = false;

      const result = await messageHandler.handleMessage(mockMessage as Message);

      expect(result.shouldRespond).toBe(true);
      expect(mockResponseFormatter.formatForWhatsApp).toHaveBeenCalledWith(
        'Halo! Ada yang bisa saya bantu? tolong panggil saya dengan menyebut "wulang" dalam pesan'
      );
    });

    it('should handle whitespace-only message body for group messages', async () => {
      mockMessage.body = '   ';
      mockMessage.from = 'group-id@g.us'; // Group message
      mockMessage.hasMedia = false;

      const result = await messageHandler.handleMessage(mockMessage as Message);

      expect(result.shouldRespond).toBe(false);
      expect(mockResponseFormatter.formatForWhatsApp).not.toHaveBeenCalled();
    });

    it('should handle very long message body', async () => {
      const longMessage = 'wulang ' + 'a'.repeat(10000);
      mockMessage.body = longMessage;

      mockProcessMessageUseCase.execute.mockResolvedValue(
        createMockProcessResult(true, 'Long message response')
      );

      const result = await messageHandler.handleMessage(mockMessage as Message);

      expect(result.shouldRespond).toBe(true);
      expect(result.response).toBe('Long message response');
    });

    it('should handle special characters in message', async () => {
      mockMessage.body = 'wulang test with émojis 🚀 and special chars: !@#$%^&*()';
      
      mockProcessMessageUseCase.execute.mockResolvedValue(
        createMockProcessResult(true, 'Special chars response')
      );

      const result = await messageHandler.handleMessage(mockMessage as Message);

      expect(result.shouldRespond).toBe(true);
      expect(result.response).toBe('Special chars response');
    });
  });
});
