"use client";

import { useState } from "react";
import {
  FileIcon,
  DownloadIcon,
  CheckCircle2Icon,
  RefreshCwIcon,
  Loader2Icon,
  ImageIcon,
  FileTextIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { motion } from "motion/react";

interface ConvertResultFile {
  fileName: string;
  dataUrl: string;
  size: string;
  sizeBytes: number;
}

interface ConvertResultProps {
  fromFormat: string;
  toFormat: string;
  originalFileName: string;
  originalSize: string;
  files: ConvertResultFile[];
  message?: string;
}

const IMAGE_FORMATS = new Set(["PNG", "JPG", "JPEG", "WEBP", "BMP", "GIF", "TIFF", "AVIF", "SVG", "ICO"]);

const OFFICE_FORMAT_COLORS: Record<string, string> = {
  DOCX: "#185ABD", DOC: "#185ABD", ODT: "#185ABD",
  XLSX: "#217346", XLS: "#217346", ODS: "#217346",
  PPTX: "#C43E1C", PPT: "#C43E1C", ODP: "#C43E1C",
};

function isValidDataUrl(url: string) {
  return url.startsWith("data:") && !url.startsWith("[large");
}

export function ConvertResult({
  fromFormat,
  toFormat,
  originalFileName,
  originalSize,
  files,
  message,
}: ConvertResultProps) {
  const [downloadedIndexes, setDownloadedIndexes] = useState<Set<number>>(new Set());
  const [downloadingIndex, setDownloadingIndex] = useState<number | null>(null);

  const fmt = toFormat.toUpperCase();
  const isImageOutput = IMAGE_FORMATS.has(fmt);
  const isPdfOutput = fmt === "PDF";
  const isOfficeOutput = fmt in OFFICE_FORMAT_COLORS;
  const officeColor = OFFICE_FORMAT_COLORS[fmt] ?? "#6366f1";

  const handleDownload = async (file: ConvertResultFile, index: number) => {
    setDownloadingIndex(index);
    try {
      const response = await fetch(file.dataUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = file.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setDownloadedIndexes((prev) => new Set(prev).add(index));
      setTimeout(() => {
        setDownloadedIndexes((prev) => {
          const next = new Set(prev);
          next.delete(index);
          return next;
        });
      }, 3000);
    } catch (error) {
      console.error("Download failed:", error);
    } finally {
      setDownloadingIndex(null);
    }
  };

  const handleDownloadAll = async () => {
    for (let i = 0; i < files.length; i++) {
      await handleDownload(files[i], i);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full rounded-xl border bg-card overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b bg-indigo-500/10">
        <div className="p-2 rounded-lg bg-indigo-500/20">
          <RefreshCwIcon className="size-5 text-indigo-500" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium truncate">
            Converted {fromFormat} → {toFormat}
          </h4>
          <p className="text-xs text-muted-foreground">
            {message || `${originalFileName} (${originalSize})`}
          </p>
        </div>
        <CheckCircle2Icon className="size-5 text-green-500 shrink-0" />
      </div>

      {/* Files */}
      <div className="p-4 space-y-3">
        {files.map((file, index) => (
          <div key={index} className="space-y-2">
            {/* Image preview */}
            {isImageOutput && file.dataUrl && isValidDataUrl(file.dataUrl) && (
              <div className="rounded-lg overflow-hidden border bg-muted/30 flex items-center justify-center p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={file.dataUrl}
                  alt={file.fileName}
                  className="max-h-[220px] max-w-full object-contain rounded"
                />
              </div>
            )}

            {/* PDF preview */}
            {isPdfOutput && file.dataUrl && isValidDataUrl(file.dataUrl) && (
              <div className="rounded-lg overflow-hidden border bg-muted/30" style={{ height: "200px" }}>
                <iframe
                  src={file.dataUrl}
                  className="w-full h-full border-0"
                  title={`PDF Preview: ${file.fileName}`}
                />
              </div>
            )}

            {/* Office / other format preview */}
            {isOfficeOutput && (
              <div className="relative rounded-lg overflow-hidden border bg-muted/30 h-[72px] flex items-center">
                <div
                  className="w-12 h-full flex items-center justify-center shrink-0"
                  style={{ background: officeColor }}
                >
                  <FileTextIcon className="size-5 text-white" />
                </div>
                <div className="flex-1 min-w-0 px-3">
                  <p className="text-sm font-medium truncate">{file.fileName}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{fmt} document</p>
                </div>
              </div>
            )}

            {/* File info */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              {isImageOutput ? (
                <ImageIcon className="size-8 text-indigo-500 shrink-0" />
              ) : (
                <FileIcon className="size-8 text-indigo-500 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{file.fileName}</p>
                <p className="text-xs text-muted-foreground">{file.size}</p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleDownload(file, index)}
                disabled={downloadingIndex === index}
                className={cn(
                  "gap-1.5",
                  downloadedIndexes.has(index) && "text-green-500"
                )}
              >
                {downloadingIndex === index ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : downloadedIndexes.has(index) ? (
                  <CheckCircle2Icon className="size-4" />
                ) : (
                  <DownloadIcon className="size-4" />
                )}
                {downloadedIndexes.has(index) ? "Done" : "Download"}
              </Button>
            </div>
          </div>
        ))}

        {/* Conversion stats */}
        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="p-2 rounded-lg bg-muted/30">
            <p className="text-xs text-muted-foreground">From</p>
            <p className="text-sm font-medium">{fromFormat} ({originalSize})</p>
          </div>
          <div className="p-2 rounded-lg bg-indigo-500/10">
            <p className="text-xs text-muted-foreground">To</p>
            <p className="text-sm font-medium">
              {toFormat}{" "}
              {files.length === 1 && `(${files[0].size})`}
              {files.length > 1 && `(${files.length} files)`}
            </p>
          </div>
        </div>

        {/* Download all button for multi-file results */}
        {files.length > 1 && (
          <Button onClick={handleDownloadAll} className="w-full gap-2">
            <DownloadIcon className="size-4" />
            Download All ({files.length} files)
          </Button>
        )}

        {files.length === 1 && (
          <Button
            onClick={() => handleDownload(files[0], 0)}
            disabled={downloadingIndex === 0}
            className={cn(
              "w-full gap-2",
              downloadedIndexes.has(0) && "bg-green-600 hover:bg-green-700"
            )}
          >
            {downloadingIndex === 0 ? (
              <>
                <Loader2Icon className="size-4 animate-spin" />
                Preparing...
              </>
            ) : downloadedIndexes.has(0) ? (
              <>
                <CheckCircle2Icon className="size-4" />
                Downloaded!
              </>
            ) : (
              <>
                <DownloadIcon className="size-4" />
                Download {toFormat}
              </>
            )}
          </Button>
        )}
      </div>
    </motion.div>
  );
}
