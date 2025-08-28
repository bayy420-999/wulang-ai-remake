import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { IAIService, ConversationContext, MediaContext, ModerationResult } from '../../../domain/interfaces/services/IAIService';
import { env } from '../../../config/env';
import { AIServiceError } from '../../../domain/errors/BotError';
import { logError, logInfo, logDebug, logWarn } from '../../../lib/logger';

export class OpenAIService implements IAIService {
  constructor() {
    // Vercel AI SDK handles configuration automatically
  }

  async generateResponse(userMessage: string, context: ConversationContext, mediaContext?: MediaContext[]): Promise<string> {
    try {
      const systemPrompt = this.buildSystemPrompt(context);
      const messages = this.buildMessages(context, userMessage, mediaContext);

      const { text } = await generateText({
        model: openai(env.OPENAI_MODEL),
        messages,
        temperature: env.TEMPERATURE,
      });

      if (!text) {
        throw new AIServiceError('No response from OpenAI');
      }

      return text;
    } catch (error) {
      logError('Error generating AI response', error as Error, 'OpenAIService');
      throw new AIServiceError(`Failed to generate response: ${error}`);
    }
  }

  async generateWelcomeMessage(userName?: string): Promise<string> {
    try {
      const welcomePrompt = userName 
        ? `Generate a warm welcome message for ${userName} in Indonesian. Keep it friendly and under 100 words.`
        : 'Generate a warm welcome message in Indonesian. Keep it friendly and under 100 words.';

      const { text } = await generateText({
        model: openai(env.OPENAI_MODEL),
        messages: [
          { role: 'system', content: 'You are a helpful AI assistant. Respond in Indonesian.' },
          { role: 'user', content: welcomePrompt }
        ],
        temperature: 0.7,
      });

      return text || 'Selamat datang! Saya siap membantu Anda.';
    } catch (error) {
      logError('Error generating welcome message', error as Error, 'OpenAIService');
      return 'Selamat datang! Saya siap membantu Anda.';
    }
  }

  async generateResetMessage(): Promise<string> {
    try {
      const { text } = await generateText({
        model: openai(env.OPENAI_MODEL),
        messages: [
          { role: 'system', content: 'You are a helpful AI assistant. Respond in Indonesian.' },
          { role: 'user', content: 'Generate a friendly message confirming that conversation history has been reset. Keep it under 50 words.' }
        ],
        temperature: 0.7,
      });

      return text || '✅ Riwayat percakapan telah direset. Mari mulai percakapan baru!';
    } catch (error) {
      logError('Error generating reset message', error as Error, 'OpenAIService');
      return '✅ Riwayat percakapan telah direset. Mari mulai percakapan baru!';
    }
  }

  async analyzeMedia(mediaContext: MediaContext): Promise<string> {
    try {
      if (mediaContext.type === 'image' && mediaContext.data) {
        // For images, generate a comprehensive summary for database storage
        const { text } = await generateText({
          model: openai(env.OPENAI_MODEL),
          messages: [
            { 
              role: 'system', 
              content: `You are a helpful AI assistant. Analyze the image and provide a comprehensive, detailed summary in Indonesian that captures all important details. This summary will be stored in a database and used for future reference, so make it as complete and detailed as possible.

Include in your analysis:
- Main subjects and objects in the image
- Colors, textures, and visual elements
- Spatial relationships and composition
- Any text, numbers, or symbols visible
- Mood, atmosphere, or context
- Technical details (if relevant)
- Any notable or unusual features

Make the summary comprehensive enough that someone could ask follow-up questions about specific details in the image and you would have the information to answer them.` 
            },
            { 
              role: 'user', 
              content: [
                { type: 'text', text: 'Please provide a comprehensive analysis of this image in Indonesian. Include all important details that could be referenced in future conversations.' },
                { type: 'image', image: mediaContext.data }
              ]
            }
          ],
          temperature: 0.3,
        });

        return text || 'Maaf, saya tidak bisa menganalisis gambar ini.';
      } else if (mediaContext.type === 'pdf') {
        // For PDFs, generate a comprehensive summary
        const { text } = await generateText({
          model: openai(env.OPENAI_MODEL),
        messages: [
            { 
              role: 'system', 
              content: `You are a helpful AI assistant. Analyze the PDF content and provide a comprehensive summary in Indonesian that captures all important information. This summary will be stored in a database and used for future reference, so make it as complete and detailed as possible.

Include in your analysis:
- Main topics and themes
- Key points and arguments
- Important data, statistics, or facts
- Structure and organization
- Any conclusions or recommendations
- Notable quotes or references
- Technical terms or concepts

Make the summary comprehensive enough that someone could ask follow-up questions about specific content and you would have the information to answer them.` 
            },
            { role: 'user', content: `Analyze this PDF content and provide a comprehensive summary in Indonesian. Include all important information that could be referenced in future conversations. Content: ${mediaContext.content}` }
          ],
        temperature: 0.3,
      });

        return text || 'Maaf, saya tidak bisa menganalisis PDF ini.';
      }

      return 'Maaf, saya tidak bisa menganalisis media ini.';
    } catch (error) {
      logError('Error analyzing media', error as Error, 'OpenAIService');
      throw new AIServiceError(`Failed to analyze media: ${error}`);
    }
  }

  async analyzeMediaWithCaption(mediaContext: MediaContext, userCaption: string): Promise<string> {
    try {
      if (mediaContext.type === 'image' && mediaContext.data) {
        // For images with caption, send both image and text
        const { text } = await generateText({
          model: openai(env.OPENAI_MODEL),
          messages: [
            { role: 'system', content: 'You are a helpful AI assistant. Analyze the image based on the user question and respond in Indonesian.' },
            { 
              role: 'user', 
              content: [
                { type: 'text', text: `Pertanyaan: ${userCaption}\n\nSilakan analisis gambar ini berdasarkan pertanyaan di atas.` },
                { type: 'image', image: mediaContext.data }
              ]
            }
          ],
          temperature: 0.3,
        });

        return text || 'Maaf, saya tidak bisa menganalisis gambar ini berdasarkan pertanyaan Anda.';
      } else if (mediaContext.type === 'pdf') {
        // For PDFs with caption, use text content
        const { text } = await generateText({
          model: openai(env.OPENAI_MODEL),
        messages: [
            { role: 'system', content: 'You are a helpful AI assistant. Analyze PDF content and respond in Indonesian.' },
            { role: 'user', content: `Analyze this PDF content based on the user's question: "${userCaption}". Provide a detailed answer in Indonesian. PDF content: ${mediaContext.content}` }
        ],
        temperature: 0.3,
      });

        return text || 'Maaf, saya tidak bisa menganalisis PDF ini berdasarkan pertanyaan Anda.';
      }

      return 'Maaf, saya tidak bisa menganalisis media ini berdasarkan pertanyaan Anda.';
    } catch (error) {
      logError('Error analyzing media with caption', error as Error, 'OpenAIService');
      throw new AIServiceError(`Failed to analyze media with caption: ${error}`);
    }
  }

  async moderateContent(content: string): Promise<ModerationResult> {
    try {
      // Using Vercel AI SDK for content moderation
      const { text } = await generateText({
        model: openai(env.OPENAI_MODEL),
        messages: [
          { role: 'system', content: 'You are a content moderation system. Analyze the following content and respond with only "APPROPRIATE" or "INAPPROPRIATE".' },
          { role: 'user', content: `Analyze this content: ${content}` }
        ],
        temperature: 0,
      });

      const isAppropriate = text?.toLowerCase().includes('appropriate') || false;

      return {
        isAppropriate,
        categories: {},
        scores: {}
      };
    } catch (error) {
      logError('Error moderating content', error as Error, 'OpenAIService');
      // Default to allowing content if moderation fails
      return { isAppropriate: true };
    }
  }

  private buildSystemPrompt(context: ConversationContext): string {
    const userName = context.userName || 'User';
    return `You are ${env.BOT_NAME}, a helpful AI assistant. You are chatting with ${userName} (${context.userPhone}).

Key Guidelines:
- Always respond in Indonesian
- Be friendly, helpful, and professional
- Keep responses concise but informative
- If you don't know something, say so honestly
- Maintain context from previous messages
- Be respectful and avoid harmful content

Current conversation context: ${context.messages.length} previous messages`;
  }

  private buildMessages(context: ConversationContext, userMessage: string, mediaContext?: MediaContext[]): any[] {
    const messages: any[] = [
      { role: 'system', content: this.buildSystemPrompt(context) }
    ];

    logInfo(`🧠 Building AI messages for conversation with ${context.messages.length} total messages`, 'OpenAIService');
    logDebug(`Building messages for conversation with ${context.messages.length} total messages`, 'OpenAIService');

    // Add conversation history (limited to last 10 messages)
    const recentMessages = context.messages.slice(-10);
    logInfo(`📚 Using last ${recentMessages.length} messages from conversation history`, 'OpenAIService');
    logDebug(`Using last ${recentMessages.length} messages from conversation history`, 'OpenAIService');
    
    let messageCount = 0;
    let userMessageCount = 0;
    let assistantMessageCount = 0;
    let systemMessageCount = 0;
    let mediaContextCount = 0;
    let skippedMessageCount = 0;
    
    for (const msg of recentMessages) {
      if (msg.content) {
        // Simplified role mapping - just convert to lowercase
        let openAIRole: 'system' | 'user' | 'assistant';
        const roleLower = msg.role.toLowerCase();
        
        if (roleLower === 'user' || roleLower === 'assistant' || roleLower === 'system') {
          openAIRole = roleLower as 'system' | 'user' | 'assistant';
        } else {
          logWarn(`Unknown role: ${msg.role}, defaulting to user`, 'OpenAIService');
          openAIRole = 'user'; // Default instead of skipping
        }
        
        // Count messages by role
        switch (openAIRole) {
          case 'user':
            userMessageCount++;
            break;
          case 'assistant':
            assistantMessageCount++;
            break;
          case 'system':
            systemMessageCount++;
            break;
        }
        
        // Build message content with media context if available
        let messageContent: any = msg.content;
        
        // If message has media context, include it in the message
        if (msg.media && msg.media.summary) {
          const mediaInfo = `[MEDIA CONTEXT - ${msg.media.type.toUpperCase()}]\n\n**Complete Media Analysis:**\n${msg.media.summary}\n\n**Original User Message:** ${msg.content}`;
          messageContent = mediaInfo;
          mediaContextCount++;
          logInfo(`📎 Including comprehensive media context for message: ${msg.media.type}`, 'OpenAIService');
        }
        
        messages.push({
          role: openAIRole,
          content: messageContent
        });
        messageCount++;
        logInfo(`📝 Added message to AI context: [${openAIRole.toUpperCase()}] ${messageContent.substring(0, 100)}${messageContent.length > 100 ? '...' : ''}`, 'OpenAIService');
        logDebug(`Added message: role=${openAIRole}, content=${messageContent.substring(0, 50)}...`, 'OpenAIService');
      } else {
        skippedMessageCount++;
        logDebug(`Skipping message with no content: role=${msg.role}`, 'OpenAIService');
      }
    }

    // Build the user message content
    let userContent: any = userMessage;

    // Add media context if present
    if (mediaContext && mediaContext.length > 0) {
      const imageContexts = mediaContext.filter(mc => mc.type === 'image' && mc.data);
      const otherContexts = mediaContext.filter(mc => mc.type !== 'image');

      logInfo(`🖼️ Processing media context: ${imageContexts.length} images, ${otherContexts.length} other media`, 'OpenAIService');
      logDebug(`Processing media context: ${imageContexts.length} images, ${otherContexts.length} other media`, 'OpenAIService');

      if (imageContexts.length > 0) {
        // If we have images, create a multi-modal message
        const contentArray: any[] = [];
        
        // Add text content
        if (userMessage.trim()) {
          contentArray.push({ type: 'text', text: userMessage });
        }
        
        // Add other media info
        if (otherContexts.length > 0) {
          const otherMediaInfo = otherContexts.map(mc => 
            `${mc.type.toUpperCase()}: ${mc.filename || 'unnamed file'}`
          ).join(', ');
          contentArray.push({ type: 'text', text: `\n\n[Media attached: ${otherMediaInfo}]` });
        }
        
        // Add images
        for (const imageContext of imageContexts) {
          if (imageContext.data) {
            contentArray.push({ type: 'image', image: imageContext.data });
            logInfo(`🖼️ Added image to message: ${imageContext.filename}`, 'OpenAIService');
            logDebug(`Added image to message: ${imageContext.filename}`, 'OpenAIService');
          }
        }
        
        userContent = contentArray;
      } else {
        // Only non-image media, add as text info
        const mediaInfo = otherContexts.map(mc => 
        `${mc.type.toUpperCase()}: ${mc.filename || 'unnamed file'}`
      ).join(', ');
        userContent = userMessage + `\n\n[Media attached: ${mediaInfo}]`;
      }
    }

    messages.push({ role: 'user', content: userContent });
    messageCount++;
    userMessageCount++;
    
    // Comprehensive logging of message statistics
    logInfo(`📊 AI Context Statistics:`, 'OpenAIService');
    logInfo(`   - Total messages: ${messageCount}`, 'OpenAIService');
    logInfo(`   - User messages: ${userMessageCount}`, 'OpenAIService');
    logInfo(`   - Assistant messages: ${assistantMessageCount}`, 'OpenAIService');
    logInfo(`   - System messages: ${systemMessageCount}`, 'OpenAIService');
    logInfo(`   - Messages with media context: ${mediaContextCount}`, 'OpenAIService');
    logInfo(`   - Skipped messages: ${skippedMessageCount}`, 'OpenAIService');
    
    logInfo(`✅ Final message count: ${messages.length}`, 'OpenAIService');
    logDebug(`Final message count: ${messages.length}`, 'OpenAIService');
    
    // Log the complete message structure being sent to AI
    logInfo(`🤖 Complete AI Context Structure:`, 'OpenAIService');
    messages.forEach((msg, index) => {
      const role = msg.role.toUpperCase();
      const contentPreview = typeof msg.content === 'string' 
        ? msg.content.substring(0, 100) + (msg.content.length > 100 ? '...' : '')
        : `[Multi-modal content: ${Array.isArray(msg.content) ? msg.content.length : 1} parts]`;
      logInfo(`   ${index + 1}. [${role}]: ${contentPreview}`, 'OpenAIService');
    });
    
    return messages;
  }
}
