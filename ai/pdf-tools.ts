import { tool } from "ai";
import { z } from "zod";

/**
 * PDF Tools for Agent0
 * 
 * These tools allow the AI agent to perform PDF operations:
 * - mergePDFs: Merge multiple PDF files into one
 * - compressPDF: Compress a PDF file to reduce size
 * 
 * Users invoke these tools using @pdf mentions in their prompts.
 * Files are sent as base64 data URLs from the client and processed server-side.
 */

/**
 * Merge multiple PDF files into one
 */
export const mergePDFsTool = tool({
  description: "Merge multiple PDF files into a single PDF. Use this when the user wants to combine, merge, or join PDF files together. The files should be attached by the user as PDF files.",
  inputSchema: z.object({
    fileUrls: z.array(z.string()).min(2).describe("Array of base64 data URLs of PDF files to merge. Must have at least 2 PDFs."),
    outputFileName: z.string().optional().describe("Name for the merged output file. Defaults to 'merged.pdf'."),
  }),
  execute: async ({ fileUrls, outputFileName }) => {
    try {
      // Call internal API to do the actual PDF merge
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const response = await fetch(`${baseUrl}/api/pdf/merge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files: fileUrls, outputFileName }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          error: true,
          message: errorData.error || "Failed to merge PDFs",
        };
      }

      const result = await response.json();
      return {
        error: false,
        operation: "merge",
        outputFileName: result.fileName,
        fileUrl: result.fileUrl,
        pageCount: result.pageCount,
        fileSize: result.fileSize,
        message: `Successfully merged ${fileUrls.length} PDFs into "${result.fileName}" (${result.pageCount} pages, ${result.fileSize})`,
      };
    } catch (err) {
      return {
        error: true,
        message: err instanceof Error ? err.message : "Failed to merge PDFs",
      };
    }
  },
});

/**
 * Compress a PDF file to reduce its size
 */
export const compressPDFTool = tool({
  description: "Compress a PDF file to reduce its file size. Use this when the user wants to compress, reduce size, or optimize a PDF file. The file should be attached by the user as a PDF file.",
  inputSchema: z.object({
    fileUrl: z.string().describe("Base64 data URL of the PDF file to compress."),
    outputFileName: z.string().optional().describe("Name for the compressed output file. Defaults to 'compressed.pdf'."),
  }),
  execute: async ({ fileUrl, outputFileName }) => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const response = await fetch(`${baseUrl}/api/pdf/compress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file: fileUrl, outputFileName }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          error: true,
          message: errorData.error || "Failed to compress PDF",
        };
      }

      const result = await response.json();
      return {
        error: false,
        operation: "compress",
        outputFileName: result.fileName,
        fileUrl: result.fileUrl,
        pageCount: result.pageCount,
        originalSize: result.originalSize,
        compressedSize: result.compressedSize,
        compressionRatio: result.compressionRatio,
        message: `Successfully compressed PDF: ${result.originalSize} → ${result.compressedSize} (${result.compressionRatio}% reduction)`,
      };
    } catch (err) {
      return {
        error: true,
        message: err instanceof Error ? err.message : "Failed to compress PDF",
      };
    }
  },
});

/**
 * Export all PDF tools
 */
export const pdfTools = {
  mergePDFs: mergePDFsTool,
  compressPDF: compressPDFTool,
};

export default pdfTools;
