import { MaintenanceService } from '../MaintenanceService';
import { IConversationRepository } from '../../../domain/interfaces/repositories/IConversationRepository';
import { IMediaService } from '../../../domain/interfaces/services/IMediaService';
import { logInfo, logError } from '../../../lib/logger';

// Mock logger
jest.mock('../../../lib/logger', () => ({
  logInfo: jest.fn(),
  logError: jest.fn(),
}));

describe('MaintenanceService', () => {
  let maintenanceService: MaintenanceService;
  let mockConversationRepository: jest.Mocked<IConversationRepository>;
  let mockMediaService: jest.Mocked<IMediaService>;
  let logInfo: jest.MockedFunction<typeof import('../../../lib/logger').logInfo>;
  let logError: jest.MockedFunction<typeof import('../../../lib/logger').logError>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    mockConversationRepository = {
      cleanupOldConversations: jest.fn(),
    } as any;

    mockMediaService = {
      cleanupOldTempFiles: jest.fn(),
    } as any;

    maintenanceService = new MaintenanceService(mockConversationRepository, mockMediaService);

    // Get the mocked functions
    logInfo = require('../../../lib/logger').logInfo;
    logError = require('../../../lib/logger').logError;
  });

  afterEach(() => {
    jest.useRealTimers();
    maintenanceService.stopScheduledMaintenance();
  });

  describe('Constructor', () => {
    it('should create MaintenanceService with dependencies', () => {
      expect(maintenanceService).toBeInstanceOf(MaintenanceService);
    });
  });

  describe('startScheduledMaintenance', () => {
    it('should start scheduled maintenance with 24-hour interval', () => {
      maintenanceService.startScheduledMaintenance();

      expect(logInfo).toHaveBeenCalledWith('⏰ Scheduled maintenance tasks every 24 hours', 'MaintenanceService');
    });

    it('should allow multiple scheduled maintenance starts', () => {
      maintenanceService.startScheduledMaintenance();
      maintenanceService.startScheduledMaintenance();

      expect(logInfo).toHaveBeenCalledWith('⏰ Scheduled maintenance tasks every 24 hours', 'MaintenanceService');
      expect(logInfo).toHaveBeenCalledTimes(2);
    });
  });

  describe('runManualMaintenance', () => {
    it('should run manual maintenance successfully', async () => {
      mockConversationRepository.cleanupOldConversations.mockResolvedValue(5);
      mockMediaService.cleanupOldTempFiles.mockResolvedValue();

      await maintenanceService.runManualMaintenance();

      expect(mockConversationRepository.cleanupOldConversations).toHaveBeenCalledWith(90);
      expect(mockMediaService.cleanupOldTempFiles).toHaveBeenCalledWith(24);
      expect(logInfo).toHaveBeenCalledWith('🔧 Running manual maintenance...', 'MaintenanceService');
      expect(logInfo).toHaveBeenCalledWith('✅ Manual maintenance completed', 'MaintenanceService');
    });

    it('should handle errors during manual maintenance gracefully', async () => {
      const error = new Error('Manual maintenance failed');
      mockConversationRepository.cleanupOldConversations.mockRejectedValue(error);

      // runManualMaintenance should not throw errors because performMaintenance catches them
      await expect(maintenanceService.runManualMaintenance()).resolves.toBeUndefined();

      expect(logError).toHaveBeenCalledWith('Error during maintenance', error, 'MaintenanceService');
    });

    it('should handle partial failures during manual maintenance gracefully', async () => {
      const conversationError = new Error('Conversation cleanup failed');
      const mediaError = new Error('Media cleanup failed');
      
      mockConversationRepository.cleanupOldConversations.mockRejectedValue(conversationError);
      mockMediaService.cleanupOldTempFiles.mockRejectedValue(mediaError);

      // runManualMaintenance should not throw errors because performMaintenance catches them
      await expect(maintenanceService.runManualMaintenance()).resolves.toBeUndefined();

      expect(mockConversationRepository.cleanupOldConversations).toHaveBeenCalledWith(90);
      // Media service is not called because conversation cleanup fails first and error is caught
      expect(mockMediaService.cleanupOldTempFiles).not.toHaveBeenCalled();
      expect(logError).toHaveBeenCalledWith('Error during maintenance', conversationError, 'MaintenanceService');
    });

    it('should handle zero conversations cleaned up', async () => {
      mockConversationRepository.cleanupOldConversations.mockResolvedValue(0);
      mockMediaService.cleanupOldTempFiles.mockResolvedValue();

      await maintenanceService.runManualMaintenance();

      expect(logInfo).toHaveBeenCalledWith('Cleaned up 0 old conversations', 'MaintenanceService');
    });

    it('should handle large number of conversations cleaned up', async () => {
      mockConversationRepository.cleanupOldConversations.mockResolvedValue(1000);
      mockMediaService.cleanupOldTempFiles.mockResolvedValue();

      await maintenanceService.runManualMaintenance();

      expect(logInfo).toHaveBeenCalledWith('Cleaned up 1000 old conversations', 'MaintenanceService');
    });
  });

  describe('stopScheduledMaintenance', () => {
    it('should stop scheduled maintenance when running', () => {
      maintenanceService.startScheduledMaintenance();
      maintenanceService.stopScheduledMaintenance();

      expect(logInfo).toHaveBeenCalledWith('Stopped scheduled maintenance', 'MaintenanceService');
    });

    it('should handle stopping maintenance when not running', () => {
      maintenanceService.stopScheduledMaintenance();

      expect(logInfo).not.toHaveBeenCalledWith('Stopped scheduled maintenance', 'MaintenanceService');
    });
  });

  describe('performMaintenance (private method)', () => {
    it('should perform all maintenance tasks in correct order', async () => {
      mockConversationRepository.cleanupOldConversations.mockResolvedValue(5);
      mockMediaService.cleanupOldTempFiles.mockResolvedValue();

      await maintenanceService.runManualMaintenance();

      expect(mockConversationRepository.cleanupOldConversations).toHaveBeenCalledWith(90);
      expect(mockMediaService.cleanupOldTempFiles).toHaveBeenCalledWith(24);
      expect(logInfo).toHaveBeenCalledWith('Starting maintenance tasks...', 'MaintenanceService');
      expect(logInfo).toHaveBeenCalledWith('Maintenance tasks completed', 'MaintenanceService');
    });

    it('should handle conversation repository errors gracefully', async () => {
      const error = new Error('Conversation repository error');
      mockConversationRepository.cleanupOldConversations.mockRejectedValue(error);

      // runManualMaintenance should not throw errors because performMaintenance catches them
      await expect(maintenanceService.runManualMaintenance()).resolves.toBeUndefined();

      expect(logError).toHaveBeenCalledWith('Error during maintenance', error, 'MaintenanceService');
    });

    it('should handle media service errors gracefully', async () => {
      const error = new Error('Media service error');
      mockConversationRepository.cleanupOldConversations.mockResolvedValue(3);
      mockMediaService.cleanupOldTempFiles.mockRejectedValue(error);

      // runManualMaintenance should not throw errors because performMaintenance catches them
      await expect(maintenanceService.runManualMaintenance()).resolves.toBeUndefined();

      expect(logError).toHaveBeenCalledWith('Error during maintenance', error, 'MaintenanceService');
    });

    it('should handle both services failing gracefully', async () => {
      const conversationError = new Error('Conversation cleanup failed');
      const mediaError = new Error('Media cleanup failed');
      
      mockConversationRepository.cleanupOldConversations.mockRejectedValue(conversationError);
      mockMediaService.cleanupOldTempFiles.mockRejectedValue(mediaError);

      // runManualMaintenance should not throw errors because performMaintenance catches them
      await expect(maintenanceService.runManualMaintenance()).resolves.toBeUndefined();

      // Should log the first error encountered
      expect(logError).toHaveBeenCalledWith('Error during maintenance', conversationError, 'MaintenanceService');
    });
  });

  describe('Error handling', () => {
    it('should handle repository method throwing synchronous errors gracefully', async () => {
      const error = new Error('Synchronous repository error');
      mockConversationRepository.cleanupOldConversations.mockImplementation(() => {
        throw error;
      });

      // runManualMaintenance should not throw errors because performMaintenance catches them
      await expect(maintenanceService.runManualMaintenance()).resolves.toBeUndefined();

      expect(logError).toHaveBeenCalledWith('Error during maintenance', error, 'MaintenanceService');
    });

    it('should handle media service method throwing synchronous errors gracefully', async () => {
      const error = new Error('Synchronous media error');
      mockConversationRepository.cleanupOldConversations.mockResolvedValue(1);
      mockMediaService.cleanupOldTempFiles.mockImplementation(() => {
        throw error;
      });

      // runManualMaintenance should not throw errors because performMaintenance catches them
      await expect(maintenanceService.runManualMaintenance()).resolves.toBeUndefined();

      expect(logError).toHaveBeenCalledWith('Error during maintenance', error, 'MaintenanceService');
    });

    it('should handle non-Error objects thrown gracefully', async () => {
      const nonError = 'String error';
      mockConversationRepository.cleanupOldConversations.mockRejectedValue(nonError);

      // runManualMaintenance should not throw errors because performMaintenance catches them
      await expect(maintenanceService.runManualMaintenance()).resolves.toBeUndefined();

      expect(logError).toHaveBeenCalledWith('Error during maintenance', nonError, 'MaintenanceService');
    });
  });

  describe('Edge cases', () => {
    it('should handle very large conversation cleanup results', async () => {
      mockConversationRepository.cleanupOldConversations.mockResolvedValue(Number.MAX_SAFE_INTEGER);
      mockMediaService.cleanupOldTempFiles.mockResolvedValue();

      await maintenanceService.runManualMaintenance();

      expect(logInfo).toHaveBeenCalledWith(`Cleaned up ${Number.MAX_SAFE_INTEGER} old conversations`, 'MaintenanceService');
    });

    it('should handle negative conversation cleanup results', async () => {
      mockConversationRepository.cleanupOldConversations.mockResolvedValue(-5);
      mockMediaService.cleanupOldTempFiles.mockResolvedValue();

      await maintenanceService.runManualMaintenance();

      expect(logInfo).toHaveBeenCalledWith('Cleaned up -5 old conversations', 'MaintenanceService');
    });

    it('should handle multiple manual maintenance calls', async () => {
      mockConversationRepository.cleanupOldConversations.mockResolvedValue(2);
      mockMediaService.cleanupOldTempFiles.mockResolvedValue();

      await maintenanceService.runManualMaintenance();
      await maintenanceService.runManualMaintenance();

      expect(mockConversationRepository.cleanupOldConversations).toHaveBeenCalledTimes(2);
      expect(mockMediaService.cleanupOldTempFiles).toHaveBeenCalledTimes(2);
    });
  });
});
