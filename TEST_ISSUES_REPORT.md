# Test Issues Report

## Summary
- **Total Test Files**: 4
- **Passing**: 3 files (ProcessMessageUseCase, MediaProcessingService, OpenAIService)
- **Failing**: 1 file (MessageHandler) - 13 failures
- **Total Tests**: 95 (82 passing, 13 failing)

## Issues Found

### 1. OpenAIService.ts - Content Moderation Logic Bug

**Location**: `src/infrastructure/external/openai/OpenAIService.ts:240`

**Issue**: The moderation logic is flawed. It checks `text?.toLowerCase().includes('appropriate')` which returns `true` for both "APPROPRIATE" and "INAPPROPRIATE" because both contain the word "appropriate".

**Current Code**:
```typescript
const isAppropriate = text?.toLowerCase().includes('appropriate') || false;
```

**Problem**: This logic will incorrectly classify "INAPPROPRIATE" as appropriate content.

**Fix Needed**: Change the logic to be more specific:
```typescript
const isAppropriate = text?.toLowerCase().trim() === 'appropriate';
```

### 2. MessageHandler.ts - Behavior Changes from Test Expectations

The tests were written for an older version of the MessageHandler implementation. The current implementation has different behavior:

#### 2.1 Message Validation Logic
**Test Expects**: `shouldRespond: false` for messages without "Wulang" keyword
**Actual Behavior**: `shouldRespond: true` with response asking user to mention "wulang"

**Current Code** (lines 67-70):
```typescript
if (!hasWulangKeyword) {
  logDebug(`Ignoring message without "wulang" keyword from ${phoneNumber}`, 'MessageHandler');
  return { shouldRespond: true, response: 'Halo! Ada yang bisa saya bantu? tolong panggil saya dengan menyebut "wulang" dalam pesan' };
}
```

#### 2.2 Reset Command Logic
**Test Expects**: `mockResetConversationUseCase.execute` to be called
**Actual Behavior**: The reset logic exists but the test mocks aren't being called properly

**Issue**: The test is not properly triggering the reset command logic.

#### 2.3 Media Handling
**Test Expects**: `mockWhatsAppClient.downloadMedia` to be called
**Actual Behavior**: The code calls `message.downloadMedia()` directly, not through a client

**Current Code** (line 125):
```typescript
const media = await message.downloadMedia();
```

#### 2.4 Error Messages
**Test Expects**: Specific error messages like "Failed to reset conversation"
**Actual Behavior**: Generic error messages like "❌ Maaf, saya mengalami kesalahan saat memproses pesan Anda. Silakan coba lagi nanti."

**Current Code** (lines 175-178):
```typescript
return { 
  shouldRespond: true, 
  response: '❌ Maaf, saya mengalami kesalahan saat memproses pesan Anda. Silakan coba lagi nanti.'
};
```

#### 2.5 Memory Management
**Test Expects**: `processedMessageIds` size ≤ 500
**Actual Behavior**: Size is 599 because the cleanup only happens when size > 1000

**Current Code** (lines 215-220):
```typescript
private cleanupOldMessageIds(): void {
  // Keep only the last 1000 message IDs to prevent memory leaks
  if (this.processedMessageIds.size > 1000) {
    const idsArray = Array.from(this.processedMessageIds);
    this.processedMessageIds = new Set(idsArray.slice(-500));
    logDebug(`Cleaned up message ID cache, kept last 500 IDs`, 'MessageHandler');
  }
}
```

## Configuration Issues Fixed

### 1. Jest Configuration
- **Fixed**: `moduleNameMapping` → `moduleNameMapper`
- **Fixed**: Added `testPathIgnorePatterns` to exclude setup file

### 2. TypeScript Mock Issues
- **Fixed**: Simplified `jest.fn<any, any>()` to `jest.fn()` with `as any` casting
- **Fixed**: Resolved spread operator errors in `setup.ts`

### 3. Path Module Mock
- **Fixed**: Added missing `path` functions (`resolve`, `dirname`, `extname`, `basename`)

## Recommendations

### 1. Fix Content Moderation Logic
Update the moderation logic in `OpenAIService.ts` to properly distinguish between "APPROPRIATE" and "INAPPROPRIATE" responses.

### 2. Update MessageHandler Tests
The MessageHandler tests need to be updated to match the current implementation behavior:

- Update message validation expectations
- Fix mock function call expectations
- Update error message expectations
- Adjust memory management test expectations

### 3. Consider Test-Driven Development
The significant differences between test expectations and actual implementation suggest the tests were written for a different version of the code. Consider:

- Writing tests that match current behavior
- Using tests to drive future changes
- Maintaining test coverage as the implementation evolves

### 4. Improve Error Handling
The current implementation uses generic error messages. Consider:

- Adding more specific error types
- Implementing proper error handling strategies
- Making error messages more informative for debugging

## Test Coverage Status

- **ProcessMessageUseCase**: ✅ Fully tested and passing
- **MediaProcessingService**: ✅ Fully tested and passing  
- **OpenAIService**: ✅ Fully tested and passing (with documented moderation bug)
- **MessageHandler**: ❌ Tests need significant updates to match current implementation

## Next Steps

1. Fix the content moderation logic bug in OpenAIService
2. Update MessageHandler tests to match current implementation
3. Consider adding more comprehensive error handling tests
4. Implement integration tests for end-to-end functionality
5. Add performance tests for memory management and conversation handling
