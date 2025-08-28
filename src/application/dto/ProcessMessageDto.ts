export interface ProcessMessageDto {
  phoneNumber: string;
  message: string;
  userName?: string;
  hasMedia: boolean;
  mediaType?: string;
  mediaData?: {
    buffer: Buffer;
    filename: string;
    mimeType: string;
    caption?: string;
  };
}

export interface ProcessMessageResult {
  success: boolean;
  response: string;
  conversationId: string;
  mediaId?: string;
  error?: string;
}

export interface ConversationContextDto {
  messages: Array<{
    role: string;
    content: string | null;
    createdAt: Date;
    media?: {
      id: string;
      url: string;
      type: string;
      summary: string | null;
    } | null;
  }>;
  userPhone: string;
  userName?: string;
}
