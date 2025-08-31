import { PrismaConversationRepository } from '../PrismaConversationRepository';
import { PrismaClient } from '@prisma/client';
import { DatabaseError } from '../../../../domain/errors/BotError';
import { createMockConversation } from '../../../../test/setup';

// Mock PrismaClient
const mockPrismaClient = {
  conversation: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  },
  message: {
    deleteMany: jest.fn(),
  },
};

// Mock the PrismaClient constructor
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => mockPrismaClient),
}));

describe('PrismaConversationRepository', () => {
  let repository: PrismaConversationRepository;
  let mockPrisma: PrismaClient;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Create a new instance of the repository
    mockPrisma = new PrismaClient() as any;
    repository = new PrismaConversationRepository(mockPrisma);
  });

  describe('findById', () => {
    it('should find conversation by ID successfully', async () => {
      const conversationId = 'conv-123';
      const mockPrismaConversation = {
        id: conversationId,
        userId: 'user-123',
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z'),
        user: {
          id: 'user-123',
          phoneNumber: '+6281234567890',
          name: 'John Doe',
        },
        _count: {
          messages: 5,
        },
      };

      mockPrismaClient.conversation.findUnique.mockResolvedValue(mockPrismaConversation);

      const result = await repository.findById(conversationId);

      expect(mockPrismaClient.conversation.findUnique).toHaveBeenCalledWith({
        where: { id: conversationId },
        include: {
          user: {
            select: {
              id: true,
              phoneNumber: true,
              name: true,
            },
          },
          _count: {
            select: { messages: true },
          },
        },
      });

      expect(result).toEqual(mockPrismaConversation);
    });

    it('should return null when conversation not found', async () => {
      const conversationId = 'conv-123';

      mockPrismaClient.conversation.findUnique.mockResolvedValue(null);

      const result = await repository.findById(conversationId);

      expect(result).toBeNull();
    });

    it('should throw DatabaseError on database error', async () => {
      const conversationId = 'conv-123';
      const dbError = new Error('Database connection failed');

      mockPrismaClient.conversation.findUnique.mockRejectedValue(dbError);

      await expect(repository.findById(conversationId)).rejects.toThrow(DatabaseError);
      await expect(repository.findById(conversationId)).rejects.toThrow('Failed to find conversation by ID');
    });
  });

  describe('findByUserId', () => {
    it('should find conversations by user ID successfully', async () => {
      const userId = 'user-123';
      const mockPrismaConversations = [
        {
          id: 'conv-1',
          userId,
          createdAt: new Date('2024-01-01T00:00:00Z'),
          updatedAt: new Date('2024-01-02T00:00:00Z'),
          _count: { messages: 10 },
        },
        {
          id: 'conv-2',
          userId,
          createdAt: new Date('2024-01-03T00:00:00Z'),
          updatedAt: new Date('2024-01-04T00:00:00Z'),
          _count: { messages: 5 },
        },
      ];

      mockPrismaClient.conversation.findMany.mockResolvedValue(mockPrismaConversations);

      const result = await repository.findByUserId(userId);

      expect(mockPrismaClient.conversation.findMany).toHaveBeenCalledWith({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        include: {
          _count: {
            select: { messages: true },
          },
        },
      });

      expect(result).toEqual(mockPrismaConversations);
    });

    it('should return empty array when no conversations found', async () => {
      const userId = 'user-123';

      mockPrismaClient.conversation.findMany.mockResolvedValue([]);

      const result = await repository.findByUserId(userId);

      expect(result).toEqual([]);
    });

    it('should throw DatabaseError on database error', async () => {
      const userId = 'user-123';
      const dbError = new Error('Database connection failed');

      mockPrismaClient.conversation.findMany.mockRejectedValue(dbError);

      await expect(repository.findByUserId(userId)).rejects.toThrow(DatabaseError);
      await expect(repository.findByUserId(userId)).rejects.toThrow('Failed to find conversations by user ID');
    });
  });

  describe('findActiveByUserId', () => {
    it('should find active conversation by user ID successfully', async () => {
      const userId = 'user-123';
      const mockPrismaConversation = {
        id: 'conv-123',
        userId,
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-02T00:00:00Z'),
        user: {
          id: userId,
          phoneNumber: '+6281234567890',
          name: 'John Doe',
        },
        _count: {
          messages: 5,
        },
      };

      mockPrismaClient.conversation.findFirst.mockResolvedValue(mockPrismaConversation);

      const result = await repository.findActiveByUserId(userId);

      expect(mockPrismaClient.conversation.findFirst).toHaveBeenCalledWith({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              phoneNumber: true,
              name: true,
            },
          },
          _count: {
            select: { messages: true },
          },
        },
      });

      expect(result).toEqual(mockPrismaConversation);
    });

    it('should return null when no active conversation found', async () => {
      const userId = 'user-123';

      mockPrismaClient.conversation.findFirst.mockResolvedValue(null);

      const result = await repository.findActiveByUserId(userId);

      expect(result).toBeNull();
    });

    it('should throw DatabaseError on database error', async () => {
      const userId = 'user-123';
      const dbError = new Error('Database connection failed');

      mockPrismaClient.conversation.findFirst.mockRejectedValue(dbError);

      await expect(repository.findActiveByUserId(userId)).rejects.toThrow(DatabaseError);
      await expect(repository.findActiveByUserId(userId)).rejects.toThrow('Failed to find active conversation by user ID');
    });
  });

  describe('create', () => {
    it('should create conversation successfully', async () => {
      const createConversationDto = {
        userId: 'user-123',
      };

      const mockPrismaConversation = {
        id: 'conv-123',
        userId: createConversationDto.userId,
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z'),
        user: {
          id: createConversationDto.userId,
          phoneNumber: '+6281234567890',
          name: 'John Doe',
        },
        _count: {
          messages: 0,
        },
      };

      mockPrismaClient.conversation.create.mockResolvedValue(mockPrismaConversation);

      const result = await repository.create(createConversationDto);

      expect(mockPrismaClient.conversation.create).toHaveBeenCalledWith({
        data: {
          userId: createConversationDto.userId,
        },
        include: {
          user: {
            select: {
              id: true,
              phoneNumber: true,
              name: true,
            },
          },
          _count: {
            select: { messages: true },
          },
        },
      });

      expect(result).toEqual(mockPrismaConversation);
    });

    it('should throw DatabaseError on database error', async () => {
      const createConversationDto = {
        userId: 'user-123',
      };
      const dbError = new Error('Database connection failed');

      mockPrismaClient.conversation.create.mockRejectedValue(dbError);

      await expect(repository.create(createConversationDto)).rejects.toThrow(DatabaseError);
      await expect(repository.create(createConversationDto)).rejects.toThrow('Failed to create conversation');
    });

    it('should handle foreign key constraint error', async () => {
      const createConversationDto = {
        userId: 'user-123',
      };
      const dbError = new Error('Foreign key constraint failed');

      mockPrismaClient.conversation.create.mockRejectedValue(dbError);

      await expect(repository.create(createConversationDto)).rejects.toThrow(DatabaseError);
    });
  });

  describe('update', () => {
    it('should update conversation successfully', async () => {
      const conversationId = 'conv-123';
      const updateData = {
        updatedAt: new Date('2024-01-02T00:00:00Z'),
      };

      const mockPrismaConversation = {
        id: conversationId,
        userId: 'user-123',
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: updateData.updatedAt,
        user: {
          id: 'user-123',
          phoneNumber: '+6281234567890',
          name: 'John Doe',
        },
        _count: {
          messages: 5,
        },
      };

      mockPrismaClient.conversation.update.mockResolvedValue(mockPrismaConversation);

      const result = await repository.update(conversationId, updateData);

      expect(mockPrismaClient.conversation.update).toHaveBeenCalledWith({
        where: { id: conversationId },
        data: updateData,
        include: {
          user: {
            select: {
              id: true,
              phoneNumber: true,
              name: true,
            },
          },
          _count: {
            select: { messages: true },
          },
        },
      });

      expect(result).toEqual(mockPrismaConversation);
    });

    it('should throw DatabaseError on database error', async () => {
      const conversationId = 'conv-123';
      const updateData = {
        updatedAt: new Date('2024-01-02T00:00:00Z'),
      };
      const dbError = new Error('Database connection failed');

      mockPrismaClient.conversation.update.mockRejectedValue(dbError);

      await expect(repository.update(conversationId, updateData)).rejects.toThrow(DatabaseError);
      await expect(repository.update(conversationId, updateData)).rejects.toThrow('Failed to update conversation');
    });

    it('should handle conversation not found error', async () => {
      const conversationId = 'conv-123';
      const updateData = {
        updatedAt: new Date('2024-01-02T00:00:00Z'),
      };
      const dbError = new Error('Record to update not found');

      mockPrismaClient.conversation.update.mockRejectedValue(dbError);

      await expect(repository.update(conversationId, updateData)).rejects.toThrow(DatabaseError);
    });
  });

  describe('delete', () => {
    it('should delete conversation successfully', async () => {
      const conversationId = 'conv-123';

      mockPrismaClient.conversation.delete.mockResolvedValue(undefined);

      await expect(repository.delete(conversationId)).resolves.toBeUndefined();

      expect(mockPrismaClient.conversation.delete).toHaveBeenCalledWith({
        where: { id: conversationId },
      });
    });

    it('should throw DatabaseError on database error', async () => {
      const conversationId = 'conv-123';
      const dbError = new Error('Database connection failed');

      mockPrismaClient.conversation.delete.mockRejectedValue(dbError);

      await expect(repository.delete(conversationId)).rejects.toThrow(DatabaseError);
      await expect(repository.delete(conversationId)).rejects.toThrow('Failed to delete conversation');
    });

    it('should handle conversation not found error', async () => {
      const conversationId = 'conv-123';
      const dbError = new Error('Record to delete does not exist');

      mockPrismaClient.conversation.delete.mockRejectedValue(dbError);

      await expect(repository.delete(conversationId)).rejects.toThrow(DatabaseError);
    });
  });

  describe('deleteByUserId', () => {
    it('should delete all conversations for user successfully', async () => {
      const userId = 'user-123';
      const mockConversations = [
        { id: 'conv-1' },
        { id: 'conv-2' },
        { id: 'conv-3' },
      ];

      mockPrismaClient.conversation.findMany.mockResolvedValue(mockConversations);
      mockPrismaClient.message.deleteMany.mockResolvedValue({ count: 15 });
      mockPrismaClient.conversation.deleteMany.mockResolvedValue({ count: 3 });

      await expect(repository.deleteByUserId(userId)).resolves.toBeUndefined();

      expect(mockPrismaClient.conversation.findMany).toHaveBeenCalledWith({
        where: { userId },
        select: { id: true },
      });

      expect(mockPrismaClient.message.deleteMany).toHaveBeenCalledWith({
        where: {
          conversationId: {
            in: ['conv-1', 'conv-2', 'conv-3'],
          },
        },
      });

      expect(mockPrismaClient.conversation.deleteMany).toHaveBeenCalledWith({
        where: { userId },
      });
    });

    it('should handle user with no conversations', async () => {
      const userId = 'user-123';

      mockPrismaClient.conversation.findMany.mockResolvedValue([]);
      mockPrismaClient.conversation.deleteMany.mockResolvedValue({ count: 0 });

      await expect(repository.deleteByUserId(userId)).resolves.toBeUndefined();

      expect(mockPrismaClient.message.deleteMany).not.toHaveBeenCalled();
      expect(mockPrismaClient.conversation.deleteMany).toHaveBeenCalledWith({
        where: { userId },
      });
    });

    it('should throw DatabaseError on database error', async () => {
      const userId = 'user-123';
      const dbError = new Error('Database connection failed');

      mockPrismaClient.conversation.findMany.mockRejectedValue(dbError);

      await expect(repository.deleteByUserId(userId)).rejects.toThrow(DatabaseError);
      await expect(repository.deleteByUserId(userId)).rejects.toThrow('Failed to delete conversations by user ID');
    });

    it('should handle error during message deletion', async () => {
      const userId = 'user-123';
      const mockConversations = [{ id: 'conv-1' }];
      const dbError = new Error('Message deletion failed');

      mockPrismaClient.conversation.findMany.mockResolvedValue(mockConversations);
      mockPrismaClient.message.deleteMany.mockRejectedValue(dbError);

      await expect(repository.deleteByUserId(userId)).rejects.toThrow(DatabaseError);
    });
  });

  describe('cleanupOldConversations', () => {
    it('should cleanup old conversations successfully', async () => {
      const days = 30;
      const mockOldConversations = [
        { id: 'conv-1' },
        { id: 'conv-2' },
        { id: 'conv-3' },
      ];

      mockPrismaClient.conversation.findMany.mockResolvedValue(mockOldConversations);
      mockPrismaClient.message.deleteMany.mockResolvedValue({ count: 25 });
      mockPrismaClient.conversation.deleteMany.mockResolvedValue({ count: 3 });

      const result = await repository.cleanupOldConversations(days);

      expect(mockPrismaClient.conversation.findMany).toHaveBeenCalledWith({
        where: {
          updatedAt: {
            lt: expect.any(Date),
          },
        },
        select: { id: true },
      });

      expect(mockPrismaClient.message.deleteMany).toHaveBeenCalledWith({
        where: {
          conversationId: {
            in: ['conv-1', 'conv-2', 'conv-3'],
          },
        },
      });

      expect(mockPrismaClient.conversation.deleteMany).toHaveBeenCalledWith({
        where: {
          updatedAt: {
            lt: expect.any(Date),
          },
        },
      });

      expect(result).toBe(3);
    });

    it('should handle no old conversations to cleanup', async () => {
      const days = 30;

      mockPrismaClient.conversation.findMany.mockResolvedValue([]);
      mockPrismaClient.conversation.deleteMany.mockResolvedValue({ count: 0 });

      const result = await repository.cleanupOldConversations(days);

      expect(mockPrismaClient.message.deleteMany).not.toHaveBeenCalled();
      expect(result).toBe(0);
    });

    it('should throw DatabaseError on database error', async () => {
      const days = 30;
      const dbError = new Error('Database connection failed');

      mockPrismaClient.conversation.findMany.mockRejectedValue(dbError);

      await expect(repository.cleanupOldConversations(days)).rejects.toThrow(DatabaseError);
      await expect(repository.cleanupOldConversations(days)).rejects.toThrow('Failed to cleanup old conversations');
    });

    it('should handle error during message deletion in cleanup', async () => {
      const days = 30;
      const mockOldConversations = [{ id: 'conv-1' }];
      const dbError = new Error('Message deletion failed');

      mockPrismaClient.conversation.findMany.mockResolvedValue(mockOldConversations);
      mockPrismaClient.message.deleteMany.mockRejectedValue(dbError);

      await expect(repository.cleanupOldConversations(days)).rejects.toThrow(DatabaseError);
    });

    it('should calculate correct cutoff date', async () => {
      const days = 7;
      const mockOldConversations = [{ id: 'conv-1' }];

      mockPrismaClient.conversation.findMany.mockResolvedValue(mockOldConversations);
      mockPrismaClient.message.deleteMany.mockResolvedValue({ count: 5 });
      mockPrismaClient.conversation.deleteMany.mockResolvedValue({ count: 1 });

      await repository.cleanupOldConversations(days);

      const findManyCall = mockPrismaClient.conversation.findMany.mock.calls[0][0];
      const cutoffDate = findManyCall.where.updatedAt.lt;
      
      const expectedCutoffDate = new Date();
      expectedCutoffDate.setDate(expectedCutoffDate.getDate() - days);

      // Allow for small time differences in test execution
      expect(cutoffDate.getTime()).toBeCloseTo(expectedCutoffDate.getTime(), -2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long conversation IDs', async () => {
      const longConversationId = 'conv-' + 'a'.repeat(1000);
      const mockPrismaConversation = {
        id: longConversationId,
        userId: 'user-123',
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z'),
        user: {
          id: 'user-123',
          phoneNumber: '+6281234567890',
          name: 'John Doe',
        },
        _count: {
          messages: 0,
        },
      };

      mockPrismaClient.conversation.findUnique.mockResolvedValue(mockPrismaConversation);

      const result = await repository.findById(longConversationId);

      expect(result?.id).toBe(longConversationId);
    });

    it('should handle very long user IDs', async () => {
      const longUserId = 'user-' + 'a'.repeat(1000);
      const mockPrismaConversations = [
        {
          id: 'conv-1',
          userId: longUserId,
          createdAt: new Date('2024-01-01T00:00:00Z'),
          updatedAt: new Date('2024-01-02T00:00:00Z'),
          _count: { messages: 5 },
        },
      ];

      mockPrismaClient.conversation.findMany.mockResolvedValue(mockPrismaConversations);

      const result = await repository.findByUserId(longUserId);

      expect(result[0]?.userId).toBe(longUserId);
    });

    it('should handle large number of conversations for cleanup', async () => {
      const days = 30;
      const mockOldConversations = Array.from({ length: 1000 }, (_, i) => ({ id: `conv-${i}` }));

      mockPrismaClient.conversation.findMany.mockResolvedValue(mockOldConversations);
      mockPrismaClient.message.deleteMany.mockResolvedValue({ count: 5000 });
      mockPrismaClient.conversation.deleteMany.mockResolvedValue({ count: 1000 });

      const result = await repository.cleanupOldConversations(days);

      expect(result).toBe(1000);
      expect(mockPrismaClient.message.deleteMany).toHaveBeenCalledWith({
        where: {
          conversationId: {
            in: expect.arrayContaining([expect.stringMatching(/^conv-\d+$/)]),
          },
        },
      });
    });

    it('should handle special characters in IDs', async () => {
      const specialConversationId = 'conv-123_456-789@test';
      const mockPrismaConversation = {
        id: specialConversationId,
        userId: 'user-123',
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z'),
        user: {
          id: 'user-123',
          phoneNumber: '+6281234567890',
          name: 'John Doe',
        },
        _count: {
          messages: 0,
        },
      };

      mockPrismaClient.conversation.findUnique.mockResolvedValue(mockPrismaConversation);

      const result = await repository.findById(specialConversationId);

      expect(result?.id).toBe(specialConversationId);
    });
  });
});
