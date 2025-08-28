export interface MediaProcessingResult {
  type: 'pdf' | 'image';
  content: string;
  filename: string;
  metadata?: Record<string, any>;
}

export interface IMediaService {
  processPDF(buffer: Buffer, filename: string): Promise<MediaProcessingResult>;
  processImage(buffer: Buffer, filename: string): Promise<MediaProcessingResult>;
  processMedia(buffer: Buffer, filename: string, mimeType: string): Promise<MediaProcessingResult>;
  saveTemporaryFile(buffer: Buffer, filename: string): Promise<string>;
  cleanupTemporaryFile(filePath: string): Promise<void>;
  cleanupOldTempFiles(maxAgeHours?: number): Promise<void>;
  getMediaType(mimeType: string): 'pdf' | 'image' | 'unsupported';
  validateFileSize(buffer: Buffer, maxSizeMB?: number): boolean;
}
