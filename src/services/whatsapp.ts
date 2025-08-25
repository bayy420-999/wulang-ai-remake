import { Client, LocalAuth, Message, MessageMedia } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import { env } from '../config/env';
import { logError, logInfo, logWarn, logDebug } from '../lib/logger';

export interface WhatsAppMessage {
  id: string;
  body: string;
  from: string;
  fromMe: boolean;
  timestamp: number;
  hasMedia: boolean;
  mediaType?: string;
  contact: {
    number: string;
    name?: string;
    pushname?: string;
  };
}

export interface MediaMessage {
  media: MessageMedia;
  filename?: string;
  caption?: string;
}

export class WhatsAppService {
  private client: Client;
  private isReady: boolean = false;
  private messageHandler?: (message: WhatsAppMessage, media?: MediaMessage) => Promise<void>;

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

  /**
   * Setup event handlers for the WhatsApp client
   */
  private setupEventHandlers() {
    // QR Code generation for authentication
    this.client.on('qr', (qr) => {
      logInfo('QR Code received. Please scan with your WhatsApp mobile app:', 'WhatsApp');
      qrcode.generate(qr, { small: true });
    });

    // Client ready
    this.client.on('ready', () => {
      logInfo('WhatsApp client is ready!', 'WhatsApp');
      this.isReady = true;
    });

    // Authentication success
    this.client.on('authenticated', () => {
      logInfo('WhatsApp authentication successful', 'WhatsApp');
    });

    // Authentication failure
    this.client.on('auth_failure', (message) => {
      logError('WhatsApp authentication failed', new Error(message), 'WhatsApp');
    });

    // Client disconnected
    this.client.on('disconnected', (reason) => {
      logWarn(`WhatsApp client disconnected: ${reason}`, 'WhatsApp');
      this.isReady = false;
    });

    // Message received
    this.client.on('message', async (message) => {
      try {
        await this.handleIncomingMessage(message);
      } catch (error) {
        logError('Error handling incoming message', error as Error, 'WhatsApp');
      }
    });

    // Loading screen
    this.client.on('loading_screen', (percent, message) => {
      logDebug(`Loading: ${percent}% - ${message}`, 'WhatsApp');
    });
  }

  /**
   * Handle incoming messages
   */
  private async handleIncomingMessage(message: Message) {
    // Skip messages from groups and from self
    if (message.fromMe || message.from.includes('@g.us')) {
      return;
    }

    logDebug(`Received message from ${message.from}: ${message.body}`, 'WhatsApp');

    const contact = await message.getContact();
    
    const whatsappMessage: WhatsAppMessage = {
      id: message.id._serialized,
      body: message.body,
      from: message.from,
      fromMe: message.fromMe,
      timestamp: message.timestamp,
      hasMedia: message.hasMedia,
      mediaType: message.type,
      contact: {
        number: contact.number,
        name: contact.name,
        pushname: contact.pushname
      }
    };

    let mediaMessage: MediaMessage | undefined;

    // Handle media messages
    if (message.hasMedia) {
      try {
        const media = await message.downloadMedia();
        
        if (media) {
          mediaMessage = {
            media,
            filename: media.filename || undefined,
            caption: message.body // Caption is usually in the body for media messages
          };

          logInfo(`Received media message: ${media.mimetype} (${media.filename || 'no filename'})`, 'WhatsApp');
        }
      } catch (error) {
        logError('Failed to download media', error as Error, 'WhatsApp');
      }
    }

    // Call the message handler if set
    if (this.messageHandler) {
      await this.messageHandler(whatsappMessage, mediaMessage);
    }
  }

  /**
   * Initialize and start the WhatsApp client
   */
  async initialize(): Promise<void> {
    try {
      logInfo('Initializing WhatsApp client...', 'WhatsApp');
      await this.client.initialize();
    } catch (error) {
      logError('Failed to initialize WhatsApp client', error as Error, 'WhatsApp');
      throw error;
    }
  }

  /**
   * Send a text message
   */
  async sendMessage(to: string, message: string): Promise<boolean> {
    if (!this.isReady) {
      logError('WhatsApp client is not ready', undefined, 'WhatsApp');
      return false;
    }

    try {
      await this.client.sendMessage(to, message);
      logDebug(`Sent message to ${to}: ${message.substring(0, 100)}...`, 'WhatsApp');
      return true;
    } catch (error) {
      logError(`Failed to send message to ${to}`, error as Error, 'WhatsApp');
      return false;
    }
  }

  /**
   * Send a media message
   */
  async sendMediaMessage(to: string, media: MessageMedia, caption?: string): Promise<boolean> {
    if (!this.isReady) {
      logError('WhatsApp client is not ready', undefined, 'WhatsApp');
      return false;
    }

    try {
      await this.client.sendMessage(to, media, { caption });
      logDebug(`Sent media message to ${to}`, 'WhatsApp');
      return true;
    } catch (error) {
      logError(`Failed to send media message to ${to}`, error as Error, 'WhatsApp');
      return false;
    }
  }

  /**
   * Reply to a specific message
   */
  async replyToMessage(message: Message, reply: string): Promise<boolean> {
    if (!this.isReady) {
      logError('WhatsApp client is not ready', undefined, 'WhatsApp');
      return false;
    }

    try {
      await message.reply(reply);
      logDebug(`Replied to message ${message.id._serialized}`, 'WhatsApp');
      return true;
    } catch (error) {
      logError('Failed to reply to message', error as Error, 'WhatsApp');
      return false;
    }
  }

  /**
   * Set the message handler function
   */
  setMessageHandler(handler: (message: WhatsAppMessage, media?: MediaMessage) => Promise<void>) {
    this.messageHandler = handler;
    logInfo('Message handler set', 'WhatsApp');
  }

  /**
   * Get contact information
   */
  async getContact(number: string) {
    try {
      const contact = await this.client.getContactById(number);
      return {
        number: contact.number,
        name: contact.name,
        pushname: contact.pushname,
        isBlocked: contact.isBlocked,
        isGroup: contact.isGroup
      };
    } catch (error) {
      logError(`Failed to get contact info for ${number}`, error as Error, 'WhatsApp');
      return null;
    }
  }

  /**
   * Check if the client is ready
   */
  isClientReady(): boolean {
    return this.isReady;
  }

  /**
   * Get client information
   */
  async getClientInfo() {
    if (!this.isReady) {
      return null;
    }

    try {
      const info = this.client.info;
      return {
        wid: info.wid,
        pushname: info.pushname,
        platform: info.platform,
        connected: this.isReady
      };
    } catch (error) {
      logError('Failed to get client info', error as Error, 'WhatsApp');
      return null;
    }
  }

  /**
   * Gracefully shutdown the client
   */
  async destroy(): Promise<void> {
    try {
      logInfo('Shutting down WhatsApp client...', 'WhatsApp');
      await this.client.destroy();
      this.isReady = false;
      logInfo('WhatsApp client shut down successfully', 'WhatsApp');
    } catch (error) {
      logError('Error shutting down WhatsApp client', error as Error, 'WhatsApp');
    }
  }

  /**
   * Format phone number for WhatsApp (add @c.us suffix if not present)
   */
  static formatPhoneNumber(phone: string): string {
    // Remove any non-digit characters except '+'
    const cleaned = phone.replace(/[^\d+]/g, '');
    
    // Remove '+' and any leading zeros
    const number = cleaned.replace(/^\+/, '').replace(/^0+/, '');
    
    // Add WhatsApp suffix if not present
    return number.includes('@c.us') ? number : `${number}@c.us`;
  }

  /**
   * Extract phone number from WhatsApp ID
   */
  static extractPhoneNumber(whatsappId: string): string {
    return whatsappId.replace('@c.us', '');
  }
}
