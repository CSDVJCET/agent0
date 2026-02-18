"use client";

import { motion } from "motion/react";
import { PresentationIcon, DownloadIcon, ExternalLinkIcon, EyeIcon, Maximize2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface PresentationResultProps {
  title: string;
  slideCount: number;
  htmlContent: string;
  colorScheme?: string;
  message?: string;
  error?: boolean;
}

export function PresentationResult({
  title,
  slideCount,
  htmlContent,
  colorScheme = "tech",
  message,
  error = false,
}: PresentationResultProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isOpening, setIsOpening] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const createBlobUrlForDownload = () => {
    const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" });
    return URL.createObjectURL(blob);
  };

  const handleDownload = () => {
    setIsDownloading(true);
    setActionError(null);
    try {
      const url = createBlobUrlForDownload();
      const a = document.createElement("a");
      a.href = url;
      // Clean filename: remove special chars, replace with underscores, clean up multiple/trailing underscores
      const cleanFilename = title
        .replace(/[^a-z0-9]/gi, "_")
        .toLowerCase()
        .replace(/_+/g, "_")
        .replace(/^_|_$/g, "");
      a.download = `${cleanFilename || "presentation"}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      setActionError("Unable to download presentation. Please try again.");
    } finally {
      setTimeout(() => setIsDownloading(false), 1000);
    }
  };

  const handleOpenInNewTab = () => {
    setIsOpening(true);
    setActionError(null);
    try {
      // Use document.write so external scripts (reveal.js) load and
      // execute reliably — blob URLs can fail to run animations.
      const newWindow = window.open("", "_blank");
      if (!newWindow) {
        setActionError("Popup blocked — please allow popups for this site, then try again.");
        return;
      }
      newWindow.document.open();
      newWindow.document.write(htmlContent);
      newWindow.document.close();
    } catch {
      setActionError("Unable to open presentation right now. Please try again.");
    } finally {
      setTimeout(() => setIsOpening(false), 1000);
    }
  };

  const colorSchemeLabels: Record<string, string> = {
    auto: "Auto",
    tech: "Tech Blue",
    energy: "Energy Red",
    nature: "Nature Green",
    luxury: "Luxury Gold",
    ocean: "Ocean Cyan",
    sunset: "Sunset Warm",
    corporate: "Corporate",
    creative: "Creative Purple",
    medical: "Medical Teal",
    finance: "Finance Blue",
    education: "Education Violet",
    minimal: "Minimal",
    warm: "Warm Amber",
    custom: "Custom",
  };

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-red-500/20 bg-gradient-to-br from-red-500/5 to-transparent p-6"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-red-500/10 text-red-600">
            <PresentationIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-red-700 dark:text-red-400">
              Failed to Create Presentation
            </h3>
            <p className="text-xs text-red-600/70 dark:text-red-500/70">
              {message || "An error occurred while creating the presentation"}
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-lg my-4 not-prose"
    >
      <div className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm shadow-lg overflow-hidden">
        {/* Header */}
        <div className="border-b border-border/50 bg-gradient-to-br from-primary/5 via-primary/3 to-transparent p-4">
          <div className="flex items-center gap-3">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
              className="p-2 rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20"
            >
              <PresentationIcon className="w-5 h-5" />
            </motion.div>
            <div className="flex-1">
              <h3 className="font-semibold text-base">Presentation Created</h3>
              <p className="text-xs text-muted-foreground">
                {slideCount} slides • {colorSchemeLabels[colorScheme]} theme
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Title */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Title
            </label>
            <p className="text-base font-medium mt-1">{title}</p>
          </div>

          {/* Preview */}
          <div className="relative aspect-video w-full overflow-hidden rounded-lg border bg-muted/50 mt-4 group">
            <iframe 
              srcDoc={htmlContent}
              className="absolute inset-0 h-[400%] w-[400%] origin-top-left scale-25 border-0 select-none pointer-events-none bg-background"
              title="Presentation Preview"
            />
            <div 
              className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/10 transition-colors cursor-pointer" 
              onClick={handleOpenInNewTab}
            >
              <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm text-sm font-medium flex items-center gap-2">
                <Maximize2Icon className="w-4 h-4" />
                Click to open full screen
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              onClick={handleOpenInNewTab}
              disabled={isOpening}
              className="flex-1 gap-2"
              variant="default"
            >
              <ExternalLinkIcon className="w-4 h-4" />
              {isOpening ? "Opening..." : "Open Presentation"}
            </Button>
            <Button
              onClick={handleDownload}
              disabled={isDownloading}
              variant="outline"
              className="gap-2"
            >
              <DownloadIcon className="w-4 h-4" />
              {isDownloading ? "Downloading..." : "Download"}
            </Button>
          </div>

          {/* Message */}
          {message && (
            <p className="text-xs text-muted-foreground pt-2 border-t border-border/50">
              {message}
            </p>
          )}

          {actionError && (
            <p className="text-xs text-destructive pt-2 border-t border-border/50">{actionError}</p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export function PresentationLoading({ title }: { title?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-lg my-4 not-prose"
    >
      <div className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm shadow-lg overflow-hidden">
        <div className="border-b border-border/50 bg-gradient-to-br from-primary/5 via-primary/3 to-transparent p-4">
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="p-2 rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20"
            >
              <PresentationIcon className="w-5 h-5" />
            </motion.div>
            <div className="flex-1">
              <h3 className="font-semibold text-base">Creating Presentation...</h3>
              <p className="text-xs text-muted-foreground">
                {title || "Generating slides with images and animations"}
              </p>
            </div>
          </div>
        </div>
        <div className="p-4 space-y-3">
          <div className="space-y-2">
            <div className="h-3 bg-primary/10 rounded-full animate-pulse w-3/4" />
            <div className="h-3 bg-primary/10 rounded-full animate-pulse w-1/2" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
