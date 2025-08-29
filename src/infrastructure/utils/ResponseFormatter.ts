import TurndownService from 'turndown';

export class ResponseFormatter {
  private turndownService: TurndownService;

  constructor() {
    this.turndownService = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
      emDelimiter: '*',
      strongDelimiter: '**',
      bulletListMarker: '-',
      linkStyle: 'inlined',
      linkReferenceStyle: 'full'
    });

    // Customize turndown for WhatsApp-friendly output
    this.turndownService.addRule('whatsappCode', {
      filter: ['code'],
      replacement: function (content) {
        return `\`${content}\``;
      }
    });

    this.turndownService.addRule('whatsappPre', {
      filter: ['pre'],
      replacement: function (content) {
        return `\`\`\`\n${content}\n\`\`\``;
      }
    });

    this.turndownService.addRule('whatsappBlockquote', {
      filter: ['blockquote'],
      replacement: function (content) {
        return content.split('\n').map(line => `> ${line}`).join('\n');
      }
    });
  }

  /**
   * Convert markdown response to WhatsApp-friendly plain text
   * @param markdownResponse - The markdown response from OpenAI
   * @returns WhatsApp-friendly plain text
   */
  formatForWhatsApp(markdownResponse: string): string {
    if (!markdownResponse) {
      return '';
    }

    try {
      // First, convert any HTML that might be in the response to markdown
      let cleanMarkdown = markdownResponse;
      
      // If the response contains HTML tags, convert them to markdown first
      if (this.containsHTML(markdownResponse)) {
        cleanMarkdown = this.turndownService.turndown(markdownResponse);
      }

      // Now convert markdown to WhatsApp-friendly plain text
      return this.markdownToWhatsAppText(cleanMarkdown);
    } catch (error) {
      console.error('Error formatting response for WhatsApp:', error);
      // Fallback: return the original response with basic markdown stripping
      return this.stripBasicMarkdown(markdownResponse);
    }
  }

  /**
   * Convert markdown to WhatsApp-friendly plain text
   * @param markdown - Markdown text
   * @returns Plain text suitable for WhatsApp
   */
  private markdownToWhatsAppText(markdown: string): string {
    let text = markdown;

    // Remove markdown headers (keep the text)
    text = text.replace(/^#{1,6}\s+/gm, '');

    // Convert bold markdown to WhatsApp bold
    text = text.replace(/\*\*(.*?)\*\*/g, '*$1*');
    text = text.replace(/__(.*?)__/g, '*$1*');

    // Convert italic markdown to WhatsApp italic
    text = text.replace(/\*(.*?)\*/g, '_$1_');
    text = text.replace(/_(.*?)_/g, '_$1_');

    // Convert strikethrough
    text = text.replace(/~~(.*?)~~/g, '~$1~');

    // Convert code blocks to monospace
    text = text.replace(/```([\s\S]*?)```/g, '```\n$1\n```');
    text = text.replace(/`([^`]+)`/g, '`$1`');

    // Convert blockquotes
    text = text.replace(/^>\s*(.*)$/gm, '> $1');

    // Convert lists
    text = text.replace(/^[-*+]\s+(.*)$/gm, '• $1');
    text = text.replace(/^\d+\.\s+(.*)$/gm, '• $1');

    // Convert links (keep the text, remove the URL)
    text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

    // Remove horizontal rules
    text = text.replace(/^[-*_]{3,}$/gm, '');

    // Clean up excessive whitespace
    text = text.replace(/\n\s*\n\s*\n/g, '\n\n');
    text = text.replace(/^\s+|\s+$/gm, '');

    // Ensure proper line breaks for WhatsApp
    text = text.replace(/\n\n/g, '\n');
    text = text.replace(/\n/g, '\n');

    return text.trim();
  }

  /**
   * Check if text contains HTML tags
   * @param text - Text to check
   * @returns True if HTML tags are found
   */
  private containsHTML(text: string): boolean {
    const htmlRegex = /<[^>]*>/;
    return htmlRegex.test(text);
  }

  /**
   * Fallback method to strip basic markdown
   * @param text - Text with markdown
   * @returns Plain text
   */
  private stripBasicMarkdown(text: string): string {
    return text
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
      .replace(/__(.*?)__/g, '$1') // Remove bold
      .replace(/\*(.*?)\*/g, '$1') // Remove italic
      .replace(/_(.*?)_/g, '$1') // Remove italic
      .replace(/~~(.*?)~~/g, '$1') // Remove strikethrough
      .replace(/`([^`]+)`/g, '$1') // Remove inline code
      .replace(/```([\s\S]*?)```/g, '$1') // Remove code blocks
      .replace(/^#{1,6}\s+/gm, '') // Remove headers
      .replace(/^[-*+]\s+/gm, '• ') // Convert list markers
      .replace(/^\d+\.\s+/gm, '• ') // Convert numbered lists
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links
      .replace(/^>\s+/gm, '') // Remove blockquotes
      .trim();
  }

  /**
   * Format media analysis response specifically for WhatsApp
   * @param analysis - Media analysis response
   * @returns Formatted response
   */
  formatMediaAnalysis(analysis: string): string {
    if (!analysis) {
      return 'Maaf, saya tidak bisa menganalisis media ini.';
    }

    const formatted = this.formatForWhatsApp(analysis);
    
    // Add a friendly prefix for media analysis
    return `📄 *Analisis Media*\n\n${formatted}`;
  }

  /**
   * Format error response for WhatsApp
   * @param error - Error message
   * @returns Formatted error response
   */
  formatError(error: string): string {
    return `❌ *Error*\n\n${this.formatForWhatsApp(error)}`;
  }

  /**
   * Format welcome message for WhatsApp
   * @param message - Welcome message
   * @returns Formatted welcome message
   */
  formatWelcome(message: string): string {
    const formatted = this.formatForWhatsApp(message);
    return `👋 *Selamat Datang*\n\n${formatted}`;
  }
}
