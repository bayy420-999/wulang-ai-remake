import { Media, CreateMediaDto, UpdateMediaDto } from '../../entities/Media';

export interface IMediaRepository {
  findById(id: string): Promise<Media | null>;
  findByUserId(userId: string): Promise<Media[]>;
  create(media: CreateMediaDto): Promise<Media>;
  update(id: string, data: UpdateMediaDto): Promise<Media>;
  delete(id: string): Promise<void>;
  deleteByUserId(userId: string): Promise<void>;
}
