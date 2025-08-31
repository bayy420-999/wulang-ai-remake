# Comprehensive Unit Testing Guide
## For TypeScript WhatsApp Bot Application

> **⚠️ CRITICAL**: This guide is for a 1B valuation company. Follow every detail - bugs here could cost millions.

---

## Table of Contents
1. [Introduction & Philosophy](#introduction--philosophy)
2. [Setup & Configuration](#setup--configuration)
3. [Core Testing Concepts](#core-testing-concepts)
4. [Testing Patterns & Best Practices](#testing-patterns--best-practices)
5. [Mocking & Dependency Injection](#mocking--dependency-injection)
6. [Testing Strategy for Our App](#testing-strategy-for-our-app)
7. [Advanced Testing Topics](#advanced-testing-topics)
8. [Troubleshooting & Common Issues](#troubleshooting--common-issues)
9. [CI/CD Integration](#cicd-integration)
10. [Code Coverage & Quality Metrics](#code-coverage--quality-metrics)

---

## Introduction & Philosophy

### What is Unit Testing?
Unit testing is testing individual "units" of code in isolation. Think of it like testing each Lego block before building the whole castle.

**A unit is typically:**
- A single function
- A method in a class
- A small, focused piece of functionality

### Why Unit Testing Matters (Especially for 1B Companies)

1. **Confidence** - Know your code works as expected
2. **Regression Prevention** - Catch bugs when making changes
3. **Living Documentation** - Tests show how code should behave
4. **Design Feedback** - Hard-to-test code often indicates poor design
5. **Refactoring Safety** - Confidence to improve code
6. **Cost Prevention** - Bugs in production cost millions

### The Testing Pyramid
```
        /\
       /  \     E2E Tests (Few)
      /____\    
     /      \   Integration Tests (Some)
    /________\  
   /          \ Unit Tests (Many)
  /____________\
```

**Rule**: Write many unit tests, some integration tests, few E2E tests.

---

## Setup & Configuration

### Prerequisites
```bash
npm install --save-dev jest @types/jest ts-jest
npm install --save-dev @testing-library/jest-dom
```

### Jest Configuration (jest.config.js)
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
};
```

### TypeScript Configuration (tsconfig.json)
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "types": ["jest", "node"]
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### Test Setup File (src/test/setup.ts)
```typescript
import '@testing-library/jest-dom';

// Global test setup
beforeAll(() => {
  // Setup any global test environment
});

afterAll(() => {
  // Cleanup global test environment
});
```

### Package.json Scripts
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:ci": "jest --ci --coverage --watchAll=false"
  }
}
```

---

## Core Testing Concepts

### Test Structure
```typescript
describe('ComponentName', () => {
  // Setup that runs before each test in this describe block
  beforeEach(() => {
    // Initialize test data, mocks, etc.
  });

  // Cleanup that runs after each test
  afterEach(() => {
    // Clean up mocks, reset state, etc.
  });

  // Setup that runs once before all tests in this describe block
  beforeAll(() => {
    // One-time setup
  });

  // Cleanup that runs once after all tests
  afterAll(() => {
    // One-time cleanup
  });

  // Individual test cases
  it('should do something specific', () => {
    // Test implementation
  });

  // Group related tests
  describe('when condition A', () => {
    it('should behave in way X', () => {
      // Test for specific condition
    });
  });
});
```

### The AAA Pattern (Arrange, Act, Assert)
```typescript
it('should add two numbers correctly', () => {
  // Arrange - Set up test data and conditions
  const a = 2;
  const b = 3;
  const expected = 5;

  // Act - Execute the function being tested
  const result = add(a, b);

  // Assert - Verify the result matches expectations
  expect(result).toBe(expected);
});
```

### Jest Matchers
```typescript
// Basic matchers
expect(value).toBe(expected);           // Strict equality (===)
expect(value).toEqual(expected);        // Deep equality
expect(value).toBeTruthy();             // Truthy values
expect(value).toBeFalsy();              // Falsy values
expect(value).toBeNull();               // null
expect(value).toBeUndefined();          // undefined
expect(value).toBeDefined();            // Not undefined

// Number matchers
expect(value).toBeGreaterThan(3);
expect(value).toBeLessThan(5);
expect(value).toBeGreaterThanOrEqual(3.5);
expect(value).toBeLessThanOrEqual(4.5);
expect(value).toBeCloseTo(0.3);         // For floating point

// String matchers
expect(value).toMatch(/regex/);
expect(value).toContain('substring');

// Array matchers
expect(array).toContain(item);
expect(array).toHaveLength(3);
expect(array).toEqual(expect.arrayContaining([1, 2]));

// Object matchers
expect(object).toHaveProperty('key');
expect(object).toEqual(expect.objectContaining({ key: 'value' }));

// Exception matchers
expect(() => function()).toThrow();
expect(() => function()).toThrow('Error message');
expect(() => function()).toThrow(Error);

// Async matchers
await expect(promise).resolves.toBe(value);
await expect(promise).rejects.toThrow('Error');
```

---

## Testing Patterns & Best Practices

### 1. Test Naming Convention
```typescript
// Good test names
describe('UserService', () => {
  describe('createUser', () => {
    it('should create user with valid data', () => {});
    it('should throw error when email is invalid', () => {});
    it('should throw error when user already exists', () => {});
  });
});

// Bad test names
describe('UserService', () => {
  it('should work', () => {});           // Too vague
  it('test1', () => {});                 // No description
  it('should create user with valid data and return user object with id and email', () => {}); // Too long
});
```

### 2. Test Organization
```typescript
describe('UserService', () => {
  // Happy path tests first
  describe('createUser', () => {
    it('should create user with valid data', () => {});
    it('should return user with generated ID', () => {});
  });

  // Edge cases
  describe('createUser edge cases', () => {
    it('should handle empty name', () => {});
    it('should handle very long email', () => {});
  });

  // Error cases
  describe('createUser errors', () => {
    it('should throw error when email is invalid', () => {});
    it('should throw error when user already exists', () => {});
  });
});
```

### 3. Test Data Management
```typescript
// Use factories for test data
const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: 'user-123',
  name: 'John Doe',
  email: 'john@example.com',
  createdAt: new Date(),
  ...overrides,
});

// Use constants for expected values
const EXPECTED_USER_ID = 'user-123';
const EXPECTED_ERROR_MESSAGE = 'User already exists';

describe('UserService', () => {
  it('should create user with valid data', () => {
    const userData = createMockUser({ name: 'Jane Doe' });
    const expectedUser = createMockUser({ 
      name: 'Jane Doe',
      id: EXPECTED_USER_ID 
    });

    const result = userService.createUser(userData);

    expect(result).toEqual(expectedUser);
  });
});
```

### 4. Testing Async Code
```typescript
// Testing Promises
it('should fetch user by id', async () => {
  const userId = 'user-123';
  const expectedUser = createMockUser({ id: userId });

  const result = await userService.getUserById(userId);

  expect(result).toEqual(expectedUser);
});

// Testing with done callback (for callbacks)
it('should call callback with user data', (done) => {
  userService.getUserById('user-123', (user) => {
    expect(user).toEqual(createMockUser());
    done();
  });
});

// Testing with setTimeout
it('should resolve after delay', async () => {
  jest.useFakeTimers();
  
  const promise = userService.delayedOperation();
  
  jest.runAllTimers();
  
  const result = await promise;
  expect(result).toBe('completed');
});
```

---

## Mocking & Dependency Injection

### Why Mock?
- **Isolation**: Test units in isolation
- **Speed**: Avoid slow external dependencies
- **Reliability**: Tests don't depend on external services
- **Control**: Simulate different scenarios

### Jest Mocking Basics
```typescript
// Mock a module
jest.mock('../services/EmailService');

// Mock a function
const mockSendEmail = jest.fn();
jest.mock('../services/EmailService', () => ({
  sendEmail: mockSendEmail,
}));

// Mock implementation
mockSendEmail.mockResolvedValue({ success: true });
mockSendEmail.mockRejectedValue(new Error('Email failed'));

// Verify calls
expect(mockSendEmail).toHaveBeenCalledWith('user@example.com', 'Welcome!');
expect(mockSendEmail).toHaveBeenCalledTimes(1);
```

### Mocking Patterns for Our App

#### 1. Repository Mocking
```typescript
// Mock the repository interface
const mockUserRepository: jest.Mocked<IUserRepository> = {
  create: jest.fn(),
  findById: jest.fn(),
  findByEmail: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

// In test setup
beforeEach(() => {
  jest.clearAllMocks();
  mockUserRepository.create.mockResolvedValue(createMockUser());
});

// In tests
it('should create user via repository', async () => {
  const userData = createMockUser();
  mockUserRepository.create.mockResolvedValue(userData);

  const result = await userService.createUser(userData);

  expect(mockUserRepository.create).toHaveBeenCalledWith(userData);
  expect(result).toEqual(userData);
});
```

#### 2. External Service Mocking
```typescript
// Mock OpenAI service
const mockOpenAIService: jest.Mocked<IAIService> = {
  generateResponse: jest.fn(),
  processMessage: jest.fn(),
};

// Mock WhatsApp client
const mockWhatsAppClient: jest.Mocked<WhatsAppClient> = {
  sendMessage: jest.fn(),
  isConnected: jest.fn(),
  connect: jest.fn(),
  disconnect: jest.fn(),
};

// In tests
it('should process message with AI and send response', async () => {
  const message = createMockMessage();
  const aiResponse = 'AI generated response';
  
  mockOpenAIService.processMessage.mockResolvedValue(aiResponse);
  mockWhatsAppClient.sendMessage.mockResolvedValue();

  await messageHandler.handleMessage(message);

  expect(mockOpenAIService.processMessage).toHaveBeenCalledWith(message);
  expect(mockWhatsAppClient.sendMessage).toHaveBeenCalledWith(
    message.from,
    aiResponse
  );
});
```

#### 3. Database Mocking
```typescript
// Mock Prisma client
const mockPrismaClient = {
  user: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  message: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
  conversation: {
    create: jest.fn(),
    findUnique: jest.fn(),
  },
};

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mockPrismaClient),
}));
```

### Dependency Injection Testing
```typescript
// Test with injected dependencies
describe('ProcessMessageUseCase', () => {
  let useCase: ProcessMessageUseCase;
  let mockAIService: jest.Mocked<IAIService>;
  let mockMessageRepo: jest.Mocked<IMessageRepository>;
  let mockConversationRepo: jest.Mocked<IConversationRepository>;

  beforeEach(() => {
    mockAIService = {
      processMessage: jest.fn(),
    } as any;
    
    mockMessageRepo = {
      create: jest.fn(),
      findByConversationId: jest.fn(),
    } as any;
    
    mockConversationRepo = {
      findOrCreate: jest.fn(),
      update: jest.fn(),
    } as any;

    useCase = new ProcessMessageUseCase(
      mockAIService,
      mockMessageRepo,
      mockConversationRepo
    );
  });

  it('should process message successfully', async () => {
    const messageData = createMockMessage();
    const aiResponse = 'AI response';
    const conversation = createMockConversation();

    mockConversationRepo.findOrCreate.mockResolvedValue(conversation);
    mockAIService.processMessage.mockResolvedValue(aiResponse);
    mockMessageRepo.create.mockResolvedValue(createMockMessage());

    const result = await useCase.execute(messageData);

    expect(mockConversationRepo.findOrCreate).toHaveBeenCalledWith(
      messageData.from
    );
    expect(mockAIService.processMessage).toHaveBeenCalledWith(messageData);
    expect(result).toBeDefined();
  });
});
```

---

## Testing Strategy for Our App

### 1. Domain Entities Testing
```typescript
// Test domain entities (pure business logic)
describe('User', () => {
  it('should create user with valid data', () => {
    const userData = {
      name: 'John Doe',
      email: 'john@example.com',
    };

    const user = new User(userData);

    expect(user.name).toBe(userData.name);
    expect(user.email).toBe(userData.email);
    expect(user.id).toBeDefined();
    expect(user.createdAt).toBeInstanceOf(Date);
  });

  it('should validate email format', () => {
    expect(() => new User({
      name: 'John',
      email: 'invalid-email',
    })).toThrow('Invalid email format');
  });

  it('should update user data', () => {
    const user = new User({ name: 'John', email: 'john@example.com' });
    
    user.update({ name: 'Jane' });

    expect(user.name).toBe('Jane');
    expect(user.email).toBe('john@example.com'); // Unchanged
  });
});
```

### 2. Use Cases Testing
```typescript
describe('ProcessMessageUseCase', () => {
  let useCase: ProcessMessageUseCase;
  let mockDependencies: {
    aiService: jest.Mocked<IAIService>;
    messageRepo: jest.Mocked<IMessageRepository>;
    conversationRepo: jest.Mocked<IConversationRepository>;
  };

  beforeEach(() => {
    mockDependencies = {
      aiService: createMockAIService(),
      messageRepo: createMockMessageRepository(),
      conversationRepo: createMockConversationRepository(),
    };

    useCase = new ProcessMessageUseCase(
      mockDependencies.aiService,
      mockDependencies.messageRepo,
      mockDependencies.conversationRepo
    );
  });

  describe('execute', () => {
    it('should process message successfully', async () => {
      // Arrange
      const messageData = createMockMessage();
      const conversation = createMockConversation();
      const aiResponse = 'AI generated response';

      mockDependencies.conversationRepo.findOrCreate.mockResolvedValue(conversation);
      mockDependencies.aiService.processMessage.mockResolvedValue(aiResponse);
      mockDependencies.messageRepo.create.mockResolvedValue(createMockMessage());

      // Act
      const result = await useCase.execute(messageData);

      // Assert
      expect(mockDependencies.conversationRepo.findOrCreate).toHaveBeenCalledWith(
        messageData.from
      );
      expect(mockDependencies.aiService.processMessage).toHaveBeenCalledWith(messageData);
      expect(mockDependencies.messageRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          content: messageData.content,
          conversationId: conversation.id,
        })
      );
      expect(result).toBeDefined();
    });

    it('should handle AI service errors', async () => {
      const messageData = createMockMessage();
      const error = new Error('AI service unavailable');

      mockDependencies.aiService.processMessage.mockRejectedValue(error);

      await expect(useCase.execute(messageData)).rejects.toThrow('AI service unavailable');
    });

    it('should handle empty message content', async () => {
      const messageData = createMockMessage({ content: '' });

      await expect(useCase.execute(messageData)).rejects.toThrow('Message content cannot be empty');
    });
  });
});
```

### 3. Service Testing
```typescript
describe('OpenAIService', () => {
  let service: OpenAIService;
  let mockOpenAI: jest.Mocked<any>;

  beforeEach(() => {
    mockOpenAI = {
      chat: {
        completions: {
          create: jest.fn(),
        },
      },
    };

    service = new OpenAIService(mockOpenAI);
  });

  describe('processMessage', () => {
    it('should process message with OpenAI', async () => {
      const message = createMockMessage();
      const expectedResponse = 'AI response';
      
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: expectedResponse } }],
      });

      const result = await service.processMessage(message);

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith({
        model: 'gpt-3.5-turbo',
        messages: expect.arrayContaining([
          expect.objectContaining({ content: message.content }),
        ]),
      });
      expect(result).toBe(expectedResponse);
    });

    it('should handle OpenAI API errors', async () => {
      const message = createMockMessage();
      const error = new Error('OpenAI API error');

      mockOpenAI.chat.completions.create.mockRejectedValue(error);

      await expect(service.processMessage(message)).rejects.toThrow('OpenAI API error');
    });
  });
});
```

### 4. Repository Testing
```typescript
describe('PrismaUserRepository', () => {
  let repository: PrismaUserRepository;
  let mockPrisma: jest.Mocked<any>;

  beforeEach(() => {
    mockPrisma = {
      user: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    repository = new PrismaUserRepository(mockPrisma);
  });

  describe('create', () => {
    it('should create user in database', async () => {
      const userData = createMockUser();
      const dbUser = { ...userData, id: 'db-user-123' };

      mockPrisma.user.create.mockResolvedValue(dbUser);

      const result = await repository.create(userData);

      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: {
          name: userData.name,
          email: userData.email,
        },
      });
      expect(result).toEqual(dbUser);
    });
  });

  describe('findById', () => {
    it('should find user by id', async () => {
      const userId = 'user-123';
      const dbUser = createMockUser({ id: userId });

      mockPrisma.user.findUnique.mockResolvedValue(dbUser);

      const result = await repository.findById(userId);

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
      });
      expect(result).toEqual(dbUser);
    });

    it('should return null when user not found', async () => {
      const userId = 'non-existent';

      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await repository.findById(userId);

      expect(result).toBeNull();
    });
  });
});
```

### 5. Handler Testing
```typescript
describe('MessageHandler', () => {
  let handler: MessageHandler;
  let mockUseCase: jest.Mocked<ProcessMessageUseCase>;
  let mockWhatsAppClient: jest.Mocked<WhatsAppClient>;

  beforeEach(() => {
    mockUseCase = createMockProcessMessageUseCase();
    mockWhatsAppClient = createMockWhatsAppClient();

    handler = new MessageHandler(mockUseCase, mockWhatsAppClient);
  });

  describe('handleMessage', () => {
    it('should process message and send response', async () => {
      const message = createMockMessage();
      const processedMessage = createMockMessage({ content: 'Processed response' });

      mockUseCase.execute.mockResolvedValue(processedMessage);
      mockWhatsAppClient.sendMessage.mockResolvedValue();

      await handler.handleMessage(message);

      expect(mockUseCase.execute).toHaveBeenCalledWith(message);
      expect(mockWhatsAppClient.sendMessage).toHaveBeenCalledWith(
        message.from,
        processedMessage.content
      );
    });

    it('should handle processing errors gracefully', async () => {
      const message = createMockMessage();
      const error = new Error('Processing failed');

      mockUseCase.execute.mockRejectedValue(error);

      await expect(handler.handleMessage(message)).rejects.toThrow('Processing failed');
      expect(mockWhatsAppClient.sendMessage).not.toHaveBeenCalled();
    });
  });
});
```

---

## Advanced Testing Topics

### 1. Test Coverage
```typescript
// Run coverage
npm run test:coverage

// Coverage thresholds in jest.config.js
coverageThreshold: {
  global: {
    branches: 80,
    functions: 80,
    lines: 80,
    statements: 80,
  },
  './src/domain/': {
    branches: 90,
    functions: 90,
    lines: 90,
    statements: 90,
  },
}
```

### 2. Integration Testing
```typescript
// Test multiple components working together
describe('MessageProcessing Integration', () => {
  let container: Container;
  let messageHandler: MessageHandler;

  beforeAll(async () => {
    container = await setupTestContainer();
    messageHandler = container.get(MessageHandler);
  });

  it('should process message end-to-end', async () => {
    const message = createMockMessage();
    
    const result = await messageHandler.handleMessage(message);
    
    expect(result).toBeDefined();
    // Verify database was updated
    // Verify AI service was called
    // Verify WhatsApp message was sent
  });
});
```

### 3. Performance Testing
```typescript
describe('Performance Tests', () => {
  it('should process message within 100ms', async () => {
    const startTime = Date.now();
    
    await messageHandler.handleMessage(createMockMessage());
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    expect(duration).toBeLessThan(100);
  });
});
```

### 4. Error Boundary Testing
```typescript
describe('Error Handling', () => {
  it('should handle database connection errors', async () => {
    // Mock database to throw connection error
    mockPrisma.$connect.mockRejectedValue(new Error('Connection failed'));

    await expect(userService.createUser(createMockUser()))
      .rejects.toThrow('Database connection failed');
  });

  it('should handle network timeouts', async () => {
    // Mock network timeout
    jest.useFakeTimers();
    const promise = aiService.processMessage(createMockMessage());
    
    jest.advanceTimersByTime(30000); // 30 seconds
    
    await expect(promise).rejects.toThrow('Request timeout');
  });
});
```

---

## Troubleshooting & Common Issues

### 1. TypeScript Errors in Tests
```typescript
// Problem: TypeScript doesn't recognize Jest types
// Solution: Add to tsconfig.json
{
  "compilerOptions": {
    "types": ["jest", "node"]
  }
}

// Problem: Mock types not working
// Solution: Use proper typing
const mockService: jest.Mocked<IService> = {
  method: jest.fn(),
} as any;
```

### 2. Async Test Issues
```typescript
// Problem: Test passes before async operation completes
// Solution: Always await or use done callback
it('should complete async operation', async () => {
  const result = await asyncFunction();
  expect(result).toBeDefined();
});

// Problem: Timers not working
// Solution: Use proper timer mocking
jest.useFakeTimers();
jest.runAllTimers();
jest.useRealTimers();
```

### 3. Mock Reset Issues
```typescript
// Problem: Mocks not resetting between tests
// Solution: Clear mocks in beforeEach
beforeEach(() => {
  jest.clearAllMocks();
  mockService.method.mockReset();
});
```

### 4. Database Connection Issues
```typescript
// Problem: Tests affecting each other's database state
// Solution: Use test database or transactions
beforeEach(async () => {
  await prisma.$transaction(async (tx) => {
    // Run test in transaction
  });
});
```

---

## CI/CD Integration

### GitHub Actions Example
```yaml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:ci
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v3
```

### Pre-commit Hooks
```json
{
  "husky": {
    "hooks": {
      "pre-commit": "npm run test:ci",
      "pre-push": "npm run test:coverage"
    }
  }
}
```

---

## Code Coverage & Quality Metrics

### Coverage Goals
- **Lines**: 80% minimum
- **Functions**: 80% minimum  
- **Branches**: 80% minimum
- **Statements**: 80% minimum

### Quality Metrics
- **Test execution time**: < 30 seconds for full suite
- **Test reliability**: 99.9% pass rate
- **Code complexity**: Cyclomatic complexity < 10 per function

### Coverage Reports
```bash
# Generate HTML coverage report
npm run test:coverage

# View in browser
open coverage/lcov-report/index.html
```

---

## Final Checklist

Before considering your unit tests complete, verify:

- [ ] All public methods are tested
- [ ] All error paths are tested
- [ ] All edge cases are covered
- [ ] Mocks are properly configured
- [ ] Tests are isolated and independent
- [ ] Test names are descriptive
- [ ] Coverage meets thresholds
- [ ] Tests run in CI/CD pipeline
- [ ] Performance is acceptable
- [ ] No flaky tests

---

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [TypeScript Testing](https://www.typescriptlang.org/docs/handbook/testing.html)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)

---

> **Remember**: Good unit tests are an investment in your codebase's future. They save time, prevent bugs, and give you confidence to make changes. In a 1B company, this investment pays dividends every day.
