import fs from 'fs';
import path from 'path';
import pdfParse from 'pdf-parse';
import Jimp from 'jimp';

export interface MediaProcessingResult {
  type: 'pdf' | 'image';
  content: string;
  filename: string;
  metadata?: Record<string, any>;
}

export class MediaService {
  private readonly tempDir: string;

  constructor() {
    this.tempDir = path.join(process.cwd(), 'temp');
    // Create temp directory if it doesn't exist
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  /**
   * Process PDF file and extract text content
   */
  async processPDF(buffer: Buffer, filename: string): Promise<MediaProcessingResult> {
    try {
      const data = await pdfParse(buffer);
      
      return {
        type: 'pdf',
        content: data.text.trim(),
        filename,
        metadata: {
          pages: data.numpages,
          info: data.info,
          extractedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      throw new Error(`Failed to process PDF "${filename}": ${error}`);
    }
  }

  /**
   * Process image and extract text using OCR (basic implementation)
   * For production, consider using services like Google Vision API or AWS Textract
   */
  async processImage(buffer: Buffer, filename: string): Promise<MediaProcessingResult> {
    try {
      // Load image with Jimp
      const image = await Jimp.read(buffer);
      
      // For now, we'll return basic image metadata
      // In production, you would implement OCR here
      const imageInfo = {
        width: image.getWidth(),
        height: image.getHeight(),
        mime: image.getMIME(),
        size: buffer.length
      };

      // Placeholder content - in production, implement OCR
      const content = `Image Analysis:
- Filename: ${filename}
- Dimensions: ${imageInfo.width}x${imageInfo.height}
- Format: ${imageInfo.mime}
- Size: ${(imageInfo.size / 1024).toFixed(2)} KB

Note: For detailed text extraction from images, please implement OCR service integration (Google Vision API, AWS Textract, or similar).`;

      return {
        type: 'image',
        content,
        filename,
        metadata: {
          ...imageInfo,
          processedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      throw new Error(`Failed to process image "${filename}": ${error}`);
    }
  }

  /**
   * Save file temporarily for processing
   */
  async saveTemporaryFile(buffer: Buffer, filename: string): Promise<string> {
    const tempFilePath = path.join(this.tempDir, `${Date.now()}_${filename}`);
    
    try {
      fs.writeFileSync(tempFilePath, buffer);
      return tempFilePath;
    } catch (error) {
      throw new Error(`Failed to save temporary file: ${error}`);
    }
  }

  /**
   * Clean up temporary file
   */
  async cleanupTemporaryFile(filePath: string): Promise<void> {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      console.error(`Failed to cleanup temporary file ${filePath}:`, error);
    }
  }

  /**
   * Determine media type from mime type
   */
  getMediaType(mimeType: string): 'pdf' | 'image' | 'unsupported' {
    if (mimeType === 'application/pdf') {
      return 'pdf';
    }
    
    if (mimeType.startsWith('image/')) {
      const supportedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      return supportedImageTypes.includes(mimeType.toLowerCase()) ? 'image' : 'unsupported';
    }
    
    return 'unsupported';
  }

  /**
   * Validate file size (in bytes)
   */
  validateFileSize(buffer: Buffer, maxSizeMB: number = 10): boolean {
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    return buffer.length <= maxSizeBytes;
  }

  /**
   * Process media based on type
   */
  async processMedia(buffer: Buffer, filename: string, mimeType: string): Promise<MediaProcessingResult> {
    const mediaType = this.getMediaType(mimeType);
    
    if (mediaType === 'unsupported') {
      throw new Error(`Unsupported media type: ${mimeType}`);
    }

    if (!this.validateFileSize(buffer)) {
      throw new Error('File size exceeds 10MB limit');
    }

    switch (mediaType) {
      case 'pdf':
        return await this.processPDF(buffer, filename);
      case 'image':
        return await this.processImage(buffer, filename);
      default:
        throw new Error(`Unknown media type: ${mediaType}`);
    }
  }

  /**
   * Clean up old temporary files
   */
  async cleanupOldTempFiles(maxAgeHours: number = 24): Promise<void> {
    try {
      const files = fs.readdirSync(this.tempDir);
      const cutoffTime = Date.now() - (maxAgeHours * 60 * 60 * 1000);

      for (const file of files) {
        const filePath = path.join(this.tempDir, file);
        const stats = fs.statSync(filePath);
        
        if (stats.mtime.getTime() < cutoffTime) {
          await this.cleanupTemporaryFile(filePath);
        }
      }
    } catch (error) {
      console.error('Failed to cleanup old temp files:', error);
    }
  }
}

// OCR Integration Example (commented out - implement as needed)
/*
export class OCRService {
  async extractTextFromImage(imagePath: string): Promise<string> {
    // Example using Google Vision API
    // const vision = require('@google-cloud/vision');
    // const client = new vision.ImageAnnotatorClient();
    // const [result] = await client.textDetection(imagePath);
    // return result.textAnnotations?.[0]?.description || '';
    
    throw new Error('OCR service not implemented. Please implement OCR integration.');
  }
}
*/
