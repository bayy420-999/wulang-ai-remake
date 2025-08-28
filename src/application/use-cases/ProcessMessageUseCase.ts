import { IUserRepository } from '../../domain/interfaces/repositories/IUserRepository';
import { IConversationRepository } from '../../domain/interfaces/repositories/IConversationRepository';
import { IMessageRepository } from '../../domain/interfaces/repositories/IMessageRepository';
import { IMediaRepository } from '../../domain/interfaces/repositories/IMediaRepository';
import { IAIService } from '../../domain/interfaces/services/IAIService';
import { IMediaService } from '../../domain/interfaces/services/IMediaService';
import { ProcessMessageDto, ProcessMessageResult, ConversationContextDto } from '../dto/ProcessMessageDto';
import { MessageRole } from '../../domain/entities/Message';
import { ProcessingError, ValidationError } from '../../domain/errors/BotError';
import { env } from '../../config/env';
import { logError, logInfo, logDebug } from '../../lib/logger';

export class ProcessMessageUseCase {
  constructor(
    private userRepository: IUserRepository,
    private conversationRepository: IConversationRepository,
    private messageRepository: IMessageRepository,
    private mediaRepository: IMediaRepository,
    private aiService: IAIService,
    private mediaService: IMediaService
  ) {}

  async execute(dto: ProcessMessageDto): Promise<ProcessMessageResult> {
    try {
      // Validate input
      if (!dto.phoneNumber || !dto.message) {
        throw new ValidationError('Phone number and message are required');
      }

      // Get or create user
      let user = await this.userRepository.findByPhoneNumber(dto.phoneNumber);
      if (!user) {
        // Create new user if not found
        user = await this.userRepository.create({ 
          phoneNumber: dto.phoneNumber, 
          name: dto.userName 
        });
        logInfo(`👤 Created new user: ${user.name || 'Unknown'} (${dto.phoneNumber})`, 'ProcessMessageUseCase');
      } else {
        // Update user name if provided and not set
        if (dto.userName && !user.name) {
          user = await this.userRepository.update(user.id, { name: dto.userName });
          logInfo(`👤 Updated user name: ${user.name} (${dto.phoneNumber})`, 'ProcessMessageUseCase');
        } else {
          logInfo(`👤 Using existing user: ${user.name || 'Unknown'} (${dto.phoneNumber})`, 'ProcessMessageUseCase');
        }
      }

      // Get or create active conversation
      let conversation = await this.conversationRepository.findActiveByUserId(user.id);
      if (!conversation) {
        conversation = await this.conversationRepository.create({ userId: user.id });
        logInfo(`💬 Created new conversation ${conversation.id} for user ${user.id}`, 'ProcessMessageUseCase');
      } else {
        logInfo(`💬 Using existing conversation ${conversation.id} for user ${user.id}`, 'ProcessMessageUseCase');
      }

      // Process media if present
      let mediaId: string | undefined;
      let mediaAnalysis: string | null = null;

      if (dto.hasMedia && dto.mediaData) {
        const processedMedia = await this.processMedia(dto.mediaData);
        if (processedMedia) {
          // Save media to database
          const media = await this.mediaRepository.create({
            url: processedMedia.filename,
            type: processedMedia.type,
            summary: undefined, // Will be updated after analysis
            userId: user.id
          });
          mediaId = media.id;

          // Analyze media with AI
          if (dto.mediaData.caption) {
            mediaAnalysis = await this.aiService.analyzeMediaWithCaption(
              {
                type: processedMedia.type,
                content: processedMedia.content,
                filename: processedMedia.filename,
                mimeType: dto.mediaData.mimeType,
                data: dto.mediaData.buffer.toString('base64')
              },
              dto.mediaData.caption
            );
          } else {
            mediaAnalysis = await this.aiService.analyzeMedia({
              type: processedMedia.type,
              content: processedMedia.content,
              filename: processedMedia.filename,
              mimeType: dto.mediaData.mimeType,
              data: dto.mediaData.buffer.toString('base64')
            });
          }

          // Update media with analysis
          await this.mediaRepository.update(mediaId, { summary: mediaAnalysis });
        }
      }

      // Store user message
      await this.messageRepository.create({
        role: MessageRole.USER,
        content: dto.message || undefined,
        conversationId: conversation.id,
        mediaId: mediaId || undefined
      });

      // Get conversation history using environment variable for consistency
      const conversationHistory = await this.messageRepository.findByConversationId(
        conversation.id, 
        env.MAX_CONTEXT_MESSAGES
      );
      
      logInfo(`📋 Retrieved ${conversationHistory.length} messages for context building`, 'ProcessMessageUseCase');
      
      // Build conversation context with media information
      const contextMessages = await Promise.all(
        conversationHistory.map(async (msg) => {
          let mediaInfo: { id: string; url: string; type: string; summary: string | null } | null = null;
          
          // If message has mediaId, fetch the media information with error handling
          if (msg.mediaId) {
            try {
              const media = await this.mediaRepository.findById(msg.mediaId);
              if (media) {
                mediaInfo = {
                  id: media.id,
                  url: media.url,
                  type: media.type,
                  summary: media.summary || null
                };
                logDebug(`📎 Fetched media context for message ${msg.id}: ${media.type}`, 'ProcessMessageUseCase');
              }
            } catch (error) {
              logError(`Failed to fetch media context for message ${msg.id}`, error as Error, 'ProcessMessageUseCase');
            }
          }
          
          return {
            role: msg.role,
            content: msg.content || null,
            createdAt: msg.createdAt,
            media: mediaInfo
          };
        })
      );
      
      logInfo(`📝 Built context with ${contextMessages.length} messages`, 'ProcessMessageUseCase');
      
      const context: ConversationContextDto = {
        messages: contextMessages,
        userPhone: dto.phoneNumber,
        userName: dto.userName
      };

      let aiResponse: string;
      if (dto.hasMedia && mediaAnalysis) {
        if (dto.mediaData?.caption) {
          // Media + Caption: Use the analysis as response
          aiResponse = mediaAnalysis;
        } else {
          // Media only: Provide comprehensive summary and ask what they want to do
          const mediaType = dto.mediaType?.includes('image') ? 'gambar' : 'dokumen';
          aiResponse = `📎 **Analisis Lengkap ${mediaType.toUpperCase()}**\n\n${mediaAnalysis}\n\n---\n\nApa yang ingin Anda ketahui lebih lanjut tentang ${mediaType} ini? Silakan tanyakan apa saja yang ingin Anda analisis atau ketahui lebih detail.`;
        }
      } else {
        // Text only: Generate normal response
        aiResponse = await this.aiService.generateResponse(dto.message, context);
      }

      // Store AI response
      await this.messageRepository.create({
        role: MessageRole.ASSISTANT,
        content: aiResponse,
        conversationId: conversation.id
      });

      return {
        success: true,
        response: aiResponse,
        conversationId: conversation.id,
        mediaId: mediaId || undefined
      };

    } catch (error) {
      return {
        success: false,
        response: '❌ Maaf, saya mengalami kesalahan saat memproses pesan Anda. Silakan coba lagi nanti.',
        conversationId: '',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async processMedia(mediaData: {
    buffer: Buffer;
    filename: string;
    mimeType: string;
  }) {
    try {
      if (!this.mediaService.validateFileSize(mediaData.buffer)) {
        throw new ValidationError('File size exceeds limit');
      }

      const mediaType = this.mediaService.getMediaType(mediaData.mimeType);
      if (mediaType === 'unsupported') {
        throw new ValidationError(`Unsupported media type: ${mediaData.mimeType}`);
      }

      return await this.mediaService.processMedia(mediaData.buffer, mediaData.filename, mediaData.mimeType);
    } catch (error) {
      throw new ProcessingError(`Failed to process media: ${error}`);
    }
  }
}
