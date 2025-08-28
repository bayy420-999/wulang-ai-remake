import { logError, logInfo } from './lib/logger';
import { setupDependencyInjection } from './shared/config/dependencyInjection';
import { container } from './shared/config/container';

/**
 * Main Wulang AI Bot Application
 */
class WulangAIApplication {
  private bot: any; // WhatsAppBot from container

  constructor() {
    // Setup dependency injection
    setupDependencyInjection();
    
    // Get the bot from the container
    this.bot = container.get('WhatsAppBot');
  }

  /**
   * Start the application
   */
  async start(): Promise<void> {
    try {
      logInfo('🚀 Initializing Wulang AI Application with Clean Architecture...', 'WulangAI');
      await this.bot.start();
    } catch (error) {
      logError('Failed to start Wulang AI Application', error as Error, 'WulangAI');
      await this.shutdown();
      throw error;
    }
  }

  /**
   * Get application status
   */
  async getStatus() {
    return await this.bot.getStatus();
  }

  /**
   * Run manual maintenance
   */
  async runMaintenance(): Promise<void> {
    await this.bot.runMaintenance();
  }

  /**
   * Shutdown the application
   */
  async shutdown(): Promise<void> {
    logInfo('🛑 Shutting down Wulang AI Application...', 'WulangAI');
    await this.bot.shutdown();
  }
}

// Global application instance
let app: WulangAIApplication | null = null;

/**
 * Main function to start the application
 */
async function main() {
  try {
    // Create and start application
    app = new WulangAIApplication();
    await app.start();

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
    logError('Failed to start application', error as Error, 'WulangAI');
    process.exit(1);
  }
}

/**
 * Handle graceful shutdown
 */
async function handleShutdown() {
  if (app) {
    await app.shutdown();
    app = null;
  }
  process.exit(0);
}

// Start the application if this file is run directly
if (require.main === module) {
  main().catch((error) => {
    logError('Fatal error in main', error as Error, 'WulangAI');
    process.exit(1);
  });
}

export { WulangAIApplication };

