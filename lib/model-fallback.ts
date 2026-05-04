// Model fallback order for automatic retries when rate limiting occurs
// All models support tool calling
export const modelFallbackChains: Record<string, string[]> = {
  // Gemini fallback chain
  "gemini-2.5-pro": [
    "gemini-3.1-pro-preview",
    "gemini-2.5-flash",
    "groq:llama-3.3-70b-versatile",
  ],
  "gemini-3.1-pro-preview": [
    "gemini-2.5-pro",
    "gemini-2.5-flash",
    "groq:llama-3.3-70b-versatile",
  ],
  "gemini-2.5-flash": [
    "gemini-2.5-flash-lite",
    "gemini-3-flash-preview",
    "groq:llama-3.3-70b-versatile",
  ],
  "gemini-2.5-flash-lite": [
    "gemini-3-flash-preview",
    "gemini-3.1-flash-lite-preview",
    "groq:llama-3.1-8b-instant",
    "cohere:command-a-03-2025",
  ],
  "gemini-3-flash-preview": [
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
    "groq:llama-3.3-70b-versatile",
  ],
  "gemini-3.1-flash-lite-preview": [
    "gemini-3-flash-preview",
    "gemini-2.5-flash-lite",
    "groq:llama-3.1-8b-instant",
  ],

  // Groq fallback chain
  "groq:llama-3.3-70b-versatile": [
    "groq:openai/gpt-oss-120b",
    "groq:meta-llama/llama-4-scout-17b-16e-instruct",
    "groq:openai/gpt-oss-20b",
  ],
  "groq:llama-3.1-8b-instant": [
    "groq:openai/gpt-oss-20b",
    "groq:qwen/qwen3-32b",
    "cohere:command-r7b-12-2024",
  ],
  "groq:qwen/qwen3-32b": [
    "groq:openai/gpt-oss-120b",
    "groq:openai/gpt-oss-20b",
    "cohere:command-a-03-2025",
  ],
  "groq:meta-llama/llama-4-scout-17b-16e-instruct": [
    "groq:openai/gpt-oss-20b",
    "cohere:command-a-03-2025",
    "cohere:command-r7b-12-2024",
  ],
  "groq:openai/gpt-oss-20b": [
    "groq:openai/gpt-oss-120b",
    "cohere:command-a-03-2025",
    "cohere:command-r-08-2024",
  ],
  "groq:openai/gpt-oss-120b": [
    "groq:openai/gpt-oss-20b",
    "cohere:command-a-03-2025",
    "cohere:command-r-08-2024",
  ],

  // Cohere fallback chain
  "cohere:command-a-03-2025": [
    "cohere:command-r-08-2024",
    "cohere:command-r7b-12-2024",
    "cohere:command-nightly",
  ],
  "cohere:command-r-08-2024": [
    "cohere:command-r7b-12-2024",
    "cohere:command-nightly",
    "groq:llama-3.1-8b-instant",
  ],
  "cohere:command-r7b-12-2024": [
    "cohere:command-nightly",
    "groq:llama-3.1-8b-instant",
    "gemini-2.5-flash",
  ],
  "cohere:command-nightly": [
    "cohere:command-a-03-2025",
    "groq:llama-3.3-70b-versatile",
    "gemini-2.5-flash",
  ],
};

export function getNextFallbackModel(currentModel: string, attemptedModels: Set<string>): string | null {
  const fallbacks = modelFallbackChains[currentModel] || [];

  // Find first fallback that hasn't been attempted yet
  for (const fallback of fallbacks) {
    if (!attemptedModels.has(fallback)) {
      return fallback;
    }
  }

  return null;
}

export function isRateLimitError(error: any): boolean {
  if (!error) return false;

  const errorMessage = error?.message?.toLowerCase() || "";
  const errorString = String(error).toLowerCase();

  return (
    errorMessage.includes("rate limit") ||
    errorMessage.includes("429") ||
    errorMessage.includes("too many requests") ||
    errorMessage.includes("quota") ||
    errorString.includes("rate limit") ||
    errorString.includes("429")
  );
}

export interface ModelRetryMetadata {
  originalModel: string;
  attemptedModels: string[];
  finalModel: string;
  retryCount: number;
}
