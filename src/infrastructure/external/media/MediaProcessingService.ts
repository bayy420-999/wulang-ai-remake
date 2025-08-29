import * as fs from 'fs';
import * as path from 'path';
import pdf from 'pdf-parse';
import Jimp from 'jimp';
import { IMediaService, MediaProcessingResult } from '../../../domain/interfaces/services/IMediaService';
import { ProcessingError } from '../../../domain/errors/BotError';
import { logError, logInfo } from '../../../lib/logger';

export class MediaProcessingService implements IMediaService {
  private tempDir: string;

  constructor() {
    this.tempDir = path.join(process.cwd(), 'temp');
    this.ensureTempDir();
  }

  async processPDF(buffer: Buffer, filename: string): Promise<MediaProcessingResult> {
    try {
      logInfo(`Processing PDF: ${filename}`, 'MediaProcessingService');
      
      const data = await pdf(buffer);
      
      return {
        type: 'pdf',
        content: data.text || 'No text content found in PDF',
        filename,
        metadata: {
          pages: data.numpages,
          info: data.info
        }
      };
    } catch (error) {
      logError(`Error processing PDF: ${filename}`, error as Error, 'MediaProcessingService');
      throw new ProcessingError(`Failed to process PDF: ${error}`);
    }
  }

  async processImage(buffer: Buffer, filename: string): Promise<MediaProcessingResult> {
    try {
      logInfo(`Processing image: ${filename}`, 'MediaProcessingService');
      
      const image = await Jimp.read(buffer);
      const metadata = {
        width: image.getWidth(),
        height: image.getHeight(),
        format: image.getExtension(),
        size: buffer.length
      };

      // For now, return basic image info since OCR is not implemented
      const content = `Image file: ${filename}. Dimensions: ${metadata.width}x${metadata.height}px. Format: ${metadata.format}. Size: ${this.formatBytes(metadata.size)}.`;
      
      return {
        type: 'image',
        content,
        filename,
        metadata
      };
    } catch (error) {
      logError(`Error processing image: ${filename}`, error as Error, 'MediaProcessingService');
      throw new ProcessingError(`Failed to process image: ${error}`);
    }
  }

  async processMedia(buffer: Buffer, filename: string, mimeType: string): Promise<MediaProcessingResult> {
    try {
      const mediaType = this.getMediaType(mimeType);
      
      if (mediaType === 'pdf') {
        return await this.processPDF(buffer, filename);
      } else if (mediaType === 'image') {
        return await this.processImage(buffer, filename);
      } else {
        throw new ProcessingError(`Unsupported media type: ${mimeType}`);
      }
    } catch (error) {
      logError(`Error processing media: ${filename}`, error as Error, 'MediaProcessingService');
      throw new ProcessingError(`Failed to process media: ${error}`);
    }
  }

  async saveTemporaryFile(buffer: Buffer, filename: string): Promise<string> {
    try {
      const filePath = path.join(this.tempDir, filename);
      await fs.promises.writeFile(filePath, buffer);
      logInfo(`Saved temporary file: ${filePath}`, 'MediaProcessingService');
      return filePath;
    } catch (error) {
      logError(`Error saving temporary file: ${filename}`, error as Error, 'MediaProcessingService');
      throw new ProcessingError(`Failed to save temporary file: ${error}`);
    }
  }

  async cleanupTemporaryFile(filePath: string): Promise<void> {
    try {
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
        logInfo(`Cleaned up temporary file: ${filePath}`, 'MediaProcessingService');
      }
    } catch (error) {
      logError(`Error cleaning up temporary file: ${filePath}`, error as Error, 'MediaProcessingService');
    }
  }

  async cleanupOldTempFiles(maxAgeHours: number = 24): Promise<void> {
    try {
      const files = await fs.promises.readdir(this.tempDir);
      const cutoffTime = Date.now() - (maxAgeHours * 60 * 60 * 1000);
      
      for (const file of files) {
        const filePath = path.join(this.tempDir, file);
        const stats = await fs.promises.stat(filePath);
        
        if (stats.mtime.getTime() < cutoffTime) {
          await this.cleanupTemporaryFile(filePath);
        }
      }
      
      logInfo(`Cleaned up old temporary files (older than ${maxAgeHours} hours)`, 'MediaProcessingService');
    } catch (error) {
      logError('Error cleaning up old temporary files', error as Error, 'MediaProcessingService');
    }
  }

  getMediaType(mimeType: string): 'pdf' | 'image' | 'unsupported' {
    const lowerMimeType = mimeType.toLowerCase();
    
    if (lowerMimeType === 'application/pdf') {
      return 'pdf';
    } else if (lowerMimeType.startsWith('image/')) {
      return 'image';
    } else {
      return 'unsupported';
    }
  }

  validateFileSize(buffer: Buffer, maxSizeMB: number = 10): boolean {
    const sizeInMB = buffer.length / (1024 * 1024);
    return sizeInMB <= maxSizeMB;
  }

  private ensureTempDir(): void {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
      logInfo(`Created temp directory: ${this.tempDir}`, 'MediaProcessingService');
    }
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
