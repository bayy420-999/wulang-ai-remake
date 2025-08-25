import { generateText, CoreMessage } from 'ai';
import { openai } from '@ai-sdk/openai';
import { env } from '../config/env';
import { Role } from '@prisma/client';

export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ConversationContext {
  messages: Array<{
    role: Role;
    content: string;
    createdAt: Date;
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

export class AIService {
  private model = openai('gpt-4o-mini');
  
  private readonly systemPrompt = `You are Wulang AI, a helpful and intelligent WhatsApp assistant. You can:

1. Have natural conversations with users
2. Process and understand PDF documents and images shared by users
3. Maintain context across conversations
4. Provide helpful, accurate, and engaging responses

Guidelines:
- Be conversational and friendly
- Keep responses concise and relevant for WhatsApp format
- If you receive media (PDF or image), analyze it and incorporate the information into your responses
- Remember the conversation context to provide coherent follow-up responses
- Use emojis appropriately to make conversations more engaging
- If asked about capabilities, mention that you can process PDFs and images

Current conversation context will be provided in the message history.`;

  /**
   * Generate AI response based on conversation history and optional media context
   */
  async generateResponse(
    userMessage: string,
    context: ConversationContext,
    mediaContext?: MediaContext[]
  ): Promise<string> {
    try {
      // Convert database messages to AI SDK format
      const messages: CoreMessage[] = [
        {
          role: 'system',
          content: this.systemPrompt
        }
      ];

      // Add conversation history
      for (const msg of context.messages) {
        messages.push({
          role: this.convertRole(msg.role),
          content: msg.content
        });
      }

      // Add media context if provided
      if (mediaContext && mediaContext.length > 0) {
        const mediaContent: Array<{
          type: 'text' | 'image';
          text?: string;
          image?: string;
        }> = [];
        
        for (const media of mediaContext) {
          if (media.type === 'image' && media.data && media.mimeType) {
            // For images, send the actual image data to the AI model
            mediaContent.push({
              type: 'image',
              image: `data:${media.mimeType};base64,${media.data}`
            });
            if (media.content) {
              mediaContent.push({
                type: 'text',
                text: `Image analysis: ${media.content}`
              });
            }
          } else if (media.type === 'pdf') {
            // For PDFs, include the extracted text content
            mediaContent.push({
              type: 'text',
              text: `[PDF - ${media.filename || 'Document'}]: ${media.content}`
            });
          }
        }

        if (mediaContent.length > 0) {
          // Create a multimodal message with both text and images
          const mediaMessage: CoreMessage = {
            role: 'user',
            content: mediaContent as any // Type assertion for multimodal content
          };
          messages.push(mediaMessage);
        }
      }

      // Add current user message
      messages.push({
        role: 'user',
        content: userMessage
      });

      // Generate response
      const { text } = await generateText({
        model: this.model,
        messages,
        temperature: 0.7,
      });

      return text;
    } catch (error) {
      console.error('AI Service Error:', error);
      throw new Error(`Failed to generate AI response: ${error}`);
    }
  }

  /**
   * Generate a welcome message for new users
   */
  async generateWelcomeMessage(userName?: string): Promise<string> {
    try {
      const greeting = userName ? `Hi ${userName}! 👋` : 'Hi there! 👋';
      
      const { text } = await generateText({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: this.systemPrompt
          },
          {
            role: 'user',
            content: `Generate a brief welcome message for a new user${userName ? ` named ${userName}` : ''}. Keep it friendly and concise for WhatsApp.`
          }
        ],
        temperature: 0.8,
      });

      return text;
    } catch (error) {
      console.error('Welcome Message Error:', error);
      // Fallback message if AI fails
      const name = userName ? ` ${userName}` : '';
      const greeting = userName ? `Hi ${userName}! 👋` : 'Hi there! 👋';
      return `${greeting}\n\nI'm Wulang AI, your WhatsApp assistant! 🤖\n\nI can help you with questions, analyze PDFs and images you share, and have conversations with context awareness.\n\nHow can I help you today?`;
    }
  }

  /**
   * Generate a reset confirmation message
   */
  async generateResetMessage(): Promise<string> {
    try {
      const { text } = await generateText({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: this.systemPrompt
          },
          {
            role: 'user',
            content: 'Generate a brief message confirming that the conversation history has been reset. Keep it friendly and concise for WhatsApp.'
          }
        ],
        temperature: 0.7,
      });

      return text;
    } catch (error) {
      console.error('Reset Message Error:', error);
      // Fallback message if AI fails
      return '🔄 Conversation reset! Our chat history has been cleared and we\'re starting fresh. How can I help you today?';
    }
  }

  /**
   * Analyze media content (images or PDFs) directly with AI
   * This method sends media to AI first to get detailed analysis
   */
  async analyzeMedia(mediaContext: MediaContext): Promise<string> {
    try {
      const messages: CoreMessage[] = [
        {
          role: 'system',
          content: `You are analyzing media content shared by a user. Provide a detailed, accurate analysis of what you see or read. For images, describe the content, objects, text, people, scenes, etc. For PDFs, summarize the key information and main points.`
        }
      ];

      if (mediaContext.type === 'image' && mediaContext.data && mediaContext.mimeType) {
        // For images, send the actual image data for vision analysis
        messages.push({
          role: 'user',
          content: [
            {
              type: 'image',
              image: `data:${mediaContext.mimeType};base64,${mediaContext.data}`
            },
            {
              type: 'text',
              text: `Please analyze this image${mediaContext.filename ? ` (${mediaContext.filename})` : ''} and provide a detailed description of what you see.`
            }
          ] as any
        });
      } else if (mediaContext.type === 'pdf') {
        // For PDFs, analyze the extracted text content
        messages.push({
          role: 'user',
          content: `Please analyze this PDF content${mediaContext.filename ? ` from "${mediaContext.filename}"` : ''} and provide a comprehensive summary:\n\n${mediaContext.content}`
        });
      }

      const { text } = await generateText({
        model: this.model,
        messages,
        temperature: 0.3, // Lower temperature for more accurate analysis
      });

      return text;
    } catch (error) {
      console.error('Media Analysis Error:', error);
      throw new Error(`Failed to analyze ${mediaContext.type}: ${error}`);
    }
  }

  /**
   * Analyze media content with user's caption/question
   * This method considers the user's specific question or caption about the media
   */
  async analyzeMediaWithCaption(mediaContext: MediaContext, userCaption: string): Promise<string> {
    try {
      const messages: CoreMessage[] = [
        {
          role: 'system',
          content: `You are analyzing media content shared by a user who has provided a specific question or caption. Focus on answering their question or addressing their caption while also providing relevant details about the media content.`
        }
      ];

      if (mediaContext.type === 'image' && mediaContext.data && mediaContext.mimeType) {
        // For images with captions, send both image and user's question/caption
        messages.push({
          role: 'user',
          content: [
            {
              type: 'image',
              image: `data:${mediaContext.mimeType};base64,${mediaContext.data}`
            },
            {
              type: 'text',
              text: `User's question/caption: "${userCaption}"\n\nPlease analyze this image${mediaContext.filename ? ` (${mediaContext.filename})` : ''} and respond to the user's question/caption while providing relevant visual details.`
            }
          ] as any
        });
      } else if (mediaContext.type === 'pdf') {
        // For PDFs with captions, focus on the user's specific question about the document
        messages.push({
          role: 'user',
          content: `User's question/caption: "${userCaption}"\n\nPlease analyze this PDF content${mediaContext.filename ? ` from "${mediaContext.filename}"` : ''} and respond to the user's question while providing relevant information from the document:\n\n${mediaContext.content}`
        });
      }

      const { text } = await generateText({
        model: this.model,
        messages,
        temperature: 0.4, // Slightly higher temperature for more conversational responses
      });

      return text;
    } catch (error) {
      console.error('Media Analysis with Caption Error:', error);
      throw new Error(`Failed to analyze ${mediaContext.type} with caption: ${error}`);
    }
  }

  /**
   * Process text content from PDF or image (legacy method - kept for compatibility)
   */
  async processMediaContent(content: string, type: 'pdf' | 'image', filename?: string): Promise<string> {
    try {
      const { text } = await generateText({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are analyzing media content shared by a user. Provide a clear, concise summary of the key information.'
          },
          {
            role: 'user',
            content: `Please analyze this ${type} content${filename ? ` from "${filename}"` : ''} and provide a summary of the key information:\n\n${content}`
          }
        ],
        temperature: 0.5,
      });

      return text;
    } catch (error) {
      console.error('Media Processing Error:', error);
      throw new Error(`Failed to process ${type} content: ${error}`);
    }
  }

  /**
   * Convert database Role enum to AI SDK role format
   */
  private convertRole(role: Role): 'user' | 'assistant' | 'system' {
    switch (role) {
      case Role.USER:
        return 'user';
      case Role.ASSISTANT:
        return 'assistant';
      case Role.SYSTEM:
        return 'system';
      default:
        return 'user';
    }
  }

  /**
   * Check if a message is appropriate (basic content filtering)
   */
  async moderateContent(content: string): Promise<{ isAppropriate: boolean; reason?: string }> {
    try {
      // Basic content moderation - you can enhance this with OpenAI's moderation API
      const inappropriate = [
        'hate', 'violence', 'harassment', 'self-harm', 
        'sexual', 'illegal', 'spam'
      ];

      const lowerContent = content.toLowerCase();
      
      for (const word of inappropriate) {
        if (lowerContent.includes(word)) {
          return {
            isAppropriate: false,
            reason: `Content contains inappropriate material: ${word}`
          };
        }
      }

      return { isAppropriate: true };
    } catch (error) {
      console.error('Content Moderation Error:', error);
      // If moderation fails, allow the content through
      return { isAppropriate: true };
    }
  }
}
