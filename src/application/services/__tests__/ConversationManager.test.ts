import { ConversationManager } from '../ConversationManager';
import { ConversationContextDto } from '../../dto/ProcessMessageDto';
import { createMockUser, createMockMessage, createMockConversation } from '../../../test/setup';

// Mock all dependencies
const mockUserRepository = {
  findByPhoneNumber: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
};

const mockGroupRepository = {
  findByGroupId: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
};

const mockConversationRepository = {
  findActiveByUserId: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  deleteByUserId: jest.fn(),
};

const mockMessageRepository = {
  create: jest.fn(),
  findByConversationId: jest.fn(),
  findById: jest.fn(),
};

const mockAIService = {
  generateResponse: jest.fn(),
  analyzeMediaWithCaption: jest.fn(),
  generateWelcomeMessage: jest.fn(),
  generateResetMessage: jest.fn(),
  moderateContent: jest.fn(),
};

describe('ConversationManager', () => {
  let conversationManager: ConversationManager;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Create the conversation manager with mocked dependencies
    conversationManager = new ConversationManager(
      mockUserRepository as any,
      mockGroupRepository as any,
      mockConversationRepository as any,
      mockMessageRepository as any,
      mockAIService as any
    );
  });

  describe('getOrCreateUser', () => {
    it('should return existing user when found', async () => {
      const phoneNumber = '+6281234567890';
      const existingUser = createMockUser({ phoneNumber });

      mockUserRepository.findByPhoneNumber.mockResolvedValue(existingUser);

      const result = await conversationManager.getOrCreateUser(phoneNumber);

      expect(mockUserRepository.findByPhoneNumber).toHaveBeenCalledWith(phoneNumber);
      expect(mockUserRepository.create).not.toHaveBeenCalled();
      expect(result).toEqual(existingUser);
    });

    it('should create new user when not found', async () => {
      const phoneNumber = '+6281234567890';
      const userName = 'John Doe';
      const newUser = createMockUser({ phoneNumber, name: userName });

      mockUserRepository.findByPhoneNumber.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue(newUser);

      const result = await conversationManager.getOrCreateUser(phoneNumber, userName);

      expect(mockUserRepository.findByPhoneNumber).toHaveBeenCalledWith(phoneNumber);
      expect(mockUserRepository.create).toHaveBeenCalledWith({
        phoneNumber,
        name: userName
      });
      expect(result).toEqual(newUser);
    });

    it('should create user without name when not provided', async () => {
      const phoneNumber = '+6281234567890';
      const newUser = createMockUser({ phoneNumber, name: undefined });

      mockUserRepository.findByPhoneNumber.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue(newUser);

      const result = await conversationManager.getOrCreateUser(phoneNumber);

      expect(mockUserRepository.create).toHaveBeenCalledWith({
        phoneNumber,
        name: undefined
      });
      expect(result).toEqual(newUser);
    });

    it('should update existing user name when provided and user has no name', async () => {
      const phoneNumber = '+6281234567890';
      const existingUser = createMockUser({ phoneNumber, name: undefined });
      const updatedUser = createMockUser({ phoneNumber, name: 'John Doe' });

      mockUserRepository.findByPhoneNumber.mockResolvedValue(existingUser);
      mockUserRepository.update.mockResolvedValue(updatedUser);

      const result = await conversationManager.getOrCreateUser(phoneNumber, 'John Doe');

      expect(mockUserRepository.update).toHaveBeenCalledWith(existingUser.id, {
        name: 'John Doe'
      });
      expect(result).toEqual(updatedUser);
    });

    it('should not update existing user name when user already has a name', async () => {
      const phoneNumber = '+6281234567890';
      const existingUser = createMockUser({ phoneNumber, name: 'Existing Name' });

      mockUserRepository.findByPhoneNumber.mockResolvedValue(existingUser);

      const result = await conversationManager.getOrCreateUser(phoneNumber, 'New Name');

      expect(mockUserRepository.update).not.toHaveBeenCalled();
      expect(result).toEqual(existingUser);
    });

    it('should handle different phone number formats', async () => {
      const phoneNumbers = [
        '+6281234567890',
        '6281234567890',
        '+62 812 345 6789',
        '081234567890'
      ];

      for (const phoneNumber of phoneNumbers) {
        const user = createMockUser({ phoneNumber });
        mockUserRepository.findByPhoneNumber.mockResolvedValue(user);

        const result = await conversationManager.getOrCreateUser(phoneNumber);

        expect(mockUserRepository.findByPhoneNumber).toHaveBeenCalledWith(phoneNumber);
        expect(result).toEqual(user);
      }
    });
  });

  describe('getOrCreateActiveConversation', () => {
    it('should return existing active conversation when found', async () => {
      const userId = 'user-123';
      const existingConversation = createMockConversation({ userId });

      mockConversationRepository.findActiveByUserId.mockResolvedValue(existingConversation);

      const result = await conversationManager.getOrCreateActiveConversation(userId);

      expect(mockConversationRepository.findActiveByUserId).toHaveBeenCalledWith(userId);
      expect(mockConversationRepository.create).not.toHaveBeenCalled();
      expect(result).toEqual(existingConversation);
    });

    it('should create new conversation when no active conversation found', async () => {
      const userId = 'user-123';
      const newConversation = createMockConversation({ userId });

      mockConversationRepository.findActiveByUserId.mockResolvedValue(null);
      mockConversationRepository.create.mockResolvedValue(newConversation);

      const result = await conversationManager.getOrCreateActiveConversation(userId);

      expect(mockConversationRepository.findActiveByUserId).toHaveBeenCalledWith(userId);
      expect(mockConversationRepository.create).toHaveBeenCalledWith({ userId });
      expect(result).toEqual(newConversation);
    });

    it('should handle different user ID formats', async () => {
      const userIds = ['user-123', '123', 'user_456', 'user-789'];

      for (const userId of userIds) {
        const conversation = createMockConversation({ userId });
        mockConversationRepository.findActiveByUserId.mockResolvedValue(conversation);

        const result = await conversationManager.getOrCreateActiveConversation(userId);

        expect(mockConversationRepository.findActiveByUserId).toHaveBeenCalledWith(userId);
        expect(result).toEqual(conversation);
      }
    });
  });

  describe('getConversationContext', () => {
    it('should build conversation context with messages', async () => {
      const conversationId = 'conv-123';
      const userPhone = '+6281234567890';
      const userName = 'John Doe';
      const messages = [
        createMockMessage({ role: 'USER', content: 'Hello' }),
        createMockMessage({ role: 'ASSISTANT', content: 'Hi there!' }),
        createMockMessage({ role: 'USER', content: 'How are you?' })
      ];

      mockMessageRepository.findByConversationId.mockResolvedValue(messages);

      const result = await conversationManager.getConversationContext(conversationId, userPhone, userName);

      expect(mockMessageRepository.findByConversationId).toHaveBeenCalledWith(conversationId);
      expect(result).toEqual({
        userPhone,
        userName,
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content,
          createdAt: msg.createdAt,
          media: null
        }))
      });
    });

    it('should build conversation context with empty messages', async () => {
      const conversationId = 'conv-123';
      const userPhone = '+6281234567890';
      const userName = 'John Doe';

      mockMessageRepository.findByConversationId.mockResolvedValue([]);

      const result = await conversationManager.getConversationContext(conversationId, userPhone, userName);

      expect(result).toEqual({
        userPhone,
        userName,
        messages: []
      });
    });

    it('should handle undefined userName', async () => {
      const conversationId = 'conv-123';
      const userPhone = '+6281234567890';

      mockMessageRepository.findByConversationId.mockResolvedValue([]);

      const result = await conversationManager.getConversationContext(conversationId, userPhone);

      expect(result).toEqual({
        userPhone,
        userName: undefined,
        messages: []
      });
    });

    it('should handle messages with media', async () => {
      const conversationId = 'conv-123';
      const userPhone = '+6281234567890';
      const userName = 'John Doe';
      const messages = [
        createMockMessage({ 
          role: 'USER', 
          content: 'Check this image',
          mediaId: 'media-123'
        }),
        createMockMessage({ 
          role: 'ASSISTANT', 
          content: 'I can see the image'
        })
      ];

      mockMessageRepository.findByConversationId.mockResolvedValue(messages);

      const result = await conversationManager.getConversationContext(conversationId, userPhone, userName);

      expect(result.messages).toHaveLength(2);
      expect(result.messages[0]).toEqual({
        role: 'USER',
        content: 'Check this image',
        createdAt: messages[0].createdAt,
        media: null
      });
      expect(result.messages[1]).toEqual({
        role: 'ASSISTANT',
        content: 'I can see the image',
        createdAt: messages[1].createdAt,
        media: null
      });
    });
  });

  describe('generateWelcomeMessage', () => {
    it('should generate welcome message with user name', async () => {
      const userName = 'John Doe';
      const welcomeMessage = 'Hello John Doe! Welcome to our service.';

      mockAIService.generateWelcomeMessage.mockResolvedValue(welcomeMessage);

      const result = await conversationManager.generateWelcomeMessage(userName);

      expect(mockAIService.generateWelcomeMessage).toHaveBeenCalledWith(userName);
      expect(result).toBe(welcomeMessage);
    });

    it('should generate welcome message without user name', async () => {
      const welcomeMessage = 'Hello! Welcome to our service.';

      mockAIService.generateWelcomeMessage.mockResolvedValue(welcomeMessage);

      const result = await conversationManager.generateWelcomeMessage();

      expect(mockAIService.generateWelcomeMessage).toHaveBeenCalledWith(undefined);
      expect(result).toBe(welcomeMessage);
    });
  });

  describe('Pending Media Management', () => {
    const phoneNumber = '+6281234567890';
    const mediaData = {
      buffer: Buffer.from('fake content'),
      filename: 'test.jpg',
      mimeType: 'image/jpeg'
    };

    describe('storePendingMedia', () => {
      it('should store pending media for phone number', () => {
        conversationManager.storePendingMedia(phoneNumber, mediaData);

        expect(conversationManager.hasPendingMedia(phoneNumber)).toBe(true);
      });

      it('should overwrite existing pending media', () => {
        const newMediaData = {
          buffer: Buffer.from('new content'),
          filename: 'new.jpg',
          mimeType: 'image/png'
        };

        conversationManager.storePendingMedia(phoneNumber, mediaData);
        conversationManager.storePendingMedia(phoneNumber, newMediaData);

        const stored = conversationManager.getPendingMedia(phoneNumber);
        expect(stored).toMatchObject({
          buffer: newMediaData.buffer,
          filename: newMediaData.filename,
          mimeType: newMediaData.mimeType
        });
        expect(stored!.timestamp).toBeDefined();
      });

      it('should store media with timestamp', () => {
        const beforeStore = Date.now();
        conversationManager.storePendingMedia(phoneNumber, mediaData);
        const afterStore = Date.now();

        const stored = conversationManager.getPendingMedia(phoneNumber);
        expect(stored).toMatchObject({
          buffer: mediaData.buffer,
          filename: mediaData.filename,
          mimeType: mediaData.mimeType
        });
        expect(stored!.timestamp).toBeDefined();
        
        // The timestamp should be within the test execution time
        expect(stored!.timestamp).toBeGreaterThanOrEqual(beforeStore);
        expect(stored!.timestamp).toBeLessThanOrEqual(afterStore);
      });
    });

    describe('getPendingMedia', () => {
      it('should return stored pending media', () => {
        conversationManager.storePendingMedia(phoneNumber, mediaData);

        const result = conversationManager.getPendingMedia(phoneNumber);

        expect(result).toMatchObject({
          buffer: mediaData.buffer,
          filename: mediaData.filename,
          mimeType: mediaData.mimeType
        });
        expect(result!.timestamp).toBeDefined();
      });

      it('should return undefined when no pending media exists', () => {
        const result = conversationManager.getPendingMedia(phoneNumber);

        expect(result).toBeUndefined();
      });

      it('should return undefined for different phone number', () => {
        const differentPhone = '+6289876543210';
        conversationManager.storePendingMedia(phoneNumber, mediaData);

        const result = conversationManager.getPendingMedia(differentPhone);

        expect(result).toBeUndefined();
      });
    });

    describe('hasPendingMedia', () => {
      it('should return true when pending media exists', () => {
        conversationManager.storePendingMedia(phoneNumber, mediaData);

        const result = conversationManager.hasPendingMedia(phoneNumber);

        expect(result).toBe(true);
      });

      it('should return false when no pending media exists', () => {
        const result = conversationManager.hasPendingMedia(phoneNumber);

        expect(result).toBe(false);
      });

      it('should return false for different phone number', () => {
        const differentPhone = '+6289876543210';
        conversationManager.storePendingMedia(phoneNumber, mediaData);

        const result = conversationManager.hasPendingMedia(differentPhone);

        expect(result).toBe(false);
      });
    });

    describe('removePendingMedia', () => {
      it('should remove pending media for phone number', () => {
        conversationManager.storePendingMedia(phoneNumber, mediaData);
        expect(conversationManager.hasPendingMedia(phoneNumber)).toBe(true);

        conversationManager.removePendingMedia(phoneNumber);

        expect(conversationManager.hasPendingMedia(phoneNumber)).toBe(false);
        expect(conversationManager.getPendingMedia(phoneNumber)).toBeUndefined();
      });

      it('should not affect other phone numbers', () => {
        const otherPhone = '+6289876543210';
        const otherMedia = {
          buffer: Buffer.from('other content'),
          filename: 'other.jpg',
          mimeType: 'image/png'
        };

        conversationManager.storePendingMedia(phoneNumber, mediaData);
        conversationManager.storePendingMedia(otherPhone, otherMedia);

        conversationManager.removePendingMedia(phoneNumber);

        expect(conversationManager.hasPendingMedia(phoneNumber)).toBe(false);
        expect(conversationManager.hasPendingMedia(otherPhone)).toBe(true);
        const otherStored = conversationManager.getPendingMedia(otherPhone);
        expect(otherStored).toMatchObject({
          buffer: otherMedia.buffer,
          filename: otherMedia.filename,
          mimeType: otherMedia.mimeType
        });
        expect(otherStored!.timestamp).toBeDefined();
      });

      it('should handle removing non-existent pending media', () => {
        expect(() => conversationManager.removePendingMedia(phoneNumber)).not.toThrow();
      });
    });

    describe('cleanupOldPendingMedia', () => {
      it('should remove expired pending media', () => {
        // Store media with old timestamp (25 hours ago)
        const oldTimestamp = Date.now() - (25 * 60 * 60 * 1000);
        conversationManager.storePendingMedia(phoneNumber, mediaData);
        
        // Manually set old timestamp
        const pendingMedia = conversationManager.getPendingMedia(phoneNumber);
        if (pendingMedia) {
          pendingMedia.timestamp = oldTimestamp;
        }

        conversationManager.cleanupOldPendingMedia();

        expect(conversationManager.hasPendingMedia(phoneNumber)).toBe(false);
      });

      it('should keep recent pending media', () => {
        conversationManager.storePendingMedia(phoneNumber, mediaData);

        conversationManager.cleanupOldPendingMedia();

        expect(conversationManager.hasPendingMedia(phoneNumber)).toBe(true);
      });

      it('should handle multiple phone numbers with mixed expiration', () => {
        const phone1 = '+6281234567890';
        const phone2 = '+6289876543210';
        const phone3 = '+6281111111111';

        // Store media for all phones
        conversationManager.storePendingMedia(phone1, mediaData);
        conversationManager.storePendingMedia(phone2, mediaData);
        conversationManager.storePendingMedia(phone3, mediaData);

        // Set old timestamp for phone1 and phone2
        const oldTimestamp = Date.now() - (25 * 60 * 60 * 1000);
        const media1 = conversationManager.getPendingMedia(phone1);
        const media2 = conversationManager.getPendingMedia(phone2);
        if (media1) media1.timestamp = oldTimestamp;
        if (media2) media2.timestamp = oldTimestamp;

        conversationManager.cleanupOldPendingMedia();

        expect(conversationManager.hasPendingMedia(phone1)).toBe(false);
        expect(conversationManager.hasPendingMedia(phone2)).toBe(false);
        expect(conversationManager.hasPendingMedia(phone3)).toBe(true);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle user repository errors in getOrCreateUser', async () => {
      const phoneNumber = '+6281234567890';
      const error = new Error('Database connection failed');

      mockUserRepository.findByPhoneNumber.mockRejectedValue(error);

      await expect(conversationManager.getOrCreateUser(phoneNumber))
        .rejects.toThrow('Database connection failed');
    });

    it('should handle conversation repository errors in getOrCreateActiveConversation', async () => {
      const userId = 'user-123';
      const error = new Error('Database connection failed');

      mockConversationRepository.findActiveByUserId.mockRejectedValue(error);

      await expect(conversationManager.getOrCreateActiveConversation(userId))
        .rejects.toThrow('Database connection failed');
    });

    it('should handle message repository errors in getConversationContext', async () => {
      const conversationId = 'conv-123';
      const userPhone = '+6281234567890';
      const error = new Error('Database connection failed');

      mockMessageRepository.findByConversationId.mockRejectedValue(error);

      await expect(conversationManager.getConversationContext(conversationId, userPhone))
        .rejects.toThrow('Database connection failed');
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long phone numbers', async () => {
      const longPhoneNumber = '+628123456789012345678901234567890';
      const user = createMockUser({ phoneNumber: longPhoneNumber });

      mockUserRepository.findByPhoneNumber.mockResolvedValue(user);

      const result = await conversationManager.getOrCreateUser(longPhoneNumber);

      expect(result).toEqual(user);
    });

    it('should handle very long user names', async () => {
      const phoneNumber = '+6281234567890';
      const longName = 'A'.repeat(1000);
      const user = createMockUser({ phoneNumber, name: longName });

      mockUserRepository.findByPhoneNumber.mockResolvedValue(user);

      const result = await conversationManager.getOrCreateUser(phoneNumber, longName);

      expect(result).toEqual(user);
    });

    it('should handle special characters in phone numbers', async () => {
      const specialPhoneNumber = '+62-812-345-6789';
      const user = createMockUser({ phoneNumber: specialPhoneNumber });

      mockUserRepository.findByPhoneNumber.mockResolvedValue(user);

      const result = await conversationManager.getOrCreateUser(specialPhoneNumber);

      expect(result).toEqual(user);
    });

    it('should handle empty conversation context', async () => {
      const conversationId = '';
      const userPhone = '';
      const userName = '';

      mockMessageRepository.findByConversationId.mockResolvedValue([]);

      const result = await conversationManager.getConversationContext(conversationId, userPhone, userName);

      expect(result).toEqual({
        userPhone: '',
        userName: '',
        messages: []
      });
    });
  });
});
