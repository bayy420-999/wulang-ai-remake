import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { MediaProcessingService } from '../infrastructure/external/media/MediaProcessingService';
import { ProcessingError } from '../domain/errors/BotError';

// Mock dependencies
const mockPdfParse = require('pdf-parse');
const mockJimp = require('jimp');
const mockFs = require('fs');
const mockPath = require('path');

jest.mock('pdf-parse', () => jest.fn());
jest.mock('jimp', () => ({
  read: jest.fn(),
}));
jest.mock('fs', () => ({
  promises: {
    writeFile: jest.fn(),
    readFile: jest.fn(),
    unlink: jest.fn(),
    readdir: jest.fn(),
    stat: jest.fn(),
  },
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
}));
jest.mock('path', () => ({
  join: jest.fn((...args: string[]) => args.join('/')),
  resolve: jest.fn((...args: string[]) => args.join('/')),
  dirname: jest.fn((path: string) => path.split('/').slice(0, -1).join('/')),
  extname: jest.fn((path: string) => {
    const parts = path.split('.');
    return parts.length > 1 ? `.${parts[parts.length - 1]}` : '';
  }),
  basename: jest.fn((path: string) => path.split('/').pop() || ''),
}));

describe('MediaProcessingService', () => {
  let service: MediaProcessingService;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    mockPath.join.mockImplementation((...args: string[]) => args.join('/'));
    mockFs.existsSync.mockReturnValue(true);
    mockFs.promises.writeFile.mockResolvedValue(undefined);
    mockFs.promises.readdir.mockResolvedValue([]);
    mockFs.promises.stat.mockResolvedValue({ mtime: new Date() });
    
    service = new MediaProcessingService();
  });

  describe('processPDF()', () => {
    it('should extract text from valid PDF', async () => {
      // Arrange
      const buffer = Buffer.from('test pdf content');
      const filename = 'test.pdf';
      const mockPdfData = {
        text: 'Extracted text from PDF',
        numpages: 2,
        info: { Title: 'Test Document' }
      };
      mockPdfParse.mockResolvedValue(mockPdfData);

      // Act
      const result = await service.processPDF(buffer, filename);

      // Assert
      expect(mockPdfParse).toHaveBeenCalledWith(buffer);
      expect(result).toEqual({
        type: 'pdf',
        content: 'Extracted text from PDF',
        filename: 'test.pdf',
        metadata: {
          pages: 2,
          info: { Title: 'Test Document' }
        }
      });
    });

    it('should handle PDF with no text content', async () => {
      // Arrange
      const buffer = Buffer.from('test pdf content');
      const filename = 'test.pdf';
      const mockPdfData = {
        text: null,
        numpages: 1,
        info: {}
      };
      mockPdfParse.mockResolvedValue(mockPdfData);

      // Act
      const result = await service.processPDF(buffer, filename);

      // Assert
      expect(result.content).toBe('No text content found in PDF');
    });

    it('should handle PDF processing errors', async () => {
      // Arrange
      const buffer = Buffer.from('corrupted pdf content');
      const filename = 'corrupted.pdf';
      mockPdfParse.mockRejectedValue(new Error('PDF parsing failed'));

      // Act & Assert
      await expect(service.processPDF(buffer, filename)).rejects.toThrow('Failed to process PDF');
    });
  });

  describe('processImage()', () => {
    it('should process image and return metadata', async () => {
      // Arrange
      const buffer = Buffer.from('test image content');
      const filename = 'test.jpg';
      const mockImage = {
        getWidth: jest.fn().mockReturnValue(800),
        getHeight: jest.fn().mockReturnValue(600),
        getExtension: jest.fn().mockReturnValue('jpg'),
      };
      mockJimp.read.mockResolvedValue(mockImage);

      // Act
      const result = await service.processImage(buffer, filename);

      // Assert
      expect(mockJimp.read).toHaveBeenCalledWith(buffer);
      expect(result).toEqual({
        type: 'image',
        content: expect.stringContaining('Image file: test.jpg'),
        filename: 'test.jpg',
        metadata: {
          width: 800,
          height: 600,
          format: 'jpg',
          size: buffer.length
        }
      });
    });

    it('should handle image processing errors', async () => {
      // Arrange
      const buffer = Buffer.from('corrupted image content');
      const filename = 'corrupted.jpg';
      mockJimp.read.mockRejectedValue(new Error('Image processing failed'));

      // Act & Assert
      await expect(service.processImage(buffer, filename)).rejects.toThrow('Failed to process image');
    });
  });

  describe('processMedia()', () => {
    it('should route PDF files to processPDF', async () => {
      // Arrange
      const buffer = Buffer.from('test content');
      const filename = 'test.pdf';
      const mimeType = 'application/pdf';
      const mockPdfData = {
        text: 'Extracted text',
        numpages: 1,
        info: {}
      };
      mockPdfParse.mockResolvedValue(mockPdfData);

      // Act
      const result = await service.processMedia(buffer, filename, mimeType);

      // Assert
      expect(result.type).toBe('pdf');
      expect(mockPdfParse).toHaveBeenCalled();
    });

    it('should route image files to processImage', async () => {
      // Arrange
      const buffer = Buffer.from('test content');
      const filename = 'test.jpg';
      const mimeType = 'image/jpeg';
      const mockImage = {
        getWidth: jest.fn().mockReturnValue(100),
        getHeight: jest.fn().mockReturnValue(100),
        getExtension: jest.fn().mockReturnValue('jpg'),
      };
      mockJimp.read.mockResolvedValue(mockImage);

      // Act
      const result = await service.processMedia(buffer, filename, mimeType);

      // Assert
      expect(result.type).toBe('image');
      expect(mockJimp.read).toHaveBeenCalled();
    });

    it('should reject unsupported media types', async () => {
      // Arrange
      const buffer = Buffer.from('test content');
      const filename = 'test.txt';
      const mimeType = 'text/plain';

      // Act & Assert
      await expect(service.processMedia(buffer, filename, mimeType)).rejects.toThrow('Unsupported media type');
    });

    it('should handle media processing errors', async () => {
      // Arrange
      const buffer = Buffer.from('test content');
      const filename = 'test.pdf';
      const mimeType = 'application/pdf';
      mockPdfParse.mockRejectedValue(new Error('Processing failed'));

      // Act & Assert
      await expect(service.processMedia(buffer, filename, mimeType)).rejects.toThrow('Failed to process media');
    });
  });

  describe('getMediaType()', () => {
    it('should identify PDF files', () => {
      expect(service.getMediaType('application/pdf')).toBe('pdf');
      expect(service.getMediaType('APPLICATION/PDF')).toBe('pdf');
    });

    it('should identify image files', () => {
      expect(service.getMediaType('image/jpeg')).toBe('image');
      expect(service.getMediaType('image/png')).toBe('image');
      expect(service.getMediaType('image/gif')).toBe('image');
      expect(service.getMediaType('IMAGE/JPEG')).toBe('image');
    });

    it('should return unsupported for other types', () => {
      expect(service.getMediaType('text/plain')).toBe('unsupported');
      expect(service.getMediaType('application/json')).toBe('unsupported');
      expect(service.getMediaType('video/mp4')).toBe('unsupported');
    });
  });

  describe('validateFileSize()', () => {
    it('should accept files within size limit', () => {
      const buffer = Buffer.alloc(5 * 1024 * 1024); // 5MB
      expect(service.validateFileSize(buffer, 10)).toBe(true);
    });

    it('should reject files exceeding size limit', () => {
      const buffer = Buffer.alloc(15 * 1024 * 1024); // 15MB
      expect(service.validateFileSize(buffer, 10)).toBe(false);
    });

    it('should use default size limit when not specified', () => {
      const buffer = Buffer.alloc(5 * 1024 * 1024); // 5MB
      expect(service.validateFileSize(buffer)).toBe(true);
    });
  });

  describe('saveTemporaryFile()', () => {
    it('should save file to temporary directory', async () => {
      // Arrange
      const buffer = Buffer.from('test content');
      const filename = 'test.pdf';
      mockFs.promises.writeFile.mockResolvedValue(undefined);

      // Act
      const result = await service.saveTemporaryFile(buffer, filename);

      // Assert
      expect(mockFs.promises.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('test.pdf'),
        buffer
      );
      expect(result).toContain('test.pdf');
    });

    it('should handle file save errors', async () => {
      // Arrange
      const buffer = Buffer.from('test content');
      const filename = 'test.pdf';
      mockFs.promises.writeFile.mockRejectedValue(new Error('Write failed'));

      // Act & Assert
      await expect(service.saveTemporaryFile(buffer, filename)).rejects.toThrow('Failed to save temporary file');
    });
  });

  describe('cleanupTemporaryFile()', () => {
    it('should delete existing file', async () => {
      // Arrange
      const filePath = '/temp/test.pdf';
      mockFs.existsSync.mockReturnValue(true);
      mockFs.promises.unlink.mockResolvedValue(undefined);

      // Act
      await service.cleanupTemporaryFile(filePath);

      // Assert
      expect(mockFs.promises.unlink).toHaveBeenCalledWith(filePath);
    });

    it('should handle non-existent files gracefully', async () => {
      // Arrange
      const filePath = '/temp/nonexistent.pdf';
      mockFs.existsSync.mockReturnValue(false);

      // Act
      await service.cleanupTemporaryFile(filePath);

      // Assert
      expect(mockFs.promises.unlink).not.toHaveBeenCalled();
    });

    it('should handle cleanup errors gracefully', async () => {
      // Arrange
      const filePath = '/temp/test.pdf';
      mockFs.existsSync.mockReturnValue(true);
      mockFs.promises.unlink.mockRejectedValue(new Error('Delete failed'));

      // Act - should not throw
      await expect(service.cleanupTemporaryFile(filePath)).resolves.toBeUndefined();
    });
  });

  describe('cleanupOldTempFiles()', () => {
    it('should clean up old files', async () => {
      // Arrange
      const oldFile = 'old.pdf';
      const newFile = 'new.pdf';
      const oldTime = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25 hours ago
      const newTime = new Date(Date.now() - 1 * 60 * 60 * 1000); // 1 hour ago

      mockFs.promises.readdir.mockResolvedValue([oldFile, newFile]);
      mockFs.promises.stat
        .mockResolvedValueOnce({ mtime: oldTime }) // old file
        .mockResolvedValueOnce({ mtime: newTime }); // new file

      // Act
      await service.cleanupOldTempFiles(24);

      // Assert
      expect(mockFs.promises.unlink).toHaveBeenCalledWith(expect.stringContaining(oldFile));
      expect(mockFs.promises.unlink).not.toHaveBeenCalledWith(expect.stringContaining(newFile));
    });

    it('should handle cleanup errors gracefully', async () => {
      // Arrange
      mockFs.promises.readdir.mockRejectedValue(new Error('Read failed'));

      // Act - should not throw
      await expect(service.cleanupOldTempFiles(24)).resolves.toBeUndefined();
    });
  });

  describe('constructor and initialization', () => {
    it('should create temp directory if it does not exist', () => {
      // Arrange
      mockFs.existsSync.mockReturnValue(false);

      // Act
      new MediaProcessingService();

      // Assert
      expect(mockFs.mkdirSync).toHaveBeenCalledWith(
        expect.stringContaining('temp'),
        { recursive: true }
      );
    });

    it('should not create temp directory if it already exists', () => {
      // Arrange
      mockFs.existsSync.mockReturnValue(true);

      // Act
      new MediaProcessingService();

      // Assert
      expect(mockFs.mkdirSync).not.toHaveBeenCalled();
    });
  });

  describe('formatBytes()', () => {
    it('should format bytes correctly', () => {
      expect(service['formatBytes'](0)).toBe('0 Bytes');
      expect(service['formatBytes'](1024)).toBe('1 KB');
      expect(service['formatBytes'](1024 * 1024)).toBe('1 MB');
      expect(service['formatBytes'](1024 * 1024 * 1024)).toBe('1 GB');
    });
  });
});
