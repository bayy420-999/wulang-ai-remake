import { Message } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import { WhatsAppClient } from '../infrastructure/external/whatsapp/WhatsAppClient';
import { MessageHandler } from './handlers/MessageHandler';
import { MaintenanceService } from './services/MaintenanceService';
import { env } from '../config/env';
import { logError, logInfo, logWarn } from '../lib/logger';

export class WhatsAppBot {
  private whatsappClient: WhatsAppClient;
  private messageHandler: MessageHandler;
  private maintenanceService: MaintenanceService;
  private isRunning: boolean = false;

  constructor(
    messageHandler: MessageHandler,
    maintenanceService: MaintenanceService
  ) {
    this.whatsappClient = new WhatsAppClient();
    this.messageHandler = messageHandler;
    this.maintenanceService = maintenanceService;
  }

  async start(): Promise<void> {
    try {
      logInfo('🚀 Starting Wulang AI Bot...', 'WhatsAppBot');
      
      // Display configuration
      logInfo(`📋 Configuration:`, 'WhatsAppBot');
      logInfo(`   - Bot Name: ${env.BOT_NAME}`, 'WhatsAppBot');
      logInfo(`   - Reset Keyword: ${env.RESET_KEYWORD}`, 'WhatsAppBot');
      logInfo(`   - Max Context Messages: ${env.MAX_CONTEXT_MESSAGES}`, 'WhatsAppBot');
      logInfo(`   - Session Name: ${env.SESSION_NAME}`, 'WhatsAppBot');

      // Setup event handlers
      this.setupEventHandlers();

      // Initialize WhatsApp client
      await this.whatsappClient.initialize();

      // Start maintenance service
      this.maintenanceService.startScheduledMaintenance();

      this.isRunning = true;
      logInfo('✅ Wulang AI Bot is now running!', 'WhatsAppBot');
      logInfo('📱 The bot will respond to messages containing "wulang":', 'WhatsAppBot');
      logInfo(`   "wulang" - Start/continue conversation`, 'WhatsAppBot');
      logInfo(`   "${env.RESET_KEYWORD}" - Reset conversation history`, 'WhatsAppBot');

    } catch (error) {
      logError('Failed to start Wulang AI Bot', error as Error, 'WhatsAppBot');
      await this.shutdown();
      throw error;
    }
  }

  private setupEventHandlers(): void {
    // QR Code generation for authentication
    this.whatsappClient.on('qr', (qr) => {
      qrcode.generate(qr, { small: true });
    });

    // Message received
    this.whatsappClient.on('message', async (message: Message) => {
      try {
        const result = await this.messageHandler.handleMessage(message);
        
        if (result.shouldRespond && result.response) {
          const success = await this.whatsappClient.sendMessage(message.from, result.response);
          if (!success) {
            logError(`Failed to send response to ${message.from}`, undefined, 'WhatsAppBot');
          }
        }
      } catch (error) {
        logError('Error handling incoming message', error as Error, 'WhatsAppBot');
      }
    });

    // Client disconnected
    this.whatsappClient.on('disconnected', (reason) => {
      logWarn(`WhatsApp client disconnected: ${reason}`, 'WhatsAppBot');
    });
  }

  async getStatus() {
    try {
      return {
        isRunning: this.isRunning,
        whatsappReady: this.whatsappClient.isReady(),
        configuration: {
          botName: env.BOT_NAME,
          resetKeyword: env.RESET_KEYWORD,
          maxContextMessages: env.MAX_CONTEXT_MESSAGES
        }
      };
    } catch (error) {
      logError('Error getting bot status', error as Error, 'WhatsAppBot');
      return null;
    }
  }

  async runMaintenance(): Promise<void> {
    try {
      await this.maintenanceService.runManualMaintenance();
    } catch (error) {
      logError('Error during manual maintenance', error as Error, 'WhatsAppBot');
      throw error;
    }
  }

  async shutdown(): Promise<void> {
    try {
      logInfo('🛑 Shutting down Wulang AI Bot...', 'WhatsAppBot');
      this.isRunning = false;

      // Stop maintenance service
      this.maintenanceService.stopScheduledMaintenance();

      // Shutdown WhatsApp client
      await this.whatsappClient.destroy();

      logInfo('✅ Wulang AI Bot shut down successfully', 'WhatsAppBot');
    } catch (error) {
      logError('Error during shutdown', error as Error, 'WhatsAppBot');
    }
  }
}
