import { ResetConversationUseCase, ResetConversationDto, ResetConversationResult } from '../ResetConversationUseCase';
import { ValidationError } from '../../../domain/errors/BotError';
import { createMockUser, createMockConversation } from '../../../test/setup';

// Mock all dependencies
const mockUserRepository = {
  findByPhoneNumber: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
};

const mockConversationRepository = {
  findActiveByUserId: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  deleteByUserId: jest.fn(),
};

const mockAIService = {
  generateResponse: jest.fn(),
  analyzeMediaWithCaption: jest.fn(),
  generateWelcomeMessage: jest.fn(),
  generateResetMessage: jest.fn(),
  moderateContent: jest.fn(),
};

describe('ResetConversationUseCase', () => {
  let useCase: ResetConversationUseCase;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Create the use case with mocked dependencies
    useCase = new ResetConversationUseCase(
      mockUserRepository as any,
      mockConversationRepository as any,
      mockAIService as any
    );
  });

  describe('execute', () => {
    describe('Input Validation', () => {
      it('should return error result when phoneNumber is missing', async () => {
        const dto: ResetConversationDto = {
          phoneNumber: '',
        };

        const result = await useCase.execute(dto);

        expect(result.success).toBe(false);
        expect(result.message).toBe('❌ Gagal mereset percakapan. Silakan coba lagi.');
        expect(result.error).toBe('Phone number is required');
      });

      it('should return error result when phoneNumber is null', async () => {
        const dto: ResetConversationDto = {
          phoneNumber: null as any,
        };

        const result = await useCase.execute(dto);

        expect(result.success).toBe(false);
        expect(result.message).toBe('❌ Gagal mereset percakapan. Silakan coba lagi.');
        expect(result.error).toBe('Phone number is required');
      });

      it('should return error result when phoneNumber is undefined', async () => {
        const dto: ResetConversationDto = {
          phoneNumber: undefined as any,
        };

        const result = await useCase.execute(dto);

        expect(result.success).toBe(false);
        expect(result.message).toBe('❌ Gagal mereset percakapan. Silakan coba lagi.');
        expect(result.error).toBe('Phone number is required');
      });

      it('should accept valid phoneNumber', async () => {
        const dto: ResetConversationDto = {
          phoneNumber: '+6281234567890',
        };

        const mockUser = createMockUser({ phoneNumber: dto.phoneNumber });
        const mockResetMessage = '✅ Percakapan berhasil direset! Mulai percakapan baru.';

        mockUserRepository.findByPhoneNumber.mockResolvedValue(mockUser);
        mockConversationRepository.deleteByUserId.mockResolvedValue(undefined);
        mockAIService.generateResetMessage.mockResolvedValue(mockResetMessage);

        const result = await useCase.execute(dto);

        expect(result.success).toBe(true);
        expect(result.message).toBe(mockResetMessage);
      });
    });

    describe('User Lookup', () => {
      it('should return error when user not found', async () => {
        const dto: ResetConversationDto = {
          phoneNumber: '+6281234567890',
        };

        mockUserRepository.findByPhoneNumber.mockResolvedValue(null);

        const result = await useCase.execute(dto);

        expect(result.success).toBe(false);
        expect(result.message).toBe('❓ Anda tidak memiliki riwayat percakapan untuk direset.');
        expect(mockUserRepository.findByPhoneNumber).toHaveBeenCalledWith(dto.phoneNumber);
        expect(mockConversationRepository.deleteByUserId).not.toHaveBeenCalled();
        expect(mockAIService.generateResetMessage).not.toHaveBeenCalled();
      });

      it('should find user by phone number', async () => {
        const dto: ResetConversationDto = {
          phoneNumber: '+6281234567890',
        };

        const mockUser = createMockUser({ phoneNumber: dto.phoneNumber });
        const mockResetMessage = '✅ Percakapan berhasil direset!';

        mockUserRepository.findByPhoneNumber.mockResolvedValue(mockUser);
        mockConversationRepository.deleteByUserId.mockResolvedValue(undefined);
        mockAIService.generateResetMessage.mockResolvedValue(mockResetMessage);

        const result = await useCase.execute(dto);

        expect(mockUserRepository.findByPhoneNumber).toHaveBeenCalledWith(dto.phoneNumber);
        expect(result.success).toBe(true);
      });

      it('should handle different phone number formats', async () => {
        const phoneNumbers = [
          '+6281234567890',
          '6281234567890',
          '+62 812 345 6789',
          '081234567890'
        ];

        for (const phoneNumber of phoneNumbers) {
          const dto: ResetConversationDto = { phoneNumber };
          const mockUser = createMockUser({ phoneNumber });
          const mockResetMessage = '✅ Reset berhasil!';

          mockUserRepository.findByPhoneNumber.mockResolvedValue(mockUser);
          mockConversationRepository.deleteByUserId.mockResolvedValue(undefined);
          mockAIService.generateResetMessage.mockResolvedValue(mockResetMessage);

          const result = await useCase.execute(dto);

          expect(mockUserRepository.findByPhoneNumber).toHaveBeenCalledWith(phoneNumber);
          expect(result.success).toBe(true);
        }
      });
    });

    describe('Conversation Deletion', () => {
      it('should delete all conversations for user', async () => {
        const dto: ResetConversationDto = {
          phoneNumber: '+6281234567890',
        };

        const mockUser = createMockUser({ phoneNumber: dto.phoneNumber });
        const mockResetMessage = '✅ Percakapan berhasil direset!';

        mockUserRepository.findByPhoneNumber.mockResolvedValue(mockUser);
        mockConversationRepository.deleteByUserId.mockResolvedValue(undefined);
        mockAIService.generateResetMessage.mockResolvedValue(mockResetMessage);

        const result = await useCase.execute(dto);

        expect(mockConversationRepository.deleteByUserId).toHaveBeenCalledWith(mockUser.id);
        expect(result.success).toBe(true);
      });

      it('should handle deletion of multiple conversations', async () => {
        const dto: ResetConversationDto = {
          phoneNumber: '+6281234567890',
        };

        const mockUser = createMockUser({ phoneNumber: dto.phoneNumber });
        const mockResetMessage = '✅ Semua percakapan berhasil direset!';

        mockUserRepository.findByPhoneNumber.mockResolvedValue(mockUser);
        mockConversationRepository.deleteByUserId.mockResolvedValue(undefined);
        mockAIService.generateResetMessage.mockResolvedValue(mockResetMessage);

        const result = await useCase.execute(dto);

        expect(mockConversationRepository.deleteByUserId).toHaveBeenCalledWith(mockUser.id);
        expect(result.success).toBe(true);
      });
    });

    describe('Reset Message Generation', () => {
      it('should generate reset confirmation message', async () => {
        const dto: ResetConversationDto = {
          phoneNumber: '+6281234567890',
        };

        const mockUser = createMockUser({ phoneNumber: dto.phoneNumber });
        const mockResetMessage = '✅ Percakapan berhasil direset! Mulai percakapan baru.';

        mockUserRepository.findByPhoneNumber.mockResolvedValue(mockUser);
        mockConversationRepository.deleteByUserId.mockResolvedValue(undefined);
        mockAIService.generateResetMessage.mockResolvedValue(mockResetMessage);

        const result = await useCase.execute(dto);

        expect(mockAIService.generateResetMessage).toHaveBeenCalled();
        expect(result.message).toBe(mockResetMessage);
        expect(result.success).toBe(true);
      });

      it('should handle different reset message formats', async () => {
        const dto: ResetConversationDto = {
          phoneNumber: '+6281234567890',
        };

        const mockUser = createMockUser({ phoneNumber: dto.phoneNumber });
        const resetMessages = [
          '✅ Percakapan berhasil direset!',
          '🔄 Riwayat percakapan telah dibersihkan.',
          '✨ Mulai percakapan baru!'
        ];

        for (const resetMessage of resetMessages) {
          mockUserRepository.findByPhoneNumber.mockResolvedValue(mockUser);
          mockConversationRepository.deleteByUserId.mockResolvedValue(undefined);
          mockAIService.generateResetMessage.mockResolvedValue(resetMessage);

          const result = await useCase.execute(dto);

          expect(result.message).toBe(resetMessage);
          expect(result.success).toBe(true);
        }
      });
    });

    describe('Success Flow', () => {
      it('should complete full reset flow successfully', async () => {
        const dto: ResetConversationDto = {
          phoneNumber: '+6281234567890',
        };

        const mockUser = createMockUser({ 
          phoneNumber: dto.phoneNumber,
          name: 'John Doe'
        });
        const mockResetMessage = '✅ Percakapan berhasil direset! Mulai percakapan baru.';

        mockUserRepository.findByPhoneNumber.mockResolvedValue(mockUser);
        mockConversationRepository.deleteByUserId.mockResolvedValue(undefined);
        mockAIService.generateResetMessage.mockResolvedValue(mockResetMessage);

        const result = await useCase.execute(dto);

        // Verify all steps were called in correct order
        expect(mockUserRepository.findByPhoneNumber).toHaveBeenCalledWith(dto.phoneNumber);
        expect(mockConversationRepository.deleteByUserId).toHaveBeenCalledWith(mockUser.id);
        expect(mockAIService.generateResetMessage).toHaveBeenCalled();

        // Verify result
        expect(result.success).toBe(true);
        expect(result.message).toBe(mockResetMessage);
        expect(result.error).toBeUndefined();
      });

      it('should handle user with existing conversations', async () => {
        const dto: ResetConversationDto = {
          phoneNumber: '+6281234567890',
        };

        const mockUser = createMockUser({ 
          phoneNumber: dto.phoneNumber,
          name: 'Jane Doe'
        });
        const mockResetMessage = '✅ Riwayat percakapan berhasil dihapus!';

        mockUserRepository.findByPhoneNumber.mockResolvedValue(mockUser);
        mockConversationRepository.deleteByUserId.mockResolvedValue(undefined);
        mockAIService.generateResetMessage.mockResolvedValue(mockResetMessage);

        const result = await useCase.execute(dto);

        expect(result.success).toBe(true);
        expect(result.message).toBe(mockResetMessage);
      });
    });

    describe('Error Handling', () => {
      it('should handle database errors gracefully', async () => {
        const dto: ResetConversationDto = {
          phoneNumber: '+6281234567890',
        };

        const mockUser = createMockUser({ phoneNumber: dto.phoneNumber });
        const dbError = new Error('Database connection failed');

        mockUserRepository.findByPhoneNumber.mockResolvedValue(mockUser);
        mockConversationRepository.deleteByUserId.mockRejectedValue(dbError);

        const result = await useCase.execute(dto);

        expect(result.success).toBe(false);
        expect(result.message).toBe('❌ Gagal mereset percakapan. Silakan coba lagi.');
        expect(result.error).toBe('Database connection failed');
      });

      it('should handle AI service errors gracefully', async () => {
        const dto: ResetConversationDto = {
          phoneNumber: '+6281234567890',
        };

        const mockUser = createMockUser({ phoneNumber: dto.phoneNumber });
        const aiError = new Error('AI service unavailable');

        mockUserRepository.findByPhoneNumber.mockResolvedValue(mockUser);
        mockConversationRepository.deleteByUserId.mockResolvedValue(undefined);
        mockAIService.generateResetMessage.mockRejectedValue(aiError);

        const result = await useCase.execute(dto);

        expect(result.success).toBe(false);
        expect(result.message).toBe('❌ Gagal mereset percakapan. Silakan coba lagi.');
        expect(result.error).toBe('AI service unavailable');
      });

      it('should handle user repository errors gracefully', async () => {
        const dto: ResetConversationDto = {
          phoneNumber: '+6281234567890',
        };

        const userError = new Error('User lookup failed');

        mockUserRepository.findByPhoneNumber.mockRejectedValue(userError);

        const result = await useCase.execute(dto);

        expect(result.success).toBe(false);
        expect(result.message).toBe('❌ Gagal mereset percakapan. Silakan coba lagi.');
        expect(result.error).toBe('User lookup failed');
      });

      it('should handle unknown errors gracefully', async () => {
        const dto: ResetConversationDto = {
          phoneNumber: '+6281234567890',
        };

        const mockUser = createMockUser({ phoneNumber: dto.phoneNumber });

        mockUserRepository.findByPhoneNumber.mockResolvedValue(mockUser);
        mockConversationRepository.deleteByUserId.mockRejectedValue('Unknown error type');

        const result = await useCase.execute(dto);

        expect(result.success).toBe(false);
        expect(result.message).toBe('❌ Gagal mereset percakapan. Silakan coba lagi.');
        expect(result.error).toBe('Unknown error');
      });
    });

    describe('Edge Cases', () => {
      it('should handle user with no conversations gracefully', async () => {
        const dto: ResetConversationDto = {
          phoneNumber: '+6281234567890',
        };

        const mockUser = createMockUser({ phoneNumber: dto.phoneNumber });
        const mockResetMessage = '✅ Reset berhasil!';

        mockUserRepository.findByPhoneNumber.mockResolvedValue(mockUser);
        mockConversationRepository.deleteByUserId.mockResolvedValue(undefined);
        mockAIService.generateResetMessage.mockResolvedValue(mockResetMessage);

        const result = await useCase.execute(dto);

        expect(result.success).toBe(true);
        expect(result.message).toBe(mockResetMessage);
      });

      it('should handle very long phone numbers', async () => {
        const dto: ResetConversationDto = {
          phoneNumber: '+62812345678901234567890',
        };

        const mockUser = createMockUser({ phoneNumber: dto.phoneNumber });
        const mockResetMessage = '✅ Reset berhasil!';

        mockUserRepository.findByPhoneNumber.mockResolvedValue(mockUser);
        mockConversationRepository.deleteByUserId.mockResolvedValue(undefined);
        mockAIService.generateResetMessage.mockResolvedValue(mockResetMessage);

        const result = await useCase.execute(dto);

        expect(result.success).toBe(true);
        expect(mockUserRepository.findByPhoneNumber).toHaveBeenCalledWith(dto.phoneNumber);
      });

      it('should handle special characters in phone numbers', async () => {
        const dto: ResetConversationDto = {
          phoneNumber: '+62-812-345-6789',
        };

        const mockUser = createMockUser({ phoneNumber: dto.phoneNumber });
        const mockResetMessage = '✅ Reset berhasil!';

        mockUserRepository.findByPhoneNumber.mockResolvedValue(mockUser);
        mockConversationRepository.deleteByUserId.mockResolvedValue(undefined);
        mockAIService.generateResetMessage.mockResolvedValue(mockResetMessage);

        const result = await useCase.execute(dto);

        expect(result.success).toBe(true);
        expect(mockUserRepository.findByPhoneNumber).toHaveBeenCalledWith(dto.phoneNumber);
      });
    });
  });
});
