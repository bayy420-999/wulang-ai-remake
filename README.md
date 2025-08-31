# Wulang AI - WhatsApp AI Bot

A sophisticated WhatsApp AI bot built with TypeScript that can process text messages, PDFs, and images using GPT-4o-mini. The bot maintains conversation context and stores all interactions in a PostgreSQL database with proper conversation management.

## 🚀 Features

- **Smart Conversation Management**: Detects trigger keywords and maintains conversation context with proper conversation threads
- **Media Processing**: Handles PDF text extraction and image analysis with proper media storage and AI-generated summaries
- **Advanced Database Architecture**: Stores all data in PostgreSQL with Prisma ORM using a sophisticated schema:
  - **User Management**: Tracks users by phone number with conversation history
  - **Conversation Threads**: Organizes messages into conversation threads for better context management
  - **Message Storage**: Stores messages with role-based system (USER, BOT, SYSTEM) and optional media attachments
  - **Media Management**: Stores media files with AI-generated summaries and proper file type classification
- **Context Awareness**: Maintains conversation history for intelligent responses across conversation threads
- **Content Moderation**: Basic content filtering for inappropriate messages
- **Graceful Shutdown**: Handles process signals for clean shutdowns
- **Automatic Maintenance**: Periodic cleanup of old conversations and temporary files
- **Comprehensive Logging**: Detailed logging with Winston

## 📋 Requirements

- Node.js 18+ 
- PostgreSQL database
- OpenAI API key
- WhatsApp account for bot authentication

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd wulang-ai-remake
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Setup environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your configuration:
   ```env
   # Database
   DATABASE_URL="postgresql://username:password@localhost:5432/wulang_ai_db"
   
   # OpenAI API
   OPENAI_API_KEY="your_openai_api_key_here"
   
   # Bot Configuration
   BOT_NAME="Wulang AI"
   TRIGGER_KEYWORD="!wulang"
   RESET_KEYWORD="!reset"
   MAX_CONTEXT_MESSAGES=10
   
   # WhatsApp Session
   SESSION_NAME="wulang-ai-session"
   
   # Logging
   LOG_LEVEL="info"
   ```

4. **Setup PostgreSQL database**
   Create a new PostgreSQL database for the bot.

5. **Generate Prisma client and push schema**
   ```bash
   npm run db:generate
   npm run db:push
   ```

6. **Build the project**
   ```bash
   npm run build
   ```

## 🚀 Usage

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm run build
npm start
```

### Database Management
```bash
# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push

# Create and run migrations
npm run db:migrate

# Open Prisma Studio
npm run db:studio
```

## 💬 Bot Commands

- **`!wulang [message]`** - Start or continue a conversation with the AI
- **`!reset`** - Reset conversation history and start fresh

## 📱 How It Works

1. **First Time Users**: Send a message containing `!wulang` to start a conversation
2. **Existing Users**: Once you have conversation history, you can send messages without the trigger keyword
3. **Media Support**: Send PDFs or images along with your messages for AI analysis
4. **Context Maintenance**: The bot remembers your last 10 messages for context-aware responses
5. **Conversation Management**: Each user can have multiple conversation threads

## 🏗️ Architecture

```
src/
├── config/          # Configuration and environment handling
├── lib/             # Utilities (database connection, logging)
├── services/        # Core services
│   ├── ai.ts        # AI service with Vercel AI SDK
│   ├── database.ts  # Database operations with conversation management
│   ├── media.ts     # PDF and image processing
│   └── whatsappBot.ts  # Main bot logic and WhatsApp integration
├── prisma/          # Database schema
└── index.ts         # Application entry point
```

### Clean Architecture Layers

```
┌─────────────────┐
│   Presentation  │ ← WhatsAppBot (WhatsApp interface)
├─────────────────┤
│   Application   │ ← Message processing, media handling, AI integration
├─────────────────┤  
│   Domain        │ ← User, Message, Conversation entities
├─────────────────┤
│   Infrastructure│ ← DatabaseService, AIService, MediaService
└─────────────────┘
```

## 🔧 Configuration Options

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `OPENAI_API_KEY` | OpenAI API key for GPT-4o-mini | Required |
| `BOT_NAME` | Display name for the bot | "Wulang AI" |
| `TRIGGER_KEYWORD` | Keyword to activate the bot | "!wulang" |
| `RESET_KEYWORD` | Keyword to reset conversation | "!reset" |
| `MAX_CONTEXT_MESSAGES` | Number of messages to keep in context | 10 |
| `SESSION_NAME` | WhatsApp session identifier | "wulang-ai-session" |
| `LOG_LEVEL` | Logging level (error/warn/info/debug) | "info" |

## 📊 Database Schema (Updated)

The application uses a sophisticated database schema designed for optimal conversation management and media handling:

### User Model
- `id` - Unique identifier (CUID)
- `phoneNumber` - WhatsApp phone number (unique)
- `name` - User's display name (optional)
- `conversations` - One-to-many relationship with conversations
- `media` - One-to-many relationship with uploaded media
- `createdAt` - Account creation timestamp

### Conversation Model
- `id` - Unique identifier (CUID)
- `userId` - Foreign key to user
- `messages` - One-to-many relationship with messages
- `createdAt` - Conversation creation timestamp
- `updatedAt` - Last activity timestamp (auto-updated)

### Message Model
- `id` - Unique identifier (CUID)
- `role` - Message role enum (USER, BOT, SYSTEM)
- `content` - Message text content (optional for media messages)
- `mediaId` - Foreign key to media (optional)
- `conversationId` - Foreign key to conversation
- `media` - One-to-one relationship with media
- `conversation` - Many-to-one relationship with conversation
- `createdAt` - Message timestamp

### Media Model
- `id` - Unique identifier (CUID)
- `url` - File storage location (S3/Cloudinary/local)
- `type` - Media type classification (image, pdf, etc.)
- `summary` - AI-generated summary/parsed text (optional)
- `userId` - Foreign key to user
- `messages` - One-to-many relationship with messages using this media
- `createdAt` - Upload timestamp

### Key Features of the New Schema:
- **Conversation Threading**: Messages are organized into conversation threads for better context management
- **Media Integration**: Media files are properly linked to messages and users
- **Role-Based Messaging**: Clear distinction between user, bot, and system messages
- **Automatic Timestamps**: Created and updated timestamps for tracking conversation activity
- **Cascading Deletes**: Proper cleanup when conversations or users are deleted

## 🔒 Security Features

- Content moderation for inappropriate messages
- Phone number validation and formatting
- Secure environment variable handling
- Database connection security
- Graceful error handling

## 🧪 Development

### Project Structure
```
├── src/
│   ├── config/      # Configuration files
│   ├── lib/         # Shared utilities
│   ├── services/    # Business logic services
│   └── index.ts     # Main application
├── prisma/          # Database schema and migrations
├── temp/            # Temporary files (auto-created)
└── logs/            # Log files (production)
```

### Key Services

1. **WhatsAppBot**: Main bot class handling WhatsApp integration, message processing, and bot lifecycle
2. **AIService**: Manages OpenAI API interactions and conversation generation
3. **DatabaseService**: Handles all database operations with Prisma and conversation management
4. **MediaService**: Processes PDFs and images for AI context

## 📝 Logging

The bot uses Winston for comprehensive logging:
- Console output for development
- File logging for production
- Structured JSON logs
- Configurable log levels

## 🔄 Maintenance

The bot automatically performs maintenance tasks:
- Cleanup of old conversations (90+ days)
- Removal of temporary files
- Database optimization
- Runs every 24 hours or manually via API

## 🚨 Error Handling

- Graceful degradation for API failures
- Automatic retry mechanisms
- Comprehensive error logging
- User-friendly error messages
- Process signal handling for clean shutdowns

## 📚 Dependencies

### Core Dependencies
- `whatsapp-web.js` - WhatsApp Web API client
- `@prisma/client` - Database ORM
- `ai` - Vercel AI SDK
- `openai` - OpenAI API client
- `winston` - Logging library

### Media Processing
- `pdf-parse` - PDF text extraction
- `jimp` - Image processing

### Development
- `typescript` - Type checking
- `tsx` - TypeScript execution
- `prisma` - Database management

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

If you encounter any issues:

1. Check the logs for error messages
2. Verify your environment configuration
3. Ensure your PostgreSQL database is accessible
4. Confirm your OpenAI API key is valid
5. Check WhatsApp Web connection status

## ⚠️ Important Notes

- The bot requires an active WhatsApp Web session
- OpenAI API usage will incur costs based on usage
- PostgreSQL database should be regularly backed up
- Media files are temporarily stored and cleaned up automatically
- Bot responses are limited to 500 tokens for WhatsApp compatibility
- Conversations are managed as separate threads for better context management
