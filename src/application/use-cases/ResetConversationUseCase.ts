import { IUserRepository } from '../../domain/interfaces/repositories/IUserRepository';
import { IConversationRepository } from '../../domain/interfaces/repositories/IConversationRepository';
import { IAIService } from '../../domain/interfaces/services/IAIService';
import { ProcessingError, ValidationError } from '../../domain/errors/BotError';

export interface ResetConversationDto {
  phoneNumber: string;
}

export interface ResetConversationResult {
  success: boolean;
  message: string;
  error?: string;
}

export class ResetConversationUseCase {
  constructor(
    private userRepository: IUserRepository,
    private conversationRepository: IConversationRepository,
    private aiService: IAIService
  ) {}

  async execute(dto: ResetConversationDto): Promise<ResetConversationResult> {
    try {
      // Validate input
      if (!dto.phoneNumber) {
        throw new ValidationError('Phone number is required');
      }

      // Find user
      const user = await this.userRepository.findByPhoneNumber(dto.phoneNumber);
      if (!user) {
        return {
          success: false,
          message: '❓ Anda tidak memiliki riwayat percakapan untuk direset.'
        };
      }

      // Reset conversation by deleting all conversations for the user
      await this.conversationRepository.deleteByUserId(user.id);

      // Generate reset confirmation message
      const resetMessage = await this.aiService.generateResetMessage();

      return {
        success: true,
        message: resetMessage
      };

    } catch (error) {
      return {
        success: false,
        message: '❌ Gagal mereset percakapan. Silakan coba lagi.',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}
