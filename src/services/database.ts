import { Role } from '@prisma/client';
import { prisma } from '../lib/db';
import { env } from '../config/env';

export interface CreateUserData {
  phone: string;
  name?: string;
}

export interface CreateMessageData {
  role: Role;
  content: string;
  userId: string;
  metadata?: Record<string, any>;
}

export interface MessageWithUser {
  id: string;
  role: Role;
  content: string;
  metadata: Record<string, any> | null;
  createdAt: Date;
  user: {
    id: string;
    phone: string;
    name: string | null;
  };
}

export class DatabaseService {
  /**
   * Find or create a user by phone number
   */
  async findOrCreateUser(phone: string, name?: string) {
    try {
      // First try to find existing user
      let user = await prisma.user.findUnique({
        where: { phone },
        include: {
          _count: {
            select: { messages: true }
          }
        }
      });

      if (!user) {
        // Create new user if not found
        user = await prisma.user.create({
          data: {
            phone,
            name,
            isActive: true
          },
          include: {
            _count: {
              select: { messages: true }
            }
          }
        });
      } else if (name && !user.name) {
        // Update name if provided and user doesn't have one
        user = await prisma.user.update({
          where: { id: user.id },
          data: { name },
          include: {
            _count: {
              select: { messages: true }
            }
          }
        });
      }

      return user;
    } catch (error) {
      throw new Error(`Failed to find or create user: ${error}`);
    }
  }

  /**
   * Get user by phone number
   */
  async getUserByPhone(phone: string) {
    try {
      return await prisma.user.findUnique({
        where: { phone },
        include: {
          _count: {
            select: { messages: true }
          }
        }
      });
    } catch (error) {
      throw new Error(`Failed to get user: ${error}`);
    }
  }

  /**
   * Store a message in the database
   */
  async createMessage(data: CreateMessageData) {
    try {
      const message = await prisma.message.create({
        data: {
          role: data.role,
          content: data.content,
          userId: data.userId,
          metadata: data.metadata || undefined
        },
        include: {
          user: {
            select: {
              id: true,
              phone: true,
              name: true
            }
          }
        }
      });

      // Update user's last message timestamp
      await prisma.user.update({
        where: { id: data.userId },
        data: { lastMessageAt: new Date() }
      });

      return message;
    } catch (error) {
      throw new Error(`Failed to create message: ${error}`);
    }
  }

  /**
   * Get recent conversation messages for a user
   */
  async getConversationHistory(userId: string, limit: number = env.MAX_CONTEXT_MESSAGES) {
    try {
      const messages = await prisma.message.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              phone: true,
              name: true
            }
          }
        }
      });

      // Return in chronological order (oldest first)
      return messages.reverse();
    } catch (error) {
      throw new Error(`Failed to get conversation history: ${error}`);
    }
  }

  /**
   * Check if user has any existing conversations
   */
  async hasConversationHistory(userId: string): Promise<boolean> {
    try {
      const count = await prisma.message.count({
        where: { userId }
      });
      return count > 0;
    } catch (error) {
      throw new Error(`Failed to check conversation history: ${error}`);
    }
  }

  /**
   * Reset user's conversation history (delete all messages)
   */
  async resetUserConversation(userId: string) {
    try {
      const result = await prisma.message.deleteMany({
        where: { userId }
      });

      // Update user's last message timestamp
      await prisma.user.update({
        where: { id: userId },
        data: { lastMessageAt: null }
      });

      return result;
    } catch (error) {
      throw new Error(`Failed to reset user conversation: ${error}`);
    }
  }

  /**
   * Get message count for a user
   */
  async getMessageCount(userId: string): Promise<number> {
    try {
      return await prisma.message.count({
        where: { userId }
      });
    } catch (error) {
      throw new Error(`Failed to get message count: ${error}`);
    }
  }

  /**
   * Update user information
   */
  async updateUser(userId: string, data: Partial<CreateUserData>) {
    try {
      return await prisma.user.update({
        where: { id: userId },
        data: {
          ...data,
          updatedAt: new Date()
        }
      });
    } catch (error) {
      throw new Error(`Failed to update user: ${error}`);
    }
  }

  /**
   * Get active users (users who have sent messages recently)
   */
  async getActiveUsers(days: number = 7) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      return await prisma.user.findMany({
        where: {
          lastMessageAt: {
            gte: cutoffDate
          },
          isActive: true
        },
        include: {
          _count: {
            select: { messages: true }
          }
        },
        orderBy: { lastMessageAt: 'desc' }
      });
    } catch (error) {
      throw new Error(`Failed to get active users: ${error}`);
    }
  }

  /**
   * Clean up old messages (optional maintenance function)
   */
  async cleanupOldMessages(days: number = 90) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const result = await prisma.message.deleteMany({
        where: {
          createdAt: {
            lt: cutoffDate
          }
        }
      });

      return result;
    } catch (error) {
      throw new Error(`Failed to cleanup old messages: ${error}`);
    }
  }

  /**
   * Close database connection
   */
  async disconnect() {
    await prisma.$disconnect();
  }
}
