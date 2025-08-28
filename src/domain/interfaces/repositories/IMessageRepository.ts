import { Message, CreateMessageDto } from '../../entities/Message';

export interface IMessageRepository {
  findById(id: string): Promise<Message | null>;
  findByConversationId(conversationId: string, limit?: number): Promise<Message[]>;
  create(message: CreateMessageDto): Promise<Message>;
  delete(id: string): Promise<void>;
  deleteByConversationId(conversationId: string): Promise<void>;
  getMessageCount(conversationId: string): Promise<number>;
}
