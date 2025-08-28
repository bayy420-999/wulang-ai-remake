import { PrismaClient } from '@prisma/client';
import { IConversationRepository } from '../../../domain/interfaces/repositories/IConversationRepository';
import { Conversation, CreateConversationDto } from '../../../domain/entities/Conversation';
import { DatabaseError } from '../../../domain/errors/BotError';

export class PrismaConversationRepository implements IConversationRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(id: string): Promise<Conversation | null> {
    try {
      const conversation = await this.prisma.conversation.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              id: true,
              phoneNumber: true,
              name: true
            }
          },
          _count: {
            select: { messages: true }
          }
        }
      });

      return conversation;
    } catch (error) {
      throw new DatabaseError(`Failed to find conversation by ID: ${error}`);
    }
  }

  async findByUserId(userId: string): Promise<Conversation[]> {
    try {
      const conversations = await this.prisma.conversation.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        include: {
          _count: {
            select: { messages: true }
          }
        }
      });

      return conversations;
    } catch (error) {
      throw new DatabaseError(`Failed to find conversations by user ID: ${error}`);
    }
  }

  async findActiveByUserId(userId: string): Promise<Conversation | null> {
    try {
      const conversation = await this.prisma.conversation.findFirst({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              phoneNumber: true,
              name: true
            }
          },
          _count: {
            select: { messages: true }
          }
        }
      });

      return conversation;
    } catch (error) {
      throw new DatabaseError(`Failed to find active conversation by user ID: ${error}`);
    }
  }

  async create(conversation: CreateConversationDto): Promise<Conversation> {
    try {
      const newConversation = await this.prisma.conversation.create({
        data: {
          userId: conversation.userId
        },
        include: {
          user: {
            select: {
              id: true,
              phoneNumber: true,
              name: true
            }
          },
          _count: {
            select: { messages: true }
          }
        }
      });

      return newConversation;
    } catch (error) {
      throw new DatabaseError(`Failed to create conversation: ${error}`);
    }
  }

  async update(id: string, data: Partial<Conversation>): Promise<Conversation> {
    try {
      const updatedConversation = await this.prisma.conversation.update({
        where: { id },
        data,
        include: {
          user: {
            select: {
              id: true,
              phoneNumber: true,
              name: true
            }
          },
          _count: {
            select: { messages: true }
          }
        }
      });

      return updatedConversation;
    } catch (error) {
      throw new DatabaseError(`Failed to update conversation: ${error}`);
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.prisma.conversation.delete({
        where: { id }
      });
    } catch (error) {
      throw new DatabaseError(`Failed to delete conversation: ${error}`);
    }
  }

  async deleteByUserId(userId: string): Promise<void> {
    try {
      // First, get all conversations for the user
      const conversations = await this.prisma.conversation.findMany({
        where: { userId },
        select: { id: true }
      });

      const conversationIds = conversations.map(conv => conv.id);

      // Delete all messages in these conversations first
      if (conversationIds.length > 0) {
        await this.prisma.message.deleteMany({
          where: {
            conversationId: {
              in: conversationIds
            }
          }
        });
      }

      // Then delete all conversations for the user
      await this.prisma.conversation.deleteMany({
        where: { userId }
      });
    } catch (error) {
      throw new DatabaseError(`Failed to delete conversations by user ID: ${error}`);
    }
  }

  async cleanupOldConversations(days: number): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      // First, get all old conversations
      const oldConversations = await this.prisma.conversation.findMany({
        where: {
          updatedAt: {
            lt: cutoffDate
          }
        },
        select: { id: true }
      });

      const conversationIds = oldConversations.map(conv => conv.id);

      // Delete all messages in these conversations first
      if (conversationIds.length > 0) {
        await this.prisma.message.deleteMany({
          where: {
            conversationId: {
              in: conversationIds
            }
          }
        });
      }

      // Then delete all old conversations
      const result = await this.prisma.conversation.deleteMany({
        where: {
          updatedAt: {
            lt: cutoffDate
          }
        }
      });

      return result.count;
    } catch (error) {
      throw new DatabaseError(`Failed to cleanup old conversations: ${error}`);
    }
  }
}
