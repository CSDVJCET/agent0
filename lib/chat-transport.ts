import { DefaultChatTransport } from "ai";
import type { MyUIMessage } from "@/types/chat";

/**
 * Custom chat transport that strips large base64 data before sending to prevent
 * "Unterminated string in JSON" errors caused by massive request bodies.
 */
export class StripLargeDataChatTransport extends DefaultChatTransport<MyUIMessage> {
  constructor(options: { api: string }) {
    super(options);
    
    // Wrap the fetch property to intercept and strip large data
    const originalFetch = this.fetch;
    
    this.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      // Strip large base64 data from messages before sending
      if (init && init.body) {
        try {
          const body = JSON.parse(init.body as string);
          
          // Strip large base64 data from messages to prevent request body size issues
          if (body.messages && Array.isArray(body.messages)) {
            body.messages = body.messages.map((msg: any) => {
              if (msg.parts && Array.isArray(msg.parts)) {
                const cleanedParts = msg.parts.map((part: any) => {
                  // Strip large base64 data URLs (>100KB) and replace with placeholder
                  if (part.type === "file" && part.url && typeof part.url === "string") {
                    if (part.url.startsWith("data:") && part.url.length > 100000) {
                      // For PDFs, the server handling is client-side only, so we can strip completely
                      if (part.mediaType === "application/pdf" || part.url.startsWith("data:application/pdf")) {
                        return { type: "text", text: `[PDF attachment: ${part.name || "file"}]` };
                      }
                      // For other large files, keep a reference
                      return { 
                        ...part, 
                        url: `[Large file stripped - ${Math.round(part.url.length / 1024)}KB]`,
                      };
                    }
                  }
                  return part;
                });
                return { ...msg, parts: cleanedParts };
              }
              return msg;
            });
          }
          
          init.body = JSON.stringify(body);
        } catch (e) {
          console.error("Failed to strip large data from request:", e);
        }
      }
      
      return originalFetch ? originalFetch(input, init) : fetch(input, init);
    };
  }
}
