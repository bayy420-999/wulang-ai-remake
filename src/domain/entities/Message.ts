export enum MessageRole {
  USER = 'USER',
  ASSISTANT = 'ASSISTANT',
  SYSTEM = 'SYSTEM'
}

export interface Message {
  id: string;
  role: MessageRole;
  content?: string;
  mediaId?: string;
  conversationId: string;
  createdAt: Date;
}

export interface CreateMessageDto {
  role: MessageRole;
  content?: string;
  conversationId: string;
  mediaId?: string;
}
