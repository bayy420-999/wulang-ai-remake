import { container } from './container';
import { prisma } from '../../lib/db';

// Repositories
import { PrismaUserRepository } from '../../infrastructure/database/repositories/PrismaUserRepository';
import { PrismaConversationRepository } from '../../infrastructure/database/repositories/PrismaConversationRepository';
import { PrismaMessageRepository } from '../../infrastructure/database/repositories/PrismaMessageRepository';
import { PrismaMediaRepository } from '../../infrastructure/database/repositories/PrismaMediaRepository';

// Services
import { OpenAIService } from '../../infrastructure/external/openai/OpenAIService';
import { MediaProcessingService } from '../../infrastructure/external/media/MediaProcessingService';
import { MemoryCacheService } from '../../infrastructure/cache/MemoryCacheService';

// Use Cases
import { ProcessMessageUseCase } from '../../application/use-cases/ProcessMessageUseCase';
import { ResetConversationUseCase } from '../../application/use-cases/ResetConversationUseCase';

// Application Services
import { ConversationManager } from '../../application/services/ConversationManager';

// Presentation
import { MessageHandler } from '../../presentation/handlers/MessageHandler';
import { MaintenanceService } from '../../presentation/services/MaintenanceService';
import { WhatsAppBot } from '../../presentation/WhatsAppBot';

export function setupDependencyInjection(): void {
  // Register repositories
  container.register('IUserRepository', new PrismaUserRepository(prisma));
  container.register('IConversationRepository', new PrismaConversationRepository(prisma));
  container.register('IMessageRepository', new PrismaMessageRepository(prisma));
  container.register('IMediaRepository', new PrismaMediaRepository(prisma));

  // Register services
  container.register('IAIService', new OpenAIService());
  container.register('IMediaService', new MediaProcessingService());
  container.register('ICacheService', new MemoryCacheService());

  // Register use cases
  container.register('ProcessMessageUseCase', new ProcessMessageUseCase(
    container.get('IUserRepository'),
    container.get('IConversationRepository'),
    container.get('IMessageRepository'),
    container.get('IMediaRepository'),
    container.get('IAIService'),
    container.get('IMediaService')
  ));

  container.register('ResetConversationUseCase', new ResetConversationUseCase(
    container.get('IUserRepository'),
    container.get('IConversationRepository'),
    container.get('IAIService')
  ));

  // Register application services
  container.register('ConversationManager', new ConversationManager(
    container.get('IUserRepository'),
    container.get('IConversationRepository'),
    container.get('IMessageRepository'),
    container.get('IAIService')
  ));

  // Register presentation components
  container.register('MessageHandler', new MessageHandler(
    container.get('ProcessMessageUseCase'),
    container.get('ResetConversationUseCase'),
    container.get('ConversationManager')
  ));

  container.register('MaintenanceService', new MaintenanceService(
    container.get('IConversationRepository'),
    container.get('IMediaService')
  ));

  // Register main bot
  container.register('WhatsAppBot', new WhatsAppBot(
    container.get('MessageHandler'),
    container.get('MaintenanceService')
  ));
}
