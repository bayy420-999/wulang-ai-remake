import { Client, LocalAuth, Message } from 'whatsapp-web.js';
import { env } from '../../../config/env';
import { logError, logInfo, logWarn, logDebug } from '../../../lib/logger';

export interface IWhatsAppClient {
  initialize(): Promise<void>;
  isReady(): boolean;
  sendMessage(to: string, message: string): Promise<boolean>;
  on(event: string, callback: (data: any) => void): void;
  destroy(): Promise<void>;
}

export class WhatsAppClient implements IWhatsAppClient {
  private client: Client;
  private ready: boolean = false;
  private eventHandlers: Map<string, ((data: any) => void)[]> = new Map();

  constructor() {
    this.client = new Client({
      authStrategy: new LocalAuth({
        clientId: env.SESSION_NAME
      }),
      puppeteer: {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu'
        ]
      }
    });

    this.setupEventHandlers();
  }

  async initialize(): Promise<void> {
    try {
      await this.client.initialize();
    } catch (error) {
      logError('Failed to initialize WhatsApp client', error as Error, 'WhatsAppClient');
      throw error;
    }
  }

  isReady(): boolean {
    return this.ready;
  }

  async sendMessage(to: string, message: string): Promise<boolean> {
    if (!this.ready) {
      logError('WhatsApp client is not ready', undefined, 'WhatsAppClient');
      return false;
    }

    try {
      await this.client.sendMessage(to, message);
      logDebug(`Sent message to ${to}: ${message.substring(0, 100)}...`, 'WhatsAppClient');
      return true;
    } catch (error) {
      logError(`Failed to send message to ${to}`, error as Error, 'WhatsAppClient');
      return false;
    }
  }

  on(event: string, callback: (data: any) => void): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(callback);
  }

  async destroy(): Promise<void> {
    try {
      await this.client.destroy();
      this.ready = false;
      logInfo('WhatsApp client destroyed', 'WhatsAppClient');
    } catch (error) {
      logError('Error destroying WhatsApp client', error as Error, 'WhatsAppClient');
    }
  }

  private setupEventHandlers(): void {
    // QR Code generation for authentication
    this.client.on('qr', (qr) => {
      logInfo('QR Code received. Please scan with your WhatsApp mobile app:', 'WhatsAppClient');
      this.emit('qr', qr);
    });

    // Client ready
    this.client.on('ready', () => {
      logInfo('WhatsApp client is ready!', 'WhatsAppClient');
      this.ready = true;
      this.emit('ready');
    });

    // Authentication success
    this.client.on('authenticated', () => {
      logInfo('WhatsApp authentication successful', 'WhatsAppClient');
      this.emit('authenticated');
    });

    // Authentication failure
    this.client.on('auth_failure', (message) => {
      logError('WhatsApp authentication failed', new Error(message), 'WhatsAppClient');
      this.emit('auth_failure', message);
    });

    // Client disconnected
    this.client.on('disconnected', (reason) => {
      logWarn(`WhatsApp client disconnected: ${reason}`, 'WhatsAppClient');
      this.ready = false;
      this.emit('disconnected', reason);
    });

    // Message received
    this.client.on('message', async (message) => {
      this.emit('message', message);
    });

    // Loading screen
    this.client.on('loading_screen', (percent, message) => {
      logDebug(`Loading: ${percent}% - ${message}`, 'WhatsAppClient');
      this.emit('loading_screen', { percent, message });
    });
  }

  private emit(event: string, data?: any): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          logError(`Error in event handler for ${event}`, error as Error, 'WhatsAppClient');
        }
      });
    }
  }
}
