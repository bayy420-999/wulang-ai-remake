export abstract class BotError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: any
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class ValidationError extends BotError {
  constructor(message: string, field?: string) {
    super(message, 'VALIDATION_ERROR', { field });
  }
}

export class ProcessingError extends BotError {
  constructor(message: string, context?: any) {
    super(message, 'PROCESSING_ERROR', context);
  }
}

export class DatabaseError extends BotError {
  constructor(message: string, context?: any) {
    super(message, 'DATABASE_ERROR', context);
  }
}

export class AIServiceError extends BotError {
  constructor(message: string, context?: any) {
    super(message, 'AI_SERVICE_ERROR', context);
  }
}
