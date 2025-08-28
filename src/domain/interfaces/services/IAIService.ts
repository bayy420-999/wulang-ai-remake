export interface ConversationContext {
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

export interface MediaContext {
  type: 'pdf' | 'image';
  content: string;
  filename?: string;
  mimeType?: string;
  data?: string; // base64 data for images
}

export interface ModerationResult {
  isAppropriate: boolean;
  reason?: string;
  categories?: any;
  scores?: any;
}

export interface IAIService {
  generateResponse(userMessage: string, context: ConversationContext, mediaContext?: MediaContext[]): Promise<string>;
  generateWelcomeMessage(userName?: string): Promise<string>;
  generateResetMessage(): Promise<string>;
  analyzeMedia(mediaContext: MediaContext): Promise<string>;
  analyzeMediaWithCaption(mediaContext: MediaContext, userCaption: string): Promise<string>;
  moderateContent(content: string): Promise<ModerationResult>;
}
