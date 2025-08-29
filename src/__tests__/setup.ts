// Global test setup
import { jest } from '@jest/globals';

// Mock environment variables
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
process.env.OPENAI_API_KEY = 'test-api-key';
process.env.OPENAI_MODEL = 'gpt-4o-mini';
process.env.TEMPERATURE = '0.7';
process.env.BOT_NAME = 'Wulang - Kelas Inovatif';
process.env.RESET_KEYWORD = '!reset';
process.env.MAX_CONTEXT_MESSAGES = '10';
process.env.SESSION_NAME = 'wulang-ai-session';
process.env.LOG_LEVEL = 'error';

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock fs module
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

// Mock path module
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

// Mock pdf-parse
jest.mock('pdf-parse', () => jest.fn());

// Mock Jimp
jest.mock('jimp', () => ({
  read: jest.fn(),
}));

// Mock AI SDK
jest.mock('ai', () => ({
  generateText: jest.fn(),
}));

// Mock OpenAI
jest.mock('@ai-sdk/openai', () => ({
  openai: jest.fn(),
}));
