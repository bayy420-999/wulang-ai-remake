import { WhatsAppBot } from '../WhatsAppBot';
import { MessageHandler } from '../handlers/MessageHandler';
import { MaintenanceService } from '../services/MaintenanceService';
import { WhatsAppClient } from '../../infrastructure/external/whatsapp/WhatsAppClient';
import { Message } from 'whatsapp-web.js';
import { logError, logInfo, logWarn } from '../../lib/logger';
import { env } from '../../config/env';

// Mock dependencies
jest.mock('../handlers/MessageHandler');
jest.mock('../services/MaintenanceService');
jest.mock('../../infrastructure/external/whatsapp/WhatsAppClient');
jest.mock('../../lib/logger', () => ({
  logError: jest.fn(),
  logInfo: jest.fn(),
  logWarn: jest.fn(),
}));
jest.mock('qrcode-terminal', () => ({
  generate: jest.fn(),
}));

describe('WhatsAppBot', () => {
  let whatsAppBot: WhatsAppBot;
  let mockMessageHandler: jest.Mocked<MessageHandler>;
  let mockMaintenanceService: jest.Mocked<MaintenanceService>;
  let mockWhatsAppClient: jest.Mocked<WhatsAppClient>;
  let mockEventHandlers: Map<string, Function[]>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockEventHandlers = new Map();

    // Create mocks
    mockMessageHandler = {
      handleMessage: jest.fn(),
    } as any;

    mockMaintenanceService = {
      startScheduledMaintenance: jest.fn(),
      stopScheduledMaintenance: jest.fn(),
      runManualMaintenance: jest.fn(),
    } as any;

    mockWhatsAppClient = {
      initialize: jest.fn(),
      destroy: jest.fn(),
      isReady: jest.fn(),
      sendMessage: jest.fn(),
      on: jest.fn((event: string, handler: Function) => {
        if (!mockEventHandlers.has(event)) {
          mockEventHandlers.set(event, []);
        }
        mockEventHandlers.get(event)!.push(handler);
      }),
    } as any;

    // Mock WhatsAppClient constructor
    (WhatsAppClient as jest.MockedClass<typeof WhatsAppClient>).mockImplementation(() => mockWhatsAppClient);

    // Create bot instance
    whatsAppBot = new WhatsAppBot(mockMessageHandler, mockMaintenanceService);
  });

  afterEach(async () => {
    // Clean up
    if (whatsAppBot) {
      await whatsAppBot.shutdown();
    }
  });

  describe('Constructor', () => {
    it('should create WhatsAppBot with dependencies', () => {
      expect(WhatsAppClient).toHaveBeenCalled();
      expect(whatsAppBot).toBeInstanceOf(WhatsAppBot);
    });
  });

  describe('start', () => {
    it('should start the bot successfully', async () => {
      await whatsAppBot.start();

      expect(logInfo).toHaveBeenCalledWith('🚀 Starting Wulang AI Bot...', 'WhatsAppBot');
      expect(logInfo).toHaveBeenCalledWith('📋 Configuration:', 'WhatsAppBot');
      expect(logInfo).toHaveBeenCalledWith(`   - Bot Name: ${env.BOT_NAME}`, 'WhatsAppBot');
      expect(logInfo).toHaveBeenCalledWith(`   - Reset Keyword: ${env.RESET_KEYWORD}`, 'WhatsAppBot');
      expect(logInfo).toHaveBeenCalledWith(`   - Max Context Messages: ${env.MAX_CONTEXT_MESSAGES}`, 'WhatsAppBot');
      expect(logInfo).toHaveBeenCalledWith(`   - Session Name: ${env.SESSION_NAME}`, 'WhatsAppBot');
      expect(mockWhatsAppClient.initialize).toHaveBeenCalled();
      expect(mockMaintenanceService.startScheduledMaintenance).toHaveBeenCalled();
      expect(logInfo).toHaveBeenCalledWith('✅ Wulang AI Bot is now running!', 'WhatsAppBot');
    });

    it('should handle startup errors gracefully', async () => {
      const error = new Error('Startup failed');
      mockWhatsAppClient.initialize.mockRejectedValue(error);

      await expect(whatsAppBot.start()).rejects.toThrow('Startup failed');

      expect(logError).toHaveBeenCalledWith('Failed to start Wulang AI Bot', error, 'WhatsAppBot');
    });

    it('should setup event handlers during startup', async () => {
      await whatsAppBot.start();

      expect(mockWhatsAppClient.on).toHaveBeenCalledWith('qr', expect.any(Function));
      expect(mockWhatsAppClient.on).toHaveBeenCalledWith('message', expect.any(Function));
      expect(mockWhatsAppClient.on).toHaveBeenCalledWith('disconnected', expect.any(Function));
    });
  });

  describe('Event Handlers', () => {
    beforeEach(async () => {
      await whatsAppBot.start();
    });

    it('should handle QR code generation', () => {
      const qrHandler = mockEventHandlers.get('qr')![0];
      const mockQr = 'mock-qr-code-data';

      qrHandler(mockQr);

      // Verify qrcode-terminal was called (mocked)
      expect(mockEventHandlers.get('qr')).toHaveLength(1);
    });

    it('should handle incoming messages successfully', async () => {
      const messageHandler = mockEventHandlers.get('message')![0];
      const mockMessage = {
        from: '6281234567890@c.us',
        body: 'Hello wulang',
      } as Message;

      const mockResponse = { shouldRespond: true, response: 'Hello! How can I help you?' };
      mockMessageHandler.handleMessage.mockResolvedValue(mockResponse);
      mockWhatsAppClient.sendMessage.mockResolvedValue(true);

      await messageHandler(mockMessage);

      expect(mockMessageHandler.handleMessage).toHaveBeenCalledWith(mockMessage);
      expect(mockWhatsAppClient.sendMessage).toHaveBeenCalledWith(
        mockMessage.from,
        mockResponse.response
      );
    });

    it('should handle messages that should not respond', async () => {
      const messageHandler = mockEventHandlers.get('message')![0];
      const mockMessage = {
        from: '6281234567890@c.us',
        body: 'Hello wulang',
      } as Message;

      const mockResponse = { shouldRespond: false };
      mockMessageHandler.handleMessage.mockResolvedValue(mockResponse);

      await messageHandler(mockMessage);

      expect(mockMessageHandler.handleMessage).toHaveBeenCalledWith(mockMessage);
      expect(mockWhatsAppClient.sendMessage).not.toHaveBeenCalled();
    });

    it('should handle message sending failures', async () => {
      const messageHandler = mockEventHandlers.get('message')![0];
      const mockMessage = {
        from: '6281234567890@c.us',
        body: 'Hello wulang',
      } as Message;

      const mockResponse = { shouldRespond: true, response: 'Hello! How can I help you?' };
      mockMessageHandler.handleMessage.mockResolvedValue(mockResponse);
      mockWhatsAppClient.sendMessage.mockResolvedValue(false);

      await messageHandler(mockMessage);

      expect(logError).toHaveBeenCalledWith(
        'Failed to send response to 6281234567890@c.us',
        undefined,
        'WhatsAppBot'
      );
    });

    it('should handle message processing errors', async () => {
      const messageHandler = mockEventHandlers.get('message')![0];
      const mockMessage = {
        from: '6281234567890@c.us',
        body: 'Hello wulang',
      } as Message;

      const error = new Error('Message processing failed');
      mockMessageHandler.handleMessage.mockRejectedValue(error);

      await messageHandler(mockMessage);

      expect(logError).toHaveBeenCalledWith(
        'Error handling incoming message',
        error,
        'WhatsAppBot'
      );
    });

    it('should handle client disconnection', () => {
      const disconnectHandler = mockEventHandlers.get('disconnected')![0];
      const disconnectReason = 'Connection lost';

      disconnectHandler(disconnectReason);

      expect(logWarn).toHaveBeenCalledWith(
        'WhatsApp client disconnected: Connection lost',
        'WhatsAppBot'
      );
    });
  });

  describe('getStatus', () => {
    beforeEach(async () => {
      await whatsAppBot.start();
    });

    it('should return bot status successfully', async () => {
      mockWhatsAppClient.isReady.mockReturnValue(true);

      const status = await whatsAppBot.getStatus();

      expect(status).toEqual({
        isRunning: true,
        whatsappReady: true,
        configuration: {
          botName: env.BOT_NAME,
          resetKeyword: env.RESET_KEYWORD,
          maxContextMessages: env.MAX_CONTEXT_MESSAGES
        }
      });
    });

    it('should handle status retrieval errors', async () => {
      const error = new Error('Status check failed');
      mockWhatsAppClient.isReady.mockImplementation(() => {
        throw error;
      });

      const status = await whatsAppBot.getStatus();

      expect(status).toBeNull();
      expect(logError).toHaveBeenCalledWith('Error getting bot status', error, 'WhatsAppBot');
    });

    it('should return correct status when WhatsApp is not ready', async () => {
      mockWhatsAppClient.isReady.mockReturnValue(false);

      const status = await whatsAppBot.getStatus();

      expect(status?.whatsappReady).toBe(false);
    });
  });

  describe('runMaintenance', () => {
    it('should run manual maintenance successfully', async () => {
      await whatsAppBot.runMaintenance();

      expect(mockMaintenanceService.runManualMaintenance).toHaveBeenCalled();
    });

    it('should handle maintenance errors', async () => {
      const error = new Error('Maintenance failed');
      mockMaintenanceService.runManualMaintenance.mockRejectedValue(error);

      await expect(whatsAppBot.runMaintenance()).rejects.toThrow('Maintenance failed');

      expect(logError).toHaveBeenCalledWith('Error during manual maintenance', error, 'WhatsAppBot');
    });
  });

  describe('shutdown', () => {
    beforeEach(async () => {
      await whatsAppBot.start();
    });

    it('should shutdown the bot gracefully', async () => {
      await whatsAppBot.shutdown();

      expect(logInfo).toHaveBeenCalledWith('🛑 Shutting down Wulang AI Bot...', 'WhatsAppBot');
      expect(mockMaintenanceService.stopScheduledMaintenance).toHaveBeenCalled();
      expect(mockWhatsAppClient.destroy).toHaveBeenCalled();
      expect(logInfo).toHaveBeenCalledWith('✅ Wulang AI Bot shut down successfully', 'WhatsAppBot');
    });

    it('should handle shutdown errors gracefully', async () => {
      const error = new Error('Shutdown failed');
      mockWhatsAppClient.destroy.mockRejectedValue(error);

      await whatsAppBot.shutdown();

      expect(logError).toHaveBeenCalledWith('Error during shutdown', error, 'WhatsAppBot');
    });

    it('should set isRunning to false during shutdown', async () => {
      await whatsAppBot.shutdown();

      const status = await whatsAppBot.getStatus();
      expect(status?.isRunning).toBe(false);
    });
  });

  describe('Integration scenarios', () => {
    it('should handle complete message flow', async () => {
      await whatsAppBot.start();

      const messageHandler = mockEventHandlers.get('message')![0];
      const mockMessage = {
        from: '6281234567890@c.us',
        body: 'wulang, help me with my research',
      } as Message;

      const mockResponse = { 
        shouldRespond: true, 
        response: 'I can help you with your research. What specific topic are you working on?' 
      };
      mockMessageHandler.handleMessage.mockResolvedValue(mockResponse);
      mockWhatsAppClient.sendMessage.mockResolvedValue(true);

      await messageHandler(mockMessage);

      expect(mockMessageHandler.handleMessage).toHaveBeenCalledWith(mockMessage);
      expect(mockWhatsAppClient.sendMessage).toHaveBeenCalledWith(
        mockMessage.from,
        mockResponse.response
      );
    });

    it('should handle multiple messages in sequence', async () => {
      await whatsAppBot.start();

      const messageHandler = mockEventHandlers.get('message')![0];
      const mockMessages = [
        { from: '6281234567890@c.us', body: 'wulang, hello' },
        { from: '6281234567891@c.us', body: 'wulang, help me' },
      ];

      for (const mockMessage of mockMessages) {
        const mockResponse = { 
          shouldRespond: true, 
          response: `Response to ${mockMessage.body}` 
        };
        mockMessageHandler.handleMessage.mockResolvedValue(mockResponse);
        mockWhatsAppClient.sendMessage.mockResolvedValue(true);

        await messageHandler(mockMessage as Message);

        expect(mockMessageHandler.handleMessage).toHaveBeenCalledWith(mockMessage);
        expect(mockWhatsAppClient.sendMessage).toHaveBeenCalledWith(
          mockMessage.from,
          mockResponse.response
        );
      }
    });

    it('should handle bot restart scenario', async () => {
      // Start the bot
      await whatsAppBot.start();
      expect(mockWhatsAppClient.initialize).toHaveBeenCalledTimes(1);

      // Shutdown
      await whatsAppBot.shutdown();
      expect(mockWhatsAppClient.destroy).toHaveBeenCalledTimes(1);

      // Restart
      await whatsAppBot.start();
      expect(mockWhatsAppClient.initialize).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error handling', () => {
    it('should handle WhatsApp client initialization errors', async () => {
      const error = new Error('WhatsApp initialization failed');
      mockWhatsAppClient.initialize.mockRejectedValue(error);

      await expect(whatsAppBot.start()).rejects.toThrow('WhatsApp initialization failed');

      expect(logError).toHaveBeenCalledWith('Failed to start Wulang AI Bot', error, 'WhatsAppBot');
    });

    it('should handle maintenance service errors during startup', async () => {
      const error = new Error('Maintenance service failed');
      mockMaintenanceService.startScheduledMaintenance.mockImplementation(() => {
        throw error;
      });

      await expect(whatsAppBot.start()).rejects.toThrow('Maintenance service failed');
    });

    it('should handle event handler setup errors', async () => {
      mockWhatsAppClient.on.mockImplementation(() => {
        throw new Error('Event handler setup failed');
      });

      await expect(whatsAppBot.start()).rejects.toThrow('Event handler setup failed');
    });
  });

  describe('Configuration validation', () => {
    it('should log all required configuration values', async () => {
      await whatsAppBot.start();

      expect(logInfo).toHaveBeenCalledWith(`   - Bot Name: ${env.BOT_NAME}`, 'WhatsAppBot');
      expect(logInfo).toHaveBeenCalledWith(`   - Reset Keyword: ${env.RESET_KEYWORD}`, 'WhatsAppBot');
      expect(logInfo).toHaveBeenCalledWith(`   - Max Context Messages: ${env.MAX_CONTEXT_MESSAGES}`, 'WhatsAppBot');
      expect(logInfo).toHaveBeenCalledWith(`   - Session Name: ${env.SESSION_NAME}`, 'WhatsAppBot');
    });

    it('should log usage instructions', async () => {
      await whatsAppBot.start();

      expect(logInfo).toHaveBeenCalledWith('📱 The bot will respond to messages containing "wulang":', 'WhatsAppBot');
      expect(logInfo).toHaveBeenCalledWith('   "wulang" - Start/continue conversation', 'WhatsAppBot');
      expect(logInfo).toHaveBeenCalledWith(`   "${env.RESET_KEYWORD}" - Reset conversation history`, 'WhatsAppBot');
    });
  });

  describe('State management', () => {
    it('should track running state correctly', async () => {
      // Initially not running
      let status = await whatsAppBot.getStatus();
      expect(status?.isRunning).toBe(false);

      // After start
      await whatsAppBot.start();
      status = await whatsAppBot.getStatus();
      expect(status?.isRunning).toBe(true);

      // After shutdown
      await whatsAppBot.shutdown();
      status = await whatsAppBot.getStatus();
      expect(status?.isRunning).toBe(false);
    });

    it('should maintain state during errors', async () => {
      await whatsAppBot.start();
      
      // Simulate an error that doesn't stop the bot
      const messageHandler = mockEventHandlers.get('message')![0];
      const mockMessage = { from: '6281234567890@c.us', body: 'wulang, test' } as Message;
      
      mockMessageHandler.handleMessage.mockRejectedValue(new Error('Test error'));
      
      await messageHandler(mockMessage);
      
      // Bot should still be running
      const status = await whatsAppBot.getStatus();
      expect(status?.isRunning).toBe(true);
    });
  });
});
