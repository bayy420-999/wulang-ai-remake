import { IUserRepository } from '../../domain/interfaces/repositories/IUserRepository';
import { IGroupRepository } from '../../domain/interfaces/repositories/IGroupRepository';
import { IConversationRepository } from '../../domain/interfaces/repositories/IConversationRepository';
import { IMessageRepository } from '../../domain/interfaces/repositories/IMessageRepository';
import { IAIService } from '../../domain/interfaces/services/IAIService';
import { ConversationContextDto } from '../dto/ProcessMessageDto';
import { ProcessingError } from '../../domain/errors/BotError';
import { logDebug, logInfo } from '../../lib/logger';

interface PendingMedia {
  buffer: Buffer;
  filename: string;
  mimeType: string;
  timestamp: number;
}

export class ConversationManager {
  private pendingMedia: Map<string, PendingMedia> = new Map();

  constructor(
    private userRepository: IUserRepository,
    private groupRepository: IGroupRepository,
    private conversationRepository: IConversationRepository,
    private messageRepository: IMessageRepository,
    private aiService: IAIService
  ) {}

  async getOrCreateUser(phoneNumber: string, name?: string) {
    logDebug(`🔍 Looking up user by phone number: ${phoneNumber}`, 'ConversationManager');
    
    let user = await this.userRepository.findByPhoneNumber(phoneNumber);
    
    if (!user) {
      logInfo(`👤 User not found, creating new user: ${phoneNumber}`, 'ConversationManager');
      user = await this.userRepository.create({ phoneNumber, name });
      logInfo(`✅ Created new user: ${user.name || 'Unknown'} (${phoneNumber})`, 'ConversationManager');
    } else {
      logInfo(`👤 Found existing user: ${user.name || 'Unknown'} (${phoneNumber})`, 'ConversationManager');
      if (name && !user.name) {
        logInfo(`📝 Updating user name from '${user.name}' to '${name}'`, 'ConversationManager');
        user = await this.userRepository.update(user.id, { name });
        logInfo(`✅ Updated user name: ${user.name} (${phoneNumber})`, 'ConversationManager');
      }
    }

    return user;
  }

  async getOrCreateGroup(groupId: string, name?: string) {
    logDebug(`🔍 Looking up group by group ID: ${groupId}`, 'ConversationManager');
    
    let group = await this.groupRepository.findByGroupId(groupId);
    
    if (!group) {
      logInfo(`👥 Group not found, creating new group: ${groupId}`, 'ConversationManager');
      group = await this.groupRepository.create({ groupId, name });
      logInfo(`✅ Created new group: ${group.name || 'Unknown'} (${groupId})`, 'ConversationManager');
    } else {
      logInfo(`👥 Found existing group: ${group.name || 'Unknown'} (${groupId})`, 'ConversationManager');
      if (name && !group.name) {
        logInfo(`📝 Updating group name from '${group.name}' to '${name}'`, 'ConversationManager');
        group = await this.groupRepository.update(group.id, { name });
        logInfo(`✅ Updated group name: ${group.name} (${groupId})`, 'ConversationManager');
      }
    }

    return group;
  }

  async getOrCreateActiveConversation(userId?: string, groupId?: string) {
    if (userId) {
      logDebug(`🔍 Looking up active conversation for user: ${userId}`, 'ConversationManager');
      
      let conversation = await this.conversationRepository.findActiveByUserId(userId);
      
      if (!conversation) {
        logInfo(`💬 No active conversation found, creating new conversation for user: ${userId}`, 'ConversationManager');
        conversation = await this.conversationRepository.create({ userId });
        logInfo(`✅ Created new conversation: ${conversation.id} for user: ${userId}`, 'ConversationManager');
      } else {
        logInfo(`💬 Found existing active conversation: ${conversation.id} for user: ${userId}`, 'ConversationManager');
      }

      return conversation;
    } else if (groupId) {
      logDebug(`🔍 Looking up active conversation for group: ${groupId}`, 'ConversationManager');
      
      let conversation = await this.conversationRepository.findActiveByGroupId(groupId);
      
      if (!conversation) {
        logInfo(`💬 No active conversation found, creating new conversation for group: ${groupId}`, 'ConversationManager');
        conversation = await this.conversationRepository.create({ groupId });
        logInfo(`✅ Created new conversation: ${conversation.id} for group: ${groupId}`, 'ConversationManager');
      } else {
        logInfo(`💬 Found existing active conversation: ${conversation.id} for group: ${groupId}`, 'ConversationManager');
      }

      return conversation;
    } else {
      throw new Error('Either userId or groupId must be provided');
    }
  }

  async getConversationContext(conversationId: string, userPhone: string, userName?: string): Promise<ConversationContextDto> {
    const messages = await this.messageRepository.findByConversationId(conversationId);
    
    logInfo(`📋 Retrieved ${messages.length} messages for conversation ${conversationId}`, 'ConversationManager');
    logDebug(`Retrieved ${messages.length} messages for conversation ${conversationId}`, 'ConversationManager');
    
    const mappedMessages = messages.map(msg => ({
      role: msg.role,
      content: msg.content || null,
      createdAt: msg.createdAt,
      media: null // Media info would need to be fetched separately if needed
    }));

    logInfo(`📝 Mapped ${mappedMessages.length} messages for context`, 'ConversationManager');
    logDebug(`Mapped messages: ${JSON.stringify(mappedMessages.map(m => ({ role: m.role, content: m.content?.substring(0, 50) + '...' })))}`, 'ConversationManager');
    
    return {
      messages: mappedMessages,
      userPhone,
      userName
    };
  }



  async generateWelcomeMessage(userName?: string): Promise<string> {
    return await this.aiService.generateWelcomeMessage(userName);
  }

  // Store pending media for a user
  storePendingMedia(phoneNumber: string, mediaData: { buffer: Buffer; filename: string; mimeType: string }): void {
    this.pendingMedia.set(phoneNumber, {
      ...mediaData,
      timestamp: Date.now()
    });
    logInfo(`💾 Stored pending media for ${phoneNumber}: ${mediaData.filename}`, 'ConversationManager');
  }

  // Get pending media for a user
  getPendingMedia(phoneNumber: string): PendingMedia | undefined {
    const media = this.pendingMedia.get(phoneNumber);
    if (media) {
      // Check if media is not too old (24 hours)
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
      if (Date.now() - media.timestamp < maxAge) {
        logInfo(`📎 Retrieved pending media for ${phoneNumber}: ${media.filename}`, 'ConversationManager');
        return media;
      } else {
        // Remove expired media
        this.pendingMedia.delete(phoneNumber);
        logInfo(`🗑️ Removed expired pending media for ${phoneNumber}`, 'ConversationManager');
      }
    }
    return undefined;
  }

  // Remove pending media for a user
  removePendingMedia(phoneNumber: string): void {
    this.pendingMedia.delete(phoneNumber);
    logInfo(`🗑️ Removed pending media for ${phoneNumber}`, 'ConversationManager');
  }

  // Check if user has pending media
  hasPendingMedia(phoneNumber: string): boolean {
    return this.getPendingMedia(phoneNumber) !== undefined;
  }

  // Clean up old pending media
  cleanupOldPendingMedia(): void {
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    const now = Date.now();
    
    for (const [phoneNumber, media] of this.pendingMedia.entries()) {
      if (now - media.timestamp > maxAge) {
        this.pendingMedia.delete(phoneNumber);
      }
    }
  }
}
