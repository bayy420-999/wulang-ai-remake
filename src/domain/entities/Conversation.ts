export interface Conversation {
  id: string;
  userId?: string;
  groupId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateConversationDto {
  userId?: string;
  groupId?: string;
}
