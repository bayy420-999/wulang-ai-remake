import { PrismaClient, Role } from '@prisma/client';
import { Message, MessageRole, CreateMessageDto } from '../../../domain/entities/Message';
import { IMessageRepository } from '../../../domain/interfaces/repositories/IMessageRepository';
import { DatabaseError } from '../../../domain/errors/BotError';

export class PrismaMessageRepository implements IMessageRepository {
  constructor(private prisma: PrismaClient) {}

  private mapPrismaRoleToMessageRole(role: Role): MessageRole {
    switch (role) {
      case Role.USER:
        return MessageRole.USER;
      case Role.ASSISTANT:
        return MessageRole.ASSISTANT;
      case Role.SYSTEM:
        return MessageRole.SYSTEM;
      default:
        throw new Error(`Unknown role: ${role}`);
    }
  }

  async findById(id: string): Promise<Message | null> {
    try {
      const message = await this.prisma.message.findUnique({
        where: { id },
        include: {
          media: true,
          conversation: {
            include: {
              user: {
                select: {
                  id: true,
                  phoneNumber: true,
                  name: true
                }
              }
            }
          }
        }
      });

      if (!message) return null;

      return {
        id: message.id,
        role: this.mapPrismaRoleToMessageRole(message.role),
        content: message.content || undefined,
        mediaId: message.mediaId || undefined,
        conversationId: message.conversationId,
        createdAt: message.createdAt
      };
    } catch (error) {
      throw new DatabaseError(`Failed to find message by ID: ${error}`);
    }
  }

  async findByConversationId(conversationId: string, limit: number = 10): Promise<Message[]> {
    try {
      // First, get the total count to calculate offset
      const totalCount = await this.prisma.message.count({
        where: { conversationId }
      });

      // Calculate offset to get the last N messages
      const offset = Math.max(0, totalCount - limit);

      const messages = await this.prisma.message.findMany({
        where: { conversationId },
        orderBy: [
          { createdAt: 'asc' },
          { id: 'asc' } // Secondary sort for consistent ordering
        ],
        skip: offset,  // ✅ Skip older messages to get the last N
        take: limit,
        include: {
          media: true,
          conversation: {
            include: {
              user: {
                select: {
                  id: true,
                  phoneNumber: true,
                  name: true
                }
              }
            }
          }
        }
      });

      // Messages are now in chronological order (oldest first) but only the last N
      return messages.map(message => ({
        id: message.id,
        role: this.mapPrismaRoleToMessageRole(message.role),
        content: message.content || undefined,
        mediaId: message.mediaId || undefined,
        conversationId: message.conversationId,
        createdAt: message.createdAt
      }));
    } catch (error) {
      throw new DatabaseError(`Failed to find messages by conversation ID: ${error}`);
    }
  }

  async create(message: CreateMessageDto): Promise<Message> {
    try {
      const newMessage = await this.prisma.message.create({
        data: {
          role: message.role as any, // Prisma enum
          content: message.content,
          conversationId: message.conversationId,
          mediaId: message.mediaId || undefined
        },
        include: {
          media: true,
          conversation: {
            include: {
              user: {
                select: {
                  id: true,
                  phoneNumber: true,
                  name: true
                }
              }
            }
          }
        }
      });

      // Update conversation's updatedAt timestamp
      await this.prisma.conversation.update({
        where: { id: message.conversationId },
        data: { updatedAt: new Date() }
      });

      return {
        id: newMessage.id,
        role: this.mapPrismaRoleToMessageRole(newMessage.role),
        content: newMessage.content || undefined,
        mediaId: newMessage.mediaId || undefined,
        conversationId: newMessage.conversationId,
        createdAt: newMessage.createdAt
      };
    } catch (error) {
      throw new DatabaseError(`Failed to create message: ${error}`);
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.prisma.message.delete({
        where: { id }
      });
    } catch (error) {
      throw new DatabaseError(`Failed to delete message: ${error}`);
    }
  }

  async deleteByConversationId(conversationId: string): Promise<void> {
    try {
      await this.prisma.message.deleteMany({
        where: { conversationId }
      });
    } catch (error) {
      throw new DatabaseError(`Failed to delete messages by conversation ID: ${error}`);
    }
  }

  async getMessageCount(conversationId: string): Promise<number> {
    try {
      return await this.prisma.message.count({
        where: { conversationId }
      });
    } catch (error) {
      throw new DatabaseError(`Failed to get message count: ${error}`);
    }
  }
}
