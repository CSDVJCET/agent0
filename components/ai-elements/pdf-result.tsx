"use client";

import { useEffect, useState } from "react";
import {
  FileIcon,
  DownloadIcon,
  CheckCircle2Icon,
  FileStackIcon,
  ArrowDownToLineIcon,
  Loader2Icon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "motion/react";

interface PdfResultProps {
  operation: "merge" | "compress";
  fileName: string;
  fileUrl: string;
  pageCount?: number;
  fileSize?: string;
  originalSize?: string;
  compressedSize?: string;
  compressionRatio?: number;
  message?: string;
  inputFileCount?: number;
}

export function PdfResult({
  operation,
  fileName,
  fileUrl,
  pageCount,
  fileSize,
  originalSize,
  compressedSize,
  compressionRatio,
  message,
  inputFileCount,
}: PdfResultProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Resolve the actual file URL — may be a ref to the in-memory cache
  const resolvedFileUrl = (() => {
    if (fileUrl?.startsWith("__pdf_ref__:")) {
      const refId = fileUrl.replace("__pdf_ref__:", "");
      if (typeof window !== "undefined" && (window as any).__pdfResults?.[refId]) {
        return (window as any).__pdfResults[refId] as string;
      }
      return null; // expired — page was refreshed
    }
    return fileUrl;
  })();

  const canDownload = !!resolvedFileUrl;

  useEffect(() => {
    let objectUrl: string | null = null;

    const setPreviewSource = async () => {
      if (!resolvedFileUrl) {
        setPreviewUrl(null);
        return;
      }

      if (resolvedFileUrl.startsWith("data:application/pdf")) {
        try {
          const response = await fetch(resolvedFileUrl);
          const blob = await response.blob();
          objectUrl = URL.createObjectURL(blob);
          setPreviewUrl(objectUrl);
        } catch (error) {
          console.error("Failed to load PDF preview:", error);
          setPreviewUrl(null);
        }
        return;
      }

      setPreviewUrl(resolvedFileUrl);
    };

    void setPreviewSource();

    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [resolvedFileUrl]);

  const handleDownload = async () => {
    if (!resolvedFileUrl) return;
    setIsDownloading(true);
    try {
      // Convert base64 data URL to blob
      const response = await fetch(resolvedFileUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      setDownloaded(true);
      setTimeout(() => setDownloaded(false), 3000);
    } catch (error) {
      console.error("Download failed:", error);
    } finally {
      setIsDownloading(false);
    }
  };

  const isMerge = operation === "merge";
  const isCompress = operation === "compress";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full rounded-xl border bg-card overflow-hidden"
    >
      {/* Header */}
      <div className={cn(
        "flex items-center gap-3 px-4 py-3 border-b",
        isMerge ? "bg-blue-500/10" : "bg-green-500/10"
      )}>
        <div className={cn(
          "p-2 rounded-lg",
          isMerge ? "bg-blue-500/20" : "bg-green-500/20"
        )}>
          {isMerge ? (
            <FileStackIcon className={cn("size-5", "text-blue-500")} />
          ) : (
            <ArrowDownToLineIcon className="size-5 text-green-500" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium truncate">
            {isMerge ? "PDF Merged Successfully" : "PDF Compressed Successfully"}
          </h4>
          <p className="text-xs text-muted-foreground">
            {message}
          </p>
        </div>
        <CheckCircle2Icon className="size-5 text-green-500 shrink-0" />
      </div>

      {/* File info & stats */}
      <div className="p-4 space-y-3">
        {/* File display */}
        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
          <FileIcon className="size-8 text-red-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{fileName}</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {pageCount && <span>{pageCount} page{pageCount !== 1 ? "s" : ""}</span>}
              {pageCount && (fileSize || compressedSize) && <span>·</span>}
              {(fileSize || compressedSize) && <span>{fileSize || compressedSize}</span>}
            </div>
          </div>
        </div>

        {/* Compression stats */}
        {isCompress && originalSize && compressedSize && (
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 rounded-lg bg-muted/30">
              <p className="text-xs text-muted-foreground">Original</p>
              <p className="text-sm font-medium">{originalSize}</p>
            </div>
            <div className="p-2 rounded-lg bg-muted/30">
              <p className="text-xs text-muted-foreground">Compressed</p>
              <p className="text-sm font-medium">{compressedSize}</p>
            </div>
            <div className="p-2 rounded-lg bg-green-500/10">
              <p className="text-xs text-muted-foreground">Reduced</p>
              <p className="text-sm font-medium text-green-500">{compressionRatio}%</p>
            </div>
          </div>
        )}

        {/* Merge stats */}
        {isMerge && inputFileCount && (
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="p-2 rounded-lg bg-muted/30">
              <p className="text-xs text-muted-foreground">Files Merged</p>
              <p className="text-sm font-medium">{inputFileCount}</p>
            </div>
            <div className="p-2 rounded-lg bg-muted/30">
              <p className="text-xs text-muted-foreground">Total Pages</p>
              <p className="text-sm font-medium">{pageCount}</p>
            </div>
          </div>
        )}

        {/* PDF Preview */}
        <AnimatePresence>
          {previewUrl && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 400 }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="rounded-lg overflow-hidden border"
            >
              <iframe
                src={previewUrl}
                className="w-full h-[400px] bg-white"
                title={`Preview: ${fileName}`}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action buttons */}
        <div className="flex gap-2">
          {canDownload ? (
            <>
              <Button
                onClick={handleDownload}
                disabled={isDownloading}
                className={cn(
                  "flex-1 gap-2",
                  downloaded && "bg-green-600 hover:bg-green-700"
                )}
              >
                {isDownloading ? (
                  <>
                    <Loader2Icon className="size-4 animate-spin" />
                    Preparing...
                  </>
                ) : downloaded ? (
                  <>
                    <CheckCircle2Icon className="size-4" />
                    Downloaded!
                  </>
                ) : (
                  <>
                    <DownloadIcon className="size-4" />
                    Download
                  </>
                )}
              </Button>
            </>
          ) : (
            <Button disabled variant="outline" className="w-full gap-2 opacity-60">
              <DownloadIcon className="size-4" />
              Download expired — run the operation again
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/**
 * Loading state for PDF operations
 */
export function PdfLoading({ operation }: { operation?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full rounded-xl border bg-card p-4"
    >
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-muted animate-pulse">
          <FileIcon className="size-5 text-muted-foreground" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Loader2Icon className="size-4 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {operation === "merge" ? "Merging PDFs..." : operation === "compress" ? "Compressing PDF..." : "Processing PDF..."}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
