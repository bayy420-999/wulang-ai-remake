# Wulang AI - WhatsApp AI Bot

A sophisticated WhatsApp AI bot built with TypeScript that can process text messages, PDFs, and images using GPT-4o-mini. The bot maintains conversation context and stores all interactions in a PostgreSQL database.

## 🚀 Features

- **Smart Conversation Management**: Detects trigger keywords and maintains conversation context
- **Media Processing**: Handles PDF text extraction and image analysis
- **Database Storage**: Stores all conversations in PostgreSQL with Prisma ORM
- **Context Awareness**: Maintains conversation history for intelligent responses
- **Content Moderation**: Basic content filtering for inappropriate messages
- **Graceful Shutdown**: Handles process signals for clean shutdowns
- **Automatic Maintenance**: Periodic cleanup of old data and temporary files
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

## 🏗️ Architecture

```
src/
├── config/          # Configuration and environment handling
├── lib/             # Utilities (database connection, logging)
├── services/        # Core services
│   ├── ai.ts        # AI service with Vercel AI SDK
│   ├── database.ts  # Database operations
│   ├── media.ts     # PDF and image processing
│   ├── whatsapp.ts  # WhatsApp client management
│   └── messageProcessor.ts  # Main bot logic
├── prisma/          # Database schema
└── index.ts         # Application entry point
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

## 📊 Database Schema

### Users Table
- `id` - Unique identifier
- `phone` - WhatsApp phone number
- `name` - User's display name
- `isActive` - Whether user is active
- `lastMessageAt` - Last message timestamp
- `createdAt` - Account creation time

### Messages Table
- `id` - Unique identifier
- `role` - Message role (USER/ASSISTANT/SYSTEM)
- `content` - Message content
- `metadata` - Additional metadata (JSON)
- `userId` - Reference to user
- `createdAt` - Message timestamp

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

1. **WhatsAppService**: Handles WhatsApp Web client connection and message handling
2. **AIService**: Manages OpenAI API interactions and conversation generation
3. **DatabaseService**: Handles all database operations with Prisma
4. **MediaService**: Processes PDFs and images for AI context
5. **MessageProcessor**: Core bot logic and message routing

## 📝 Logging

The bot uses Winston for comprehensive logging:
- Console output for development
- File logging for production
- Structured JSON logs
- Configurable log levels

## 🔄 Maintenance

The bot automatically performs maintenance tasks:
- Cleanup of old messages (90+ days)
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
