import { PrismaMediaRepository } from '../PrismaMediaRepository';
import { PrismaClient } from '@prisma/client';
import { DatabaseError } from '../../../../domain/errors/BotError';

import { createMockMedia } from '../../../../test/setup';

// Mock PrismaClient
const mockPrismaClient = {
  media: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  },
};

// Mock the PrismaClient constructor
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => mockPrismaClient),
}));

describe('PrismaMediaRepository', () => {
  let repository: PrismaMediaRepository;
  let mockPrisma: PrismaClient;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Create a new instance of the repository
    mockPrisma = new PrismaClient() as any;
    repository = new PrismaMediaRepository(mockPrisma);
  });

  describe('findById', () => {
    it('should find media by ID successfully', async () => {
      const mediaId = 'media-123';
      const mockPrismaMedia = {
        id: mediaId,
        url: 'https://example.com/image.jpg',
        type: 'IMAGE',
        summary: 'A beautiful landscape image',
        userId: 'user-123',
        createdAt: new Date('2024-01-01T00:00:00Z'),
        user: {
          id: 'user-123',
          phoneNumber: '+6281234567890',
          name: 'John Doe',
        },
        messages: [
          {
            id: 'msg-123',
            createdAt: new Date('2024-01-01T00:00:00Z'),
            role: 'USER',
            content: 'Check this image',
            mediaId: mediaId,
            conversationId: 'conv-123',
          },
        ],
      };

      mockPrismaClient.media.findUnique.mockResolvedValue(mockPrismaMedia);

      const result = await repository.findById(mediaId);

      expect(mockPrismaClient.media.findUnique).toHaveBeenCalledWith({
        where: { id: mediaId },
        include: {
          user: {
            select: {
              id: true,
              phoneNumber: true,
              name: true,
            },
          },
          messages: {
            select: {
              id: true,
              createdAt: true,
              role: true,
              content: true,
              mediaId: true,
              conversationId: true,
            },
          },
        },
      });

      expect(result).toEqual({
        id: mediaId,
        url: 'https://example.com/image.jpg',
        type: 'IMAGE',
        summary: 'A beautiful landscape image',
        userId: 'user-123',
        createdAt: new Date('2024-01-01T00:00:00Z'),
      });
    });

    it('should handle media without summary', async () => {
      const mediaId = 'media-123';
      const mockPrismaMedia = {
        id: mediaId,
        url: 'https://example.com/video.mp4',
        type: 'VIDEO',
        summary: null,
        userId: 'user-123',
        createdAt: new Date('2024-01-01T00:00:00Z'),
        user: {
          id: 'user-123',
          phoneNumber: '+6281234567890',
          name: 'John Doe',
        },
        messages: [],
      };

      mockPrismaClient.media.findUnique.mockResolvedValue(mockPrismaMedia);

      const result = await repository.findById(mediaId);

      expect(result).toEqual({
        id: mediaId,
        url: 'https://example.com/video.mp4',
        type: 'VIDEO',
        summary: undefined,
        userId: 'user-123',
        createdAt: new Date('2024-01-01T00:00:00Z'),
      });
    });

    it('should return null when media not found', async () => {
      const mediaId = 'media-123';

      mockPrismaClient.media.findUnique.mockResolvedValue(null);

      const result = await repository.findById(mediaId);

      expect(result).toBeNull();
    });

    it('should throw DatabaseError on database error', async () => {
      const mediaId = 'media-123';
      const dbError = new Error('Database connection failed');

      mockPrismaClient.media.findUnique.mockRejectedValue(dbError);

      await expect(repository.findById(mediaId)).rejects.toThrow(DatabaseError);
      await expect(repository.findById(mediaId)).rejects.toThrow('Failed to find media by ID');
    });
  });

  describe('findByUserId', () => {
    it('should find media by user ID successfully', async () => {
      const userId = 'user-123';
      const mockPrismaMedia = [
        {
          id: 'media-1',
          url: 'https://example.com/image1.jpg',
          type: 'IMAGE',
          summary: 'First image',
          userId,
          createdAt: new Date('2024-01-01T00:00:00Z'),
          messages: [],
        },
        {
          id: 'media-2',
          url: 'https://example.com/video1.mp4',
          type: 'VIDEO',
          summary: 'First video',
          userId,
          createdAt: new Date('2024-01-02T00:00:00Z'),
          messages: [],
        },
      ];

      mockPrismaClient.media.findMany.mockResolvedValue(mockPrismaMedia);

      const result = await repository.findByUserId(userId);

      expect(mockPrismaClient.media.findMany).toHaveBeenCalledWith({
        where: { userId },
        include: {
          messages: {
            select: {
              id: true,
              createdAt: true,
              role: true,
              content: true,
              mediaId: true,
              conversationId: true,
            },
          },
        },
      });

      expect(result).toEqual([
        {
          id: 'media-1',
          url: 'https://example.com/image1.jpg',
          type: 'IMAGE',
          summary: 'First image',
          userId,
          createdAt: new Date('2024-01-01T00:00:00Z'),
        },
        {
          id: 'media-2',
          url: 'https://example.com/video1.mp4',
          type: 'VIDEO',
          summary: 'First video',
          userId,
          createdAt: new Date('2024-01-02T00:00:00Z'),
        },
      ]);
    });

    it('should return empty array when no media found', async () => {
      const userId = 'user-123';

      mockPrismaClient.media.findMany.mockResolvedValue([]);

      const result = await repository.findByUserId(userId);

      expect(result).toEqual([]);
    });

    it('should throw DatabaseError on database error', async () => {
      const userId = 'user-123';
      const dbError = new Error('Database connection failed');

      mockPrismaClient.media.findMany.mockRejectedValue(dbError);

      await expect(repository.findByUserId(userId)).rejects.toThrow(DatabaseError);
      await expect(repository.findByUserId(userId)).rejects.toThrow('Failed to find media by user ID');
    });
  });

  describe('create', () => {
    it('should create media successfully', async () => {
      const createMediaDto = {
        url: 'https://example.com/new-image.jpg',
        type: 'IMAGE',
        summary: 'New image description',
        userId: 'user-123',
      };

      const mockPrismaMedia = {
        id: 'media-123',
        url: createMediaDto.url,
        type: 'IMAGE',
        summary: createMediaDto.summary,
        userId: createMediaDto.userId,
        createdAt: new Date('2024-01-01T00:00:00Z'),
        user: {
          id: 'user-123',
          phoneNumber: '+6281234567890',
          name: 'John Doe',
        },
        messages: [],
      };

      mockPrismaClient.media.create.mockResolvedValue(mockPrismaMedia);

      const result = await repository.create(createMediaDto);

      expect(mockPrismaClient.media.create).toHaveBeenCalledWith({
        data: {
          url: createMediaDto.url,
          type: 'IMAGE',
          summary: createMediaDto.summary,
          userId: createMediaDto.userId,
        },
        include: {
          user: {
            select: {
              id: true,
              phoneNumber: true,
              name: true,
            },
          },
          messages: {
            select: {
              id: true,
              createdAt: true,
              role: true,
              content: true,
              mediaId: true,
              conversationId: true,
            },
          },
        },
      });

      expect(result).toEqual({
        id: 'media-123',
        url: createMediaDto.url,
        type: 'IMAGE',
        summary: createMediaDto.summary,
        userId: createMediaDto.userId,
        createdAt: new Date('2024-01-01T00:00:00Z'),
      });
    });

    it('should create media without summary', async () => {
      const createMediaDto = {
        url: 'https://example.com/new-video.mp4',
        type: 'VIDEO',
        summary: undefined,
        userId: 'user-123',
      };

      const mockPrismaMedia = {
        id: 'media-123',
        url: createMediaDto.url,
        type: 'VIDEO',
        summary: null,
        userId: createMediaDto.userId,
        createdAt: new Date('2024-01-01T00:00:00Z'),
        user: {
          id: 'user-123',
          phoneNumber: '+6281234567890',
          name: 'John Doe',
        },
        messages: [],
      };

      mockPrismaClient.media.create.mockResolvedValue(mockPrismaMedia);

      const result = await repository.create(createMediaDto);

      expect(result).toEqual({
        id: 'media-123',
        url: createMediaDto.url,
        type: 'VIDEO',
        summary: undefined,
        userId: createMediaDto.userId,
        createdAt: new Date('2024-01-01T00:00:00Z'),
      });
    });

    it('should create audio media', async () => {
      const createMediaDto = {
        url: 'https://example.com/audio.mp3',
        type: 'AUDIO',
        summary: 'Audio file',
        userId: 'user-123',
      };

      const mockPrismaMedia = {
        id: 'media-123',
        url: createMediaDto.url,
        type: 'AUDIO',
        summary: createMediaDto.summary,
        userId: createMediaDto.userId,
        createdAt: new Date('2024-01-01T00:00:00Z'),
        user: {
          id: 'user-123',
          phoneNumber: '+6281234567890',
          name: 'John Doe',
        },
        messages: [],
      };

      mockPrismaClient.media.create.mockResolvedValue(mockPrismaMedia);

      const result = await repository.create(createMediaDto);

      expect(result.type).toBe('AUDIO');
    });

    it('should create document media', async () => {
      const createMediaDto = {
        url: 'https://example.com/document.pdf',
        type: 'DOCUMENT',
        summary: 'PDF document',
        userId: 'user-123',
      };

      const mockPrismaMedia = {
        id: 'media-123',
        url: createMediaDto.url,
        type: 'DOCUMENT',
        summary: createMediaDto.summary,
        userId: createMediaDto.userId,
        createdAt: new Date('2024-01-01T00:00:00Z'),
        user: {
          id: 'user-123',
          phoneNumber: '+6281234567890',
          name: 'John Doe',
        },
        messages: [],
      };

      mockPrismaClient.media.create.mockResolvedValue(mockPrismaMedia);

      const result = await repository.create(createMediaDto);

      expect(result.type).toBe('DOCUMENT');
    });

    it('should throw DatabaseError on database error', async () => {
      const createMediaDto = {
        url: 'https://example.com/image.jpg',
        type: 'IMAGE',
        summary: 'Test image',
        userId: 'user-123',
      };
      const dbError = new Error('Database connection failed');

      mockPrismaClient.media.create.mockRejectedValue(dbError);

      await expect(repository.create(createMediaDto)).rejects.toThrow(DatabaseError);
      await expect(repository.create(createMediaDto)).rejects.toThrow('Failed to create media');
    });

    it('should handle foreign key constraint error', async () => {
      const createMediaDto = {
        url: 'https://example.com/image.jpg',
        type: 'IMAGE',
        summary: 'Test image',
        userId: 'user-123',
      };
      const dbError = new Error('Foreign key constraint failed');

      mockPrismaClient.media.create.mockRejectedValue(dbError);

      await expect(repository.create(createMediaDto)).rejects.toThrow(DatabaseError);
    });
  });

  describe('update', () => {
    it('should update media successfully', async () => {
      const mediaId = 'media-123';
      const updateMediaDto = {
        summary: 'Updated image description',
      };

      const mockPrismaMedia = {
        id: mediaId,
        url: 'https://example.com/image.jpg',
        type: 'IMAGE',
        summary: updateMediaDto.summary,
        userId: 'user-123',
        createdAt: new Date('2024-01-01T00:00:00Z'),
        user: {
          id: 'user-123',
          phoneNumber: '+6281234567890',
          name: 'John Doe',
        },
        messages: [],
      };

      mockPrismaClient.media.update.mockResolvedValue(mockPrismaMedia);

      const result = await repository.update(mediaId, updateMediaDto);

      expect(mockPrismaClient.media.update).toHaveBeenCalledWith({
        where: { id: mediaId },
        data: {
          summary: updateMediaDto.summary,
        },
        include: {
          user: {
            select: {
              id: true,
              phoneNumber: true,
              name: true,
            },
          },
          messages: {
            select: {
              id: true,
              createdAt: true,
              role: true,
              content: true,
              mediaId: true,
              conversationId: true,
            },
          },
        },
      });

      expect(result).toEqual({
        id: mediaId,
        url: 'https://example.com/image.jpg',
        type: 'IMAGE',
        summary: updateMediaDto.summary,
        userId: 'user-123',
        createdAt: new Date('2024-01-01T00:00:00Z'),
      });
    });

    it('should update media summary to undefined', async () => {
      const mediaId = 'media-123';
      const updateMediaDto = {
        summary: undefined,
      };

      const mockPrismaMedia = {
        id: mediaId,
        url: 'https://example.com/image.jpg',
        type: 'IMAGE',
        summary: null,
        userId: 'user-123',
        createdAt: new Date('2024-01-01T00:00:00Z'),
        user: {
          id: 'user-123',
          phoneNumber: '+6281234567890',
          name: 'John Doe',
        },
        messages: [],
      };

      mockPrismaClient.media.update.mockResolvedValue(mockPrismaMedia);

      const result = await repository.update(mediaId, updateMediaDto);

      expect(result.summary).toBe(undefined);
    });

    it('should throw DatabaseError on database error', async () => {
      const mediaId = 'media-123';
      const updateMediaDto = {
        summary: 'Updated description',
      };
      const dbError = new Error('Database connection failed');

      mockPrismaClient.media.update.mockRejectedValue(dbError);

      await expect(repository.update(mediaId, updateMediaDto)).rejects.toThrow(DatabaseError);
      await expect(repository.update(mediaId, updateMediaDto)).rejects.toThrow('Failed to update media');
    });

    it('should handle media not found error', async () => {
      const mediaId = 'media-123';
      const updateMediaDto = {
        summary: 'Updated description',
      };
      const dbError = new Error('Record to update not found');

      mockPrismaClient.media.update.mockRejectedValue(dbError);

      await expect(repository.update(mediaId, updateMediaDto)).rejects.toThrow(DatabaseError);
    });
  });

  describe('delete', () => {
    it('should delete media successfully', async () => {
      const mediaId = 'media-123';

      mockPrismaClient.media.delete.mockResolvedValue(undefined);

      await expect(repository.delete(mediaId)).resolves.toBeUndefined();

      expect(mockPrismaClient.media.delete).toHaveBeenCalledWith({
        where: { id: mediaId },
      });
    });

    it('should throw DatabaseError on database error', async () => {
      const mediaId = 'media-123';
      const dbError = new Error('Database connection failed');

      mockPrismaClient.media.delete.mockRejectedValue(dbError);

      await expect(repository.delete(mediaId)).rejects.toThrow(DatabaseError);
      await expect(repository.delete(mediaId)).rejects.toThrow('Failed to delete media');
    });

    it('should handle media not found error', async () => {
      const mediaId = 'media-123';
      const dbError = new Error('Record to delete does not exist');

      mockPrismaClient.media.delete.mockRejectedValue(dbError);

      await expect(repository.delete(mediaId)).rejects.toThrow(DatabaseError);
    });
  });

  describe('deleteByUserId', () => {
    it('should delete all media for user successfully', async () => {
      const userId = 'user-123';

      mockPrismaClient.media.deleteMany.mockResolvedValue({ count: 5 });

      await expect(repository.deleteByUserId(userId)).resolves.toBeUndefined();

      expect(mockPrismaClient.media.deleteMany).toHaveBeenCalledWith({
        where: { userId },
      });
    });

    it('should handle user with no media', async () => {
      const userId = 'user-123';

      mockPrismaClient.media.deleteMany.mockResolvedValue({ count: 0 });

      await expect(repository.deleteByUserId(userId)).resolves.toBeUndefined();
    });

    it('should throw DatabaseError on database error', async () => {
      const userId = 'user-123';
      const dbError = new Error('Database connection failed');

      mockPrismaClient.media.deleteMany.mockRejectedValue(dbError);

      await expect(repository.deleteByUserId(userId)).rejects.toThrow(DatabaseError);
      await expect(repository.deleteByUserId(userId)).rejects.toThrow('Failed to delete media by user ID');
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long media IDs', async () => {
      const longMediaId = 'media-' + 'a'.repeat(1000);
      const mockPrismaMedia = {
        id: longMediaId,
        url: 'https://example.com/image.jpg',
        type: 'IMAGE',
        summary: 'Test image',
        userId: 'user-123',
        createdAt: new Date('2024-01-01T00:00:00Z'),
        user: {
          id: 'user-123',
          phoneNumber: '+6281234567890',
          name: 'John Doe',
        },
        messages: [],
      };

      mockPrismaClient.media.findUnique.mockResolvedValue(mockPrismaMedia);

      const result = await repository.findById(longMediaId);

      expect(result?.id).toBe(longMediaId);
    });

    it('should handle very long user IDs', async () => {
      const longUserId = 'user-' + 'a'.repeat(1000);
      const mockPrismaMedia = [
        {
          id: 'media-1',
          url: 'https://example.com/image.jpg',
          type: 'IMAGE',
          summary: 'Test image',
          userId: longUserId,
          createdAt: new Date('2024-01-01T00:00:00Z'),
          messages: [],
        },
      ];

      mockPrismaClient.media.findMany.mockResolvedValue(mockPrismaMedia);

      const result = await repository.findByUserId(longUserId);

      expect(result[0]?.userId).toBe(longUserId);
    });

    it('should handle very long URLs', async () => {
      const longUrl = 'https://example.com/' + 'a'.repeat(1000) + '.jpg';
      const createMediaDto = {
        url: longUrl,
        type: 'IMAGE',
        summary: 'Test image',
        userId: 'user-123',
      };

      const mockPrismaMedia = {
        id: 'media-123',
        url: longUrl,
        type: 'IMAGE',
        summary: createMediaDto.summary,
        userId: createMediaDto.userId,
        createdAt: new Date('2024-01-01T00:00:00Z'),
        user: {
          id: 'user-123',
          phoneNumber: '+6281234567890',
          name: 'John Doe',
        },
        messages: [],
      };

      mockPrismaClient.media.create.mockResolvedValue(mockPrismaMedia);

      const result = await repository.create(createMediaDto);

      expect(result.url).toBe(longUrl);
    });

    it('should handle very long summaries', async () => {
      const longSummary = 'A'.repeat(10000);
      const createMediaDto = {
        url: 'https://example.com/image.jpg',
        type: 'IMAGE',
        summary: longSummary,
        userId: 'user-123',
      };

      const mockPrismaMedia = {
        id: 'media-123',
        url: createMediaDto.url,
        type: 'IMAGE',
        summary: longSummary,
        userId: createMediaDto.userId,
        createdAt: new Date('2024-01-01T00:00:00Z'),
        user: {
          id: 'user-123',
          phoneNumber: '+6281234567890',
          name: 'John Doe',
        },
        messages: [],
      };

      mockPrismaClient.media.create.mockResolvedValue(mockPrismaMedia);

      const result = await repository.create(createMediaDto);

      expect(result.summary).toBe(longSummary);
    });

    it('should handle special characters in URLs', async () => {
      const specialUrl = 'https://example.com/image with spaces & special chars.jpg';
      const createMediaDto = {
        url: specialUrl,
        type: 'IMAGE',
        summary: 'Test image',
        userId: 'user-123',
      };

      const mockPrismaMedia = {
        id: 'media-123',
        url: specialUrl,
        type: 'IMAGE',
        summary: createMediaDto.summary,
        userId: createMediaDto.userId,
        createdAt: new Date('2024-01-01T00:00:00Z'),
        user: {
          id: 'user-123',
          phoneNumber: '+6281234567890',
          name: 'John Doe',
        },
        messages: [],
      };

      mockPrismaClient.media.create.mockResolvedValue(mockPrismaMedia);

      const result = await repository.create(createMediaDto);

      expect(result.url).toBe(specialUrl);
    });

    it('should handle special characters in IDs', async () => {
      const specialMediaId = 'media-123_456-789@test';
      const mockPrismaMedia = {
        id: specialMediaId,
        url: 'https://example.com/image.jpg',
        type: 'IMAGE',
        summary: 'Test image',
        userId: 'user-123',
        createdAt: new Date('2024-01-01T00:00:00Z'),
        user: {
          id: 'user-123',
          phoneNumber: '+6281234567890',
          name: 'John Doe',
        },
        messages: [],
      };

      mockPrismaClient.media.findUnique.mockResolvedValue(mockPrismaMedia);

      const result = await repository.findById(specialMediaId);

      expect(result?.id).toBe(specialMediaId);
    });

    it('should handle all media types', async () => {
      const mediaTypes = [
        { type: 'IMAGE', expectedType: 'IMAGE' },
        { type: 'VIDEO', expectedType: 'VIDEO' },
        { type: 'AUDIO', expectedType: 'AUDIO' },
        { type: 'DOCUMENT', expectedType: 'DOCUMENT' },
      ];

      for (const { type, expectedType } of mediaTypes) {
        const createMediaDto = {
          url: `https://example.com/file.${type.toLowerCase()}`,
          type: expectedType,
          summary: `${type} file`,
          userId: 'user-123',
        };

        const mockPrismaMedia = {
          id: 'media-123',
          url: createMediaDto.url,
          type,
          summary: createMediaDto.summary,
          userId: createMediaDto.userId,
          createdAt: new Date('2024-01-01T00:00:00Z'),
          user: {
            id: 'user-123',
            phoneNumber: '+6281234567890',
            name: 'John Doe',
          },
          messages: [],
        };

        mockPrismaClient.media.create.mockResolvedValue(mockPrismaMedia);

        const result = await repository.create(createMediaDto);

        expect(result.type).toBe(expectedType);
      }
    });
  });
});
