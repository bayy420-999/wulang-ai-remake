import { PrismaClient } from '@prisma/client';
import { User, CreateUserDto, UpdateUserDto } from '../../../domain/entities/User';
import { IUserRepository } from '../../../domain/interfaces/repositories/IUserRepository';
import { DatabaseError } from '../../../domain/errors/BotError';

export class PrismaUserRepository implements IUserRepository {
  constructor(private prisma: PrismaClient) {}

  private mapPrismaUserToUser(prismaUser: any): User {
    return {
      id: prismaUser.id,
      phoneNumber: prismaUser.phoneNumber,
      name: prismaUser.name || undefined,
      createdAt: prismaUser.createdAt
    };
  }

  async findById(id: string): Promise<User | null> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id },
        include: {
          conversations: {
            include: {
              _count: {
                select: {
                  messages: true
                }
              }
            }
          },
          _count: {
            select: {
              media: true,
              conversations: true
            }
          }
        }
      });

      return user ? this.mapPrismaUserToUser(user) : null;
    } catch (error) {
      throw new DatabaseError(`Failed to find user by ID: ${error}`);
    }
  }

  async findByPhoneNumber(phoneNumber: string): Promise<User | null> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { phoneNumber },
        include: {
          conversations: {
            include: {
              _count: {
                select: {
                  messages: true
                }
              }
            }
          },
          _count: {
            select: {
              media: true,
              conversations: true
            }
          }
        }
      });

      return user ? this.mapPrismaUserToUser(user) : null;
    } catch (error) {
      throw new DatabaseError(`Failed to find user by phone number: ${error}`);
    }
  }

  async create(user: CreateUserDto): Promise<User> {
    try {
      const newUser = await this.prisma.user.create({
        data: {
          phoneNumber: user.phoneNumber,
          name: user.name
        },
        include: {
          conversations: {
            include: {
              _count: {
                select: {
                  messages: true
                }
              }
            }
          },
          _count: {
            select: {
              media: true,
              conversations: true
            }
          }
        }
      });

      return this.mapPrismaUserToUser(newUser);
    } catch (error) {
      throw new DatabaseError(`Failed to create user: ${error}`);
    }
  }

  async update(id: string, updates: UpdateUserDto): Promise<User> {
    try {
      const updatedUser = await this.prisma.user.update({
        where: { id },
        data: {
          name: updates.name
        },
        include: {
          conversations: {
            include: {
              _count: {
                select: {
                  messages: true
                }
              }
            }
          },
          _count: {
            select: {
              media: true,
              conversations: true
            }
          }
        }
      });

      return this.mapPrismaUserToUser(updatedUser);
    } catch (error) {
      throw new DatabaseError(`Failed to update user: ${error}`);
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.prisma.user.delete({
        where: { id }
      });
    } catch (error) {
      throw new DatabaseError(`Failed to delete user: ${error}`);
    }
  }

  async hasConversationHistory(userId: string): Promise<boolean> {
    try {
      const count = await this.prisma.conversation.count({
        where: { userId }
      });
      return count > 0;
    } catch (error) {
      throw new DatabaseError(`Failed to check conversation history: ${error}`);
    }
  }
}
