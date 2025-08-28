export interface Conversation {
  id: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateConversationDto {
  userId: string;
}
