import { ResponseFormatter } from '../infrastructure/utils/ResponseFormatter';

describe('ResponseFormatter', () => {
  let formatter: ResponseFormatter;

  beforeEach(() => {
    formatter = new ResponseFormatter();
  });

  describe('formatForWhatsApp', () => {
    it('should convert markdown headers to plain text', () => {
      const markdown = '# Header 1\n## Header 2\n### Header 3';
      const result = formatter.formatForWhatsApp(markdown);
      expect(result).toBe('Header 1\nHeader 2\nHeader 3');
    });

    it('should convert bold markdown to WhatsApp bold', () => {
      const markdown = 'This is **bold** text and __also bold__';
      const result = formatter.formatForWhatsApp(markdown);
      expect(result).toBe('This is *bold* text and *also bold*');
    });

    it('should convert italic markdown to WhatsApp italic', () => {
      const markdown = 'This is *italic* text and _also italic_';
      const result = formatter.formatForWhatsApp(markdown);
      expect(result).toBe('This is _italic_ text and _also italic_');
    });

    it('should convert strikethrough markdown', () => {
      const markdown = 'This is ~~strikethrough~~ text';
      const result = formatter.formatForWhatsApp(markdown);
      expect(result).toBe('This is ~strikethrough~ text');
    });

    it('should convert code blocks to monospace', () => {
      const markdown = '```\nconst x = 1;\n```\nAnd `inline code`';
      const result = formatter.formatForWhatsApp(markdown);
      expect(result).toBe('```\nconst x = 1;\n```\nAnd `inline code`');
    });

    it('should convert blockquotes', () => {
      const markdown = '> This is a quote\n> Multiple lines';
      const result = formatter.formatForWhatsApp(markdown);
      expect(result).toBe('> This is a quote\n> Multiple lines');
    });

    it('should convert lists', () => {
      const markdown = '- Item 1\n- Item 2\n1. Numbered item';
      const result = formatter.formatForWhatsApp(markdown);
      expect(result).toBe('• Item 1\n• Item 2\n• Numbered item');
    });

    it('should remove links but keep text', () => {
      const markdown = 'Visit [Google](https://google.com) for more info';
      const result = formatter.formatForWhatsApp(markdown);
      expect(result).toBe('Visit Google for more info');
    });

    it('should handle HTML tags', () => {
      const html = '<h1>Title</h1><p>This is <strong>bold</strong> text.</p>';
      const result = formatter.formatForWhatsApp(html);
      expect(result).toContain('Title');
      expect(result).toContain('This is *bold* text');
    });

    it('should clean up excessive whitespace', () => {
      const markdown = 'Text 1\n\n\n\nText 2\n\n\nText 3';
      const result = formatter.formatForWhatsApp(markdown);
      expect(result).toBe('Text 1\nText 2\nText 3');
    });

    it('should handle empty input', () => {
      const result = formatter.formatForWhatsApp('');
      expect(result).toBe('');
    });

    it('should handle null/undefined input', () => {
      const result = formatter.formatForWhatsApp(null as any);
      expect(result).toBe('');
    });
  });

  describe('formatMediaAnalysis', () => {
    it('should format media analysis with prefix', () => {
      const analysis = 'This is a **detailed** analysis of the media.';
      const result = formatter.formatMediaAnalysis(analysis);
      expect(result).toContain('📄 *Analisis Media*');
      expect(result).toContain('This is a *detailed* analysis of the media');
    });

    it('should handle empty analysis', () => {
      const result = formatter.formatMediaAnalysis('');
      expect(result).toBe('Maaf, saya tidak bisa menganalisis media ini.');
    });
  });

  describe('formatError', () => {
    it('should format error with prefix', () => {
      const error = 'Something went **wrong**';
      const result = formatter.formatError(error);
      expect(result).toContain('❌ *Error*');
      expect(result).toContain('Something went *wrong*');
    });
  });

  describe('formatWelcome', () => {
    it('should format welcome message with prefix', () => {
      const welcome = 'Welcome to **Kelas Inovatif**!';
      const result = formatter.formatWelcome(welcome);
      expect(result).toContain('👋 *Selamat Datang*');
      expect(result).toContain('Welcome to *Kelas Inovatif*!');
    });
  });
});
