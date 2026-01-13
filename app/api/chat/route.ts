import { google, GoogleGenerativeAIProviderOptions } from "@ai-sdk/google";
import { streamText, convertToModelMessages, stepCountIs } from "ai";
import { z } from "zod";
import type { MyUIMessage } from "@/types/chat";
import { tools as weatherTools } from "@/ai/tools";
import { calendarTools } from "@/ai/calendar-tools";
import { isToolInstalled } from "@/lib/installed-tools";

export const maxDuration = 60;

const bodySchema = z.object({
  messages: z.array(z.any()), // Will be validated as UIMessage[] at runtime
  model: z.string(),
  enableSearch: z.boolean().optional(),
  enableThinking: z.boolean().optional(),
  enableUrlContext: z.boolean().optional(),
  enableCodeExecution: z.boolean().optional(),
  mentionedTools: z.array(z.string()).optional(),
});

// Custom error handler for user-friendly error messages
function getErrorMessage(error: unknown): string {
  if (error == null) {
    return "An unknown error occurred";
  }

  if (typeof error === "string") {
    return error;
  }

  if (error instanceof Error) {
    // Check for specific error types
    if (error.message.includes("rate limit")) {
      return "Rate limit exceeded. Please try again in a moment.";
    }
    if (error.message.includes("context length")) {
      return "The conversation is too long. Please start a new chat.";
    }
    if (error.message.includes("API key")) {
      return "API configuration error. Please contact support.";
    }
    return error.message;
  }

  return JSON.stringify(error);
}

export async function POST(req: Request) {
  let parsedBody;

  try {
    parsedBody = bodySchema.parse(await req.json());
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "Invalid request body",
        details: error instanceof Error ? error.message : error,
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const {
    messages,
    model,
    enableSearch = false,
    enableThinking = true,
    enableUrlContext = true,
    enableCodeExecution = true,
    mentionedTools = [],
  } = parsedBody;

  // Type-cast messages to MyUIMessage[] for type safety
  const uiMessages = messages as MyUIMessage[];

  // Convert UI messages to model messages using the AI SDK helper
  let modelMessages;
  try {
    modelMessages = convertToModelMessages(uiMessages);
  } catch (error) {
    console.error("convertToModelMessages failed", error);
    return new Response(
      JSON.stringify({
        error: "Invalid messages",
        details:
          error instanceof Error ? error.message : "Unable to convert messages",
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Build tools object based on mentioned tools and enabled features
  let tools: Record<string, any> = {};
  let useProviderTools = false;
  const hasCustomTools = mentionedTools.length > 0;

  // Add @mentioned custom tools (like weather)
  // When custom tools are mentioned, ONLY use those tools (disable provider tools)
  if (hasCustomTools) {
    for (const toolName of mentionedTools) {
      const lowerToolName = toolName.toLowerCase();
      
      // Map mentioned tool names to actual tool implementations
      if (lowerToolName === "weather") {
        tools.displayWeather = weatherTools.displayWeather;
      }
      // Calendar tools
      if (lowerToolName === "calendar") {
        if (isToolInstalled("calendar")) {
          // Primary tool for scheduling events with human-in-the-loop
          tools.scheduleCalendarEvent = calendarTools.scheduleCalendarEvent;
          tools.confirmScheduledEvent = calendarTools.confirmScheduledEvent;
          // Other calendar tools
          tools.listCalendarEvents = calendarTools.listCalendarEvents;
          tools.updateCalendarEvent = calendarTools.updateCalendarEvent;
          tools.deleteCalendarEvent = calendarTools.deleteCalendarEvent;
          tools.findCalendarAvailability = calendarTools.findCalendarAvailability;
          tools.getCalendarEvent = calendarTools.getCalendarEvent;
          // Keep legacy tools for backward compatibility
          tools.draftCalendarEvent = calendarTools.draftCalendarEvent;
          tools.createCalendarEvent = calendarTools.createCalendarEvent;
        } else {
             // Optionally add a system message or error logic here if the tool is not installed
             // For now, we just don't add the tools
             console.warn("Calendar tool mentioned but not installed");
        }
      }
      // Add more tool mappings here as needed
    }
  } else {
    // Only add Google provider tools when NO custom tools are mentioned
    // This prevents mixing function tools with provider-defined tools
    if (enableSearch) {
      tools.google_search = google.tools.googleSearch({});
      useProviderTools = true;
    }

    if (enableUrlContext) {
      tools.url_context = google.tools.urlContext({});
      useProviderTools = true;
    }

    if (enableCodeExecution) {
      tools.code_execution = google.tools.codeExecution({});
      useProviderTools = true;
    }
  }

  const hasTools = Object.keys(tools).length > 0;

  // Build system prompt based on enabled tools
  const baseSystemPrompt = `The current date and time is ${new Date().toLocaleString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit", timeZoneName: "short" })}.`;
  
  // Add calendar-specific instructions when calendar tools are enabled
  const hasCalendarTools = mentionedTools.some(t => t.toLowerCase() === "calendar");
  const calendarPrompt = hasCalendarTools ? `

CALENDAR SCHEDULING RULES (CRITICAL - FOLLOW EXACTLY):
1. When the user wants to schedule, create, or book an event, IMMEDIATELY use the scheduleCalendarEvent tool
2. NEVER ask clarifying questions about title, time, or duration
3. ALWAYS infer the title from context:
   - "schedule a meeting" → title: "Meeting"
   - "book a standup" → title: "Standup"
   - "meeting with John" → title: "Meeting with John"
   - "dentist appointment" → title: "Dentist Appointment"
4. If no time specified, use 9:00 AM on the mentioned date
5. If no duration specified, default to 1 hour
6. The user can review and edit the details in the form before confirming

Example: "schedule a meeting tomorrow at 2pm" → IMMEDIATELY call scheduleCalendarEvent with title="Meeting", startDateTime=tomorrow at 14:00` : "";

  const providerOptions: { google: GoogleGenerativeAIProviderOptions } = {
    google: {
      ...(enableThinking &&
        model.includes("2.5") && {
          thinkingConfig: {
            thinkingBudget: 4096,
            includeThoughts: true,
          },
        }),
      ...(enableThinking &&
        model.includes("gemini-3") && {
          thinkingConfig: {
            thinkingLevel: "high",
            includeThoughts: true,
          },
        }),
    },
  };

  const result = streamText({
    model: google(model),
    system: baseSystemPrompt + calendarPrompt,
    messages: modelMessages,
    tools: hasTools ? tools : undefined,
    toolChoice: hasTools ? "auto" : "none",
    providerOptions,
    // Use stopWhen for multi-step tool calls when custom tools are mentioned
    ...(mentionedTools.length > 0 && { stopWhen: stepCountIs(5) }),
    onError: (error) => {
      console.error("Stream error:", error);
    },
  });

  return result.toUIMessageStreamResponse({
    sendReasoning: enableThinking,
    sendSources: true,
    originalMessages: uiMessages,
    onError: getErrorMessage,
    messageMetadata: ({ part }) => {
      // Send metadata when streaming starts
      if (part.type === "start") {
        return {
          createdAt: Date.now(),
          model: model,
        };
      }

      // Send additional metadata when streaming completes
      if (part.type === "finish" && part.totalUsage) {
        return {
          totalTokens: part.totalUsage.totalTokens,
          totalUsage: {
            inputTokens: part.totalUsage.inputTokens,
            outputTokens: part.totalUsage.outputTokens,
            totalTokens: part.totalUsage.totalTokens,
            reasoningTokens: part.totalUsage.reasoningTokens,
            cachedInputTokens: part.totalUsage.cachedInputTokens,
          },
        };
      }

      return undefined;
    },
  });
}
