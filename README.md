# 🤖 Wulang AI - Advanced WhatsApp AI Bot

A sophisticated WhatsApp AI bot built with TypeScript, Node.js, and Clean Architecture principles. Powered by GPT-4o-mini, it can process text messages, analyze PDFs, and interpret images while maintaining intelligent conversation context.

## ✨ Key Features

### 🧠 **Intelligent Conversation Management**
- **Context-Aware Responses**: Maintains conversation history with sliding window (last 10 messages)
- **Smart Trigger Detection**: Responds to "wulang" keyword for natural interaction
- **Conversation Threading**: Organizes messages into conversation threads for better context
- **Duplicate Prevention**: Prevents processing duplicate messages to save AI context

### 📱 **Media Processing Capabilities**
- **PDF Analysis**: Extract and analyze text content from PDF documents
- **Image Recognition**: Analyze images and provide detailed descriptions
- **Media Storage**: Store media files with AI-generated summaries
- **Multi-Modal Context**: Combine text and media for comprehensive responses
- **WhatsApp-Optimized Responses**: Automatic markdown-to-plain-text conversion for optimal WhatsApp display

### 🏗️ **Robust Architecture**
- **Clean Architecture**: Separation of concerns with Domain, Application, Infrastructure, and Presentation layers
- **Dependency Injection**: Modular service container for easy testing and maintenance
- **TypeScript**: Full type safety and modern JavaScript features
- **Prisma ORM**: Type-safe database operations with PostgreSQL

### 🔧 **Production Ready**
- **Comprehensive Logging**: Winston-based logging with multiple levels
- **Error Handling**: Graceful error handling with user-friendly messages
- **Automatic Maintenance**: Scheduled cleanup of old conversations and files
- **Graceful Shutdown**: Proper process signal handling
- **Response Formatting**: Smart conversion of AI responses to WhatsApp-compatible format

## 📋 Prerequisites

- **Node.js** 18+ 
- **PostgreSQL** 12+ database
- **OpenAI API** key (GPT-4o-mini access)
- **WhatsApp** account for bot authentication
- **Git** for version control

## 🚀 Quick Start

### 1. **Clone and Setup**
   ```bash
git clone https://github.com/bayy420-999/wulang-ai-remake.git
   cd wulang-ai-remake
   npm install
   ```

### 2. **Environment Configuration**
Create `.env` file:
   ```env
# Database Configuration
   DATABASE_URL="postgresql://username:password@localhost:5432/wulang_ai_db"
   
# OpenAI Configuration
   OPENAI_API_KEY="your_openai_api_key_here"
OPENAI_MODEL="gpt-4o-mini"
TEMPERATURE="0.7"
   
   # Bot Configuration
   BOT_NAME="Wulang AI"
   RESET_KEYWORD="!reset"
MAX_CONTEXT_MESSAGES="10"
   SESSION_NAME="wulang-ai-session"
   
   # Logging
   LOG_LEVEL="info"
   ```

### 3. **Database Setup**
```bash
# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push
```

### 4. **Start the Bot**
```bash
# Development mode
npm run dev

# Production mode
npm run build
npm start
```

## 💬 How to Use

### **Basic Interaction**
1. **Start Conversation**: Send any message containing "wulang"
2. **Continue Chat**: The bot remembers your conversation context
3. **Reset Chat**: Send "!reset" to start fresh

### **Media Support**
- **Send Images**: Upload images for AI analysis
- **Send PDFs**: Upload PDFs for text extraction and analysis
- **Ask Questions**: Ask specific questions about your media

### **Example Conversations**
```
You: "wulang, berapa 1 + 1?"
Bot: "1 + 1 sama dengan 2. Ada yang ingin kamu tanyakan lagi?"

You: "lalu successor dari hasil penjumlahan tadi?"
Bot: "Succesor dari 2 adalah 3. Jadi, jika ada hal lain yang ingin kamu ketahui, silakan tanya!"
```

### **WhatsApp Response Formatting**
The bot automatically converts AI-generated markdown responses to WhatsApp-friendly plain text:

**AI Response (Markdown):**
```
# Analysis Results

This is a **detailed** analysis with:
- Point 1
- Point 2

Visit [Google](https://google.com) for more info.
```

**WhatsApp Display:**
```
Analysis Results

This is a *detailed* analysis with:
• Point 1
• Point 2

Visit Google for more info.
```

**Features:**
- ✅ **Bold Text**: `**text**` → `*text*` (WhatsApp bold)
- ✅ **Italic Text**: `*text*` → `_text_` (WhatsApp italic)
- ✅ **Strikethrough**: `~~text~~` → `~text~` (WhatsApp strikethrough)
- ✅ **Code Blocks**: Preserved as monospace
- ✅ **Lists**: Converted to bullet points
- ✅ **Links**: URLs removed, text preserved
- ✅ **Headers**: Converted to plain text

## 🏗️ Architecture Overview

### **Clean Architecture Layers**

```
┌─────────────────────────────────────┐
│           Presentation              │
│  ┌─────────────────────────────┐   │
│  │     WhatsAppBot             │   │ ← WhatsApp integration
│  │     MessageHandler          │   │ ← Message processing
│  │     MaintenanceService      │   │ ← Scheduled tasks
│  └─────────────────────────────┘   │
├─────────────────────────────────────┤
│           Application              │
│  ┌─────────────────────────────┐   │
│  │  ProcessMessageUseCase      │   │ ← Business logic
│  │  ResetConversationUseCase   │   │ ← Conversation management
│  │  ConversationManager        │   │ ← State management
│  └─────────────────────────────┘   │
├─────────────────────────────────────┤
│             Domain                 │
│  ┌─────────────────────────────┐   │
│  │  User, Message,             │   │ ← Core entities
│  │  Conversation, Media        │   │ ← Business rules
│  │  Interfaces & Errors        │   │ ← Contracts
│  └─────────────────────────────┘   │
├─────────────────────────────────────┤
│         Infrastructure             │
│  ┌─────────────────────────────┐   │
│  │  Prisma Repositories        │   │ ← Data access
│  │  OpenAIService              │   │ ← External APIs
│  │  MediaProcessingService     │   │ ← File processing
│  │  ResponseFormatter          │   │ ← WhatsApp formatting
│  │  WhatsAppClient             │   │ ← WhatsApp API
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

### **Project Structure**
```
src/
├── application/           # Application layer
│   ├── dto/              # Data Transfer Objects
│   ├── services/         # Application services
│   └── use-cases/        # Business logic
├── config/               # Configuration
│   └── env.ts           # Environment variables
├── domain/               # Domain layer
│   ├── entities/         # Core entities
│   ├── errors/           # Domain errors
│   └── interfaces/       # Contracts
├── infrastructure/       # Infrastructure layer
│   ├── cache/           # Caching services
│   ├── database/        # Database repositories
│   ├── external/        # External services
│   └── utils/           # Utility services
├── lib/                  # Shared utilities
│   ├── db.ts            # Database connection
│   └── logger.ts        # Logging setup
├── presentation/         # Presentation layer
│   ├── handlers/        # Message handlers
│   └── services/        # Presentation services
├── shared/              # Shared configuration
│   └── config/          # DI container
└── index.ts             # Application entry point
```

## 🗄️ Database Schema

### **Core Entities**

#### **User**
```sql
- id: String (CUID, Primary Key)
- phoneNumber: String (Unique)
- name: String? (Optional)
- createdAt: DateTime
```

#### **Conversation**
```sql
- id: String (CUID, Primary Key)
- userId: String (Foreign Key)
- createdAt: DateTime
- updatedAt: DateTime
```

#### **Message**
```sql
- id: String (CUID, Primary Key)
- role: Enum (USER, ASSISTANT, SYSTEM)
- content: String? (Optional)
- mediaId: String? (Foreign Key)
- conversationId: String (Foreign Key)
- createdAt: DateTime
```

#### **Media**
```sql
- id: String (CUID, Primary Key)
- url: String
- type: String
- summary: String? (AI-generated)
- userId: String (Foreign Key)
- createdAt: DateTime
```

## 🔧 Configuration Options

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `DATABASE_URL` | PostgreSQL connection string | - | ✅ |
| `OPENAI_API_KEY` | OpenAI API key | - | ✅ |
| `OPENAI_MODEL` | AI model to use | `gpt-4o-mini` | ❌ |
| `TEMPERATURE` | AI response creativity (0-2) | `0.7` | ❌ |
| `BOT_NAME` | Bot display name | `Wulang AI` | ❌ |
| `RESET_KEYWORD` | Reset conversation command | `!reset` | ❌ |
| `MAX_CONTEXT_MESSAGES` | Context window size | `10` | ❌ |
| `SESSION_NAME` | WhatsApp session ID | `wulang-ai-session` | ❌ |
| `LOG_LEVEL` | Logging level | `info` | ❌ |

## 🛠️ Development Commands

```bash
# Development
npm run dev              # Start in development mode
npm run build           # Build for production
npm start               # Start production server

# Database
npm run db:generate     # Generate Prisma client
npm run db:push         # Push schema to database
npm run db:migrate      # Create and run migrations
npm run db:studio       # Open Prisma Studio

# Maintenance
npm run maintenance     # Run manual maintenance
```

## 🐛 Troubleshooting

### **Common Issues**

#### **1. Database Connection Failed**
```bash
Error: Failed to connect to database
```
**Solution:**
- Verify `DATABASE_URL` in `.env`
- Ensure PostgreSQL is running
- Check network connectivity

#### **2. OpenAI API Error**
```bash
Error: OpenAI API key invalid
```
**Solution:**
- Verify `OPENAI_API_KEY` in `.env`
- Check API key permissions
- Ensure sufficient credits

#### **3. WhatsApp Authentication Failed**
```bash
Error: WhatsApp QR code expired
```
**Solution:**
- Delete `.wwebjs_auth` folder
- Restart the bot
- Scan QR code again

#### **4. Context Issues**
```bash
Problem: Duplicate messages in context
```
**Solution:**
- Check if duplicate prevention is working
- Verify message ID tracking
- Restart the application

### **Debug Mode**
```bash
# Set log level to debug
LOG_LEVEL=debug npm run dev
```

## 📊 Performance Optimization

### **Context Management**
- **Sliding Window**: Only keeps last 10 messages in context
- **Duplicate Prevention**: Avoids processing same message twice
- **Memory Management**: Cleans up old message IDs

### **Database Optimization**
- **Indexed Queries**: Optimized for conversation lookups
- **Connection Pooling**: Efficient database connections
- **Cascading Deletes**: Proper cleanup of related data

### **Media Processing**
- **Temporary Storage**: Files stored temporarily and cleaned up
- **Size Limits**: 10MB file size limit
- **Format Support**: PDF and common image formats

## 🔒 Security Considerations

- **Environment Variables**: Sensitive data stored in `.env`
- **Input Validation**: All inputs validated and sanitized
- **Error Handling**: No sensitive data in error messages
- **Content Moderation**: Basic inappropriate content filtering

## 📈 Monitoring & Logging

### **Log Levels**
- `error`: Critical errors and failures
- `warn`: Warning messages
- `info`: General information
- `debug`: Detailed debugging information

### **Log Files**
- **Development**: Console output only
- **Production**: File-based logging with rotation

### **Key Metrics**
- Message processing time
- AI response generation time
- Database query performance
- Error rates and types

## 🤝 Contributing

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### **Development Guidelines**
- Follow TypeScript best practices
- Maintain clean architecture principles
- Add comprehensive error handling
- Include proper logging
- Write clear commit messages

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### **Getting Help**
1. Check the [troubleshooting](#troubleshooting) section
2. Review the logs for error messages
3. Verify your configuration
4. Open an issue on GitHub

### **Useful Resources**
- [Prisma Documentation](https://www.prisma.io/docs)
- [WhatsApp Web.js Documentation](https://docs.wwebjs.dev/)
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

## 🛠️ Technologies & Dependencies

### **Core Technologies**
- **TypeScript**: Type-safe JavaScript development
- **Node.js**: Server-side JavaScript runtime
- **PostgreSQL**: Relational database
- **Prisma**: Type-safe database ORM
- **WhatsApp Web.js**: WhatsApp client library
- **OpenAI AI SDK**: GPT-4o-mini integration

### **Key Libraries**
- **turndown**: HTML-to-markdown conversion for response formatting
- **winston**: Structured logging
- **pdf-parse**: PDF text extraction
- **jimp**: Image processing
- **dotenv**: Environment variable management
- **zod**: Runtime type validation

### **Development Tools**
- **Jest**: Unit testing framework
- **ts-jest**: TypeScript testing support
- **ESLint**: Code linting
- **Prettier**: Code formatting

## 🚀 Deployment

### **Production Checklist**
- [ ] Set up PostgreSQL database
- [ ] Configure environment variables
- [ ] Set up logging and monitoring
- [ ] Configure backup strategy
- [ ] Set up SSL/TLS certificates
- [ ] Configure process manager (PM2)
- [ ] Set up reverse proxy (Nginx)

### **Docker Deployment**
```dockerfile
# Example Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

---

**Made with ❤️ using TypeScript, Node.js, and Clean Architecture principles**
