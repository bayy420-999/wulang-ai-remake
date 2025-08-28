import { PrismaClient } from '@prisma/client';
import { Media, CreateMediaDto, UpdateMediaDto } from '../../../domain/entities/Media';
import { IMediaRepository } from '../../../domain/interfaces/repositories/IMediaRepository';
import { DatabaseError } from '../../../domain/errors/BotError';

export class PrismaMediaRepository implements IMediaRepository {
  constructor(private prisma: PrismaClient) {}

  private mapPrismaMediaToMedia(prismaMedia: any): Media {
    return {
      id: prismaMedia.id,
      url: prismaMedia.url,
      type: prismaMedia.type,
      summary: prismaMedia.summary || undefined,
      userId: prismaMedia.userId,
      createdAt: prismaMedia.createdAt
    };
  }

  async findById(id: string): Promise<Media | null> {
    try {
      const media = await this.prisma.media.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              id: true,
              phoneNumber: true,
              name: true
            }
          },
          messages: {
            select: {
              id: true,
              createdAt: true,
              role: true,
              content: true,
              mediaId: true,
              conversationId: true
            }
          }
        }
      });

      return media ? this.mapPrismaMediaToMedia(media) : null;
    } catch (error) {
      throw new DatabaseError(`Failed to find media by ID: ${error}`);
    }
  }

  async findByUserId(userId: string): Promise<Media[]> {
    try {
      const media = await this.prisma.media.findMany({
        where: { userId },
        include: {
          messages: {
            select: {
              id: true,
              createdAt: true,
              role: true,
              content: true,
              mediaId: true,
              conversationId: true
            }
          }
        }
      });

      return media.map(this.mapPrismaMediaToMedia);
    } catch (error) {
      throw new DatabaseError(`Failed to find media by user ID: ${error}`);
    }
  }

  async create(media: CreateMediaDto): Promise<Media> {
    try {
      const newMedia = await this.prisma.media.create({
        data: {
          url: media.url,
          type: media.type,
          summary: media.summary,
          userId: media.userId
        },
        include: {
          user: {
            select: {
              id: true,
              phoneNumber: true,
              name: true
            }
          },
          messages: {
            select: {
              id: true,
              createdAt: true,
              role: true,
              content: true,
              mediaId: true,
              conversationId: true
            }
          }
        }
      });

      return this.mapPrismaMediaToMedia(newMedia);
    } catch (error) {
      throw new DatabaseError(`Failed to create media: ${error}`);
    }
  }

  async update(id: string, updates: UpdateMediaDto): Promise<Media> {
    try {
      const updatedMedia = await this.prisma.media.update({
        where: { id },
        data: {
          summary: updates.summary
        },
        include: {
          user: {
            select: {
              id: true,
              phoneNumber: true,
              name: true
            }
          },
          messages: {
            select: {
              id: true,
              createdAt: true,
              role: true,
              content: true,
              mediaId: true,
              conversationId: true
            }
          }
        }
      });

      return this.mapPrismaMediaToMedia(updatedMedia);
    } catch (error) {
      throw new DatabaseError(`Failed to update media: ${error}`);
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.prisma.media.delete({
        where: { id }
      });
    } catch (error) {
      throw new DatabaseError(`Failed to delete media: ${error}`);
    }
  }

  async deleteByUserId(userId: string): Promise<void> {
    try {
      await this.prisma.media.deleteMany({
        where: { userId }
      });
    } catch (error) {
      throw new DatabaseError(`Failed to delete media by user ID: ${error}`);
    }
  }
}
