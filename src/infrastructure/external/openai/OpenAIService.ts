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
        ? `Buat pesan selamat datang yang hangat untuk ${userName} sebagai Wulang, asisten virtual dari Kelas Inovatif. Sambut mereka ke komunitas penulisan akademik dan jelaskan bagaimana kamu dapat membantu kebutuhan penulisan akademik mereka. Buat pesan yang ramah, profesional, dan di bawah 150 kata dalam bahasa Indonesia.`
        : 'Buat pesan selamat datang yang hangat sebagai Wulang, asisten virtual dari Kelas Inovatif. Sambut mereka ke komunitas penulisan akademik dan jelaskan bagaimana kamu dapat membantu kebutuhan penulisan akademik mereka. Buat pesan yang ramah, profesional, dan di bawah 150 kata dalam bahasa Indonesia.';

      // Create a minimal context for the system prompt
      const context: ConversationContext = {
        userPhone: 'User',
        userName: userName || 'User',
        messages: []
      };

      const { text } = await generateText({
        model: openai(env.OPENAI_MODEL),
        messages: [
          { role: 'system', content: this.buildSystemPrompt(context) },
          { role: 'user', content: welcomePrompt }
        ],
        temperature: 0.7,
      });

      return text || 'Selamat datang di Kelas Inovatif! Saya Wulang, asisten virtual yang siap membantu Anda dalam penulisan karya ilmiah.';
    } catch (error) {
      logError('Error generating welcome message', error as Error, 'OpenAIService');
      return 'Selamat datang di Kelas Inovatif! Saya Wulang, asisten virtual yang siap membantu Anda dalam penulisan karya ilmiah.';
    }
  }

  async generateResetMessage(): Promise<string> {
    try {
      // Create a minimal context for the system prompt
      const context: ConversationContext = {
        userPhone: 'User',
        userName: 'User',
        messages: []
      };

      const { text } = await generateText({
        model: openai(env.OPENAI_MODEL),
        messages: [
          { role: 'system', content: this.buildSystemPrompt(context) },
          { role: 'user', content: 'Buat pesan ramah yang mengkonfirmasi bahwa riwayat percakapan telah direset dan kita dapat memulai segar dengan bantuan penulisan akademik. Buat pesan di bawah 60 kata.' }
        ],
        temperature: 0.7,
      });

      return text || '✅ Riwayat percakapan telah direset. Mari mulai sesi baru untuk membantu Anda dengan penulisan karya ilmiah!';
    } catch (error) {
      logError('Error generating reset message', error as Error, 'OpenAIService');
      return '✅ Riwayat percakapan telah direset. Mari mulai sesi baru untuk membantu Anda dengan penulisan karya ilmiah!';
    }
  }

  async analyzeMedia(mediaContext: MediaContext): Promise<string> {
    try {
      // Create a minimal context for the system prompt
      const context: ConversationContext = {
        userPhone: 'User',
        userName: 'User',
        messages: []
      };

      if (mediaContext.type === 'image' && mediaContext.data) {
        // For images, generate a comprehensive summary for database storage
        const { text } = await generateText({
          model: openai(env.OPENAI_MODEL),
          messages: [
            { 
              role: 'system', 
              content: this.buildSystemPrompt(context) + `

TUGAS KHUSUS ANALISIS GAMBAR:
Analisis gambar ini dan berikan ringkasan komprehensif dalam bahasa Indonesia yang menangkap semua detail penting. Ringkasan ini akan disimpan dalam database dan digunakan untuk referensi masa depan, jadi buatlah selengkap dan sedetail mungkin.

Sertakan dalam analisis Anda:
- Subjek dan objek utama dalam gambar
- Warna, tekstur, dan elemen visual
- Hubungan spasial dan komposisi
- Teks, angka, atau simbol yang terlihat
- Suasana, atmosfer, atau konteks
- Detail teknis (jika relevan)
- Fitur yang menonjol atau tidak biasa
- Relevansi akademik (jika berlaku)

Buat ringkasan yang komprehensif sehingga seseorang dapat mengajukan pertanyaan lanjutan tentang detail spesifik dalam gambar dan Anda memiliki informasi untuk menjawabnya.` 
            },
            { 
              role: 'user', 
              content: [
                { type: 'text', text: 'Silakan berikan analisis komprehensif gambar ini dalam bahasa Indonesia. Sertakan semua detail penting yang dapat direferensikan dalam percakapan masa depan.' },
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
              content: this.buildSystemPrompt(context) + `

TUGAS KHUSUS ANALISIS PDF:
Analisis konten PDF ini dan berikan ringkasan komprehensif dalam bahasa Indonesia yang menangkap semua informasi penting. Ringkasan ini akan disimpan dalam database dan digunakan untuk referensi masa depan, jadi buatlah selengkap dan sedetail mungkin.

Sertakan dalam analisis Anda:
- Topik dan tema utama
- Poin-poin kunci dan argumen
- Data, statistik, atau fakta penting
- Struktur dan organisasi
- Kesimpulan atau rekomendasi
- Kutipan atau referensi yang menonjol
- Istilah teknis atau konsep
- Gaya penulisan akademik dan metodologi (jika berlaku)
- Implikasi penelitian dan aplikasi

Buat ringkasan yang komprehensif sehingga seseorang dapat mengajukan pertanyaan lanjutan tentang konten spesifik dan Anda memiliki informasi untuk menjawabnya.` 
            },
            { role: 'user', content: `Analisis konten PDF ini dan berikan ringkasan komprehensif dalam bahasa Indonesia. Sertakan semua informasi penting yang dapat direferensikan dalam percakapan masa depan. Konten: ${mediaContext.content}` }
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
      // Create a minimal context for the system prompt
      const context: ConversationContext = {
        userPhone: 'User',
        userName: 'User',
        messages: []
      };

      if (mediaContext.type === 'image' && mediaContext.data) {
        // For images with caption, send both image and text
        const { text } = await generateText({
          model: openai(env.OPENAI_MODEL),
          messages: [
            { role: 'system', content: this.buildSystemPrompt(context) },
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
            { role: 'system', content: this.buildSystemPrompt(context) },
            { role: 'user', content: `Analisis konten PDF ini berdasarkan pertanyaan pengguna: "${userCaption}". Berikan jawaban detail dalam bahasa Indonesia. Konten PDF: ${mediaContext.content}` }
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
      // Create a minimal context for the system prompt
      const context: ConversationContext = {
        userPhone: 'User',
        userName: 'User',
        messages: []
      };

      // Using Vercel AI SDK for content moderation
      const { text } = await generateText({
        model: openai(env.OPENAI_MODEL),
        messages: [
          { role: 'system', content: this.buildSystemPrompt(context) + '\n\nTUGAS KHUSUS MODERASI: Analisis konten berikut untuk kesesuaian akademik dan respons dengan hanya "APPROPRIATE" atau "INAPPROPRIATE".' },
          { role: 'user', content: `Analisis konten ini: ${content}` }
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
    return `Kamu adalah Wulang, seorang virtual assistant dari Kelas Inovatif yang membantu mahasiswa, dosen, dan peneliti dalam penulisan karya ilmiah. Kamu memiliki keahlian lintas bidang akademik dan berperan memberikan saran, panduan praktis, serta contoh yang dapat langsung diterapkan, dengan tetap menjaga kualitas dan integritas akademik.

Kamu juga memahami pentingnya menghindari plagiasi, sehingga setiap interaksi diarahkan untuk menghasilkan karya tulis yang orisinal, bermutu tinggi, dan etis.

Prinsip Interaksi:
- Memberikan jawaban yang jelas, sistematis, dan terstruktur
- Menyertakan contoh praktis bila relevan
- Menjelaskan alasan atau dasar pemikiran di balik setiap saran
- Mendorong pemanfaatan teknologi AI secara etis dan bertanggung jawab
- Menyediakan informasi mengenai workshop, seminar, dan webinar akademik yang akan datang

Respons Khusus:
- Jika ditanya tentang identitasmu: "Halo, saya Wulang, asisten virtual dari Kelas Inovatif yang membantu mahasiswa, dosen, dan peneliti dalam penulisan karya ilmiah."
- Jika user mengatakan "Wulang, Say Hello": Sambut anggota baru komunitas Kelas Inovatif dengan ucapan selamat datang
- Jika user mengatakan "Wulang, Info Seminar": Berikan informasi terkini mengenai seminar atau webinar yang akan datang
- Jika user mengatakan "Wulang, perkenalkan diri": Uraikan peranmu sebagai asisten virtual Kelas Inovatif
- Jika user mengatakan "Wulang, jelaskan tentang Kelas Inovatif": Jelaskan komunitas Kelas Inovatif dan peran AI dalam mendukung penulisan ilmiah

Kamu sedang berbicara dengan ${userName} (${context.userPhone}).
Konteks percakapan saat ini: ${context.messages.length} pesan sebelumnya`;
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
