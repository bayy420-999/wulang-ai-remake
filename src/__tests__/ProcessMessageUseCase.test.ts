import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { ProcessMessageUseCase } from '../application/use-cases/ProcessMessageUseCase';
import { ProcessMessageDto } from '../application/dto/ProcessMessageDto';
import { MessageRole } from '../domain/entities/Message';
import { ValidationError, ProcessingError } from '../domain/errors/BotError';

// Mock repositories and services
const mockUserRepository = {
  findByPhoneNumber: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
} as any;

const mockConversationRepository = {
  findActiveByUserId: jest.fn(),
  create: jest.fn(),
} as any;

const mockMessageRepository = {
  findByConversationId: jest.fn(),
  create: jest.fn(),
} as any;

const mockMediaRepository = {
  create: jest.fn(),
  update: jest.fn(),
  findById: jest.fn(),
} as any;

const mockAIService = {
  generateResponse: jest.fn(),
  analyzeMediaWithCaption: jest.fn(),
  generateWelcomeMessage: jest.fn(),
  generateResetMessage: jest.fn(),
  moderateContent: jest.fn(),
} as any;

const mockMediaService = {
  processMedia: jest.fn(),
  validateFileSize: jest.fn(),
  getMediaType: jest.fn(),
  processPDF: jest.fn(),
  processImage: jest.fn(),
  saveTemporaryFile: jest.fn(),
  cleanupTemporaryFile: jest.fn(),
  cleanupOldTempFiles: jest.fn(),
} as any;

describe('ProcessMessageUseCase', () => {
  let useCase: ProcessMessageUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new ProcessMessageUseCase(
      mockUserRepository as any,
      mockConversationRepository as any,
      mockMessageRepository as any,
      mockMediaRepository as any,
      mockAIService as any,
      mockMediaService as any
    );
  });

  describe('execute()', () => {
    const baseDto: ProcessMessageDto = {
      phoneNumber: '6281234567890',
      message: 'Hello Wulang',
      userName: 'Test User',
      hasMedia: false,
      mediaType: undefined,
      mediaData: undefined,
    };

    describe('User Management', () => {
      it('should create new user when user does not exist', async () => {
        // Arrange
        mockUserRepository.findByPhoneNumber.mockResolvedValue(null);
        mockUserRepository.create.mockResolvedValue({
          id: 'user-1',
          phoneNumber: '6281234567890',
          name: 'Test User',
          createdAt: new Date(),
        });
        mockConversationRepository.findActiveByUserId.mockResolvedValue(null);
        mockConversationRepository.create.mockResolvedValue({
          id: 'conv-1',
          userId: 'user-1',
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        mockMessageRepository.findByConversationId.mockResolvedValue([]);
        mockAIService.generateResponse.mockResolvedValue('Hello! How can I help you?');

        // Act
        const result = await useCase.execute(baseDto);

        // Assert
        expect(mockUserRepository.create).toHaveBeenCalledWith({
          phoneNumber: '6281234567890',
          name: 'Test User',
        });
        expect(result.success).toBe(true);
        expect(result.response).toBe('Hello! How can I help you?');
      });

      it('should use existing user when user exists', async () => {
        // Arrange
        const existingUser = {
          id: 'user-1',
          phoneNumber: '6281234567890',
          name: 'Test User',
          createdAt: new Date(),
        };
        mockUserRepository.findByPhoneNumber.mockResolvedValue(existingUser);
        mockConversationRepository.findActiveByUserId.mockResolvedValue(null);
        mockConversationRepository.create.mockResolvedValue({
          id: 'conv-1',
          userId: 'user-1',
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        mockMessageRepository.findByConversationId.mockResolvedValue([]);
        mockAIService.generateResponse.mockResolvedValue('Hello! How can I help you?');

        // Act
        const result = await useCase.execute(baseDto);

        // Assert
        expect(mockUserRepository.create).not.toHaveBeenCalled();
        expect(result.success).toBe(true);
      });

      it('should update user name if provided and not set', async () => {
        // Arrange
        const existingUser = {
          id: 'user-1',
          phoneNumber: '6281234567890',
          name: null,
          createdAt: new Date(),
        };
        const updatedUser = { ...existingUser, name: 'Test User' };
        mockUserRepository.findByPhoneNumber.mockResolvedValue(existingUser);
        mockUserRepository.update.mockResolvedValue(updatedUser);
        mockConversationRepository.findActiveByUserId.mockResolvedValue(null);
        mockConversationRepository.create.mockResolvedValue({
          id: 'conv-1',
          userId: 'user-1',
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        mockMessageRepository.findByConversationId.mockResolvedValue([]);
        mockAIService.generateResponse.mockResolvedValue('Hello! How can I help you?');

        // Act
        const result = await useCase.execute(baseDto);

        // Assert
        expect(mockUserRepository.update).toHaveBeenCalledWith('user-1', { name: 'Test User' });
        expect(result.success).toBe(true);
      });
    });

    describe('Conversation Management', () => {
      it('should create new conversation when no active conversation exists', async () => {
        // Arrange
        mockUserRepository.findByPhoneNumber.mockResolvedValue({
          id: 'user-1',
          phoneNumber: '6281234567890',
          name: 'Test User',
          createdAt: new Date(),
        });
        mockConversationRepository.findActiveByUserId.mockResolvedValue(null);
        mockConversationRepository.create.mockResolvedValue({
          id: 'conv-1',
          userId: 'user-1',
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        mockMessageRepository.findByConversationId.mockResolvedValue([]);
        mockAIService.generateResponse.mockResolvedValue('Hello! How can I help you?');

        // Act
        const result = await useCase.execute(baseDto);

        // Assert
        expect(mockConversationRepository.create).toHaveBeenCalledWith({ userId: 'user-1' });
        expect(result.success).toBe(true);
      });

      it('should use existing conversation when active conversation exists', async () => {
        // Arrange
        const existingConversation = {
          id: 'conv-1',
          userId: 'user-1',
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        mockUserRepository.findByPhoneNumber.mockResolvedValue({
          id: 'user-1',
          phoneNumber: '6281234567890',
          name: 'Test User',
          createdAt: new Date(),
        });
        mockConversationRepository.findActiveByUserId.mockResolvedValue(existingConversation);
        mockMessageRepository.findByConversationId.mockResolvedValue([]);
        mockAIService.generateResponse.mockResolvedValue('Hello! How can I help you?');

        // Act
        const result = await useCase.execute(baseDto);

        // Assert
        expect(mockConversationRepository.create).not.toHaveBeenCalled();
        expect(result.success).toBe(true);
      });
    });

    describe('Media Processing', () => {
      const mediaDto: ProcessMessageDto = {
        ...baseDto,
        hasMedia: true,
        mediaType: 'application/pdf',
        mediaData: {
          buffer: Buffer.from('test pdf content'),
          filename: 'test.pdf',
          mimeType: 'application/pdf',
          caption: 'Analyze this PDF',
        },
      };

      it('should process media and generate AI analysis', async () => {
        // Arrange
        mockUserRepository.findByPhoneNumber.mockResolvedValue({
          id: 'user-1',
          phoneNumber: '6281234567890',
          name: 'Test User',
          createdAt: new Date(),
        });
        mockConversationRepository.findActiveByUserId.mockResolvedValue({
          id: 'conv-1',
          userId: 'user-1',
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        mockMessageRepository.findByConversationId.mockResolvedValue([]);
        mockMediaService.validateFileSize.mockReturnValue(true);
        mockMediaService.getMediaType.mockReturnValue('pdf');
        mockMediaService.processMedia.mockResolvedValue({
          type: 'pdf',
          content: 'Extracted PDF content',
          filename: 'test.pdf',
          metadata: { pages: 1 },
        });
        mockMediaRepository.create.mockResolvedValue({
          id: 'media-1',
          url: 'test.pdf',
          type: 'pdf',
          summary: null,
          userId: 'user-1',
          createdAt: new Date(),
        });
        mockAIService.analyzeMediaWithCaption.mockResolvedValue('PDF analysis result');

        // Act
        const result = await useCase.execute(mediaDto);

        // Assert
        expect(mockMediaService.processMedia).toHaveBeenCalled();
        expect(mockMediaRepository.create).toHaveBeenCalled();
        expect(mockAIService.analyzeMediaWithCaption).toHaveBeenCalled();
        expect(result.success).toBe(true);
        expect(result.mediaId).toBe('media-1');
      });

      it('should handle media processing errors gracefully', async () => {
        // Arrange
        mockUserRepository.findByPhoneNumber.mockResolvedValue({
          id: 'user-1',
          phoneNumber: '6281234567890',
          name: 'Test User',
          createdAt: new Date(),
        });
        mockConversationRepository.findActiveByUserId.mockResolvedValue({
          id: 'conv-1',
          userId: 'user-1',
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        mockMessageRepository.findByConversationId.mockResolvedValue([]);
        mockMediaService.validateFileSize.mockReturnValue(true);
        mockMediaService.getMediaType.mockReturnValue('pdf');
        mockMediaService.processMedia.mockRejectedValue(new ProcessingError('PDF processing failed'));

        // Act
        const result = await useCase.execute(mediaDto);

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toContain('PDF processing failed');
      });
    });

    describe('Context Building', () => {
      it('should build conversation context with messages', async () => {
        // Arrange
        const conversationHistory = [
          {
            id: 'msg-1',
            role: MessageRole.USER,
            content: 'Hello',
            conversationId: 'conv-1',
            createdAt: new Date(),
            mediaId: null,
          },
          {
            id: 'msg-2',
            role: MessageRole.ASSISTANT,
            content: 'Hi there!',
            conversationId: 'conv-1',
            createdAt: new Date(),
            mediaId: null,
          },
        ];

        mockUserRepository.findByPhoneNumber.mockResolvedValue({
          id: 'user-1',
          phoneNumber: '6281234567890',
          name: 'Test User',
          createdAt: new Date(),
        });
        mockConversationRepository.findActiveByUserId.mockResolvedValue({
          id: 'conv-1',
          userId: 'user-1',
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        mockMessageRepository.findByConversationId.mockResolvedValue(conversationHistory);
        mockAIService.generateResponse.mockResolvedValue('Hello! How can I help you?');

        // Act
        const result = await useCase.execute(baseDto);

        // Assert
        expect(mockMessageRepository.findByConversationId).toHaveBeenCalledWith('conv-1', 10);
        expect(mockAIService.generateResponse).toHaveBeenCalledWith(
          'Hello Wulang',
          expect.objectContaining({
            messages: expect.arrayContaining([
              expect.objectContaining({ role: MessageRole.USER, content: 'Hello' }),
              expect.objectContaining({ role: MessageRole.ASSISTANT, content: 'Hi there!' }),
            ]),
          })
        );
        expect(result.success).toBe(true);
      });

      it('should include media context when available', async () => {
        // Arrange
        const conversationHistory = [
          {
            id: 'msg-1',
            role: MessageRole.USER,
            content: 'Check this image',
            conversationId: 'conv-1',
            createdAt: new Date(),
            mediaId: 'media-1',
          },
        ];

        mockUserRepository.findByPhoneNumber.mockResolvedValue({
          id: 'user-1',
          phoneNumber: '6281234567890',
          name: 'Test User',
          createdAt: new Date(),
        });
        mockConversationRepository.findActiveByUserId.mockResolvedValue({
          id: 'conv-1',
          userId: 'user-1',
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        mockMessageRepository.findByConversationId.mockResolvedValue(conversationHistory);
        mockMediaRepository.findById.mockResolvedValue({
          id: 'media-1',
          url: 'image.jpg',
          type: 'image',
          summary: 'Image analysis result',
          userId: 'user-1',
          createdAt: new Date(),
        });
        mockAIService.generateResponse.mockResolvedValue('Hello! How can I help you?');

        // Act
        const result = await useCase.execute(baseDto);

        // Assert
        expect(mockMediaRepository.findById).toHaveBeenCalledWith('media-1');
        expect(result.success).toBe(true);
      });
    });

    describe('Error Handling', () => {
      it('should handle validation errors', async () => {
        // Arrange
        const invalidDto = { ...baseDto, phoneNumber: '', message: '' };

        // Act
        const result = await useCase.execute(invalidDto);

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toContain('Phone number and message are required');
      });

      it('should handle AI service errors', async () => {
        // Arrange
        mockUserRepository.findByPhoneNumber.mockResolvedValue({
          id: 'user-1',
          phoneNumber: '6281234567890',
          name: 'Test User',
          createdAt: new Date(),
        });
        mockConversationRepository.findActiveByUserId.mockResolvedValue({
          id: 'conv-1',
          userId: 'user-1',
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        mockMessageRepository.findByConversationId.mockResolvedValue([]);
        mockAIService.generateResponse.mockRejectedValue(new Error('AI service error'));

        // Act
        const result = await useCase.execute(baseDto);

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toContain('AI service error');
      });

      it('should handle database errors', async () => {
        // Arrange
        mockUserRepository.findByPhoneNumber.mockRejectedValue(new Error('Database connection failed'));

        // Act
        const result = await useCase.execute(baseDto);

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toContain('Database connection failed');
      });
    });

    describe('Response Generation', () => {
      it('should generate appropriate response for text-only messages', async () => {
        // Arrange
        mockUserRepository.findByPhoneNumber.mockResolvedValue({
          id: 'user-1',
          phoneNumber: '6281234567890',
          name: 'Test User',
          createdAt: new Date(),
        });
        mockConversationRepository.findActiveByUserId.mockResolvedValue({
          id: 'conv-1',
          userId: 'user-1',
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        mockMessageRepository.findByConversationId.mockResolvedValue([]);
        mockAIService.generateResponse.mockResolvedValue('Hello! How can I help you?');

        // Act
        const result = await useCase.execute(baseDto);

        // Assert
        expect(mockAIService.generateResponse).toHaveBeenCalledWith(
          'Hello Wulang',
          expect.objectContaining({
            userPhone: '6281234567890',
            userName: 'Test User',
          })
        );
        expect(result.success).toBe(true);
        expect(result.response).toBe('Hello! How can I help you?');
      });

      it('should generate media analysis response for media without caption', async () => {
        // Arrange
        const mediaDto: ProcessMessageDto = {
          ...baseDto,
          hasMedia: true,
          mediaType: 'application/pdf',
          mediaData: {
            buffer: Buffer.from('test pdf content'),
            filename: 'test.pdf',
            mimeType: 'application/pdf',
            caption: undefined,
          },
        };

        mockUserRepository.findByPhoneNumber.mockResolvedValue({
          id: 'user-1',
          phoneNumber: '6281234567890',
          name: 'Test User',
          createdAt: new Date(),
        });
        mockConversationRepository.findActiveByUserId.mockResolvedValue({
          id: 'conv-1',
          userId: 'user-1',
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        mockMessageRepository.findByConversationId.mockResolvedValue([]);
        mockMediaService.validateFileSize.mockReturnValue(true);
        mockMediaService.getMediaType.mockReturnValue('pdf');
        mockMediaService.processMedia.mockResolvedValue({
          type: 'pdf',
          content: 'Extracted PDF content',
          filename: 'test.pdf',
          metadata: { pages: 1 },
        });
        mockMediaRepository.create.mockResolvedValue({
          id: 'media-1',
          url: 'test.pdf',
          type: 'pdf',
          summary: null,
          userId: 'user-1',
          createdAt: new Date(),
        });
        mockAIService.analyzeMediaWithCaption.mockResolvedValue('PDF analysis result');

        // Act
        const result = await useCase.execute(mediaDto);

        // Assert
        expect(result.success).toBe(true);
        expect(result.response).toContain('PDF analysis result');
        expect(result.response).toContain('dokumen');
      });
    });
  });

  describe('processMedia()', () => {
    it('should validate file size before processing', async () => {
      // Arrange
      const mediaData = {
        buffer: Buffer.from('large file content'),
        filename: 'large.pdf',
        mimeType: 'application/pdf',
      };

      mockMediaService.validateFileSize.mockReturnValue(false);

      // Act & Assert
      await expect(useCase['processMedia'](mediaData)).rejects.toThrow('File size exceeds limit');
    });

    it('should reject unsupported media types', async () => {
      // Arrange
      const mediaData = {
        buffer: Buffer.from('file content'),
        filename: 'file.txt',
        mimeType: 'text/plain',
      };

      mockMediaService.validateFileSize.mockReturnValue(true);
      mockMediaService.getMediaType.mockReturnValue('unsupported');

      // Act & Assert
      await expect(useCase['processMedia'](mediaData)).rejects.toThrow('Unsupported media type');
    });

    it('should handle media processing errors', async () => {
      // Arrange
      const mediaData = {
        buffer: Buffer.from('file content'),
        filename: 'file.pdf',
        mimeType: 'application/pdf',
      };

      mockMediaService.validateFileSize.mockReturnValue(true);
      mockMediaService.getMediaType.mockReturnValue('pdf');
      mockMediaService.processMedia.mockRejectedValue(new Error('Processing failed'));

      // Act & Assert
      await expect(useCase['processMedia'](mediaData)).rejects.toThrow('Failed to process media');
    });
  });
});
