# Agent0 - AI Chat Application

## Architecture Overview

**Next.js 14+** chat application using **Vercel AI SDK v5** with **Google Gemini** models. Component-based architecture with strict separation between UI primitives (shadcn/ui) and AI-specific components.

### Critical Data Flow
```
User Input → sendMessage({ role, parts }) → POST /api/chat → streamText() 
→ toUIMessageStreamResponse() → useChat messages → MessageList rendering
```

### Key Files & Responsibilities
- **[app/api/chat/route.ts](app/api/chat/route.ts)** - Server-side streaming handler
  - Uses `convertToModelMessages()` to transform UI messages for Gemini
  - Tool routing logic: `mentionedTools` array enables ONLY custom tools (disables provider tools)
  - Returns `toUIMessageStreamResponse()` with reasoning/sources
- **[components/chat-ui.tsx](components/chat-ui.tsx)** - Client-side orchestrator
  - `useChat()` hook with `DefaultChatTransport` (not custom fetch)
  - LocalStorage persistence for messages, model selection, thinking toggle
  - File attachments converted to base64 data URLs for multi-modal input
- **[ai/tools.ts](ai/tools.ts)** & **[ai/calendar-tools.ts](ai/calendar-tools.ts)** - Tool definitions
  - Use `tool()` from AI SDK with Zod schemas
  - Calendar tools conditionally added only if installed (`isToolInstalled()`)
- **[lib/installed-tools.ts](lib/installed-tools.ts)** - Tool installation state
  - File-based storage (`.installed-tools.json`) for persistence
  - Always reloads from file to sync across processes
- **[types/chat.ts](types/chat.ts)** - Message types with metadata
  - `MyUIMessage` extends `UIMessage<MessageMetadata>`
  - Metadata includes token usage, model, timestamps

## AI SDK v5 Critical Patterns

### Message Structure (Parts-Based)
Messages use `parts` array **not** `content` string:
```tsx
// User message with multi-modal content
{ role: "user", parts: [
  { type: "text", text: "Analyze this image" },
  { type: "file", url: "data:image/png;base64,...", mediaType: "image/png" }
]}

// Assistant message with reasoning + tools + text
{ role: "assistant", parts: [
  { type: "reasoning", text: "..." },           // From thinking models (2.5+)
  { type: "tool-displayWeather", ... },         // Tool format: "tool-{toolName}"
  { type: "source-url", url: "...", ... },      // From Google Search
  { type: "text", text: "Final response" }
]}
```

**Message Helpers** ([lib/chat-message-utils.ts](lib/chat-message-utils.ts)):
- `getMessageTextContent()` - Extracts text parts only
- `getMessageReasoning()` - Extracts reasoning parts (or null)
- `getToolInvocations()` - Filters parts starting with `tool-`
- `getMessageSources()` - Extracts `source-url` and `source-document` parts

### Route Handler Pattern (Server)
```ts
import { streamText, convertToModelMessages, stepCountIs } from "ai";

// Critical: Convert UI messages before passing to model
const modelMessages = convertToModelMessages(uiMessages);

const result = streamText({
  model: google(modelId),
  messages: modelMessages,
  tools: hasTools ? tools : undefined,
  toolChoice: hasTools ? "auto" : "none",
  providerOptions: {
    google: {
      thinkingConfig: { 
        thinkingBudget: 4096,      // For Gemini 2.5
        includeThoughts: true 
      }
    }
  },
  stopWhen: stepCountIs(5),  // Multi-step tool chaining limit
});

return result.toUIMessageStreamResponse({ 
  sendReasoning: true, 
  sendSources: true,
  originalMessages: uiMessages,
  messageMetadata: ({ part }) => ({ /* token counts, model, etc */ })
});
```

### Client-Side Chat Pattern
```tsx
const { messages, sendMessage, status } = useChat<MyUIMessage>({
  transport: new DefaultChatTransport({ api: "/api/chat" }),
  experimental_throttle: 50,  // UI update throttling
});

// Multi-modal send with parts
sendMessage({ 
  role: "user", 
  parts: [
    { type: "text", text: inputValue },
    ...attachments.map(a => ({ type: "file", url: a.url, mediaType: a.type }))
  ]
}, {
  body: { model, enableSearch, mentionedTools }
});
```

### Tool Definition Pattern
```ts
import { tool } from "ai";
import { z } from "zod";

export const weatherTool = tool({
  description: "Get current weather for a location using Open-Meteo API",
  inputSchema: z.object({
    location: z.string().describe("The location to get the weather for"),
  }),
  execute: async ({ location }) => {
    // 1. Geocoding API call
    // 2. Weather API call
    return { temperature, weatherDescription, /* ... */ };
  },
});
```

## Tool System Architecture

### Tool Routing Logic (CRITICAL)
In [app/api/chat/route.ts](app/api/chat/route.ts):
```ts
// When mentionedTools.length > 0:
//   - ONLY add custom function tools (weather, calendar)
//   - DISABLE all provider tools (google_search, url_context, code_execution)
// When mentionedTools.length === 0:
//   - Add provider tools based on enableSearch/enableUrlContext flags
//   - NO custom tools
```

This prevents "Tools with different schemas cannot be mixed" errors.

### Tool Installation Flow
1. User clicks "Add Integration" → `handleAddIntegration(id)`
2. Optimistically update `addedIntegrations` state
3. POST to `/api/tools/install` with `{ toolId: id }`
4. Backend writes to `.installed-tools.json` via `addInstalledTool()`
5. For calendar: Opens OAuth popup `/api/auth/google`
6. Auth tokens stored in `tokenStore` (in-memory Map)

### Tool Mention System
- `@weather` in input triggers `mentionedTools: ["weather"]`
- Parsed in [components/prompt-input-area.tsx](components/prompt-input-area.tsx)
- Sent to API route via `body.mentionedTools`
- Mapped to tool implementations in route handler

## Calendar Integration Deep Dive

### OAuth Flow
1. User installs calendar tool → Opens `/api/auth/google` in popup
2. Redirects to Google OAuth consent screen
3. Callback to `/api/auth/google/callback` with code
4. Exchange code for tokens, store in `tokenStore` (userId: "default-user")
5. Popup sends `postMessage({ type: 'GOOGLE_AUTH_SUCCESS' })` to opener
6. Main window sets `isCalendarConnected = true`

### Calendar Tools ([ai/calendar-tools.ts](ai/calendar-tools.ts))
- **scheduleCalendarEvent** - Main HITL tool (presents confirmation UI)
- **confirmScheduledEvent** - Executes after user approval
- **createCalendarEvent** - Direct creation (when all details known)
- **listCalendarEvents** - Query with time range, search
- **updateCalendarEvent** - Modify existing events
- **deleteCalendarEvent** - Cancel events
- **findCalendarAvailability** - FreeBusy API integration
- **getCalendarEvent** - Fetch single event details

### HITL Pattern (Human-in-the-Loop)
```ts
// Step 1: Draft event with scheduleCalendarEvent
return {
  status: "pending_confirmation",
  eventDetails: { title, startDateTime, endDateTime, /* ... */ },
  reasoning: "Inferred missing details..."
};

// Step 2: User reviews in UI (EventSchedulingConfirmation component)
// Step 3: User approves → calls confirmScheduledEvent with final details
```

## Component Patterns

### Compound Components (AI Elements)
```tsx
// Tool display
<Tool>
  <ToolHeader title="Weather" type="tool-displayWeather" state="output-available" />
  <ToolContent>
    <ToolInput input={args} />
    <ToolOutput output={result} errorText={error} />
  </ToolContent>
</Tool>

// Reasoning display (auto-collapse after streaming)
<Reasoning isStreaming={isLoading} defaultOpen={true}>
  <ReasoningTrigger />
  <ReasoningContent>{reasoningText}</ReasoningContent>
</Reasoning>

// Message rendering
<Message role={message.role} metadata={message.metadata}>
  {message.parts.map(part => {
    if (part.type === "text") return <Streamdown>{part.text}</Streamdown>;
    if (part.type === "reasoning") return <Reasoning>...</Reasoning>;
    if (part.type.startsWith("tool-")) return <Tool>...</Tool>;
  })}
</Message>
```

### LocalStorage Persistence
Keys in [components/chat-ui.tsx](components/chat-ui.tsx):
- `agent0-selected-model` - Model ID string
- `agent0-chat-messages` - Serialized `MyUIMessage[]`
- `agent0-enable-thinking` - Boolean string
- `agent0-added-integrations` - Tool IDs array

Pattern: Load on mount, save on change (with quota exceeded handling)

## Styling & UI Conventions

- **Tailwind CSS v4** with CSS variables in [app/globals.css](app/globals.css)
- **Dark mode only** (`dark` class on `<html>`)
- **OKLCH colors** for theme (`--primary`, `--background`, etc.)
- `cn()` utility from `@/lib/utils` for conditional classes
- **Motion** from `motion/react` (NOT `framer-motion` export)
- **Icons** from `lucide-react`
- **UI Primitives** in [components/ui/](components/ui/) - shadcn/ui new-york style

### Animation Patterns
```tsx
import { motion } from "motion/react";

<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -20 }}
  layout  // For layout animations
/>
```

## Google Gemini Specifics

### Model Capabilities
- **Gemini 2.5 Pro/Flash/Lite** - Thinking models (set `thinkingConfig`)
- **Gemini 2.0 Flash** - Fast, no thinking support
- Check `model.supportsThinking` before enabling thinking toggle

### Provider Tools (Google Native)
```ts
// In route handler when mentionedTools is empty:
tools.google_search = google.tools.googleSearch({});
tools.url_context = google.tools.urlContext({});
tools.code_execution = google.tools.codeExecution({});
```

### Thinking Configuration
```ts
providerOptions: {
  google: {
    thinkingConfig: {
      thinkingBudget: 4096,         // Token budget for reasoning
      includeThoughts: true          // Send reasoning to client
    }
  }
}
```

## Development Workflow

### Dev Commands
```bash
npm run dev      # Next.js dev server (localhost:3000)
npm run build    # Production build
npm run lint     # ESLint check
```

### VS Code Tasks
- **Next build** - Production build task
- **restart and dev** - Reinstall deps + dev server (instance limit 1)

### Common Debugging
- Check browser console for localStorage errors (quota exceeded)
- Check network tab for `/api/chat` streaming responses
- Tool errors appear in `part.errorText` (not thrown exceptions)
- Auth issues: Check `tokenStore` has valid tokens for "default-user"

## Important Constraints

1. **NO mixing function tools with provider tools** - Use `mentionedTools` to gate
2. **Always use `convertToModelMessages()`** before passing to Gemini
3. **File attachments MUST be base64 data URLs** (not File objects)
4. **Tool type format** is `tool-{toolName}` in parts (e.g., `tool-displayWeather`)
5. **LocalStorage serialization** - Handle quota exceeded gracefully
6. **OAuth tokens** are in-memory only (no persistence across restarts)
7. **Calendar requires userId** "default-user" for token lookup

## Implemented Features

### Core Chat ✅
- Streaming with Gemini 2.0/2.5 models
- Multi-modal input (images, PDFs, text files)
- Thinking/reasoning display with auto-collapse
- Message persistence to localStorage
- Model selector with thinking toggle

### Tools ✅
- **Weather** (@weather mention) - Open-Meteo API
- **Calendar** (@calendar mention) - Full CRUD + availability
- **Google Search** (toggle) - Grounding with sources
- **URL Context** (always on) - Extract content from URLs
- **Code Execution** (always on) - Python interpreter

### UI ✅
- File attachments with preview
- Feature badges showing active capabilities
- Suggestion chips for quick prompts
- Table of contents for long conversations
- Browser extension screenshot capture

## Planned Features 📋
- Email tool (Gmail integration)
- Video download (yt-dlp)
- PDF operations (merge, compress)
- Image generation (DALL-E)
- Mermaid/LaTeX rendering
- RAG with Supabase pgvector
- HITL approval UI (AI SDK v6 `needsApproval`)
- To-Do List Management (Google Tasks)
- File Conversion Tool (formats via FFmpeg)
- Spotify Integration
- Movie Tool (TMDB/OMDB)
