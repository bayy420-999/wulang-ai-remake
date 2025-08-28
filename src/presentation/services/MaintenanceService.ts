import { IConversationRepository } from '../../domain/interfaces/repositories/IConversationRepository';
import { IMediaService } from '../../domain/interfaces/services/IMediaService';
import { logInfo, logError } from '../../lib/logger';

export class MaintenanceService {
  private maintenanceInterval?: NodeJS.Timeout;

  constructor(
    private conversationRepository: IConversationRepository,
    private mediaService: IMediaService
  ) {}

  startScheduledMaintenance(): void {
    // Run maintenance every 24 hours
    this.maintenanceInterval = setInterval(async () => {
      try {
        logInfo('🔧 Running scheduled maintenance...', 'MaintenanceService');
        await this.performMaintenance();
      } catch (error) {
        logError('Error during scheduled maintenance', error as Error, 'MaintenanceService');
      }
    }, 24 * 60 * 60 * 1000); // 24 hours

    logInfo('⏰ Scheduled maintenance tasks every 24 hours', 'MaintenanceService');
  }

  async runManualMaintenance(): Promise<void> {
    try {
      logInfo('🔧 Running manual maintenance...', 'MaintenanceService');
      await this.performMaintenance();
      logInfo('✅ Manual maintenance completed', 'MaintenanceService');
    } catch (error) {
      logError('Error during manual maintenance', error as Error, 'MaintenanceService');
      throw error;
    }
  }

  private async performMaintenance(): Promise<void> {
    try {
      logInfo('Starting maintenance tasks...', 'MaintenanceService');

      // Clean up old conversations (older than 90 days)
      const deletedConversations = await this.conversationRepository.cleanupOldConversations(90);
      logInfo(`Cleaned up ${deletedConversations} old conversations`, 'MaintenanceService');

      // Clean up old temporary files
      await this.mediaService.cleanupOldTempFiles(24);
      logInfo('Cleaned up old temporary files', 'MaintenanceService');

      logInfo('Maintenance tasks completed', 'MaintenanceService');
    } catch (error) {
      logError('Error during maintenance', error as Error, 'MaintenanceService');
    }
  }

  stopScheduledMaintenance(): void {
    if (this.maintenanceInterval) {
      clearInterval(this.maintenanceInterval);
      this.maintenanceInterval = undefined;
      logInfo('Stopped scheduled maintenance', 'MaintenanceService');
    }
  }
}
