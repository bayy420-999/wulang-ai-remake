import { WhatsAppService } from './services/whatsapp';
import { MessageProcessor } from './services/messageProcessor';
import { env } from './config/env';
import { logError, logInfo, logWarn } from './lib/logger';

/**
 * Main Wulang AI Bot Application
 */
class WulangAIBot {
  private whatsappService: WhatsAppService;
  private messageProcessor: MessageProcessor;
  private isRunning: boolean = false;
  private maintenanceInterval?: NodeJS.Timeout;

  constructor() {
    this.whatsappService = new WhatsAppService();
    this.messageProcessor = new MessageProcessor(this.whatsappService);
  }

  /**
   * Initialize and start the bot
   */
  async start(): Promise<void> {
    try {
      logInfo('🚀 Starting Wulang AI Bot...', 'WulangAI');
      
      // Display configuration
      logInfo(`📋 Configuration:`, 'WulangAI');
      logInfo(`   - Bot Name: ${env.BOT_NAME}`, 'WulangAI');
      logInfo(`   - Trigger Keyword: ${env.TRIGGER_KEYWORD}`, 'WulangAI');
      logInfo(`   - Reset Keyword: ${env.RESET_KEYWORD}`, 'WulangAI');
      logInfo(`   - Max Context Messages: ${env.MAX_CONTEXT_MESSAGES}`, 'WulangAI');
      logInfo(`   - Session Name: ${env.SESSION_NAME}`, 'WulangAI');

      // Set up message handler
      this.whatsappService.setMessageHandler(async (message, media) => {
        await this.messageProcessor.processMessage(message, media);
      });

      // Initialize WhatsApp client
      await this.whatsappService.initialize();

      // Schedule maintenance tasks (run every 24 hours)
      this.scheduleMaintenanceTasks();

      this.isRunning = true;
      logInfo('✅ Wulang AI Bot is now running!', 'WulangAI');
      logInfo('📱 The bot will respond to messages containing the trigger keyword:', 'WulangAI');
      logInfo(`   "${env.TRIGGER_KEYWORD}" - Start/continue conversation`, 'WulangAI');
      logInfo(`   "${env.RESET_KEYWORD}" - Reset conversation history`, 'WulangAI');

    } catch (error) {
      logError('Failed to start Wulang AI Bot', error as Error, 'WulangAI');
      await this.shutdown();
      throw error;
    }
  }

  /**
   * Schedule regular maintenance tasks
   */
  private scheduleMaintenanceTasks(): void {
    // Run maintenance every 24 hours
    this.maintenanceInterval = setInterval(async () => {
      try {
        logInfo('🔧 Running scheduled maintenance...', 'WulangAI');
        await this.messageProcessor.performMaintenance();
      } catch (error) {
        logError('Error during scheduled maintenance', error as Error, 'WulangAI');
      }
    }, 24 * 60 * 60 * 1000); // 24 hours

    logInfo('⏰ Scheduled maintenance tasks every 24 hours', 'WulangAI');
  }

  /**
   * Get bot status and statistics
   */
  async getStatus() {
    try {
      const whatsappReady = this.whatsappService.isClientReady();
      const clientInfo = await this.whatsappService.getClientInfo();
      const activeUsersStats = await this.messageProcessor.getActiveUsersStats();

      return {
        isRunning: this.isRunning,
        whatsappReady,
        clientInfo,
        activeUsers: activeUsersStats,
        configuration: {
          botName: env.BOT_NAME,
          triggerKeyword: env.TRIGGER_KEYWORD,
          resetKeyword: env.RESET_KEYWORD,
          maxContextMessages: env.MAX_CONTEXT_MESSAGES
        }
      };
    } catch (error) {
      logError('Error getting bot status', error as Error, 'WulangAI');
      return null;
    }
  }

  /**
   * Perform manual maintenance
   */
  async runMaintenance(): Promise<void> {
    try {
      logInfo('🔧 Running manual maintenance...', 'WulangAI');
      await this.messageProcessor.performMaintenance();
      logInfo('✅ Manual maintenance completed', 'WulangAI');
    } catch (error) {
      logError('Error during manual maintenance', error as Error, 'WulangAI');
      throw error;
    }
  }

  /**
   * Gracefully shutdown the bot
   */
  async shutdown(): Promise<void> {
    try {
      logInfo('🛑 Shutting down Wulang AI Bot...', 'WulangAI');
      this.isRunning = false;

      // Clear maintenance interval
      if (this.maintenanceInterval) {
        clearInterval(this.maintenanceInterval);
        this.maintenanceInterval = undefined;
      }

      // Shutdown message processor
      await this.messageProcessor.shutdown();

      // Shutdown WhatsApp client
      await this.whatsappService.destroy();

      logInfo('✅ Wulang AI Bot shut down successfully', 'WulangAI');
    } catch (error) {
      logError('Error during shutdown', error as Error, 'WulangAI');
    }
  }
}

// Global bot instance
let bot: WulangAIBot | null = null;

/**
 * Main function to start the bot
 */
async function main() {
  try {
    // Create and start bot
    bot = new WulangAIBot();
    await bot.start();

    // Handle process signals for graceful shutdown
    process.on('SIGINT', handleShutdown);
    process.on('SIGTERM', handleShutdown);
    process.on('SIGQUIT', handleShutdown);

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logError('Uncaught Exception', error, 'WulangAI');
      handleShutdown();
    });

    process.on('unhandledRejection', (reason, promise) => {
      logError('Unhandled Rejection at Promise', new Error(String(reason)), 'WulangAI');
      handleShutdown();
    });

  } catch (error) {
    logError('Failed to start bot', error as Error, 'WulangAI');
    process.exit(1);
  }
}

/**
 * Handle graceful shutdown
 */
async function handleShutdown() {
  if (bot) {
    await bot.shutdown();
    bot = null;
  }
  process.exit(0);
}

// Start the bot if this file is run directly
if (require.main === module) {
  main().catch((error) => {
    logError('Fatal error in main', error as Error, 'WulangAI');
    process.exit(1);
  });
}

export { WulangAIBot };
