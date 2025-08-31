import { Media, CreateMediaDto, UpdateMediaDto } from '../Media';

describe('Media Entity', () => {
  describe('Media Interface', () => {
    it('should allow creating a complete media', () => {
      const media: Media = {
        id: 'media-123',
        url: 'https://example.com/image.jpg',
        type: 'image',
        summary: 'A beautiful landscape image',
        userId: 'user-456',
        createdAt: new Date('2024-01-01T10:00:00Z'),
      };

      expect(media.id).toBe('media-123');
      expect(media.url).toBe('https://example.com/image.jpg');
      expect(media.type).toBe('image');
      expect(media.summary).toBe('A beautiful landscape image');
      expect(media.userId).toBe('user-456');
      expect(media.createdAt).toBeInstanceOf(Date);
    });

    it('should allow creating media without summary', () => {
      const media: Media = {
        id: 'media-456',
        url: 'https://example.com/document.pdf',
        type: 'pdf',
        userId: 'user-789',
        createdAt: new Date(),
      };

      expect(media.summary).toBeUndefined();
      expect(media.type).toBe('pdf');
    });

    it('should handle different media types', () => {
      const mediaTypes = ['image', 'pdf', 'video', 'audio', 'document'];
      
      mediaTypes.forEach((type, index) => {
        const media: Media = {
          id: `media-${index}`,
          url: `https://example.com/file.${type}`,
          type,
          userId: `user-${index}`,
          createdAt: new Date(),
        };

        expect(media.type).toBe(type);
      });
    });
  });

  describe('CreateMediaDto Interface', () => {
    it('should allow creating a media DTO with summary', () => {
      const createDto: CreateMediaDto = {
        url: 'https://example.com/image.jpg',
        type: 'image',
        summary: 'A beautiful landscape image',
        userId: 'user-123',
      };

      expect(createDto.url).toBe('https://example.com/image.jpg');
      expect(createDto.type).toBe('image');
      expect(createDto.summary).toBe('A beautiful landscape image');
      expect(createDto.userId).toBe('user-123');
    });

    it('should allow creating a media DTO without summary', () => {
      const createDto: CreateMediaDto = {
        url: 'https://example.com/document.pdf',
        type: 'pdf',
        userId: 'user-456',
      };

      expect(createDto.url).toBe('https://example.com/document.pdf');
      expect(createDto.type).toBe('pdf');
      expect(createDto.summary).toBeUndefined();
      expect(createDto.userId).toBe('user-456');
    });

    it('should require url, type, and userId fields', () => {
      // This test verifies TypeScript compilation
      const createDto: CreateMediaDto = {
        url: 'https://example.com/file.jpg',
        type: 'image',
        userId: 'user-required',
        // summary is optional, so it's fine to omit it
      };

      expect(createDto.url).toBeDefined();
      expect(createDto.type).toBeDefined();
      expect(createDto.userId).toBeDefined();
    });
  });

  describe('UpdateMediaDto Interface', () => {
    it('should allow updating media summary', () => {
      const updateDto: UpdateMediaDto = {
        summary: 'Updated summary for the media',
      };

      expect(updateDto.summary).toBe('Updated summary for the media');
    });

    it('should allow partial updates', () => {
      const updateDto: UpdateMediaDto = {
        // All fields are optional in UpdateMediaDto
      };

      expect(updateDto.summary).toBeUndefined();
    });

    it('should handle empty summary updates', () => {
      const updateDto: UpdateMediaDto = {
        summary: '', // Empty string is different from undefined
      };

      expect(updateDto.summary).toBe('');
      expect(updateDto.summary).not.toBeUndefined();
    });
  });

  describe('Media Validation Scenarios', () => {
    it('should handle different URL formats', () => {
      const urls = [
        'https://example.com/image.jpg',
        'http://localhost:3000/file.pdf',
        'ftp://fileserver.com/video.mp4',
        'file:///path/to/local/file.txt',
        'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...',
      ];

      urls.forEach((url, index) => {
        const media: Media = {
          id: `media-${index}`,
          url,
          type: 'file',
          userId: `user-${index}`,
          createdAt: new Date(),
        };

        expect(media.url).toBe(url);
      });
    });

    it('should handle long URLs', () => {
      const longUrl = 'https://example.com/' + 'A'.repeat(1000) + '.jpg';
      const media: Media = {
        id: 'media-long-url',
        url: longUrl,
        type: 'image',
        userId: 'user-long',
        createdAt: new Date(),
      };

      expect(media.url).toBe(longUrl);
      expect(media.url.length).toBeGreaterThan(1000);
    });

    it('should handle special characters in URLs', () => {
      const specialUrl = 'https://example.com/file with spaces & special chars.jpg';
      const media: Media = {
        id: 'media-special',
        url: specialUrl,
        type: 'image',
        userId: 'user-special',
        createdAt: new Date(),
      };

      expect(media.url).toBe(specialUrl);
    });

    it('should handle different media type formats', () => {
      const mediaTypes = [
        'image/jpeg',
        'application/pdf',
        'video/mp4',
        'audio/mpeg',
        'text/plain',
        'image',
        'pdf',
        'video',
        'audio',
        'document',
      ];

      mediaTypes.forEach((type, index) => {
        const media: Media = {
          id: `media-${index}`,
          url: `https://example.com/file.${type.split('/')[1] || type}`,
          type,
          userId: `user-${index}`,
          createdAt: new Date(),
        };

        expect(media.type).toBe(type);
      });
    });

    it('should handle long summaries', () => {
      const longSummary = 'A'.repeat(1000); // 1000 character summary
      const media: Media = {
        id: 'media-long-summary',
        url: 'https://example.com/image.jpg',
        type: 'image',
        summary: longSummary,
        userId: 'user-long',
        createdAt: new Date(),
      };

      expect(media.summary).toBe(longSummary);
      expect(media.summary?.length).toBe(1000);
    });

    it('should handle special characters in summaries', () => {
      const specialSummary = 'Summary with special chars: @#$%^&*()_+-=[]{}|;:,.<>?';
      const media: Media = {
        id: 'media-special-summary',
        url: 'https://example.com/image.jpg',
        type: 'image',
        summary: specialSummary,
        userId: 'user-special',
        createdAt: new Date(),
      };

      expect(media.summary).toBe(specialSummary);
    });
  });

  describe('Media Data Consistency', () => {
    it('should maintain data integrity from DTO to entity', () => {
      const createDto: CreateMediaDto = {
        url: 'https://example.com/image.jpg',
        type: 'image',
        summary: 'Test image',
        userId: 'user-consistency',
      };

      const media: Media = {
        id: 'media-consistency',
        url: createDto.url,
        type: createDto.type,
        summary: createDto.summary,
        userId: createDto.userId,
        createdAt: new Date(),
      };

      expect(media.url).toBe(createDto.url);
      expect(media.type).toBe(createDto.type);
      expect(media.summary).toBe(createDto.summary);
      expect(media.userId).toBe(createDto.userId);
    });

    it('should handle summary updates correctly', () => {
      const originalMedia: Media = {
        id: 'media-update',
        url: 'https://example.com/image.jpg',
        type: 'image',
        summary: 'Original summary',
        userId: 'user-update',
        createdAt: new Date(),
      };

      const updateDto: UpdateMediaDto = {
        summary: 'Updated summary',
      };

      const updatedMedia: Media = {
        ...originalMedia,
        summary: updateDto.summary,
      };

      expect(updatedMedia.summary).toBe('Updated summary');
      expect(updatedMedia.url).toBe(originalMedia.url);
      expect(updatedMedia.type).toBe(originalMedia.type);
    });

    it('should handle removing summary', () => {
      const mediaWithSummary: Media = {
        id: 'media-with-summary',
        url: 'https://example.com/image.jpg',
        type: 'image',
        summary: 'Original summary',
        userId: 'user-remove',
        createdAt: new Date(),
      };

      const mediaWithoutSummary: Media = {
        ...mediaWithSummary,
        summary: undefined,
      };

      expect(mediaWithoutSummary.summary).toBeUndefined();
      expect(mediaWithSummary.summary).toBe('Original summary');
    });
  });

  describe('Media ID Patterns', () => {
    it('should handle different media ID formats', () => {
      const mediaIds = [
        'media-123',
        'file-456',
        'attachment-789',
        'MEDIA-ABC',
        'media.with.dots',
        'media_underscore',
      ];

      mediaIds.forEach((mediaId, index) => {
        const media: Media = {
          id: mediaId,
          url: `https://example.com/file${index}.jpg`,
          type: 'image',
          userId: `user-${index}`,
          createdAt: new Date(),
        };

        expect(media.id).toBe(mediaId);
      });
    });

    it('should handle UUID format media IDs', () => {
      const uuidMediaId = '550e8400-e29b-41d4-a716-446655440002';
      const media: Media = {
        id: uuidMediaId,
        url: 'https://example.com/file.jpg',
        type: 'image',
        userId: 'user-uuid',
        createdAt: new Date(),
      };

      expect(media.id).toBe(uuidMediaId);
    });
  });
});
