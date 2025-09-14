import { ProcessMessageUseCase } from '../ProcessMessageUseCase';
import { ProcessMessageDto, ProcessMessageResult } from '../../dto/ProcessMessageDto';
import { MessageRole } from '../../../domain/entities/Message';
import { ValidationError, ProcessingError } from '../../../domain/errors/BotError';
import { createMockUser, createMockMessage, createMockConversation, createMockMedia } from '../../../test/setup';

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
};

const mockMessageRepository = {
  create: jest.fn(),
  findByConversationId: jest.fn(),
  findById: jest.fn(),
};

const mockMediaRepository = {
  create: jest.fn(),
  update: jest.fn(),
  findById: jest.fn(),
};

const mockAIService = {
  generateResponse: jest.fn(),
  analyzeMediaWithCaption: jest.fn(),
  generateWelcomeMessage: jest.fn(),
  generateResetMessage: jest.fn(),
  moderateContent: jest.fn(),
};

const mockMediaService = {
  processMedia: jest.fn(),
  downloadMedia: jest.fn(),
  uploadMedia: jest.fn(),
  validateFileSize: jest.fn(),
  getMediaType: jest.fn(),
};

describe('ProcessMessageUseCase', () => {
  let useCase: ProcessMessageUseCase;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Create the use case with mocked dependencies
    useCase = new ProcessMessageUseCase(
      mockUserRepository as any,
      mockGroupRepository as any,
      mockConversationRepository as any,
      mockMessageRepository as any,
      mockMediaRepository as any,
      mockAIService as any,
      mockMediaService as any
    );
  });

  describe('execute', () => {
    describe('Input Validation', () => {
      it('should return error result when phoneNumber is missing', async () => {
        const dto: ProcessMessageDto = {
          phoneNumber: '',
          message: 'Hello',
          hasMedia: false,
        };

        const result = await useCase.execute(dto);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Phone number and message are required');
        expect(result.conversationId).toBe('');
        expect(result.response).toContain('Maaf, saya mengalami kesalahan');
      });

      it('should return error result when message is missing', async () => {
        const dto: ProcessMessageDto = {
          phoneNumber: '+6281234567890',
          message: '',
          hasMedia: false,
        };

        const result = await useCase.execute(dto);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Phone number and message are required');
        expect(result.conversationId).toBe('');
        expect(result.response).toContain('Maaf, saya mengalami kesalahan');
      });

      it('should return error result when both phoneNumber and message are missing', async () => {
        const dto: ProcessMessageDto = {
          phoneNumber: '',
          message: '',
          hasMedia: false,
        };

        const result = await useCase.execute(dto);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Phone number and message are required');
        expect(result.conversationId).toBe('');
        expect(result.response).toContain('Maaf, saya mengalami kesalahan');
      });

      it('should accept valid input with phoneNumber and message', async () => {
        const dto: ProcessMessageDto = {
          phoneNumber: '+6281234567890',
          message: 'Hello, how are you?',
          hasMedia: false,
        };

        // Mock successful execution
        const mockUser = createMockUser({ phoneNumber: dto.phoneNumber });
        const mockConversation = createMockConversation({ userId: mockUser.id });
        const mockResponse = 'I am doing well, thank you!';

        mockUserRepository.findByPhoneNumber.mockResolvedValue(mockUser);
        mockConversationRepository.findActiveByUserId.mockResolvedValue(mockConversation);
        mockMessageRepository.findByConversationId.mockResolvedValue([]);
        mockAIService.generateResponse.mockResolvedValue(mockResponse);
        mockMessageRepository.create.mockResolvedValue(createMockMessage());

        const result = await useCase.execute(dto);

        expect(result.success).toBe(true);
        expect(result.response).toBe(mockResponse);
        expect(result.conversationId).toBe(mockConversation.id);
      });
    });

    describe('User Management', () => {
      it('should use existing user when found', async () => {
        const dto: ProcessMessageDto = {
          phoneNumber: '+6281234567890',
          message: 'Hello',
          hasMedia: false,
        };

        const existingUser = createMockUser({ 
          phoneNumber: dto.phoneNumber,
          name: 'John Doe'
        });
        const mockConversation = createMockConversation({ userId: existingUser.id });
        const mockResponse = 'Hello John!';

        mockUserRepository.findByPhoneNumber.mockResolvedValue(existingUser);
        mockConversationRepository.findActiveByUserId.mockResolvedValue(mockConversation);
        mockMessageRepository.findByConversationId.mockResolvedValue([]);
        mockAIService.generateResponse.mockResolvedValue(mockResponse);
        mockMessageRepository.create.mockResolvedValue(createMockMessage());

        const result = await useCase.execute(dto);

        expect(mockUserRepository.findByPhoneNumber).toHaveBeenCalledWith(dto.phoneNumber);
        expect(mockUserRepository.create).not.toHaveBeenCalled();
        expect(result.success).toBe(true);
      });

      it('should create new user when not found', async () => {
        const dto: ProcessMessageDto = {
          phoneNumber: '+6281234567890',
          message: 'Hello',
          userName: 'Jane Doe',
          hasMedia: false,
        };

        const newUser = createMockUser({ 
          phoneNumber: dto.phoneNumber,
          name: dto.userName
        });
        const mockConversation = createMockConversation({ userId: newUser.id });
        const mockResponse = 'Hello Jane!';

        mockUserRepository.findByPhoneNumber.mockResolvedValue(null);
        mockUserRepository.create.mockResolvedValue(newUser);
        mockConversationRepository.findActiveByUserId.mockResolvedValue(mockConversation);
        mockMessageRepository.findByConversationId.mockResolvedValue([]);
        mockAIService.generateResponse.mockResolvedValue(mockResponse);
        mockMessageRepository.create.mockResolvedValue(createMockMessage());

        const result = await useCase.execute(dto);

        expect(mockUserRepository.create).toHaveBeenCalledWith({
          phoneNumber: dto.phoneNumber,
          name: dto.userName
        });
        expect(result.success).toBe(true);
      });

      it('should update user name when provided and user has no name', async () => {
        const dto: ProcessMessageDto = {
          phoneNumber: '+6281234567890',
          message: 'Hello',
          userName: 'Updated Name',
          hasMedia: false,
        };

        const existingUser = createMockUser({ 
          phoneNumber: dto.phoneNumber,
          name: undefined // No name set
        });
        const updatedUser = createMockUser({ 
          phoneNumber: dto.phoneNumber,
          name: dto.userName
        });
        const mockConversation = createMockConversation({ userId: updatedUser.id });
        const mockResponse = 'Hello Updated Name!';

        mockUserRepository.findByPhoneNumber.mockResolvedValue(existingUser);
        mockUserRepository.update.mockResolvedValue(updatedUser);
        mockConversationRepository.findActiveByUserId.mockResolvedValue(mockConversation);
        mockMessageRepository.findByConversationId.mockResolvedValue([]);
        mockAIService.generateResponse.mockResolvedValue(mockResponse);
        mockMessageRepository.create.mockResolvedValue(createMockMessage());

        const result = await useCase.execute(dto);

        expect(mockUserRepository.update).toHaveBeenCalledWith(existingUser.id, {
          name: dto.userName
        });
        expect(result.success).toBe(true);
      });

      it('should not update user name when user already has a name', async () => {
        const dto: ProcessMessageDto = {
          phoneNumber: '+6281234567890',
          message: 'Hello',
          userName: 'New Name',
          hasMedia: false,
        };

        const existingUser = createMockUser({ 
          phoneNumber: dto.phoneNumber,
          name: 'Existing Name'
        });
        const mockConversation = createMockConversation({ userId: existingUser.id });
        const mockResponse = 'Hello Existing Name!';

        mockUserRepository.findByPhoneNumber.mockResolvedValue(existingUser);
        mockConversationRepository.findActiveByUserId.mockResolvedValue(mockConversation);
        mockMessageRepository.findByConversationId.mockResolvedValue([]);
        mockAIService.generateResponse.mockResolvedValue(mockResponse);
        mockMessageRepository.create.mockResolvedValue(createMockMessage());

        const result = await useCase.execute(dto);

        expect(mockUserRepository.update).not.toHaveBeenCalled();
        expect(result.success).toBe(true);
      });
    });

    describe('Conversation Management', () => {
      it('should use existing active conversation when found', async () => {
        const dto: ProcessMessageDto = {
          phoneNumber: '+6281234567890',
          message: 'Hello',
          hasMedia: false,
        };

        const mockUser = createMockUser({ phoneNumber: dto.phoneNumber });
        const existingConversation = createMockConversation({ userId: mockUser.id });
        const mockResponse = 'Hello!';

        mockUserRepository.findByPhoneNumber.mockResolvedValue(mockUser);
        mockConversationRepository.findActiveByUserId.mockResolvedValue(existingConversation);
        mockMessageRepository.findByConversationId.mockResolvedValue([]);
        mockAIService.generateResponse.mockResolvedValue(mockResponse);
        mockMessageRepository.create.mockResolvedValue(createMockMessage());

        const result = await useCase.execute(dto);

        expect(mockConversationRepository.findActiveByUserId).toHaveBeenCalledWith(mockUser.id);
        expect(mockConversationRepository.create).not.toHaveBeenCalled();
        expect(result.conversationId).toBe(existingConversation.id);
      });

      it('should create new conversation when no active conversation found', async () => {
        const dto: ProcessMessageDto = {
          phoneNumber: '+6281234567890',
          message: 'Hello',
          hasMedia: false,
        };

        const mockUser = createMockUser({ phoneNumber: dto.phoneNumber });
        const newConversation = createMockConversation({ userId: mockUser.id });
        const mockResponse = 'Hello!';

        mockUserRepository.findByPhoneNumber.mockResolvedValue(mockUser);
        mockConversationRepository.findActiveByUserId.mockResolvedValue(null);
        mockConversationRepository.create.mockResolvedValue(newConversation);
        mockMessageRepository.findByConversationId.mockResolvedValue([]);
        mockAIService.generateResponse.mockResolvedValue(mockResponse);
        mockMessageRepository.create.mockResolvedValue(createMockMessage());

        const result = await useCase.execute(dto);

        expect(mockConversationRepository.create).toHaveBeenCalledWith({
          userId: mockUser.id
        });
        expect(result.conversationId).toBe(newConversation.id);
      });
    });

    describe('Text Message Processing', () => {
      it('should process text message and generate AI response', async () => {
        const dto: ProcessMessageDto = {
          phoneNumber: '+6281234567890',
          message: 'What is machine learning?',
          hasMedia: false,
        };

        const mockUser = createMockUser({ phoneNumber: dto.phoneNumber });
        const mockConversation = createMockConversation({ userId: mockUser.id });
        const mockResponse = 'Machine learning is a subset of artificial intelligence...';
        const mockMessages = [
          createMockMessage({ 
            role: MessageRole.USER, 
            content: 'Hello',
            conversationId: mockConversation.id 
          }),
          createMockMessage({ 
            role: MessageRole.ASSISTANT, 
            content: 'Hi there!',
            conversationId: mockConversation.id 
          }),
        ];

        mockUserRepository.findByPhoneNumber.mockResolvedValue(mockUser);
        mockConversationRepository.findActiveByUserId.mockResolvedValue(mockConversation);
        mockMessageRepository.findByConversationId.mockResolvedValue(mockMessages);
        mockAIService.generateResponse.mockResolvedValue(mockResponse);
        mockMessageRepository.create.mockResolvedValue(createMockMessage());

        const result = await useCase.execute(dto);

        expect(mockAIService.generateResponse).toHaveBeenCalledWith(
          dto.message,
          expect.objectContaining({
            messages: expect.arrayContaining([
              expect.objectContaining({ role: 'USER', content: 'Hello' }),
              expect.objectContaining({ role: 'ASSISTANT', content: 'Hi there!' }),
            ]),
            userPhone: dto.phoneNumber,
            userName: undefined
          })
        );
        expect(result.success).toBe(true);
        expect(result.response).toBe(mockResponse);
      });

      it('should store user message and AI response', async () => {
        const dto: ProcessMessageDto = {
          phoneNumber: '+6281234567890',
          message: 'Hello',
          hasMedia: false,
        };

        const mockUser = createMockUser({ phoneNumber: dto.phoneNumber });
        const mockConversation = createMockConversation({ userId: mockUser.id });
        const mockResponse = 'Hello! How can I help you?';

        mockUserRepository.findByPhoneNumber.mockResolvedValue(mockUser);
        mockConversationRepository.findActiveByUserId.mockResolvedValue(mockConversation);
        mockMessageRepository.findByConversationId.mockResolvedValue([]);
        mockAIService.generateResponse.mockResolvedValue(mockResponse);
        mockMessageRepository.create.mockResolvedValue(createMockMessage());

        const result = await useCase.execute(dto);

        // Verify user message was stored
        expect(mockMessageRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({
            role: MessageRole.USER,
            content: dto.message,
            conversationId: mockConversation.id,
            mediaId: undefined
          })
        );

        // Verify AI response was stored
        expect(mockMessageRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({
            role: MessageRole.ASSISTANT,
            content: mockResponse,
            conversationId: mockConversation.id
          })
        );

        expect(result.success).toBe(true);
      });
    });

    describe('Media Processing', () => {
      it('should process media with caption and return analysis', async () => {
        const dto: ProcessMessageDto = {
          phoneNumber: '+6281234567890',
          message: 'Analyze this document',
          hasMedia: true,
          mediaType: 'application/pdf',
          mediaData: {
            buffer: Buffer.from('fake pdf content'),
            filename: 'document.pdf',
            mimeType: 'application/pdf',
            caption: 'What is this document about?'
          }
        };

        const mockUser = createMockUser({ phoneNumber: dto.phoneNumber });
        const mockConversation = createMockConversation({ userId: mockUser.id });
        const mockMedia = createMockMedia({ userId: mockUser.id });
        const mockAnalysis = 'This document appears to be a research paper about...';

        mockUserRepository.findByPhoneNumber.mockResolvedValue(mockUser);
        mockConversationRepository.findActiveByUserId.mockResolvedValue(mockConversation);
        mockMessageRepository.findByConversationId.mockResolvedValue([]);
        mockMediaService.validateFileSize.mockReturnValue(true);
        mockMediaService.getMediaType.mockReturnValue('pdf');
        mockMediaService.processMedia.mockResolvedValue({
          filename: 'processed_document.pdf',
          type: 'pdf',
          content: 'processed content'
        });
        mockMediaRepository.create.mockResolvedValue(mockMedia);
        mockAIService.analyzeMediaWithCaption.mockResolvedValue(mockAnalysis);
        mockMessageRepository.create.mockResolvedValue(createMockMessage());

        const result = await useCase.execute(dto);

        expect(mockMediaService.processMedia).toHaveBeenCalled();
        expect(mockMediaRepository.create).toHaveBeenCalledWith({
          url: 'processed_document.pdf',
          type: 'pdf',
          summary: undefined,
          userId: mockUser.id
        });
        expect(mockAIService.analyzeMediaWithCaption).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'pdf',
            data: dto.mediaData!.buffer
          }),
          dto.mediaData!.caption
        );
        expect(result.success).toBe(true);
        expect(result.response).toBe(mockAnalysis);
        expect(result.mediaId).toBe(mockMedia.id);
      });

      it('should process media without caption using default analysis', async () => {
        const dto: ProcessMessageDto = {
          phoneNumber: '+6281234567890',
          message: 'Analyze this image',
          hasMedia: true,
          mediaType: 'image/jpeg',
          mediaData: {
            buffer: Buffer.from('fake image content'),
            filename: 'image.jpg',
            mimeType: 'image/jpeg'
          }
        };

        const mockUser = createMockUser({ phoneNumber: dto.phoneNumber });
        const mockConversation = createMockConversation({ userId: mockUser.id });
        const mockMedia = createMockMedia({ userId: mockUser.id });
        const mockAnalysis = 'This image shows a beautiful landscape...';

        mockUserRepository.findByPhoneNumber.mockResolvedValue(mockUser);
        mockConversationRepository.findActiveByUserId.mockResolvedValue(mockConversation);
        mockMessageRepository.findByConversationId.mockResolvedValue([]);
        mockMediaService.validateFileSize.mockReturnValue(true);
        mockMediaService.getMediaType.mockReturnValue('image');
        mockMediaService.processMedia.mockResolvedValue({
          filename: 'processed_image.jpg',
          type: 'image',
          content: 'processed content'
        });
        mockMediaRepository.create.mockResolvedValue(mockMedia);
        mockAIService.analyzeMediaWithCaption.mockResolvedValue(mockAnalysis);
        mockMessageRepository.create.mockResolvedValue(createMockMessage());

        const result = await useCase.execute(dto);

        expect(mockMediaService.processMedia).toHaveBeenCalled();
        expect(mockAIService.analyzeMediaWithCaption).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'image',
            content: 'processed content',
            filename: 'processed_image.jpg',
            mimeType: 'image/jpeg',
            data: dto.mediaData!.buffer
          }),
          expect.stringContaining('Silakan berikan analisis komprehensif')
        );
        expect(result.success).toBe(true);
        expect(result.response).toContain('Analisis Lengkap GAMBAR');
        expect(result.mediaId).toBe(mockMedia.id);
      });
    });

    describe('Error Handling', () => {
      it('should handle AI service errors gracefully', async () => {
        const dto: ProcessMessageDto = {
          phoneNumber: '+6281234567890',
          message: 'Hello',
          hasMedia: false,
        };

        const mockUser = createMockUser({ phoneNumber: dto.phoneNumber });
        const mockConversation = createMockConversation({ userId: mockUser.id });

        mockUserRepository.findByPhoneNumber.mockResolvedValue(mockUser);
        mockConversationRepository.findActiveByUserId.mockResolvedValue(mockConversation);
        mockMessageRepository.findByConversationId.mockResolvedValue([]);
        mockAIService.generateResponse.mockRejectedValue(new Error('AI service unavailable'));
        mockMessageRepository.create.mockResolvedValue(createMockMessage());

        const result = await useCase.execute(dto);

        expect(result.success).toBe(false);
        expect(result.error).toBe('AI service unavailable');
        expect(result.response).toContain('Maaf, saya mengalami kesalahan');
      });

      it('should handle media processing errors gracefully', async () => {
        const dto: ProcessMessageDto = {
          phoneNumber: '+6281234567890',
          message: 'Analyze this',
          hasMedia: true,
          mediaType: 'application/pdf',
          mediaData: {
            buffer: Buffer.from('fake content'),
            filename: 'document.pdf',
            mimeType: 'application/pdf'
          }
        };

        const mockUser = createMockUser({ phoneNumber: dto.phoneNumber });
        const mockConversation = createMockConversation({ userId: mockUser.id });

        mockUserRepository.findByPhoneNumber.mockResolvedValue(mockUser);
        mockConversationRepository.findActiveByUserId.mockResolvedValue(mockConversation);
        mockMessageRepository.findByConversationId.mockResolvedValue([]);
        mockMediaService.validateFileSize.mockReturnValue(true);
        mockMediaService.getMediaType.mockReturnValue('pdf');
        mockMediaService.processMedia.mockRejectedValue(new Error('Media processing failed'));
        mockMessageRepository.create.mockResolvedValue(createMockMessage());

        const result = await useCase.execute(dto);

        expect(result.success).toBe(false);
        expect(result.error).toContain('Failed to process media');
        expect(result.response).toContain('Maaf, saya mengalami kesalahan');
      });

      it('should handle database errors gracefully', async () => {
        const dto: ProcessMessageDto = {
          phoneNumber: '+6281234567890',
          message: 'Hello',
          hasMedia: false,
        };

        mockUserRepository.findByPhoneNumber.mockRejectedValue(new Error('Database connection failed'));

        const result = await useCase.execute(dto);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Database connection failed');
        expect(result.response).toContain('Maaf, saya mengalami kesalahan');
      });
    });
  });
});
