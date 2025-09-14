import { PrismaClient } from '@prisma/client';
import { Group, CreateGroupDto, UpdateGroupDto } from '../../../domain/entities/Group';
import { IGroupRepository } from '../../../domain/interfaces/repositories/IGroupRepository';
import { DatabaseError } from '../../../domain/errors/BotError';

export class PrismaGroupRepository implements IGroupRepository {
  constructor(private prisma: PrismaClient) {}

  private mapPrismaGroupToGroup(prismaGroup: any): Group {
    return {
      id: prismaGroup.id,
      groupId: prismaGroup.groupId,
      name: prismaGroup.name || undefined,
      createdAt: prismaGroup.createdAt
    };
  }

  async findById(id: string): Promise<Group | null> {
    try {
      const group = await this.prisma.group.findUnique({
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
              conversations: true
            }
          }
        }
      });

      return group ? this.mapPrismaGroupToGroup(group) : null;
    } catch (error) {
      throw new DatabaseError(`Failed to find group by ID: ${error}`);
    }
  }

  async findByGroupId(groupId: string): Promise<Group | null> {
    try {
      const group = await this.prisma.group.findUnique({
        where: { groupId },
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
              conversations: true
            }
          }
        }
      });

      return group ? this.mapPrismaGroupToGroup(group) : null;
    } catch (error) {
      throw new DatabaseError(`Failed to find group by group ID: ${error}`);
    }
  }

  async create(group: CreateGroupDto): Promise<Group> {
    try {
      const newGroup = await this.prisma.group.create({
        data: {
          groupId: group.groupId,
          name: group.name
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
              conversations: true
            }
          }
        }
      });

      return this.mapPrismaGroupToGroup(newGroup);
    } catch (error) {
      throw new DatabaseError(`Failed to create group: ${error}`);
    }
  }

  async update(id: string, updates: UpdateGroupDto): Promise<Group> {
    try {
      const updatedGroup = await this.prisma.group.update({
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
              conversations: true
            }
          }
        }
      });

      return this.mapPrismaGroupToGroup(updatedGroup);
    } catch (error) {
      throw new DatabaseError(`Failed to update group: ${error}`);
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.prisma.group.delete({
        where: { id }
      });
    } catch (error) {
      throw new DatabaseError(`Failed to delete group: ${error}`);
    }
  }

  async hasConversationHistory(groupId: string): Promise<boolean> {
    try {
      const count = await this.prisma.conversation.count({
        where: { groupId }
      });
      return count > 0;
    } catch (error) {
      throw new DatabaseError(`Failed to check conversation history: ${error}`);
    }
  }
}
