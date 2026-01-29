# Gmail Generative UI Implementation

## Overview
This implementation adds a Human-in-the-Loop (HITL) generative UI for the Gmail tool, following the same pattern used for the Calendar tool. When users compose emails, they see a draft with a confirmation interface before sending.

## Architecture

### 1. New Tools (ai/gmail-tools.ts)

#### `composeEmail` Tool
- **Purpose**: Main HITL tool for email composition
- **Returns**: Pending confirmation status with email details
- **Behavior**: Extracts recipient, subject, body from user request and presents for review

```typescript
{
  status: "pending_confirmation",
  emailDetails: {
    to, subject, body, cc, bcc, thread_id
  },
  reasoning: "Brief explanation of composition"
}
```

#### `confirmSendEmail` Tool
- **Purpose**: Actually sends the email after user confirmation
- **Behavior**: Calls Gmail API to send the message
- **Returns**: Success status with message ID

### 2. UI Component (components/ai-elements/email-draft-confirmation.tsx)

**Features**:
- Shows draft email with all fields (To, CC, BCC, Subject, Body)
- Editable fields before sending
- Chain of Thought display showing agent reasoning
- Three states:
  - Pending: Show form with Cancel/Send buttons
  - Sending: Loading state
  - Sent: Success message with message details
  - Cancelled: User cancelled
  - Error: Show error with retry

**Similar to**: `EventSchedulingConfirmation` component

### 3. API Route (app/api/gmail/send-email/route.ts)

- Handles POST requests to send emails
- Validates request with Zod schema
- Builds RFC 2822 format email
- Sends via Gmail API
- Returns success/error response

### 4. Integration Points

#### Message List (components/ai-elements/message-list.tsx)
Renders the appropriate UI based on tool invocation:

```typescript
// Compose Email (HITL)
if (toolName === "composeEmail" && result.status === "pending_confirmation") {
  return <EmailDraftConfirmation {...props} />
}

// Confirm Send Email (success)
if (toolName === "confirmSendEmail" && result.status === "sent") {
  return null; // Component handles success state
}
```

#### Chat Route (app/api/chat/route.ts)
Adds new tools to Gmail tool set:

```typescript
if (lowerToolName === "gmail") {
  tools.composeEmail = gmailTools.composeEmail;
  // ... other gmail tools
}
```

## User Flow

1. **User Request**: "Send an email to john@example.com about the meeting"

2. **AI Invokes `composeEmail`**:
   - Extracts: to="john@example.com", subject="Meeting", body="..."
   - Returns pending_confirmation status

3. **UI Renders EmailDraftConfirmation**:
   - Shows draft with all fields
   - User can edit any field
   - Chain of Thought shows reasoning
   - User clicks "Send Email" or "Cancel"

4. **On Send**: 
   - POST to `/api/gmail/send-email`
   - API sends via Gmail API
   - UI shows success state

5. **On Cancel**:
   - Shows cancelled state
   - No email sent

## Key Design Decisions

### Why HITL Pattern?
- **Safety**: Prevents accidental email sends
- **User Control**: User reviews before sending
- **Edit Capability**: Allows last-minute changes
- **Trust**: User sees exactly what will be sent

### Why Separate API Route?
- **Clean Separation**: UI logic separate from tool logic
- **Direct HTTP**: Avoids complex tool chaining
- **Error Handling**: Better error messages for UI
- **Reusability**: Can be called from other UI components

### Field Validation
- To, Subject, Body are required (marked with *)
- CC, BCC are optional
- Form validates before enabling Send button
- Uses Zod schema on backend for double validation

## Testing Checklist

- [ ] Install Gmail tool via integrations modal
- [ ] Authenticate with Google OAuth
- [ ] Say "@gmail compose an email to test@example.com"
- [ ] Verify draft UI appears with correct fields
- [ ] Edit subject/body
- [ ] Click Send
- [ ] Verify success message shows
- [ ] Check Gmail for sent email

## Comparison with Calendar Tool

| Aspect | Calendar Tool | Gmail Tool |
|--------|---------------|------------|
| Main HITL Tool | `scheduleCalendarEvent` | `composeEmail` |
| Confirmation Tool | `confirmScheduledEvent` | `confirmSendEmail` |
| UI Component | `EventSchedulingConfirmation` | `EmailDraftConfirmation` |
| API Route | `/api/calendar/create-event` | `/api/gmail/send-email` |
| Fields | title, startDateTime, endDateTime, location, attendees, description | to, cc, bcc, subject, body |
| Success Display | `CalendarEvent` | Inline success in same component |

## Files Modified/Created

### Created:
1. `components/ai-elements/email-draft-confirmation.tsx` (400+ lines)
2. `app/api/gmail/send-email/route.ts` (100+ lines)

### Modified:
1. `ai/gmail-tools.ts` - Added 2 new tools
2. `components/ai-elements/message-list.tsx` - Added rendering logic
3. `app/api/chat/route.ts` - Added composeEmail to tools

## Dependencies

All dependencies already exist in the project:
- `@ai-sdk/react` - For AI SDK functionality
- `motion/react` - For animations
- `lucide-react` - For icons
- `zod` - For validation
- `date-fns` - For date formatting (if needed)

## Future Enhancements

1. **Rich Text Support**: HTML emails with formatting
2. **Attachments**: Support for file attachments
3. **Templates**: Pre-defined email templates
4. **Draft Saving**: Save drafts to Gmail
5. **Reply Context**: Show original email when replying
6. **Signature**: Add user signature automatically
7. **Scheduling**: Schedule emails to send later
