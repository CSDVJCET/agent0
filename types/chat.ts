import { UIMessage, type LanguageModelUsage } from "ai";
import { z } from "zod";

// PDF operation result stored in message metadata (never as tool parts)
export interface PdfOperationResult {
  operation: "merge" | "compress";
  error?: boolean;
  message?: string;
  // Merge result
  fileName?: string;
  fileUrl?: string;
  pageCount?: number;
  fileSize?: string;
  inputFileCount?: number;
  // Compress results (one per file)
  results?: Array<{
    fileName: string;
    fileUrl: string;
    pageCount?: number;
    originalSize?: string;
    compressedSize?: string;
    compressionRatio?: number;
  }>;
}

// File conversion result stored in message metadata (never as tool parts)
export interface ConvertResult {
  error?: boolean;
  message?: string;
  fromFormat?: string;
  toFormat?: string;
  originalFileName?: string;
  originalSize?: string;
  files?: Array<{
    fileName: string;
    dataUrl: string;
    size: string;
    sizeBytes: number;
  }>;
}

// Define message metadata schema for validation
export const messageMetadataSchema = z.object({
  createdAt: z.number().optional(),
  model: z.string().optional(),
  totalTokens: z.number().optional(),
  totalUsage: z
    .object({
      inputTokens: z.number().optional(),
      outputTokens: z.number().optional(),
      totalTokens: z.number().optional(),
      reasoningTokens: z.number().optional(),
      cachedInputTokens: z.number().optional(),
    })
    .optional(),
  // PDF operation results — stored in metadata, NOT as tool parts
  pdfResult: z.any().optional(),
  // File conversion results — stored in metadata, NOT as tool parts
  convertResult: z.any().optional(),
});

// Infer the type from the schema
export type MessageMetadata = z.infer<typeof messageMetadataSchema>;

// Create a typed UIMessage with our custom metadata
export type MyUIMessage = UIMessage<MessageMetadata>;

// Export helper type for message parts
export type UIMessagePart = MyUIMessage["parts"][number];
