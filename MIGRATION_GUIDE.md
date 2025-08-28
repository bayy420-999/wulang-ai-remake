# Migration Guide: Database Schema Update

## Overview

This guide documents the migration from the old database schema to the new sophisticated schema that better supports conversation management and media handling.

## Changes Made

### 1. Database Schema Updates

#### Old Schema Structure:
```
users (table)
├── id
├── phoneNumber
├── name
├── createdAt
└── updatedAt

messages (table)
├── id
├── role
├── content
├── userId
├── metadata
└── createdAt
```

#### New Schema Structure:
```
User (model)
├── id (CUID)
├── phoneNumber (unique)
├── name
├── conversations (relation)
├── media (relation)
└── createdAt

Conversation (model)
├── id (CUID)
├── userId (foreign key)
├── messages (relation)
├── createdAt
└── updatedAt

Message (model)
├── id (CUID)
├── role (enum: USER, BOT, SYSTEM)
├── content
├── mediaId (foreign key, optional)
├── conversationId (foreign key)
├── media (relation)
├── conversation (relation)
└── createdAt

Media (model)
├── id (CUID)
├── url
├── type
├── summary
├── userId (foreign key)
├── messages (relation)
└── createdAt
```

### 2. Service Layer Updates

#### DatabaseService Changes:
- **New Methods Added:**
  - `createConversation()` - Creates new conversation threads
  - `getOrCreateActiveConversation()` - Manages conversation lifecycle
  - `createMedia()` - Stores media files with metadata
  - `getUserConversations()` - Retrieves all conversations for a user

- **Updated Methods:**
  - `createMessage()` - Now requires `conversationId` instead of `userId`
  - `getConversationHistory()` - Now takes `conversationId` instead of `userId`
  - `getMessageCount()` - Now takes `conversationId` instead of `userId`
  - `resetUserConversation()` - Now deletes conversations instead of messages
  - `cleanupOldConversations()` - Renamed from `cleanupOldMessages()`

#### WhatsAppBot Changes:
- **Conversation Management:**
  - Automatically creates conversation threads for new users
  - Maintains conversation context across sessions
  - Proper conversation lifecycle management

- **Media Handling:**
  - Enhanced media storage with AI-generated summaries
  - Better media-message relationships
  - Improved media analysis integration

#### AIService Changes:
- **Role Enum Updates:**
  - Changed from `Role.ASSISTANT` to `Role.BOT`
  - Updated `convertRole()` method to handle new enum values

### 3. Interface Updates

#### New Interfaces:
```typescript
export interface CreateConversationData {
  userId: string;
}

export interface CreateMediaData {
  url: string;
  type: string;
  summary?: string;
  userId: string;
}

export interface MessageWithUser {
  id: string;
  role: Role;
  content: string | null;
  mediaId: string | null;
  media: {
    id: string;
    url: string;
    type: string;
    summary: string | null;
  } | null;
  conversationId: string;
  createdAt: Date;
  conversation: {
    user: {
      id: string;
      phoneNumber: string;
      name: string | null;
    };
  };
}
```

#### Updated Interfaces:
```typescript
export interface CreateMessageData {
  role: Role;
  content?: string;
  conversationId: string; // Changed from userId
  mediaId?: string; // Added
}
```

## Migration Steps

### 1. Database Migration
```bash
# Generate new Prisma client
npx prisma generate

# Push new schema to database
npx prisma db push

# Or create migration (if using migrations)
npx prisma migrate dev --name update-schema-to-new-structure
```

### 2. Code Updates
All necessary code updates have been implemented in:
- `src/services/database.ts`
- `src/services/whatsappBot.ts`
- `src/services/ai.ts`
- `src/services/media.ts`

### 3. Testing
```bash
# Build the project
npm run build

# Run in development mode
npm run dev
```

## Benefits of New Schema

### 1. Better Conversation Management
- **Conversation Threading**: Messages are organized into logical conversation threads
- **Context Preservation**: Better context management across conversation sessions
- **Conversation Reset**: Clean conversation reset without losing user data

### 2. Enhanced Media Handling
- **Media Metadata**: AI-generated summaries and proper file type classification
- **Media-Message Relationships**: Clear relationships between media and messages
- **Media Storage**: Flexible storage options (S3, Cloudinary, local)

### 3. Improved Scalability
- **Efficient Queries**: Better query performance with proper indexing
- **Data Integrity**: Proper foreign key relationships and cascading deletes
- **Extensibility**: Easy to add new features and relationships

### 4. Better User Experience
- **Conversation History**: Users can have multiple conversation threads
- **Media Context**: Media analysis is properly integrated into conversations
- **Seamless Transitions**: Smooth conversation flow with proper context

## Breaking Changes

### 1. Database Queries
- All message queries now require `conversationId` instead of `userId`
- Media queries now include proper relationships
- User queries include conversation and media counts

### 2. API Changes
- `createMessage()` now requires `conversationId`
- `getConversationHistory()` now takes `conversationId`
- New methods for conversation and media management

### 3. Data Structure
- Messages are now organized by conversations
- Media files have enhanced metadata
- User data includes conversation and media relationships

## Rollback Plan

If rollback is needed:
1. Restore previous database schema
2. Revert code changes
3. Restore previous Prisma client
4. Test functionality

## Support

For questions or issues with the migration:
1. Check the updated README.md
2. Review the new database schema in `prisma/schema.prisma`
3. Test with the provided examples
4. Contact the development team
