import { Conversation, CreateConversationDto } from '../../entities/Conversation';

export interface IConversationRepository {
  findById(id: string): Promise<Conversation | null>;
  findByUserId(userId: string): Promise<Conversation[]>;
  findByGroupId(groupId: string): Promise<Conversation[]>;
  findActiveByUserId(userId: string): Promise<Conversation | null>;
  findActiveByGroupId(groupId: string): Promise<Conversation | null>;
  create(conversation: CreateConversationDto): Promise<Conversation>;
  update(id: string, data: Partial<Conversation>): Promise<Conversation>;
  delete(id: string): Promise<void>;
  deleteByUserId(userId: string): Promise<void>;
  deleteByGroupId(groupId: string): Promise<void>;
  cleanupOldConversations(days: number): Promise<number>;
}
