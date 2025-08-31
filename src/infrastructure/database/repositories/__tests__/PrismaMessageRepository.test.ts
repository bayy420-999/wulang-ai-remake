import { PrismaMessageRepository } from '../PrismaMessageRepository';
import { PrismaClient, Role } from '@prisma/client';
import { DatabaseError } from '../../../../domain/errors/BotError';
import { MessageRole } from '../../../../domain/entities/Message';
import { createMockMessage } from '../../../../test/setup';

// Mock PrismaClient
const mockPrismaClient = {
  message: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
    count: jest.fn(),
  },
  conversation: {
    update: jest.fn(),
  },
};

// Mock the PrismaClient constructor
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => mockPrismaClient),
  Role: {
    USER: 'USER',
    ASSISTANT: 'ASSISTANT',
    SYSTEM: 'SYSTEM',
  },
}));

describe('PrismaMessageRepository', () => {
  let repository: PrismaMessageRepository;
  let mockPrisma: PrismaClient;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Create a new instance of the repository
    mockPrisma = new PrismaClient() as any;
    repository = new PrismaMessageRepository(mockPrisma);
  });

  describe('findById', () => {
    it('should find message by ID successfully', async () => {
      const messageId = 'msg-123';
      const mockPrismaMessage = {
        id: messageId,
        role: Role.USER,
        content: 'Hello, how are you?',
        mediaId: null,
        conversationId: 'conv-123',
        createdAt: new Date('2024-01-01T00:00:00Z'),
        media: null,
        conversation: {
          user: {
            id: 'user-123',
            phoneNumber: '+6281234567890',
            name: 'John Doe',
          },
        },
      };

      mockPrismaClient.message.findUnique.mockResolvedValue(mockPrismaMessage);

      const result = await repository.findById(messageId);

      expect(mockPrismaClient.message.findUnique).toHaveBeenCalledWith({
        where: { id: messageId },
        include: {
          media: true,
          conversation: {
            include: {
              user: {
                select: {
                  id: true,
                  phoneNumber: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      expect(result).toEqual({
        id: messageId,
        role: MessageRole.USER,
        content: 'Hello, how are you?',
        mediaId: undefined,
        conversationId: 'conv-123',
        createdAt: new Date('2024-01-01T00:00:00Z'),
      });
    });

    it('should handle message with media', async () => {
      const messageId = 'msg-123';
      const mockPrismaMessage = {
        id: messageId,
        role: Role.USER,
        content: 'Check this image',
        mediaId: 'media-123',
        conversationId: 'conv-123',
        createdAt: new Date('2024-01-01T00:00:00Z'),
        media: {
          id: 'media-123',
          filename: 'image.jpg',
          mimeType: 'image/jpeg',
        },
        conversation: {
          user: {
            id: 'user-123',
            phoneNumber: '+6281234567890',
            name: 'John Doe',
          },
        },
      };

      mockPrismaClient.message.findUnique.mockResolvedValue(mockPrismaMessage);

      const result = await repository.findById(messageId);

      expect(result).toEqual({
        id: messageId,
        role: MessageRole.USER,
        content: 'Check this image',
        mediaId: 'media-123',
        conversationId: 'conv-123',
        createdAt: new Date('2024-01-01T00:00:00Z'),
      });
    });

    it('should handle message without content', async () => {
      const messageId = 'msg-123';
      const mockPrismaMessage = {
        id: messageId,
        role: Role.ASSISTANT,
        content: null,
        mediaId: null,
        conversationId: 'conv-123',
        createdAt: new Date('2024-01-01T00:00:00Z'),
        media: null,
        conversation: {
          user: {
            id: 'user-123',
            phoneNumber: '+6281234567890',
            name: 'John Doe',
          },
        },
      };

      mockPrismaClient.message.findUnique.mockResolvedValue(mockPrismaMessage);

      const result = await repository.findById(messageId);

      expect(result).toEqual({
        id: messageId,
        role: MessageRole.ASSISTANT,
        content: undefined,
        mediaId: undefined,
        conversationId: 'conv-123',
        createdAt: new Date('2024-01-01T00:00:00Z'),
      });
    });

    it('should return null when message not found', async () => {
      const messageId = 'msg-123';

      mockPrismaClient.message.findUnique.mockResolvedValue(null);

      const result = await repository.findById(messageId);

      expect(result).toBeNull();
    });

    it('should throw DatabaseError on database error', async () => {
      const messageId = 'msg-123';
      const dbError = new Error('Database connection failed');

      mockPrismaClient.message.findUnique.mockRejectedValue(dbError);

      await expect(repository.findById(messageId)).rejects.toThrow(DatabaseError);
      await expect(repository.findById(messageId)).rejects.toThrow('Failed to find message by ID');
    });

    it('should handle unknown role mapping', async () => {
      const messageId = 'msg-123';
      const mockPrismaMessage = {
        id: messageId,
        role: 'UNKNOWN_ROLE' as Role,
        content: 'Test message',
        mediaId: null,
        conversationId: 'conv-123',
        createdAt: new Date('2024-01-01T00:00:00Z'),
        media: null,
        conversation: {
          user: {
            id: 'user-123',
            phoneNumber: '+6281234567890',
            name: 'John Doe',
          },
        },
      };

      mockPrismaClient.message.findUnique.mockResolvedValue(mockPrismaMessage);

      await expect(repository.findById(messageId)).rejects.toThrow('Unknown role: UNKNOWN_ROLE');
    });
  });

  describe('findByConversationId', () => {
    it('should find messages by conversation ID successfully', async () => {
      const conversationId = 'conv-123';
      const limit = 5;
      const mockPrismaMessages = [
        {
          id: 'msg-1',
          role: Role.USER,
          content: 'Hello',
          mediaId: null,
          conversationId,
          createdAt: new Date('2024-01-01T00:00:00Z'),
          media: null,
          conversation: {
            user: {
              id: 'user-123',
              phoneNumber: '+6281234567890',
              name: 'John Doe',
            },
          },
        },
        {
          id: 'msg-2',
          role: Role.ASSISTANT,
          content: 'Hi there!',
          mediaId: null,
          conversationId,
          createdAt: new Date('2024-01-01T01:00:00Z'),
          media: null,
          conversation: {
            user: {
              id: 'user-123',
              phoneNumber: '+6281234567890',
              name: 'John Doe',
            },
          },
        },
      ];

      mockPrismaClient.message.count.mockResolvedValue(10);
      mockPrismaClient.message.findMany.mockResolvedValue(mockPrismaMessages);

      const result = await repository.findByConversationId(conversationId, limit);

      expect(mockPrismaClient.message.count).toHaveBeenCalledWith({
        where: { conversationId },
      });

      expect(mockPrismaClient.message.findMany).toHaveBeenCalledWith({
        where: { conversationId },
        orderBy: [
          { createdAt: 'asc' },
          { id: 'asc' },
        ],
        skip: 5, // 10 - 5 = 5
        take: limit,
        include: {
          media: true,
          conversation: {
            include: {
              user: {
                select: {
                  id: true,
                  phoneNumber: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      expect(result).toEqual([
        {
          id: 'msg-1',
          role: MessageRole.USER,
          content: 'Hello',
          mediaId: undefined,
          conversationId,
          createdAt: new Date('2024-01-01T00:00:00Z'),
        },
        {
          id: 'msg-2',
          role: MessageRole.ASSISTANT,
          content: 'Hi there!',
          mediaId: undefined,
          conversationId,
          createdAt: new Date('2024-01-01T01:00:00Z'),
        },
      ]);
    });

    it('should use default limit when not specified', async () => {
      const conversationId = 'conv-123';

      mockPrismaClient.message.count.mockResolvedValue(5);
      mockPrismaClient.message.findMany.mockResolvedValue([]);

      await repository.findByConversationId(conversationId);

      expect(mockPrismaClient.message.findMany).toHaveBeenCalledWith({
        where: { conversationId },
        orderBy: [
          { createdAt: 'asc' },
          { id: 'asc' },
        ],
        skip: 0, // 5 - 10 = 0 (max)
        take: 10, // default limit
        include: expect.any(Object),
      });
    });

    it('should handle conversation with fewer messages than limit', async () => {
      const conversationId = 'conv-123';
      const limit = 10;

      mockPrismaClient.message.count.mockResolvedValue(3);
      mockPrismaClient.message.findMany.mockResolvedValue([]);

      await repository.findByConversationId(conversationId, limit);

      expect(mockPrismaClient.message.findMany).toHaveBeenCalledWith({
        where: { conversationId },
        orderBy: [
          { createdAt: 'asc' },
          { id: 'asc' },
        ],
        skip: 0, // 3 - 10 = 0 (max)
        take: limit,
        include: expect.any(Object),
      });
    });

    it('should return empty array when no messages found', async () => {
      const conversationId = 'conv-123';

      mockPrismaClient.message.count.mockResolvedValue(0);
      mockPrismaClient.message.findMany.mockResolvedValue([]);

      const result = await repository.findByConversationId(conversationId);

      expect(result).toEqual([]);
    });

    it('should throw DatabaseError on database error', async () => {
      const conversationId = 'conv-123';
      const dbError = new Error('Database connection failed');

      mockPrismaClient.message.count.mockRejectedValue(dbError);

      await expect(repository.findByConversationId(conversationId)).rejects.toThrow(DatabaseError);
      await expect(repository.findByConversationId(conversationId)).rejects.toThrow('Failed to find messages by conversation ID');
    });
  });

  describe('create', () => {
    it('should create message successfully', async () => {
      const createMessageDto = {
        role: MessageRole.USER,
        content: 'Hello, world!',
        conversationId: 'conv-123',
        mediaId: undefined,
      };

      const mockPrismaMessage = {
        id: 'msg-123',
        role: Role.USER,
        content: createMessageDto.content,
        mediaId: null,
        conversationId: createMessageDto.conversationId,
        createdAt: new Date('2024-01-01T00:00:00Z'),
        media: null,
        conversation: {
          user: {
            id: 'user-123',
            phoneNumber: '+6281234567890',
            name: 'John Doe',
          },
        },
      };

      mockPrismaClient.message.create.mockResolvedValue(mockPrismaMessage);
      mockPrismaClient.conversation.update.mockResolvedValue(undefined);

      const result = await repository.create(createMessageDto);

      expect(mockPrismaClient.message.create).toHaveBeenCalledWith({
        data: {
          role: Role.USER,
          content: createMessageDto.content,
          conversationId: createMessageDto.conversationId,
          mediaId: undefined,
        },
        include: {
          media: true,
          conversation: {
            include: {
              user: {
                select: {
                  id: true,
                  phoneNumber: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      expect(mockPrismaClient.conversation.update).toHaveBeenCalledWith({
        where: { id: createMessageDto.conversationId },
        data: { updatedAt: expect.any(Date) },
      });

      expect(result).toEqual({
        id: 'msg-123',
        role: MessageRole.USER,
        content: 'Hello, world!',
        mediaId: undefined,
        conversationId: 'conv-123',
        createdAt: new Date('2024-01-01T00:00:00Z'),
      });
    });

    it('should create message with media', async () => {
      const createMessageDto = {
        role: MessageRole.USER,
        content: 'Check this image',
        conversationId: 'conv-123',
        mediaId: 'media-123',
      };

      const mockPrismaMessage = {
        id: 'msg-123',
        role: Role.USER,
        content: createMessageDto.content,
        mediaId: createMessageDto.mediaId,
        conversationId: createMessageDto.conversationId,
        createdAt: new Date('2024-01-01T00:00:00Z'),
        media: {
          id: 'media-123',
          filename: 'image.jpg',
          mimeType: 'image/jpeg',
        },
        conversation: {
          user: {
            id: 'user-123',
            phoneNumber: '+6281234567890',
            name: 'John Doe',
          },
        },
      };

      mockPrismaClient.message.create.mockResolvedValue(mockPrismaMessage);
      mockPrismaClient.conversation.update.mockResolvedValue(undefined);

      const result = await repository.create(createMessageDto);

      expect(mockPrismaClient.message.create).toHaveBeenCalledWith({
        data: {
          role: Role.USER,
          content: createMessageDto.content,
          conversationId: createMessageDto.conversationId,
          mediaId: 'media-123',
        },
        include: expect.any(Object),
      });

      expect(result.mediaId).toBe('media-123');
    });

    it('should create message without content', async () => {
      const createMessageDto = {
        role: MessageRole.ASSISTANT,
        content: undefined,
        conversationId: 'conv-123',
        mediaId: undefined,
      };

      const mockPrismaMessage = {
        id: 'msg-123',
        role: Role.ASSISTANT,
        content: null,
        mediaId: null,
        conversationId: createMessageDto.conversationId,
        createdAt: new Date('2024-01-01T00:00:00Z'),
        media: null,
        conversation: {
          user: {
            id: 'user-123',
            phoneNumber: '+6281234567890',
            name: 'John Doe',
          },
        },
      };

      mockPrismaClient.message.create.mockResolvedValue(mockPrismaMessage);
      mockPrismaClient.conversation.update.mockResolvedValue(undefined);

      const result = await repository.create(createMessageDto);

      expect(result).toEqual({
        id: 'msg-123',
        role: MessageRole.ASSISTANT,
        content: undefined,
        mediaId: undefined,
        conversationId: 'conv-123',
        createdAt: new Date('2024-01-01T00:00:00Z'),
      });
    });

    it('should throw DatabaseError on database error', async () => {
      const createMessageDto = {
        role: MessageRole.USER,
        content: 'Hello',
        conversationId: 'conv-123',
        mediaId: undefined,
      };
      const dbError = new Error('Database connection failed');

      mockPrismaClient.message.create.mockRejectedValue(dbError);

      await expect(repository.create(createMessageDto)).rejects.toThrow(DatabaseError);
      await expect(repository.create(createMessageDto)).rejects.toThrow('Failed to create message');
    });

    it('should handle foreign key constraint error', async () => {
      const createMessageDto = {
        role: MessageRole.USER,
        content: 'Hello',
        conversationId: 'conv-123',
        mediaId: undefined,
      };
      const dbError = new Error('Foreign key constraint failed');

      mockPrismaClient.message.create.mockRejectedValue(dbError);

      await expect(repository.create(createMessageDto)).rejects.toThrow(DatabaseError);
    });
  });

  describe('delete', () => {
    it('should delete message successfully', async () => {
      const messageId = 'msg-123';

      mockPrismaClient.message.delete.mockResolvedValue(undefined);

      await expect(repository.delete(messageId)).resolves.toBeUndefined();

      expect(mockPrismaClient.message.delete).toHaveBeenCalledWith({
        where: { id: messageId },
      });
    });

    it('should throw DatabaseError on database error', async () => {
      const messageId = 'msg-123';
      const dbError = new Error('Database connection failed');

      mockPrismaClient.message.delete.mockRejectedValue(dbError);

      await expect(repository.delete(messageId)).rejects.toThrow(DatabaseError);
      await expect(repository.delete(messageId)).rejects.toThrow('Failed to delete message');
    });

    it('should handle message not found error', async () => {
      const messageId = 'msg-123';
      const dbError = new Error('Record to delete does not exist');

      mockPrismaClient.message.delete.mockRejectedValue(dbError);

      await expect(repository.delete(messageId)).rejects.toThrow(DatabaseError);
    });
  });

  describe('deleteByConversationId', () => {
    it('should delete all messages for conversation successfully', async () => {
      const conversationId = 'conv-123';

      mockPrismaClient.message.deleteMany.mockResolvedValue({ count: 5 });

      await expect(repository.deleteByConversationId(conversationId)).resolves.toBeUndefined();

      expect(mockPrismaClient.message.deleteMany).toHaveBeenCalledWith({
        where: { conversationId },
      });
    });

    it('should handle conversation with no messages', async () => {
      const conversationId = 'conv-123';

      mockPrismaClient.message.deleteMany.mockResolvedValue({ count: 0 });

      await expect(repository.deleteByConversationId(conversationId)).resolves.toBeUndefined();
    });

    it('should throw DatabaseError on database error', async () => {
      const conversationId = 'conv-123';
      const dbError = new Error('Database connection failed');

      mockPrismaClient.message.deleteMany.mockRejectedValue(dbError);

      await expect(repository.deleteByConversationId(conversationId)).rejects.toThrow(DatabaseError);
      await expect(repository.deleteByConversationId(conversationId)).rejects.toThrow('Failed to delete messages by conversation ID');
    });
  });

  describe('getMessageCount', () => {
    it('should get message count successfully', async () => {
      const conversationId = 'conv-123';
      const expectedCount = 15;

      mockPrismaClient.message.count.mockResolvedValue(expectedCount);

      const result = await repository.getMessageCount(conversationId);

      expect(mockPrismaClient.message.count).toHaveBeenCalledWith({
        where: { conversationId },
      });

      expect(result).toBe(expectedCount);
    });

    it('should return zero for empty conversation', async () => {
      const conversationId = 'conv-123';

      mockPrismaClient.message.count.mockResolvedValue(0);

      const result = await repository.getMessageCount(conversationId);

      expect(result).toBe(0);
    });

    it('should throw DatabaseError on database error', async () => {
      const conversationId = 'conv-123';
      const dbError = new Error('Database connection failed');

      mockPrismaClient.message.count.mockRejectedValue(dbError);

      await expect(repository.getMessageCount(conversationId)).rejects.toThrow(DatabaseError);
      await expect(repository.getMessageCount(conversationId)).rejects.toThrow('Failed to get message count');
    });
  });

  describe('Role Mapping', () => {
    it('should map USER role correctly', async () => {
      const messageId = 'msg-123';
      const mockPrismaMessage = {
        id: messageId,
        role: Role.USER,
        content: 'Test',
        mediaId: null,
        conversationId: 'conv-123',
        createdAt: new Date('2024-01-01T00:00:00Z'),
        media: null,
        conversation: {
          user: {
            id: 'user-123',
            phoneNumber: '+6281234567890',
            name: 'John Doe',
          },
        },
      };

      mockPrismaClient.message.findUnique.mockResolvedValue(mockPrismaMessage);

      const result = await repository.findById(messageId);

      expect(result?.role).toBe(MessageRole.USER);
    });

    it('should map ASSISTANT role correctly', async () => {
      const messageId = 'msg-123';
      const mockPrismaMessage = {
        id: messageId,
        role: Role.ASSISTANT,
        content: 'Test',
        mediaId: null,
        conversationId: 'conv-123',
        createdAt: new Date('2024-01-01T00:00:00Z'),
        media: null,
        conversation: {
          user: {
            id: 'user-123',
            phoneNumber: '+6281234567890',
            name: 'John Doe',
          },
        },
      };

      mockPrismaClient.message.findUnique.mockResolvedValue(mockPrismaMessage);

      const result = await repository.findById(messageId);

      expect(result?.role).toBe(MessageRole.ASSISTANT);
    });

    it('should map SYSTEM role correctly', async () => {
      const messageId = 'msg-123';
      const mockPrismaMessage = {
        id: messageId,
        role: Role.SYSTEM,
        content: 'Test',
        mediaId: null,
        conversationId: 'conv-123',
        createdAt: new Date('2024-01-01T00:00:00Z'),
        media: null,
        conversation: {
          user: {
            id: 'user-123',
            phoneNumber: '+6281234567890',
            name: 'John Doe',
          },
        },
      };

      mockPrismaClient.message.findUnique.mockResolvedValue(mockPrismaMessage);

      const result = await repository.findById(messageId);

      expect(result?.role).toBe(MessageRole.SYSTEM);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long message IDs', async () => {
      const longMessageId = 'msg-' + 'a'.repeat(1000);
      const mockPrismaMessage = {
        id: longMessageId,
        role: Role.USER,
        content: 'Test message',
        mediaId: null,
        conversationId: 'conv-123',
        createdAt: new Date('2024-01-01T00:00:00Z'),
        media: null,
        conversation: {
          user: {
            id: 'user-123',
            phoneNumber: '+6281234567890',
            name: 'John Doe',
          },
        },
      };

      mockPrismaClient.message.findUnique.mockResolvedValue(mockPrismaMessage);

      const result = await repository.findById(longMessageId);

      expect(result?.id).toBe(longMessageId);
    });

    it('should handle very long conversation IDs', async () => {
      const longConversationId = 'conv-' + 'a'.repeat(1000);

      mockPrismaClient.message.count.mockResolvedValue(5);
      mockPrismaClient.message.findMany.mockResolvedValue([]);

      await repository.findByConversationId(longConversationId);

      expect(mockPrismaClient.message.count).toHaveBeenCalledWith({
        where: { conversationId: longConversationId },
      });
    });

    it('should handle very long message content', async () => {
      const longContent = 'A'.repeat(10000);
      const createMessageDto = {
        role: MessageRole.USER,
        content: longContent,
        conversationId: 'conv-123',
        mediaId: undefined,
      };

      const mockPrismaMessage = {
        id: 'msg-123',
        role: Role.USER,
        content: longContent,
        mediaId: null,
        conversationId: createMessageDto.conversationId,
        createdAt: new Date('2024-01-01T00:00:00Z'),
        media: null,
        conversation: {
          user: {
            id: 'user-123',
            phoneNumber: '+6281234567890',
            name: 'John Doe',
          },
        },
      };

      mockPrismaClient.message.create.mockResolvedValue(mockPrismaMessage);
      mockPrismaClient.conversation.update.mockResolvedValue(undefined);

      const result = await repository.create(createMessageDto);

      expect(result.content).toBe(longContent);
    });

    it('should handle special characters in IDs', async () => {
      const specialMessageId = 'msg-123_456-789@test';
      const mockPrismaMessage = {
        id: specialMessageId,
        role: Role.USER,
        content: 'Test message',
        mediaId: null,
        conversationId: 'conv-123',
        createdAt: new Date('2024-01-01T00:00:00Z'),
        media: null,
        conversation: {
          user: {
            id: 'user-123',
            phoneNumber: '+6281234567890',
            name: 'John Doe',
          },
        },
      };

      mockPrismaClient.message.findUnique.mockResolvedValue(mockPrismaMessage);

      const result = await repository.findById(specialMessageId);

      expect(result?.id).toBe(specialMessageId);
    });

    it('should handle large message counts', async () => {
      const conversationId = 'conv-123';
      const largeCount = 1000000;

      mockPrismaClient.message.count.mockResolvedValue(largeCount);
      mockPrismaClient.message.findMany.mockResolvedValue([]);

      await repository.findByConversationId(conversationId, 10);

      expect(mockPrismaClient.message.findMany).toHaveBeenCalledWith({
        where: { conversationId },
        orderBy: [
          { createdAt: 'asc' },
          { id: 'asc' },
        ],
        skip: largeCount - 10,
        take: 10,
        include: expect.any(Object),
      });
    });
  });
});
