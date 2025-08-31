import { MessageRole, Message, CreateMessageDto } from '../Message';

describe('Message Entity', () => {
  describe('MessageRole Enum', () => {
    it('should have correct enum values', () => {
      expect(MessageRole.USER).toBe('USER');
      expect(MessageRole.ASSISTANT).toBe('ASSISTANT');
      expect(MessageRole.SYSTEM).toBe('SYSTEM');
    });

    it('should have exactly 3 roles', () => {
      const roles = Object.values(MessageRole);
      expect(roles).toHaveLength(3);
      expect(roles).toEqual(['USER', 'ASSISTANT', 'SYSTEM']);
    });

    it('should allow valid role assignments', () => {
      const userMessage: Message = {
        id: 'msg-1',
        role: MessageRole.USER,
        content: 'Hello',
        conversationId: 'conv-1',
        createdAt: new Date(),
      };

      const assistantMessage: Message = {
        id: 'msg-2',
        role: MessageRole.ASSISTANT,
        content: 'Hi there!',
        conversationId: 'conv-1',
        createdAt: new Date(),
      };

      const systemMessage: Message = {
        id: 'msg-3',
        role: MessageRole.SYSTEM,
        content: 'System notification',
        conversationId: 'conv-1',
        createdAt: new Date(),
      };

      expect(userMessage.role).toBe(MessageRole.USER);
      expect(assistantMessage.role).toBe(MessageRole.ASSISTANT);
      expect(systemMessage.role).toBe(MessageRole.SYSTEM);
    });
  });

  describe('Message Interface', () => {
    it('should allow creating a complete message', () => {
      const message: Message = {
        id: 'msg-123',
        role: MessageRole.USER,
        content: 'Hello, how are you?',
        conversationId: 'conv-456',
        createdAt: new Date('2024-01-01T10:00:00Z'),
      };

      expect(message.id).toBe('msg-123');
      expect(message.role).toBe(MessageRole.USER);
      expect(message.content).toBe('Hello, how are you?');
      expect(message.conversationId).toBe('conv-456');
      expect(message.createdAt).toBeInstanceOf(Date);
    });

    it('should allow creating a message with media', () => {
      const message: Message = {
        id: 'msg-123',
        role: MessageRole.USER,
        content: 'Check this image',
        mediaId: 'media-789',
        conversationId: 'conv-456',
        createdAt: new Date(),
      };

      expect(message.mediaId).toBe('media-789');
    });

    it('should allow creating a message without content (system messages)', () => {
      const message: Message = {
        id: 'msg-123',
        role: MessageRole.SYSTEM,
        conversationId: 'conv-456',
        createdAt: new Date(),
      };

      expect(message.content).toBeUndefined();
      expect(message.role).toBe(MessageRole.SYSTEM);
    });
  });

  describe('CreateMessageDto Interface', () => {
    it('should allow creating a message DTO', () => {
      const createDto: CreateMessageDto = {
        role: MessageRole.USER,
        content: 'Hello',
        conversationId: 'conv-123',
      };

      expect(createDto.role).toBe(MessageRole.USER);
      expect(createDto.content).toBe('Hello');
      expect(createDto.conversationId).toBe('conv-123');
    });

    it('should allow creating a message DTO with media', () => {
      const createDto: CreateMessageDto = {
        role: MessageRole.USER,
        content: 'Check this',
        mediaId: 'media-456',
        conversationId: 'conv-123',
      };

      expect(createDto.mediaId).toBe('media-456');
    });

    it('should allow creating a message DTO without content', () => {
      const createDto: CreateMessageDto = {
        role: MessageRole.SYSTEM,
        conversationId: 'conv-123',
      };

      expect(createDto.content).toBeUndefined();
    });
  });

  describe('Message Validation Scenarios', () => {
    it('should handle empty content for system messages', () => {
      const systemMessage: Message = {
        id: 'msg-1',
        role: MessageRole.SYSTEM,
        conversationId: 'conv-1',
        createdAt: new Date(),
      };

      expect(systemMessage.content).toBeUndefined();
      expect(systemMessage.role).toBe(MessageRole.SYSTEM);
    });

    it('should handle messages with both content and media', () => {
      const message: Message = {
        id: 'msg-1',
        role: MessageRole.USER,
        content: 'Here is the document',
        mediaId: 'media-1',
        conversationId: 'conv-1',
        createdAt: new Date(),
      };

      expect(message.content).toBe('Here is the document');
      expect(message.mediaId).toBe('media-1');
    });
  });
});
