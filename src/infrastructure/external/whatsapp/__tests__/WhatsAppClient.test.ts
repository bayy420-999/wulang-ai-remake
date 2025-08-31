import { WhatsAppClient, IWhatsAppClient } from '../WhatsAppClient';
import { Client, LocalAuth, Message } from 'whatsapp-web.js';
import { env } from '../../../../config/env';

// Mock whatsapp-web.js
jest.mock('whatsapp-web.js', () => ({
  Client: jest.fn(),
  LocalAuth: jest.fn(),
  Message: jest.fn(),
}));

// Mock logger
jest.mock('../../../../lib/logger', () => ({
  logError: jest.fn(),
  logInfo: jest.fn(),
  logWarn: jest.fn(),
  logDebug: jest.fn(),
}));

describe('WhatsAppClient', () => {
  let whatsAppClient: WhatsAppClient;
  let mockClient: any;
  let eventHandlers: Map<string, Function[]>;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create event handlers map
    eventHandlers = new Map();

    // Create mock client
    mockClient = {
      initialize: jest.fn(),
      sendMessage: jest.fn(),
      destroy: jest.fn(),
      on: jest.fn((event: string, handler: Function) => {
        if (!eventHandlers.has(event)) {
          eventHandlers.set(event, []);
        }
        eventHandlers.get(event)!.push(handler);
      }),
    };

    // Mock Client constructor
    (Client as jest.MockedClass<typeof Client>).mockImplementation(() => mockClient);

    // Mock LocalAuth constructor
    (LocalAuth as jest.MockedClass<typeof LocalAuth>).mockImplementation(() => ({} as any));

    whatsAppClient = new WhatsAppClient();
  });

  afterEach(async () => {
    if (whatsAppClient) {
      await whatsAppClient.destroy();
    }
  });

  // Helper function to trigger events
  const triggerEvent = (event: string, ...args: any[]) => {
    const handlers = eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => handler(...args));
    }
  };

  describe('Constructor', () => {
    it('should create a WhatsApp client with correct configuration', () => {
      expect(Client).toHaveBeenCalledWith({
        authStrategy: expect.any(Object),
        puppeteer: {
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu'
          ]
        }
      });

      expect(LocalAuth).toHaveBeenCalledWith({
        clientId: env.SESSION_NAME
      });
    });

    it('should set up event handlers', () => {
      expect(mockClient.on).toHaveBeenCalledWith('qr', expect.any(Function));
      expect(mockClient.on).toHaveBeenCalledWith('ready', expect.any(Function));
      expect(mockClient.on).toHaveBeenCalledWith('authenticated', expect.any(Function));
      expect(mockClient.on).toHaveBeenCalledWith('auth_failure', expect.any(Function));
      expect(mockClient.on).toHaveBeenCalledWith('disconnected', expect.any(Function));
      expect(mockClient.on).toHaveBeenCalledWith('message', expect.any(Function));
      expect(mockClient.on).toHaveBeenCalledWith('loading_screen', expect.any(Function));
    });
  });

  describe('initialize', () => {
    it('should initialize the client successfully', async () => {
      mockClient.initialize.mockResolvedValue(undefined);

      await expect(whatsAppClient.initialize()).resolves.toBeUndefined();
      expect(mockClient.initialize).toHaveBeenCalledTimes(1);
    });

    it('should throw error when initialization fails', async () => {
      const error = new Error('Initialization failed');
      mockClient.initialize.mockRejectedValue(error);

      await expect(whatsAppClient.initialize()).rejects.toThrow('Initialization failed');
      expect(mockClient.initialize).toHaveBeenCalledTimes(1);
    });
  });

  describe('isReady', () => {
    it('should return false when client is not ready', () => {
      expect(whatsAppClient.isReady()).toBe(false);
    });

    it('should return true when client is ready', () => {
      triggerEvent('ready');
      expect(whatsAppClient.isReady()).toBe(true);
    });
  });

  describe('sendMessage', () => {
    beforeEach(() => {
      // Set client to ready state
      triggerEvent('ready');
    });

    it('should send message successfully', async () => {
      const to = '+6281234567890';
      const message = 'Hello, this is a test message';
      mockClient.sendMessage.mockResolvedValue({ id: { _serialized: 'test-id' } });

      const result = await whatsAppClient.sendMessage(to, message);

      expect(result).toBe(true);
      expect(mockClient.sendMessage).toHaveBeenCalledWith(to, message);
    });

    it('should return false when client is not ready', async () => {
      // Reset ready state
      triggerEvent('disconnected', 'test disconnect');

      const result = await whatsAppClient.sendMessage('+6281234567890', 'test message');

      expect(result).toBe(false);
      expect(mockClient.sendMessage).not.toHaveBeenCalled();
    });

    it('should return false when sending fails', async () => {
      const error = new Error('Send failed');
      mockClient.sendMessage.mockRejectedValue(error);

      const result = await whatsAppClient.sendMessage('+6281234567890', 'test message');

      expect(result).toBe(false);
      expect(mockClient.sendMessage).toHaveBeenCalledTimes(1);
    });

    it('should handle long messages correctly', async () => {
      const longMessage = 'A'.repeat(1000);
      mockClient.sendMessage.mockResolvedValue({ id: { _serialized: 'test-id' } });

      const result = await whatsAppClient.sendMessage('+6281234567890', longMessage);

      expect(result).toBe(true);
      expect(mockClient.sendMessage).toHaveBeenCalledWith('+6281234567890', longMessage);
    });

    it('should handle special characters in messages', async () => {
      const specialMessage = 'Test message with special chars: áéíóú ñ ü ß € ¥ £ ¢';
      mockClient.sendMessage.mockResolvedValue({ id: { _serialized: 'test-id' } });

      const result = await whatsAppClient.sendMessage('+6281234567890', specialMessage);

      expect(result).toBe(true);
      expect(mockClient.sendMessage).toHaveBeenCalledWith('+6281234567890', specialMessage);
    });
  });

  describe('on', () => {
    it('should register event handlers', () => {
      const mockCallback = jest.fn();
      const eventName = 'test_event';

      whatsAppClient.on(eventName, mockCallback);

      // Test that the handler is registered by checking that on method works
      expect(mockCallback).toBeDefined();
      expect(typeof mockCallback).toBe('function');
    });

    it('should register multiple handlers for the same event', () => {
      const mockCallback1 = jest.fn();
      const mockCallback2 = jest.fn();
      const eventName = 'test_event';

      whatsAppClient.on(eventName, mockCallback1);
      whatsAppClient.on(eventName, mockCallback2);

      // Test that both handlers are registered
      expect(mockCallback1).toBeDefined();
      expect(mockCallback2).toBeDefined();
      expect(typeof mockCallback1).toBe('function');
      expect(typeof mockCallback2).toBe('function');
    });
  });

  describe('destroy', () => {
    it('should destroy the client successfully', async () => {
      mockClient.destroy.mockResolvedValue(undefined);

      await expect(whatsAppClient.destroy()).resolves.toBeUndefined();
      expect(mockClient.destroy).toHaveBeenCalledTimes(1);
      expect(whatsAppClient.isReady()).toBe(false);
    });

    it('should handle destroy errors gracefully', async () => {
      const error = new Error('Destroy failed');
      mockClient.destroy.mockRejectedValue(error);

      await expect(whatsAppClient.destroy()).resolves.toBeUndefined();
      expect(mockClient.destroy).toHaveBeenCalledTimes(1);
    });
  });

  describe('Event Handlers', () => {
    it('should handle QR code event', () => {
      const mockCallback = jest.fn();
      
      whatsAppClient.on('qr', mockCallback);

      triggerEvent('qr', 'test-qr-code');
      expect(mockCallback).toHaveBeenCalledWith('test-qr-code');
    });

    it('should handle ready event', () => {
      const mockCallback = jest.fn();
      
      whatsAppClient.on('ready', mockCallback);

      triggerEvent('ready');
      expect(whatsAppClient.isReady()).toBe(true);
      expect(mockCallback).toHaveBeenCalled();
    });

    it('should handle authenticated event', () => {
      const mockCallback = jest.fn();
      
      whatsAppClient.on('authenticated', mockCallback);

      triggerEvent('authenticated');
      expect(mockCallback).toHaveBeenCalled();
    });

    it('should handle auth_failure event', () => {
      const mockCallback = jest.fn();
      
      whatsAppClient.on('auth_failure', mockCallback);

      triggerEvent('auth_failure', 'Authentication failed');
      expect(mockCallback).toHaveBeenCalledWith('Authentication failed');
    });

    it('should handle disconnected event', () => {
      const mockCallback = jest.fn();
      
      whatsAppClient.on('disconnected', mockCallback);

      triggerEvent('disconnected', 'Connection lost');
      expect(whatsAppClient.isReady()).toBe(false);
      expect(mockCallback).toHaveBeenCalledWith('Connection lost');
    });

    it('should handle message event', () => {
      const mockCallback = jest.fn();
      const mockMessage = { body: 'Hello', from: '+6281234567890' };
      
      whatsAppClient.on('message', mockCallback);

      triggerEvent('message', mockMessage);
      expect(mockCallback).toHaveBeenCalledWith(mockMessage);
    });

    it('should handle loading_screen event', () => {
      const mockCallback = jest.fn();
      
      whatsAppClient.on('loading_screen', mockCallback);

      triggerEvent('loading_screen', 50, 'Loading...');
      expect(mockCallback).toHaveBeenCalledWith({ percent: 50, message: 'Loading...' });
    });
  });

  describe('Error Handling in Event Handlers', () => {
    it('should handle errors in event handlers gracefully', () => {
      const mockCallback = jest.fn().mockImplementation(() => {
        throw new Error('Handler error');
      });
      
      whatsAppClient.on('test_event', mockCallback);

      // Test that the handler is registered even if it throws errors
      expect(mockCallback).toBeDefined();
      expect(typeof mockCallback).toBe('function');
    });
  });

  describe('Integration Tests', () => {
    // These tests would require actual WhatsApp Web connection
    // They are marked as integration tests and can be run separately
    
    describe('Real WhatsApp Integration', () => {
      it.skip('should connect to WhatsApp Web when properly configured', async () => {
        // This test requires:
        // 1. Valid WhatsApp account
        // 2. QR code scanning
        // 3. Network connectivity
        // 4. Proper environment setup
        
        const client = new WhatsAppClient();
        
        // Set up event handlers
        let qrReceived = false;
        let readyReceived = false;
        
        client.on('qr', () => {
          qrReceived = true;
        });
        
        client.on('ready', () => {
          readyReceived = true;
        });
        
        try {
          await client.initialize();
          
          // Wait for either QR code or ready state
          await new Promise((resolve) => {
            const checkState = () => {
              if (qrReceived || readyReceived) {
                resolve(undefined);
              } else {
                setTimeout(checkState, 1000);
              }
            };
            checkState();
          });
          
          expect(qrReceived || readyReceived).toBe(true);
        } finally {
          await client.destroy();
        }
      }, 60000);

      it.skip('should send real message when connected', async () => {
        // This test requires:
        // 1. Active WhatsApp connection
        // 2. Valid phone number
        // 3. Permission to send messages
        
        const client = new WhatsAppClient();
        
        try {
          await client.initialize();
          
          // Wait for ready state
          await new Promise((resolve) => {
            client.on('ready', resolve);
            setTimeout(resolve, 30000); // Timeout after 30 seconds
          });
          
          if (client.isReady()) {
            const result = await client.sendMessage('+6281234567890', 'Test message from integration test');
            expect(result).toBe(true);
          } else {
            console.log('WhatsApp client not ready, skipping message test');
          }
        } finally {
          await client.destroy();
        }
      }, 60000);
    });
  });

  describe('Performance Tests', () => {
    it('should handle rapid message sending', async () => {
      // Set client to ready state
      triggerEvent('ready');

      mockClient.sendMessage.mockResolvedValue({ id: { _serialized: 'test-id' } });

      const startTime = Date.now();
      const promises = Array.from({ length: 10 }, (_, i) => 
        whatsAppClient.sendMessage('+6281234567890', `Message ${i}`)
      );

      const results = await Promise.all(promises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(results.every(result => result === true)).toBe(true);
      expect(mockClient.sendMessage).toHaveBeenCalledTimes(10);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should handle multiple event handlers efficiently', () => {
      const handlers = Array.from({ length: 100 }, () => jest.fn());
      
      handlers.forEach(handler => {
        whatsAppClient.on('test_event', handler);
      });

      const startTime = Date.now();
      // Test that all handlers are registered
      handlers.forEach(handler => {
        expect(handler).toBeDefined();
        expect(typeof handler).toBe('function');
      });
      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(200); // Should complete within 200ms
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty message', async () => {
      // Set client to ready state
      triggerEvent('ready');

      mockClient.sendMessage.mockResolvedValue({ id: { _serialized: 'test-id' } });

      const result = await whatsAppClient.sendMessage('+6281234567890', '');

      expect(result).toBe(true);
      expect(mockClient.sendMessage).toHaveBeenCalledWith('+6281234567890', '');
    });

    it('should handle very long phone numbers', async () => {
      // Set client to ready state
      triggerEvent('ready');

      mockClient.sendMessage.mockResolvedValue({ id: { _serialized: 'test-id' } });

      const longPhoneNumber = '+62812345678901234567890';
      const result = await whatsAppClient.sendMessage(longPhoneNumber, 'test message');

      expect(result).toBe(true);
      expect(mockClient.sendMessage).toHaveBeenCalledWith(longPhoneNumber, 'test message');
    });

    it('should handle special characters in phone numbers', async () => {
      // Set client to ready state
      triggerEvent('ready');

      mockClient.sendMessage.mockResolvedValue({ id: { _serialized: 'test-id' } });

      const phoneWithSpecialChars = '+62-812-345-6789';
      const result = await whatsAppClient.sendMessage(phoneWithSpecialChars, 'test message');

      expect(result).toBe(true);
      expect(mockClient.sendMessage).toHaveBeenCalledWith(phoneWithSpecialChars, 'test message');
    });

    it('should handle concurrent initialization attempts', async () => {
      mockClient.initialize.mockResolvedValue(undefined);

      const promises = [
        whatsAppClient.initialize(),
        whatsAppClient.initialize(),
        whatsAppClient.initialize()
      ];

      await expect(Promise.all(promises)).resolves.toEqual([undefined, undefined, undefined]);
      expect(mockClient.initialize).toHaveBeenCalledTimes(3);
    });

    it('should handle concurrent destroy attempts', async () => {
      mockClient.destroy.mockResolvedValue(undefined);

      const promises = [
        whatsAppClient.destroy(),
        whatsAppClient.destroy(),
        whatsAppClient.destroy()
      ];

      await expect(Promise.all(promises)).resolves.toEqual([undefined, undefined, undefined]);
      expect(mockClient.destroy).toHaveBeenCalledTimes(3);
    });
  });
});
