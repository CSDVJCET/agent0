// ai/memory-tools.ts
import { tool } from "ai";
import { z } from "zod";
import { upsertMemory, deleteMemory, getMemoriesForUser, searchMemoriesForUser } from "@/lib/db/memory";

/**
 * Factory — call with the authenticated userId so execute closures can write
 * directly to Supabase without an extra round-trip through the API layer.
 */
export function createMemoryTools(userId: string) {
  return {
    /**
     * Save or update a fact about the user.
     * The agent should call this whenever the user shares a preference,
     * personal detail, or any information worth remembering long-term.
     */
    saveMemory: tool({
      description:
        "Save or update a persistent fact about the user. Use this whenever the user shares their name, preferences, interests, settings, contact info, or any personal detail they'd want you to remember in future conversations. Examples: name, favorite color, email address, timezone, language, occupation, goals.",
      inputSchema: z.object({
        key: z
          .string()
          .describe(
            "A short snake_case identifier for the fact. Examples: preferred_name, favorite_color, email, timezone, occupation, preferred_language"
          ),
        value: z
          .string()
          .describe("The value to remember. Keep it concise but complete."),
        category: z
          .enum([
            "personal",
            "preferences",
            "contact",
            "work",
            "interests",
            "settings",
            "general",
          ])
          .default("general")
          .describe("Category that best fits the fact being saved."),
      }),
      execute: async ({ key, value, category }) => {
        try {
          await upsertMemory(userId, key, value, category);
          return {
            success: true,
            message: `Remembered: ${key} = "${value}" (${category})`,
          };
        } catch (e) {
          console.error("[saveMemory] Failed:", e);
          return { success: false, message: "Failed to save memory." };
        }
      },
    }),

    /**
     * Retrieve all current memories so the agent can reference them on demand.
     */
    getMemories: tool({
      description:
        "Retrieve all facts currently saved about this user. Use this if the user asks what you remember about them, or to avoid saving a duplicate.",
      inputSchema: z.object({}),
      execute: async () => {
        try {
          const memories = await getMemoriesForUser(userId);
          if (memories.length === 0)
            return { memories: [], message: "No memories saved yet." };
          return {
            memories: memories.map((m) => ({
              key: m.key,
              value: m.value,
              category: m.category,
              updated_at: m.updated_at,
            })),
          };
        } catch (e) {
          console.error("[getMemories] Failed:", e);
          return { memories: [], message: "Failed to retrieve memories." };
        }
      },
    }),

    /**
     * Delete a specific memory by its key.
     */
    deleteMemory: tool({
      description:
        "Delete a saved fact about the user. Use this when the user explicitly says to forget something.",
      inputSchema: z.object({
        key: z
          .string()
          .describe(
            "The key of the memory to delete, e.g. preferred_name, favorite_color"
          ),
      }),
      execute: async ({ key }) => {
        try {
          // Look up the memory id first
          const memories = await getMemoriesForUser(userId);
          const target = memories.find((m) => m.key === key);
          if (!target)
            return { success: false, message: `No memory found for key "${key}".` };
          await deleteMemory(userId, target.id);
          return { success: true, message: `Forgot: ${key}` };
        } catch (e) {
          console.error("[deleteMemory] Failed:", e);
          return { success: false, message: "Failed to delete memory." };
        }
      },
    }),

    /**
     * Search memories by keyword to resolve a person or fact by name.
     * Use when the user references someone by name and the system prompt context
     * doesn't already contain their details (e.g. "send email to Johnson").
     */
    searchMemory: tool({
      description:
        "Search saved memories by keyword. Use this to look up a specific person's contact details (email, phone) or any stored fact when you only know part of the name/key. Example: query='johnson' returns all memories containing 'johnson' in key or value.",
      inputSchema: z.object({
        query: z
          .string()
          .describe(
            "Search term — a person's name, part of a key, or any keyword. Case-insensitive substring match."
          ),
      }),
      execute: async ({ query }) => {
        try {
          const results = await searchMemoriesForUser(userId, query);
          if (results.length === 0)
            return { results: [], message: `No memories found matching "${query}".` };
          return {
            results: results.map((m) => ({
              key: m.key,
              value: m.value,
              category: m.category,
            })),
          };
        } catch (e) {
          console.error("[searchMemory] Failed:", e);
          return { results: [], message: "Failed to search memories." };
        }
      },
    }),
  };
}
