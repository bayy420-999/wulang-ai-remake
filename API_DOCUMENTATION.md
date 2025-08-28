# Wulang AI Bot - Complete API Documentation

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Domain Layer](#domain-layer)
3. [Application Layer](#application-layer)
4. [Infrastructure Layer](#infrastructure-layer)
5. [Presentation Layer](#presentation-layer)
6. [Shared Layer](#shared-layer)
7. [Database Schema](#database-schema)
8. [Configuration](#configuration)
9. [Error Handling](#error-handling)
10. [Data Flow](#data-flow)

---

## Architecture Overview

The Wulang AI Bot follows **Clean Architecture** principles with clear separation of concerns across four main layers:

- **Domain Layer**: Core business entities, interfaces, and error definitions
- **Application Layer**: Use cases, application services, and DTOs
- **Infrastructure Layer**: External services, database repositories, and caching
- **Presentation Layer**: Message handlers, bot orchestration, and user interaction

### Technology Stack
- **WhatsApp Integration**: `whatsapp-web.js` for WhatsApp Web API
- **AI Services**: Vercel AI SDK with OpenAI GPT-4o-mini
- **Database**: PostgreSQL with Prisma ORM
- **Media Processing**: PDF parsing, image processing with Jimp
- **Logging**: Winston with structured logging
- **Dependency Injection**: Custom service container

---

## Domain Layer

### Entities

#### User Entity
```typescript
interface User {
  id: string;
  phoneNumber: string;
  name?: string;
  createdAt: Date;
}
```
**Purpose**: Represents a WhatsApp user who interacts with the bot.

#### Conversation Entity
```typescript
interface Conversation {
  id: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}
```
**Purpose**: Represents a conversation thread between a user and the bot.

#### Message Entity
```typescript
enum MessageRole {
  USER = 'USER',
  BOT = 'BOT',
  SYSTEM = 'SYSTEM'
}

interface Message {
  id: string;
  role: MessageRole;
  content?: string;
  mediaId?: string;
  conversationId: string;
  createdAt: Date;
}
```
**Purpose**: Represents individual messages in a conversation with role-based classification.

#### Media Entity
```typescript
interface Media {
  id: string;
  url: string;
  type: string;
  summary?: string;
  userId: string;
  createdAt: Date;
}
```
**Purpose**: Represents media files (images, PDFs) uploaded by users with AI-generated summaries.

### Repository Interfaces

#### IUserRepository
```typescript
interface IUserRepository {
  findByPhoneNumber(phoneNumber: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  create(user: CreateUserDto): Promise<User>;
  update(id: string, data: UpdateUserDto): Promise<User>;
  delete(id: string): Promise<void>;
  hasConversationHistory(userId: string): Promise<boolean>;
}
```
**Purpose**: Defines user data access operations.

#### IConversationRepository
```typescript
interface IConversationRepository {
  findById(id: string): Promise<Conversation | null>;
  findByUserId(userId: string): Promise<Conversation[]>;
  findActiveByUserId(userId: string): Promise<Conversation | null>;
  create(conversation: CreateConversationDto): Promise<Conversation>;
  update(id: string, data: Partial<Conversation>): Promise<Conversation>;
  delete(id: string): Promise<void>;
  deleteByUserId(userId: string): Promise<void>;
  cleanupOldConversations(days: number): Promise<number>;
}
```
**Purpose**: Defines conversation management operations including cleanup.

#### IMessageRepository
```typescript
interface IMessageRepository {
  findById(id: string): Promise<Message | null>;
  findByConversationId(conversationId: string, limit?: number): Promise<Message[]>;
  create(message: CreateMessageDto): Promise<Message>;
  delete(id: string): Promise<void>;
  deleteByConversationId(conversationId: string): Promise<void>;
  getMessageCount(conversationId: string): Promise<number>;
}
```
**Purpose**: Defines message storage and retrieval operations.

#### IMediaRepository
```typescript
interface IMediaRepository {
  findById(id: string): Promise<Media | null>;
  findByUserId(userId: string): Promise<Media[]>;
  create(media: CreateMediaDto): Promise<Media>;
  update(id: string, data: UpdateMediaDto): Promise<Media>;
  delete(id: string): Promise<void>;
  deleteByUserId(userId: string): Promise<void>;
}
```
**Purpose**: Defines media file management operations.

### Service Interfaces

#### IAIService
```typescript
interface IAIService {
  generateResponse(userMessage: string, context: ConversationContext, mediaContext?: MediaContext[]): Promise<string>;
  generateWelcomeMessage(userName?: string): Promise<string>;
  generateResetMessage(): Promise<string>;
  analyzeMedia(mediaContext: MediaContext): Promise<string>;
  analyzeMediaWithCaption(mediaContext: MediaContext, userCaption: string): Promise<string>;
  moderateContent(content: string): Promise<ModerationResult>;
}
```
**Purpose**: Defines AI service operations for text generation and media analysis.

#### IMediaService
```typescript
interface IMediaService {
  processPDF(buffer: Buffer, filename: string): Promise<MediaProcessingResult>;
  processImage(buffer: Buffer, filename: string): Promise<MediaProcessingResult>;
  processMedia(buffer: Buffer, filename: string, mimeType: string): Promise<MediaProcessingResult>;
  saveTemporaryFile(buffer: Buffer, filename: string): Promise<string>;
  cleanupTemporaryFile(filePath: string): Promise<void>;
  cleanupOldTempFiles(maxAgeHours?: number): Promise<void>;
  getMediaType(mimeType: string): 'pdf' | 'image' | 'unsupported';
  validateFileSize(buffer: Buffer, maxSizeMB?: number): boolean;
}
```
**Purpose**: Defines media processing operations for PDFs and images.

### Error Classes

#### BotError (Base Class)
```typescript
abstract class BotError extends Error {
  constructor(message: string, code: string, context?: any);
}
```
**Purpose**: Base error class for all bot-related errors.

#### Specific Error Types
- **ValidationError**: Input validation failures
- **ProcessingError**: Message/media processing failures
- **DatabaseError**: Database operation failures
- **AIServiceError**: AI service integration failures

---

## Application Layer

### DTOs (Data Transfer Objects)

#### ProcessMessageDto
```typescript
interface ProcessMessageDto {
  phoneNumber: string;
  message: string;
  userName?: string;
  hasMedia: boolean;
  mediaType?: string;
  mediaData?: {
    buffer: Buffer;
    filename: string;
    mimeType: string;
    caption?: string;
  };
}
```
**Purpose**: Transfers message processing data between layers.

#### ConversationContextDto
```typescript
interface ConversationContextDto {
  messages: Array<{
    role: string;
    content: string | null;
    createdAt: Date;
    media?: {
      id: string;
      url: string;
      type: string;
      summary: string | null;
    } | null;
  }>;
  userPhone: string;
  userName?: string;
}
```
**Purpose**: Provides conversation history context to AI services.

### Use Cases

#### ProcessMessageUseCase
**Class**: `ProcessMessageUseCase`
**Purpose**: Orchestrates the complete message processing workflow.

**Key Methods**:
- `execute(dto: ProcessMessageDto): Promise<ProcessMessageResult>`: Main entry point for message processing
- `processMedia(mediaData): Promise<MediaProcessingResult>`: Handles media processing

**Workflow**:
1. Validates input data
2. Finds or creates user
3. Gets or creates active conversation
4. Processes media if present
5. Analyzes media with AI if needed
6. Stores user message
7. Builds conversation context
8. Generates AI response
9. Stores bot response
10. Returns result

#### ResetConversationUseCase
**Class**: `ResetConversationUseCase`
**Purpose**: Handles conversation reset functionality.

**Key Methods**:
- `execute(dto: ResetConversationDto): Promise<ResetConversationResult>`: Resets user's conversation history

**Workflow**:
1. Validates phone number
2. Finds user
3. Deletes all conversations for the user
4. Generates reset confirmation message

### Application Services

#### ConversationManager
**Class**: `ConversationManager`
**Purpose**: Manages conversation state and pending media.

**Key Methods**:
- `getOrCreateUser(phoneNumber, name)`: User management
- `getOrCreateActiveConversation(userId)`: Conversation management
- `getConversationContext(conversationId, userPhone, userName)`: Context retrieval
- `shouldProcessMessage(phoneNumber, message, hasTriggerKeyword)`: Message filtering
- `storePendingMedia(phoneNumber, mediaData)`: Media state management
- `getPendingMedia(phoneNumber)`: Retrieves pending media
- `removePendingMedia(phoneNumber)`: Cleans up pending media
- `hasPendingMedia(phoneNumber)`: Checks for pending media
- `cleanupOldPendingMedia()`: Maintenance

**Pending Media Flow**:
- Stores media temporarily when user sends media without text
- Allows follow-up questions about the media
- Automatically expires after 24 hours

---

## Infrastructure Layer

### Database Repositories

#### PrismaUserRepository
**Class**: `PrismaUserRepository implements IUserRepository`
**Purpose**: Implements user data persistence using Prisma ORM.

**Key Features**:
- Comprehensive user queries with conversation and media counts
- Error handling with DatabaseError wrapping
- Optimized queries with includes for related data

#### PrismaConversationRepository
**Class**: `PrismaConversationRepository implements IConversationRepository`
**Purpose**: Implements conversation data persistence.

**Key Features**:
- Active conversation management
- Bulk deletion with cascade
- Automatic cleanup of old conversations
- Message count tracking

#### PrismaMessageRepository
**Class**: `PrismaMessageRepository implements IMessageRepository`
**Purpose**: Implements message data persistence.

**Key Features**:
- Chronological message ordering
- Media relationship handling
- Automatic conversation timestamp updates
- Pagination support

#### PrismaMediaRepository
**Class**: `PrismaMediaRepository implements IMediaRepository`
**Purpose**: Implements media file metadata persistence.

**Key Features**:
- Media summary updates
- User-based media queries
- Message relationship tracking

### External Services

#### OpenAIService
**Class**: `OpenAIService implements IAIService`
**Purpose**: Integrates with OpenAI via Vercel AI SDK.

**Key Methods**:
- `generateResponse(userMessage, context, mediaContext)`: Text generation
- `generateWelcomeMessage(userName)`: Welcome message generation
- `generateResetMessage()`: Reset confirmation generation
- `analyzeMedia(mediaContext)`: Comprehensive media analysis
- `analyzeMediaWithCaption(mediaContext, userCaption)`: Targeted media analysis
- `moderateContent(content)`: Content moderation
- `buildMessages(context, userMessage, mediaContext)`: Message formatting
- `buildSystemPrompt(context)`: System prompt generation

**AI Features**:
- Multi-modal support (text + images)
- Comprehensive media analysis for database storage
- Conversation context integration
- Role-based message formatting

#### MediaProcessingService
**Class**: `MediaProcessingService implements IMediaService`
**Purpose**: Handles media file processing and temporary storage.

**Key Methods**:
- `processPDF(buffer, filename)`: PDF text extraction
- `processImage(buffer, filename)`: Image metadata extraction
- `processMedia(buffer, filename, mimeType)`: Unified media processing
- `saveTemporaryFile(buffer, filename)`: Temporary file storage
- `cleanupTemporaryFile(filePath)`: File cleanup
- `cleanupOldTempFiles(maxAgeHours)`: Batch cleanup
- `getMediaType(mimeType)`: Media type detection
- `validateFileSize(buffer, maxSizeMB)`: File size validation

**Supported Formats**:
- **PDFs**: Text extraction using pdf-parse
- **Images**: Metadata extraction using Jimp
- **File Size**: Configurable limits (default 10MB)

#### WhatsAppClient
**Class**: `WhatsAppClient implements IWhatsAppClient`
**Purpose**: Manages WhatsApp Web connection and messaging.

**Key Methods**:
- `initialize()`: Client initialization
- `isReady()`: Connection status check
- `sendMessage(to, message)`: Message sending
- `on(event, callback)`: Event handling
- `destroy()`: Clean shutdown

**Event Handling**:
- QR code generation for authentication
- Connection status monitoring
- Message reception
- Error handling and reconnection

### Caching

#### MemoryCacheService
**Class**: `MemoryCacheService implements ICacheService`
**Purpose**: Provides in-memory caching with TTL support.

**Key Methods**:
- `get<T>(key)`: Retrieves cached data
- `set<T>(key, value, ttl)`: Stores data with expiration
- `delete(key)`: Removes cached data
- `clear()`: Clears all cache
- `cleanup()`: Removes expired items

---

## Presentation Layer

### Message Handler

#### MessageHandler
**Class**: `MessageHandler`
**Purpose**: Primary entry point for incoming WhatsApp messages.

**Key Methods**:
- `handleMessage(message: Message)`: Main message processing
- `hasTriggerKeyword(message)`: Trigger detection
- `isResetCommand(message)`: Reset command detection
- `cleanMessageContent(message)`: Message cleaning
- `extractPhoneNumber(whatsappId)`: Phone number extraction
- `getMediaType(mimeType)`: Media type detection
- `saveConversationContext(phoneNumber, userName, userMessage, botResponse)`: Context saving

**Message Processing Flow**:
1. **Filtering**: Skips group messages and self-messages
2. **Command Detection**: Handles reset commands
3. **Trigger Validation**: Checks for trigger keywords
4. **Media Processing**: Downloads and processes media files
5. **Deferred Media**: Handles media-only messages
6. **Normal Processing**: Processes text messages
7. **Response Generation**: Generates and sends responses

**Deferred Media Flow**:
- When user sends media without text, stores it temporarily
- Asks user what they want to do with the media
- Processes media + follow-up question together
- Maintains conversation context

### Bot Orchestration

#### WhatsAppBot
**Class**: `WhatsAppBot`
**Purpose**: Main bot orchestration and lifecycle management.

**Key Methods**:
- `start()`: Bot initialization and startup
- `getStatus()`: Status information retrieval
- `runMaintenance()`: Manual maintenance execution
- `shutdown()`: Graceful shutdown

**Lifecycle Management**:
- WhatsApp client initialization
- Event handler setup
- Maintenance service coordination
- Graceful shutdown handling

### Maintenance Services

#### MaintenanceService
**Class**: `MaintenanceService`
**Purpose**: Handles automated and manual maintenance tasks.

**Key Methods**:
- `startScheduledMaintenance()`: Starts automated maintenance
- `runManualMaintenance()`: Executes maintenance manually
- `stopScheduledMaintenance()`: Stops automated maintenance
- `performMaintenance()`: Core maintenance logic

**Maintenance Tasks**:
- Old conversation cleanup (90+ days)
- Temporary file cleanup (24+ hours)
- Database optimization
- System health monitoring

---

## Shared Layer

### Configuration

#### Environment Configuration
**File**: `src/config/env.ts`
**Purpose**: Centralized environment variable management.

**Configuration Schema**:
```typescript
const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  OPENAI_API_KEY: z.string().min(1),
  OPENAI_MODEL: z.string().default('gpt-4o-mini'),
  TEMPERATURE: z.string().transform(Number).pipe(z.number().min(0).max(2)).default('0.7'),
  BOT_NAME: z.string().default('Wulang AI'),
  TRIGGER_KEYWORD: z.string().default('!wulang'),
  RESET_KEYWORD: z.string().default('!reset'),
  MAX_CONTEXT_MESSAGES: z.string().transform(Number).pipe(z.number().positive()).default('10'),
  SESSION_NAME: z.string().default('wulang-ai-session'),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
});
```

### Dependency Injection

#### ServiceContainer
**Class**: `ServiceContainer`
**Purpose**: Singleton dependency injection container.

**Key Methods**:
- `getInstance()`: Singleton access
- `register<T>(name, service)`: Service registration
- `get<T>(name)`: Service retrieval
- `has(name)`: Service existence check
- `clear()`: Container cleanup

#### Dependency Setup
**File**: `src/shared/config/dependencyInjection.ts`
**Purpose**: Configures all service dependencies.

**Registration Order**:
1. Repositories (User, Conversation, Message, Media)
2. Services (AI, Media, Cache)
3. Use Cases (ProcessMessage, ResetConversation)
4. Application Services (ConversationManager)
5. Presentation Components (MessageHandler, MaintenanceService, WhatsAppBot)

### Utilities

#### Logger
**File**: `src/lib/logger.ts`
**Purpose**: Centralized logging with structured output.

**Features**:
- Multiple log levels (error, warn, info, debug)
- Context-aware logging
- Production file logging
- Development console logging
- Error stack traces

**Helper Functions**:
- `logError(message, error?, context?)`: Error logging
- `logWarn(message, context?)`: Warning logging
- `logInfo(message, context?)`: Info logging
- `logDebug(message, context?)`: Debug logging

#### Database Client
**File**: `src/lib/db.ts`
**Purpose**: Prisma client singleton with development optimization.

**Features**:
- Global singleton pattern
- Development mode optimization
- Configurable logging levels
- Connection pooling

---

## Database Schema

### Entity Relationships

```sql
User (1) ←→ (N) Conversation
User (1) ←→ (N) Media
Conversation (1) ←→ (N) Message
Media (1) ←→ (N) Message
```

### Models

#### User Model
```prisma
model User {
  id            String         @id @default(cuid())
  phoneNumber   String         @unique
  name          String?
  conversations Conversation[]
  media         Media[]
  createdAt     DateTime       @default(now())
}
```

#### Conversation Model
```prisma
model Conversation {
  id        String    @id @default(cuid())
  user      User      @relation(fields: [userId], references: [id])
  userId    String
  messages  Message[]
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
}
```

#### Message Model
```prisma
model Message {
  id             String        @id @default(cuid())
  role           Role
  content        String?
  mediaId        String?
  media          Media?        @relation(fields: [mediaId], references: [id])
  conversation   Conversation  @relation(fields: [conversationId], references: [id])
  conversationId String
  createdAt      DateTime      @default(now())
}
```

#### Media Model
```prisma
model Media {
  id        String    @id @default(cuid())
  url       String
  type      String
  summary   String?
  user      User      @relation(fields: [userId], references: [id])
  userId    String
  messages  Message[]
  createdAt DateTime  @default(now())
}
```

---

## Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `DATABASE_URL` | PostgreSQL connection string | - | Yes |
| `OPENAI_API_KEY` | OpenAI API key | - | Yes |
| `OPENAI_MODEL` | AI model to use | `gpt-4o-mini` | No |
| `TEMPERATURE` | AI response creativity | `0.7` | No |
| `BOT_NAME` | Bot display name | `Wulang AI` | No |
| `TRIGGER_KEYWORD` | Message trigger keyword | `!wulang` | No |
| `RESET_KEYWORD` | Reset command keyword | `!reset` | No |
| `MAX_CONTEXT_MESSAGES` | Context message limit | `10` | No |
| `SESSION_NAME` | WhatsApp session name | `wulang-ai-session` | No |
| `LOG_LEVEL` | Logging level | `info` | No |

### Logging Configuration

**Levels**: `error`, `warn`, `info`, `debug`
**Transports**: Console (dev), File (prod)
**Format**: JSON with timestamps and context

---

## Error Handling

### Error Hierarchy

```
BotError (abstract)
├── ValidationError
├── ProcessingError
├── DatabaseError
└── AIServiceError
```

### Error Handling Strategy

1. **Domain Errors**: Thrown by business logic
2. **Infrastructure Errors**: Wrapped in domain errors
3. **Presentation Errors**: Caught and logged
4. **Graceful Degradation**: Fallback responses for failures

### Error Recovery

- **Database Errors**: Retry with exponential backoff
- **AI Service Errors**: Fallback to cached responses
- **Media Processing Errors**: User-friendly error messages
- **WhatsApp Errors**: Automatic reconnection

---

## Data Flow

### Message Processing Flow

```
WhatsApp Message
    ↓
MessageHandler.handleMessage()
    ↓
Trigger/Command Detection
    ↓
Media Download (if present)
    ↓
ProcessMessageUseCase.execute()
    ↓
User/Conversation Management
    ↓
Media Processing (if present)
    ↓
AI Analysis (if media)
    ↓
Context Building
    ↓
AI Response Generation
    ↓
Message Storage
    ↓
Response Sending
```

### Media Processing Flow

```
Media Upload
    ↓
MediaProcessingService.processMedia()
    ↓
File Type Detection
    ↓
PDF Processing / Image Processing
    ↓
AI Analysis (OpenAIService.analyzeMedia())
    ↓
Database Storage
    ↓
Context Integration
```

### Conversation Management Flow

```
New Message
    ↓
ConversationManager.shouldProcessMessage()
    ↓
User History Check
    ↓
Trigger Keyword Validation
    ↓
Processing Decision
    ↓
Context Retrieval
    ↓
Response Generation
```

### Deferred Media Flow

```
Media Only Message
    ↓
Media Storage (Pending)
    ↓
User Prompt
    ↓
Follow-up Question
    ↓
Media + Question Processing
    ↓
AI Analysis
    ↓
Response Generation
    ↓
Pending Media Cleanup
```

---

## Key Features

### 1. Multi-Modal AI Support
- **Text Messages**: Natural language processing
- **Image Analysis**: Comprehensive visual analysis
- **PDF Processing**: Text extraction and analysis
- **Combined Context**: Text + media integration

### 2. Conversation Memory
- **Context Preservation**: Last 20 messages maintained
- **Media Context**: Previous media summaries included
- **Role-Based Messages**: User/Bot/System distinction
- **Conversation Reset**: Clean slate functionality

### 3. Media Processing
- **Comprehensive Analysis**: Detailed media summaries
- **Deferred Processing**: Media-first workflow
- **Temporary Storage**: File management
- **Type Validation**: Supported format checking

### 4. Error Resilience
- **Graceful Degradation**: Fallback responses
- **Automatic Recovery**: Connection management
- **User-Friendly Errors**: Clear error messages
- **Logging**: Comprehensive error tracking

### 5. Maintenance
- **Automated Cleanup**: Old data removal
- **Health Monitoring**: System status tracking
- **Manual Maintenance**: On-demand cleanup
- **Performance Optimization**: Database maintenance

---

## Integration Points

### External Services
- **OpenAI API**: AI text generation and analysis
- **WhatsApp Web**: Message reception and sending
- **PostgreSQL**: Data persistence
- **File System**: Temporary file storage

### Internal Services
- **Prisma ORM**: Database abstraction
- **Winston Logger**: Logging infrastructure
- **Vercel AI SDK**: AI service integration
- **Jimp**: Image processing
- **PDF-Parse**: PDF text extraction

---

This documentation provides a comprehensive overview of the Wulang AI Bot codebase, covering all interfaces, classes, methods, and their purposes. The architecture follows clean architecture principles with clear separation of concerns and robust error handling.
