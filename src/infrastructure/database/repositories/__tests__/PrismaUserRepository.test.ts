import { PrismaUserRepository } from '../PrismaUserRepository';
import { PrismaClient } from '@prisma/client';
import { DatabaseError } from '../../../../domain/errors/BotError';
import { createMockUser } from '../../../../test/setup';

// Mock PrismaClient
const mockPrismaClient = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  conversation: {
    count: jest.fn(),
  },
};

// Mock the PrismaClient constructor
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => mockPrismaClient),
}));

describe('PrismaUserRepository', () => {
  let repository: PrismaUserRepository;
  let mockPrisma: PrismaClient;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Create a new instance of the repository
    mockPrisma = new PrismaClient() as any;
    repository = new PrismaUserRepository(mockPrisma);
  });

  describe('findById', () => {
    it('should find user by ID successfully', async () => {
      const userId = 'user-123';
      const mockPrismaUser = {
        id: userId,
        phoneNumber: '+6281234567890',
        name: 'John Doe',
        createdAt: new Date('2024-01-01T00:00:00Z'),
        conversations: [],
        _count: {
          media: 0,
          conversations: 0,
        },
      };

      mockPrismaClient.user.findUnique.mockResolvedValue(mockPrismaUser);

      const result = await repository.findById(userId);

      expect(mockPrismaClient.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
        include: {
          conversations: {
            include: {
              _count: {
                select: {
                  messages: true,
                },
              },
            },
          },
          _count: {
            select: {
              media: true,
              conversations: true,
            },
          },
        },
      });

      expect(result).toEqual({
        id: userId,
        phoneNumber: '+6281234567890',
        name: 'John Doe',
        createdAt: new Date('2024-01-01T00:00:00Z'),
      });
    });

    it('should return null when user not found', async () => {
      const userId = 'user-123';

      mockPrismaClient.user.findUnique.mockResolvedValue(null);

      const result = await repository.findById(userId);

      expect(result).toBeNull();
    });

    it('should handle user without name', async () => {
      const userId = 'user-123';
      const mockPrismaUser = {
        id: userId,
        phoneNumber: '+6281234567890',
        name: null,
        createdAt: new Date('2024-01-01T00:00:00Z'),
        conversations: [],
        _count: {
          media: 0,
          conversations: 0,
        },
      };

      mockPrismaClient.user.findUnique.mockResolvedValue(mockPrismaUser);

      const result = await repository.findById(userId);

      expect(result).toEqual({
        id: userId,
        phoneNumber: '+6281234567890',
        name: undefined,
        createdAt: new Date('2024-01-01T00:00:00Z'),
      });
    });

    it('should throw DatabaseError on database error', async () => {
      const userId = 'user-123';
      const dbError = new Error('Database connection failed');

      mockPrismaClient.user.findUnique.mockRejectedValue(dbError);

      await expect(repository.findById(userId)).rejects.toThrow(DatabaseError);
      await expect(repository.findById(userId)).rejects.toThrow('Failed to find user by ID');
    });
  });

  describe('findByPhoneNumber', () => {
    it('should find user by phone number successfully', async () => {
      const phoneNumber = '+6281234567890';
      const mockPrismaUser = {
        id: 'user-123',
        phoneNumber,
        name: 'John Doe',
        createdAt: new Date('2024-01-01T00:00:00Z'),
        conversations: [],
        _count: {
          media: 0,
          conversations: 0,
        },
      };

      mockPrismaClient.user.findUnique.mockResolvedValue(mockPrismaUser);

      const result = await repository.findByPhoneNumber(phoneNumber);

      expect(mockPrismaClient.user.findUnique).toHaveBeenCalledWith({
        where: { phoneNumber },
        include: {
          conversations: {
            include: {
              _count: {
                select: {
                  messages: true,
                },
              },
            },
          },
          _count: {
            select: {
              media: true,
              conversations: true,
            },
          },
        },
      });

      expect(result).toEqual({
        id: 'user-123',
        phoneNumber,
        name: 'John Doe',
        createdAt: new Date('2024-01-01T00:00:00Z'),
      });
    });

    it('should return null when user not found by phone number', async () => {
      const phoneNumber = '+6281234567890';

      mockPrismaClient.user.findUnique.mockResolvedValue(null);

      const result = await repository.findByPhoneNumber(phoneNumber);

      expect(result).toBeNull();
    });

    it('should handle different phone number formats', async () => {
      const phoneNumbers = [
        '+6281234567890',
        '6281234567890',
        '+62 812 345 6789',
        '081234567890',
      ];

      for (const phoneNumber of phoneNumbers) {
        const mockPrismaUser = {
          id: 'user-123',
          phoneNumber,
          name: 'John Doe',
          createdAt: new Date('2024-01-01T00:00:00Z'),
          conversations: [],
          _count: {
            media: 0,
            conversations: 0,
          },
        };

        mockPrismaClient.user.findUnique.mockResolvedValue(mockPrismaUser);

        const result = await repository.findByPhoneNumber(phoneNumber);

        expect(mockPrismaClient.user.findUnique).toHaveBeenCalledWith({
          where: { phoneNumber },
          include: expect.any(Object),
        });
        expect(result?.phoneNumber).toBe(phoneNumber);
      }
    });

    it('should throw DatabaseError on database error', async () => {
      const phoneNumber = '+6281234567890';
      const dbError = new Error('Database connection failed');

      mockPrismaClient.user.findUnique.mockRejectedValue(dbError);

      await expect(repository.findByPhoneNumber(phoneNumber)).rejects.toThrow(DatabaseError);
      await expect(repository.findByPhoneNumber(phoneNumber)).rejects.toThrow('Failed to find user by phone number');
    });
  });

  describe('create', () => {
    it('should create user successfully', async () => {
      const createUserDto = {
        phoneNumber: '+6281234567890',
        name: 'John Doe',
      };

      const mockPrismaUser = {
        id: 'user-123',
        phoneNumber: createUserDto.phoneNumber,
        name: createUserDto.name,
        createdAt: new Date('2024-01-01T00:00:00Z'),
        conversations: [],
        _count: {
          media: 0,
          conversations: 0,
        },
      };

      mockPrismaClient.user.create.mockResolvedValue(mockPrismaUser);

      const result = await repository.create(createUserDto);

      expect(mockPrismaClient.user.create).toHaveBeenCalledWith({
        data: {
          phoneNumber: createUserDto.phoneNumber,
          name: createUserDto.name,
        },
        include: {
          conversations: {
            include: {
              _count: {
                select: {
                  messages: true,
                },
              },
            },
          },
          _count: {
            select: {
              media: true,
              conversations: true,
            },
          },
        },
      });

      expect(result).toEqual({
        id: 'user-123',
        phoneNumber: createUserDto.phoneNumber,
        name: createUserDto.name,
        createdAt: new Date('2024-01-01T00:00:00Z'),
      });
    });

    it('should create user without name', async () => {
      const createUserDto = {
        phoneNumber: '+6281234567890',
        name: undefined,
      };

      const mockPrismaUser = {
        id: 'user-123',
        phoneNumber: createUserDto.phoneNumber,
        name: null,
        createdAt: new Date('2024-01-01T00:00:00Z'),
        conversations: [],
        _count: {
          media: 0,
          conversations: 0,
        },
      };

      mockPrismaClient.user.create.mockResolvedValue(mockPrismaUser);

      const result = await repository.create(createUserDto);

      expect(mockPrismaClient.user.create).toHaveBeenCalledWith({
        data: {
          phoneNumber: createUserDto.phoneNumber,
          name: undefined,
        },
        include: expect.any(Object),
      });

      expect(result).toEqual({
        id: 'user-123',
        phoneNumber: createUserDto.phoneNumber,
        name: undefined,
        createdAt: new Date('2024-01-01T00:00:00Z'),
      });
    });

    it('should throw DatabaseError on database error', async () => {
      const createUserDto = {
        phoneNumber: '+6281234567890',
        name: 'John Doe',
      };
      const dbError = new Error('Database connection failed');

      mockPrismaClient.user.create.mockRejectedValue(dbError);

      await expect(repository.create(createUserDto)).rejects.toThrow(DatabaseError);
      await expect(repository.create(createUserDto)).rejects.toThrow('Failed to create user');
    });

    it('should handle duplicate phone number error', async () => {
      const createUserDto = {
        phoneNumber: '+6281234567890',
        name: 'John Doe',
      };
      const dbError = new Error('Unique constraint failed on phoneNumber');

      mockPrismaClient.user.create.mockRejectedValue(dbError);

      await expect(repository.create(createUserDto)).rejects.toThrow(DatabaseError);
    });
  });

  describe('update', () => {
    it('should update user successfully', async () => {
      const userId = 'user-123';
      const updateUserDto = {
        name: 'Jane Doe',
      };

      const mockPrismaUser = {
        id: userId,
        phoneNumber: '+6281234567890',
        name: updateUserDto.name,
        createdAt: new Date('2024-01-01T00:00:00Z'),
        conversations: [],
        _count: {
          media: 0,
          conversations: 0,
        },
      };

      mockPrismaClient.user.update.mockResolvedValue(mockPrismaUser);

      const result = await repository.update(userId, updateUserDto);

      expect(mockPrismaClient.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: {
          name: updateUserDto.name,
        },
        include: {
          conversations: {
            include: {
              _count: {
                select: {
                  messages: true,
                },
              },
            },
          },
          _count: {
            select: {
              media: true,
              conversations: true,
            },
          },
        },
      });

      expect(result).toEqual({
        id: userId,
        phoneNumber: '+6281234567890',
        name: updateUserDto.name,
        createdAt: new Date('2024-01-01T00:00:00Z'),
      });
    });

    it('should update user name to undefined', async () => {
      const userId = 'user-123';
      const updateUserDto = {
        name: undefined,
      };

      const mockPrismaUser = {
        id: userId,
        phoneNumber: '+6281234567890',
        name: null,
        createdAt: new Date('2024-01-01T00:00:00Z'),
        conversations: [],
        _count: {
          media: 0,
          conversations: 0,
        },
      };

      mockPrismaClient.user.update.mockResolvedValue(mockPrismaUser);

      const result = await repository.update(userId, updateUserDto);

      expect(result).toEqual({
        id: userId,
        phoneNumber: '+6281234567890',
        name: undefined,
        createdAt: new Date('2024-01-01T00:00:00Z'),
      });
    });

    it('should throw DatabaseError on database error', async () => {
      const userId = 'user-123';
      const updateUserDto = {
        name: 'Jane Doe',
      };
      const dbError = new Error('Database connection failed');

      mockPrismaClient.user.update.mockRejectedValue(dbError);

      await expect(repository.update(userId, updateUserDto)).rejects.toThrow(DatabaseError);
      await expect(repository.update(userId, updateUserDto)).rejects.toThrow('Failed to update user');
    });

    it('should handle user not found error', async () => {
      const userId = 'user-123';
      const updateUserDto = {
        name: 'Jane Doe',
      };
      const dbError = new Error('Record to update not found');

      mockPrismaClient.user.update.mockRejectedValue(dbError);

      await expect(repository.update(userId, updateUserDto)).rejects.toThrow(DatabaseError);
    });
  });

  describe('delete', () => {
    it('should delete user successfully', async () => {
      const userId = 'user-123';

      mockPrismaClient.user.delete.mockResolvedValue(undefined);

      await expect(repository.delete(userId)).resolves.toBeUndefined();

      expect(mockPrismaClient.user.delete).toHaveBeenCalledWith({
        where: { id: userId },
      });
    });

    it('should throw DatabaseError on database error', async () => {
      const userId = 'user-123';
      const dbError = new Error('Database connection failed');

      mockPrismaClient.user.delete.mockRejectedValue(dbError);

      await expect(repository.delete(userId)).rejects.toThrow(DatabaseError);
      await expect(repository.delete(userId)).rejects.toThrow('Failed to delete user');
    });

    it('should handle user not found error', async () => {
      const userId = 'user-123';
      const dbError = new Error('Record to delete does not exist');

      mockPrismaClient.user.delete.mockRejectedValue(dbError);

      await expect(repository.delete(userId)).rejects.toThrow(DatabaseError);
    });
  });

  describe('hasConversationHistory', () => {
    it('should return true when user has conversation history', async () => {
      const userId = 'user-123';

      mockPrismaClient.conversation.count.mockResolvedValue(3);

      const result = await repository.hasConversationHistory(userId);

      expect(mockPrismaClient.conversation.count).toHaveBeenCalledWith({
        where: { userId },
      });
      expect(result).toBe(true);
    });

    it('should return false when user has no conversation history', async () => {
      const userId = 'user-123';

      mockPrismaClient.conversation.count.mockResolvedValue(0);

      const result = await repository.hasConversationHistory(userId);

      expect(result).toBe(false);
    });

    it('should throw DatabaseError on database error', async () => {
      const userId = 'user-123';
      const dbError = new Error('Database connection failed');

      mockPrismaClient.conversation.count.mockRejectedValue(dbError);

      await expect(repository.hasConversationHistory(userId)).rejects.toThrow(DatabaseError);
      await expect(repository.hasConversationHistory(userId)).rejects.toThrow('Failed to check conversation history');
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long user IDs', async () => {
      const longUserId = 'user-' + 'a'.repeat(1000);
      const mockPrismaUser = {
        id: longUserId,
        phoneNumber: '+6281234567890',
        name: 'John Doe',
        createdAt: new Date('2024-01-01T00:00:00Z'),
        conversations: [],
        _count: {
          media: 0,
          conversations: 0,
        },
      };

      mockPrismaClient.user.findUnique.mockResolvedValue(mockPrismaUser);

      const result = await repository.findById(longUserId);

      expect(result?.id).toBe(longUserId);
    });

    it('should handle very long phone numbers', async () => {
      const longPhoneNumber = '+628123456789012345678901234567890';
      const mockPrismaUser = {
        id: 'user-123',
        phoneNumber: longPhoneNumber,
        name: 'John Doe',
        createdAt: new Date('2024-01-01T00:00:00Z'),
        conversations: [],
        _count: {
          media: 0,
          conversations: 0,
        },
      };

      mockPrismaClient.user.findUnique.mockResolvedValue(mockPrismaUser);

      const result = await repository.findByPhoneNumber(longPhoneNumber);

      expect(result?.phoneNumber).toBe(longPhoneNumber);
    });

    it('should handle very long user names', async () => {
      const longName = 'A'.repeat(1000);
      const createUserDto = {
        phoneNumber: '+6281234567890',
        name: longName,
      };

      const mockPrismaUser = {
        id: 'user-123',
        phoneNumber: createUserDto.phoneNumber,
        name: createUserDto.name,
        createdAt: new Date('2024-01-01T00:00:00Z'),
        conversations: [],
        _count: {
          media: 0,
          conversations: 0,
        },
      };

      mockPrismaClient.user.create.mockResolvedValue(mockPrismaUser);

      const result = await repository.create(createUserDto);

      expect(result.name).toBe(longName);
    });

    it('should handle special characters in phone numbers', async () => {
      const specialPhoneNumber = '+62-812-345-6789';
      const mockPrismaUser = {
        id: 'user-123',
        phoneNumber: specialPhoneNumber,
        name: 'John Doe',
        createdAt: new Date('2024-01-01T00:00:00Z'),
        conversations: [],
        _count: {
          media: 0,
          conversations: 0,
        },
      };

      mockPrismaClient.user.findUnique.mockResolvedValue(mockPrismaUser);

      const result = await repository.findByPhoneNumber(specialPhoneNumber);

      expect(result?.phoneNumber).toBe(specialPhoneNumber);
    });
  });
});
