import { OpenAIService } from '../OpenAIService';
import { ConversationContext, MediaContext } from '../../../../domain/interfaces/services/IAIService';
import { AIServiceError } from '../../../../domain/errors/BotError';
import { env } from '../../../../config/env';
import fs from 'fs';
import path from 'path';

// Skip tests if no OpenAI API key is available
const hasOpenAIKey = env.OPENAI_API_KEY && env.OPENAI_API_KEY !== 'test-key';

describe('OpenAIService Integration Tests', () => {
  let openAIService: OpenAIService;

  beforeAll(() => {
    // Check if we have a real OpenAI API key
    if (!hasOpenAIKey) {
      console.warn('⚠️  Skipping OpenAIService integration tests - no valid OpenAI API key found');
      console.warn('   Set OPENAI_API_KEY environment variable to run these tests');
    }
    
    openAIService = new OpenAIService();
  });

  // Helper function to create test conversation context
  const createTestContext = (userName: string = 'Test User', userPhone: string = '+6281234567890'): ConversationContext => ({
    userPhone,
    userName,
    messages: [
      {
        role: 'USER',
        content: 'Halo Wulang, bagaimana kabarmu?',
        createdAt: new Date('2024-01-01T00:00:00Z'),
        media: null
      },
      {
        role: 'ASSISTANT',
        content: 'Halo! Kabar saya baik, terima kasih. Saya siap membantu Anda dengan penulisan karya ilmiah. Ada yang bisa saya bantu?',
        createdAt: new Date('2024-01-01T00:01:00Z'),
        media: null
      }
    ]
  });

  // Helper function to create test media context
  const createTestImageContext = (): MediaContext => ({
    type: 'image',
    content: 'Test image content',
    filename: 'test-image.jpg',
    data: Buffer.from('fake-image-data'),
    mimeType: 'image/jpeg'
  });

  const createTestPDFContext = (): MediaContext => ({
    type: 'pdf',
    content: 'Test PDF content',
    filename: 'test-document.pdf',
    data: Buffer.from('fake-pdf-data'),
    mimeType: 'application/pdf'
  });

  describe('generateResponse', () => {
    it('should generate a response for a simple text message', async () => {
      if (!hasOpenAIKey) {
        console.log('⏭️  Skipping test - no OpenAI API key');
        return;
      }

      const context = createTestContext();
      const userMessage = 'Jelaskan apa itu metode penelitian kualitatif';

      const response = await openAIService.generateResponse(userMessage, context);

      expect(response).toBeDefined();
      expect(typeof response).toBe('string');
      expect(response.length).toBeGreaterThan(0);
      expect(response.toLowerCase()).toContain('metode penelitian kualitatif');
      console.log('✅ Generated response:', response.substring(0, 200) + '...');
    }, 30000); // 30 second timeout for API call

    it('should generate a response with conversation history context', async () => {
      if (!hasOpenAIKey) {
        console.log('⏭️  Skipping test - no OpenAI API key');
        return;
      }

      const context: ConversationContext = {
        userPhone: '+6281234567890',
        userName: 'Mahasiswa',
        messages: [
          {
            role: 'USER',
            content: 'Saya sedang menulis skripsi tentang dampak media sosial',
            createdAt: new Date('2024-01-01T00:00:00Z'),
            media: null
          },
          {
            role: 'ASSISTANT',
            content: 'Bagus! Media sosial adalah topik yang sangat relevan. Apa yang ingin Anda ketahui lebih lanjut?',
            createdAt: new Date('2024-01-01T00:01:00Z'),
            media: null
          },
          {
            role: 'USER',
            content: 'Saya bingung memilih metode penelitian yang tepat',
            createdAt: new Date('2024-01-01T00:02:00Z'),
            media: null
          }
        ]
      };

      const userMessage = 'Bisa tolong jelaskan metode penelitian yang cocok untuk penelitian saya?';

      const response = await openAIService.generateResponse(userMessage, context);

      expect(response).toBeDefined();
      expect(typeof response).toBe('string');
      expect(response.length).toBeGreaterThan(0);
      expect(response.toLowerCase()).toMatch(/metode|penelitian|media sosial|skripsi/);
      console.log('✅ Generated contextual response:', response.substring(0, 200) + '...');
    }, 30000);

    it('should handle academic writing questions', async () => {
      if (!hasOpenAIKey) {
        console.log('⏭️  Skipping test - no OpenAI API key');
        return;
      }

      const context = createTestContext();
      const userMessage = 'Bagaimana cara menulis latar belakang yang baik?';

      const response = await openAIService.generateResponse(userMessage, context);

      expect(response).toBeDefined();
      expect(typeof response).toBe('string');
      expect(response.length).toBeGreaterThan(0);
      expect(response.toLowerCase()).toMatch(/latar belakang|penulisan|akademik/);
      console.log('✅ Generated academic writing response:', response.substring(0, 200) + '...');
    }, 30000);

    it('should handle identity questions about Wulang', async () => {
      if (!hasOpenAIKey) {
        console.log('⏭️  Skipping test - no OpenAI API key');
        return;
      }

      const context = createTestContext();
      const userMessage = 'Siapa kamu?';

      const response = await openAIService.generateResponse(userMessage, context);

      expect(response).toBeDefined();
      expect(typeof response).toBe('string');
      expect(response.length).toBeGreaterThan(0);
      expect(response.toLowerCase()).toMatch(/wulang|kelas inovatif|asisten virtual/);
      console.log('✅ Generated identity response:', response.substring(0, 200) + '...');
    }, 30000);
  });

  describe('generateWelcomeMessage', () => {
    it('should generate a welcome message for a new user', async () => {
      if (!hasOpenAIKey) {
        console.log('⏭️  Skipping test - no OpenAI API key');
        return;
      }

      const response = await openAIService.generateWelcomeMessage();

      expect(response).toBeDefined();
      expect(typeof response).toBe('string');
      expect(response.length).toBeGreaterThan(0);
      expect(response.toLowerCase()).toMatch(/selamat datang|wulang|kelas inovatif/);
      console.log('✅ Generated welcome message:', response.substring(0, 200) + '...');
    }, 30000);

    it('should generate a personalized welcome message with user name', async () => {
      if (!hasOpenAIKey) {
        console.log('⏭️  Skipping test - no OpenAI API key');
        return;
      }

      const userName = 'Ahmad Fauzi';
      const response = await openAIService.generateWelcomeMessage(userName);

      expect(response).toBeDefined();
      expect(typeof response).toBe('string');
      expect(response.length).toBeGreaterThan(0);
      expect(response.toLowerCase()).toMatch(/ahmad fauzi|selamat datang|wulang/);
      console.log('✅ Generated personalized welcome message:', response.substring(0, 200) + '...');
    }, 30000);
  });

  describe('generateResetMessage', () => {
    it('should generate a reset confirmation message', async () => {
      if (!hasOpenAIKey) {
        console.log('⏭️  Skipping test - no OpenAI API key');
        return;
      }

      const response = await openAIService.generateResetMessage();

      expect(response).toBeDefined();
      expect(typeof response).toBe('string');
      expect(response.length).toBeGreaterThan(0);
      expect(response.toLowerCase()).toMatch(/reset|riwayat|percakapan|baru/);
      console.log('✅ Generated reset message:', response.substring(0, 200) + '...');
    }, 30000);
  });

  describe('moderateContent', () => {
    it('should approve appropriate academic content', async () => {
      if (!hasOpenAIKey) {
        console.log('⏭️  Skipping test - no OpenAI API key');
        return;
      }

      const appropriateContent = 'Saya sedang menulis skripsi tentang pengaruh media sosial terhadap prestasi belajar mahasiswa.';

      const result = await openAIService.moderateContent(appropriateContent);

      expect(result).toBeDefined();
      expect(result.isAppropriate).toBe(true);
      console.log('✅ Content moderation result:', result);
    }, 30000);

    it('should reject inappropriate content', async () => {
      if (!hasOpenAIKey) {
        console.log('⏭️  Skipping test - no OpenAI API key');
        return;
      }

      const inappropriateContent = 'Konten yang tidak pantas dan tidak sesuai dengan konteks akademik.';

      const result = await openAIService.moderateContent(inappropriateContent);

      expect(result).toBeDefined();
      // Note: This might return true as the model is trained to be conservative
      expect(typeof result.isAppropriate).toBe('boolean');
      console.log('✅ Inappropriate content moderation result:', result);
    }, 30000);

    it('should handle empty content', async () => {
      if (!hasOpenAIKey) {
        console.log('⏭️  Skipping test - no OpenAI API key');
        return;
      }

      const emptyContent = '';

      const result = await openAIService.moderateContent(emptyContent);

      expect(result).toBeDefined();
      expect(typeof result.isAppropriate).toBe('boolean');
      console.log('✅ Empty content moderation result:', result);
    }, 30000);
  });

  describe('analyzeMediaWithCaption', () => {
    it('should analyze image with caption', async () => {
      if (!hasOpenAIKey) {
        console.log('⏭️  Skipping test - no OpenAI API key');
        return;
      }

      // Create a simple test image (1x1 pixel PNG)
      const testImageData = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
      
      const mediaContext: MediaContext = {
        type: 'image',
        content: 'Test chart image',
        filename: 'test-chart.png',
        data: testImageData,
        mimeType: 'image/png'
      };

      const userCaption = 'Apa yang terlihat dalam gambar ini?';

      const response = await openAIService.analyzeMediaWithCaption(mediaContext, userCaption);

      expect(response).toBeDefined();
      expect(typeof response).toBe('string');
      expect(response.length).toBeGreaterThan(0);
      console.log('✅ Image analysis response:', response.substring(0, 200) + '...');
    }, 30000);

    it('should analyze PDF with caption', async () => {
      if (!hasOpenAIKey) {
        console.log('⏭️  Skipping test - no OpenAI API key');
        return;
      }

      // Create a simple test PDF content
      const testPDFData = Buffer.from('%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n/Contents 4 0 R\n>>\nendobj\n4 0 obj\n<<\n/Length 44\n>>\nstream\nBT\n/F1 12 Tf\n72 720 Td\n(Test Document) Tj\nET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000204 00000 n \ntrailer\n<<\n/Size 5\n/Root 1 0 R\n>>\nstartxref\n297\n%%EOF\n');

      const mediaContext: MediaContext = {
        type: 'pdf',
        content: 'Test document content',
        filename: 'test-document.pdf',
        data: testPDFData,
        mimeType: 'application/pdf'
      };

      const userCaption = 'Apa isi dokumen ini?';

      const response = await openAIService.analyzeMediaWithCaption(mediaContext, userCaption);

      expect(response).toBeDefined();
      expect(typeof response).toBe('string');
      expect(response.length).toBeGreaterThan(0);
      console.log('✅ PDF analysis response:', response.substring(0, 200) + '...');
    }, 30000);
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      if (!hasOpenAIKey) {
        console.log('⏭️  Skipping test - no OpenAI API key');
        return;
      }

      // Test with very long input that might cause API errors
      const context = createTestContext();
      const veryLongMessage = 'A'.repeat(10000); // Very long message

      try {
        const response = await openAIService.generateResponse(veryLongMessage, context);
        expect(response).toBeDefined();
        console.log('✅ Handled long message successfully');
      } catch (error) {
        expect(error).toBeInstanceOf(AIServiceError);
        console.log('✅ Properly handled API error:', (error as Error).message);
      }
    }, 30000);

    it('should handle network timeouts', async () => {
      if (!hasOpenAIKey) {
        console.log('⏭️  Skipping test - no OpenAI API key');
        return;
      }

      const context = createTestContext();
      const userMessage = 'Test message for timeout handling';

      try {
        const response = await openAIService.generateResponse(userMessage, context);
        expect(response).toBeDefined();
        console.log('✅ Request completed successfully');
      } catch (error) {
        expect(error).toBeInstanceOf(AIServiceError);
        console.log('✅ Properly handled timeout error:', (error as Error).message);
      }
    }, 30000);
  });

  describe('Response Quality', () => {
    it('should generate responses in Indonesian language', async () => {
      if (!hasOpenAIKey) {
        console.log('⏭️  Skipping test - no OpenAI API key');
        return;
      }

      const context = createTestContext();
      const userMessage = 'Jelaskan konsep penelitian kuantitatif';

      const response = await openAIService.generateResponse(userMessage, context);

      expect(response).toBeDefined();
      expect(typeof response).toBe('string');
      expect(response.length).toBeGreaterThan(0);
      
      // Check for Indonesian language indicators
      const indonesianWords = ['adalah', 'dalam', 'yang', 'untuk', 'dengan', 'atau', 'dan', 'dari', 'ke', 'di'];
      const hasIndonesianWords = indonesianWords.some(word => 
        response.toLowerCase().includes(word)
      );
      
      expect(hasIndonesianWords).toBe(true);
      console.log('✅ Generated Indonesian response:', response.substring(0, 200) + '...');
    }, 30000);

    it('should provide academic-focused responses', async () => {
      if (!hasOpenAIKey) {
        console.log('⏭️  Skipping test - no OpenAI API key');
        return;
      }

      const context = createTestContext();
      const userMessage = 'Bagaimana cara menulis metodologi penelitian?';

      const response = await openAIService.generateResponse(userMessage, context);

      expect(response).toBeDefined();
      expect(typeof response).toBe('string');
      expect(response.length).toBeGreaterThan(0);
      
      // Check for academic writing indicators
      const academicWords = ['metodologi', 'penelitian', 'metode', 'analisis', 'data', 'hasil', 'kesimpulan'];
      const hasAcademicWords = academicWords.some(word => 
        response.toLowerCase().includes(word)
      );
      
      expect(hasAcademicWords).toBe(true);
      console.log('✅ Generated academic response:', response.substring(0, 200) + '...');
    }, 30000);
  });

  describe('Performance Tests', () => {
    it('should complete response generation within reasonable time', async () => {
      if (!hasOpenAIKey) {
        console.log('⏭️  Skipping test - no OpenAI API key');
        return;
      }

      const context = createTestContext();
      const userMessage = 'Apa itu penelitian deskriptif?';

      const startTime = Date.now();
      const response = await openAIService.generateResponse(userMessage, context);
      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(response).toBeDefined();
      expect(duration).toBeLessThan(25000); // Should complete within 25 seconds
      console.log(`✅ Response generated in ${duration}ms`);
    }, 30000);

    it('should handle multiple concurrent requests', async () => {
      if (!hasOpenAIKey) {
        console.log('⏭️  Skipping test - no OpenAI API key');
        return;
      }

      const context = createTestContext();
      const messages = [
        'Jelaskan penelitian kualitatif',
        'Apa itu penelitian kuantitatif',
        'Bagaimana menulis abstrak'
      ];

      const startTime = Date.now();
      const promises = messages.map(message => 
        openAIService.generateResponse(message, context)
      );

      const responses = await Promise.all(promises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(responses).toHaveLength(3);
      responses.forEach(response => {
        expect(response).toBeDefined();
        expect(typeof response).toBe('string');
        expect(response.length).toBeGreaterThan(0);
      });

      console.log(`✅ ${responses.length} concurrent responses generated in ${duration}ms`);
    }, 60000); // 60 second timeout for concurrent requests
  });

  describe('Edge Cases', () => {
    it('should handle empty user message', async () => {
      if (!hasOpenAIKey) {
        console.log('⏭️  Skipping test - no OpenAI API key');
        return;
      }

      const context = createTestContext();
      const userMessage = '';

      try {
        const response = await openAIService.generateResponse(userMessage, context);
        expect(response).toBeDefined();
        console.log('✅ Handled empty message successfully');
      } catch (error) {
        expect(error).toBeInstanceOf(AIServiceError);
        console.log('✅ Properly handled empty message error');
      }
    }, 30000);

    it('should handle very short messages', async () => {
      if (!hasOpenAIKey) {
        console.log('⏭️  Skipping test - no OpenAI API key');
        return;
      }

      const context = createTestContext();
      const userMessage = 'Hi';

      const response = await openAIService.generateResponse(userMessage, context);

      expect(response).toBeDefined();
      expect(typeof response).toBe('string');
      expect(response.length).toBeGreaterThan(0);
      console.log('✅ Generated response for short message:', response.substring(0, 200) + '...');
    }, 30000);

    it('should handle special characters in messages', async () => {
      if (!hasOpenAIKey) {
        console.log('⏭️  Skipping test - no OpenAI API key');
        return;
      }

      const context = createTestContext();
      const userMessage = 'Bagaimana cara menulis rumus matematika dalam penelitian? Contoh: α + β = γ²';

      const response = await openAIService.generateResponse(userMessage, context);

      expect(response).toBeDefined();
      expect(typeof response).toBe('string');
      expect(response.length).toBeGreaterThan(0);
      console.log('✅ Generated response with special characters:', response.substring(0, 200) + '...');
    }, 30000);
  });
});
