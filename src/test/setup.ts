// Global test setup
// Note: @testing-library/jest-dom is for DOM testing, not needed for Node.js

// Global test configuration
beforeAll(() => {
  // Setup any global test environment
  console.log('🧪 Setting up test environment...');
});

afterAll(() => {
  // Cleanup global test environment
  console.log('🧹 Cleaning up test environment...');
});

// Global test utilities
export const createMockUser = (overrides: any = {}) => ({
  id: 'user-123',
  phoneNumber: '+6281234567890',
  name: 'John Doe',
  createdAt: new Date(),
  ...overrides,
});

export const createMockMessage = (overrides: any = {}) => ({
  id: 'msg-123',
  role: 'USER',
  content: 'Hello, how are you?',
  conversationId: 'conv-123',
  createdAt: new Date(),
  ...overrides,
});

export const createMockConversation = (overrides: any = {}) => ({
  id: 'conv-123',
  userId: 'user-123',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createMockMedia = (overrides: any = {}) => ({
  id: 'media-123',
  url: 'https://example.com/image.jpg',
  type: 'image',
  summary: 'A beautiful landscape image',
  userId: 'user-123',
  createdAt: new Date(),
  ...overrides,
});

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};
