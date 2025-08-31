import { MediaProcessingService } from '../MediaProcessingService';
import { MediaProcessingResult } from '../../../../domain/interfaces/services/IMediaService';
import { ProcessingError } from '../../../../domain/errors/BotError';
import { logError, logInfo } from '../../../../lib/logger';
import * as fs from 'fs';
import * as path from 'path';
import pdf from 'pdf-parse';
import Jimp from 'jimp';

// Mock dependencies before imports
jest.mock('pdf-parse', () => jest.fn());
jest.mock('jimp', () => ({
  __esModule: true,
  default: {
    read: jest.fn(),
  },
}));
jest.mock('../../../../lib/logger', () => ({
  logError: jest.fn(),
  logInfo: jest.fn(),
}));

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  promises: {
    writeFile: jest.fn(),
    readdir: jest.fn(),
    stat: jest.fn(),
    unlink: jest.fn(),
  },
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
}));

describe('MediaProcessingService', () => {
  let mediaService: MediaProcessingService;
  let mockPdfParse: any;
  let mockJimp: any;
  let mockFs: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPdfParse = pdf;
    mockJimp = Jimp;
    mockFs = fs;
    mockFs.existsSync.mockReturnValue(true);
    mediaService = new MediaProcessingService();
  });

  describe('Constructor', () => {
    it('should create temp directory if it does not exist', () => {
      mockFs.existsSync.mockReturnValue(false);
      new MediaProcessingService();
      expect(mockFs.mkdirSync).toHaveBeenCalledWith(
        path.join(process.cwd(), 'temp'),
        { recursive: true }
      );
    });
  });

  describe('getMediaType', () => {
    it('should return pdf for application/pdf mime type', () => {
      expect(mediaService.getMediaType('application/pdf')).toBe('pdf');
    });

    it('should return image for image/jpeg mime type', () => {
      expect(mediaService.getMediaType('image/jpeg')).toBe('image');
    });

    it('should return unsupported for text/plain mime type', () => {
      expect(mediaService.getMediaType('text/plain')).toBe('unsupported');
    });
  });

  describe('validateFileSize', () => {
    it('should return true for file size within limit', () => {
      const buffer = Buffer.alloc(5 * 1024 * 1024); // 5MB
      expect(mediaService.validateFileSize(buffer, 10)).toBe(true);
    });

    it('should return false for file size exceeding limit', () => {
      const buffer = Buffer.alloc(15 * 1024 * 1024); // 15MB
      expect(mediaService.validateFileSize(buffer, 10)).toBe(false);
    });
  });

  describe('processPDF', () => {
    const mockBuffer = Buffer.from('test pdf content');
    const mockFilename = 'test.pdf';

    it('should process PDF successfully', async () => {
      const mockPdfData = {
        text: 'Extracted PDF text content',
        numpages: 5,
        info: { Title: 'Test PDF' }
      };
      mockPdfParse.mockResolvedValue(mockPdfData);

      const result = await mediaService.processPDF(mockBuffer, mockFilename);

      expect(result).toEqual({
        type: 'pdf',
        content: 'Extracted PDF text content',
        filename: mockFilename,
        metadata: {
          pages: 5,
          info: { Title: 'Test PDF' }
        }
      });
    });

    it('should throw ProcessingError when PDF processing fails', async () => {
      const error = new Error('PDF parsing failed');
      mockPdfParse.mockRejectedValue(error);

      await expect(mediaService.processPDF(mockBuffer, mockFilename))
        .rejects.toThrow(ProcessingError);
    });
  });

  describe('processImage', () => {
    const mockBuffer = Buffer.from('test image content');
    const mockFilename = 'test.jpg';

    it('should process image successfully', async () => {
      const mockImage = {
        getWidth: jest.fn().mockReturnValue(1920),
        getHeight: jest.fn().mockReturnValue(1080),
        getExtension: jest.fn().mockReturnValue('jpg'),
      };
      mockJimp.read.mockResolvedValue(mockImage as any);

      const result = await mediaService.processImage(mockBuffer, mockFilename);

      expect(result.type).toBe('image');
      expect(result.metadata?.width).toBe(1920);
      expect(result.metadata?.height).toBe(1080);
    });

    it('should throw ProcessingError when image processing fails', async () => {
      const error = new Error('Image processing failed');
      mockJimp.read.mockRejectedValue(error);

      await expect(mediaService.processImage(mockBuffer, mockFilename))
        .rejects.toThrow(ProcessingError);
    });
  });

  describe('processMedia', () => {
    const mockBuffer = Buffer.from('test content');
    const mockFilename = 'test.file';

    it('should process PDF media type', async () => {
      const mockPdfData = {
        text: 'PDF content',
        numpages: 1,
        info: {}
      };
      mockPdfParse.mockResolvedValue(mockPdfData);

      const result = await mediaService.processMedia(mockBuffer, mockFilename, 'application/pdf');
      expect(result.type).toBe('pdf');
    });

    it('should process image media type', async () => {
      const mockImage = {
        getWidth: jest.fn().mockReturnValue(100),
        getHeight: jest.fn().mockReturnValue(100),
        getExtension: jest.fn().mockReturnValue('jpg'),
      };
      mockJimp.read.mockResolvedValue(mockImage as any);

      const result = await mediaService.processMedia(mockBuffer, mockFilename, 'image/jpeg');
      expect(result.type).toBe('image');
    });

    it('should throw ProcessingError for unsupported media type', async () => {
      await expect(mediaService.processMedia(mockBuffer, mockFilename, 'text/plain'))
        .rejects.toThrow(ProcessingError);
    });
  });

  describe('saveTemporaryFile', () => {
    const mockBuffer = Buffer.from('test content');
    const mockFilename = 'test.txt';

    it('should save temporary file successfully', async () => {
      const expectedPath = path.join(process.cwd(), 'temp', mockFilename);
      mockFs.promises.writeFile.mockResolvedValue(undefined);

      const result = await mediaService.saveTemporaryFile(mockBuffer, mockFilename);

      expect(result).toBe(expectedPath);
      expect(mockFs.promises.writeFile).toHaveBeenCalledWith(expectedPath, mockBuffer);
    });

    it('should throw ProcessingError when file save fails', async () => {
      const error = new Error('Write failed');
      mockFs.promises.writeFile.mockRejectedValue(error);

      await expect(mediaService.saveTemporaryFile(mockBuffer, mockFilename))
        .rejects.toThrow(ProcessingError);
    });
  });

  describe('cleanupTemporaryFile', () => {
    const mockFilePath = '/temp/test.txt';

    it('should delete existing file successfully', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.promises.unlink.mockResolvedValue(undefined);

      await mediaService.cleanupTemporaryFile(mockFilePath);

      expect(mockFs.promises.unlink).toHaveBeenCalledWith(mockFilePath);
    });

    it('should not attempt to delete non-existent file', async () => {
      mockFs.existsSync.mockReturnValue(false);

      await mediaService.cleanupTemporaryFile(mockFilePath);

      expect(mockFs.promises.unlink).not.toHaveBeenCalled();
    });
  });

  describe('cleanupOldTempFiles', () => {
    it('should cleanup old files successfully', async () => {
      const mockFiles = ['old1.txt', 'old2.txt'];
      const mockStats = {
        mtime: new Date(Date.now() - 25 * 60 * 60 * 1000) // 25 hours ago
      };
      
      mockFs.promises.readdir.mockResolvedValue(mockFiles as any);
      mockFs.promises.stat.mockResolvedValue(mockStats as any);
      mockFs.promises.unlink.mockResolvedValue(undefined);

      await mediaService.cleanupOldTempFiles(24);

      expect(mockFs.promises.unlink).toHaveBeenCalledTimes(2);
    });

    it('should handle cleanup errors gracefully', async () => {
      const error = new Error('Cleanup failed');
      mockFs.promises.readdir.mockRejectedValue(error);

      await mediaService.cleanupOldTempFiles(24);

      expect(logError).toHaveBeenCalledWith(
        'Error cleaning up old temporary files',
        error,
        'MediaProcessingService'
      );
    });
  });

  describe('Integration Tests', () => {
    describe('Real PDF Processing', () => {
      it('should process a simple PDF buffer', async () => {
        const pdfBuffer = Buffer.from('%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n/Contents 4 0 R\n>>\nendobj\n4 0 obj\n<<\n/Length 44\n>>\nstream\nBT\n/F1 12 Tf\n72 720 Td\n(Hello World) Tj\nET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000204 00000 n \ntrailer\n<<\n/Size 5\n/Root 1 0 R\n>>\nstartxref\n297\n%%EOF');
        
        const mockPdfData = {
          text: 'Hello World',
          numpages: 1,
          info: { Title: 'Test PDF' }
        };
        
        mockPdfParse.mockResolvedValue(mockPdfData);

        const result = await mediaService.processPDF(pdfBuffer, 'test.pdf');

        expect(result.type).toBe('pdf');
        expect(result.content).toBe('Hello World');
        expect(result.metadata?.pages).toBe(1);
      });
    });

    describe('Real Image Processing', () => {
      it('should process a simple image buffer', async () => {
        const imageBuffer = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43, 0x00, 0xFF, 0xC0, 0x00, 0x0B, 0x08, 0x00, 0x01, 0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xFF, 0xC4, 0x00, 0x14, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x08, 0xFF, 0xDA, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3F, 0x00, 0x37, 0xFF, 0xD9]);
        
        const mockImage = {
          getWidth: jest.fn().mockReturnValue(1),
          getHeight: jest.fn().mockReturnValue(1),
          getExtension: jest.fn().mockReturnValue('jpg'),
        };
        
        mockJimp.read.mockResolvedValue(mockImage as any);

        const result = await mediaService.processImage(imageBuffer, 'test.jpg');

        expect(result.type).toBe('image');
        expect(result.metadata?.width).toBe(1);
        expect(result.metadata?.height).toBe(1);
        expect(result.metadata?.format).toBe('jpg');
      });
    });
  });

  describe('Performance Tests', () => {
    it('should process large buffer efficiently', async () => {
      const largeBuffer = Buffer.alloc(1024 * 1024); // 1MB
      const mockPdfData = {
        text: 'Large PDF content',
        numpages: 100,
        info: {}
      };
      
      mockPdfParse.mockResolvedValue(mockPdfData);

      const startTime = Date.now();
      await mediaService.processPDF(largeBuffer, 'large.pdf');
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle multiple concurrent operations', async () => {
      const buffer = Buffer.from('test');
      const mockPdfData = {
        text: 'Test content',
        numpages: 1,
        info: {}
      };
      
      mockPdfParse.mockResolvedValue(mockPdfData);

      const promises = Array(5).fill(null).map((_, i) => 
        mediaService.processPDF(buffer, `test${i}.pdf`)
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result.type).toBe('pdf');
        expect(result.content).toBe('Test content');
      });
    });
  });
});
