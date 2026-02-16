"use client";

import { motion } from "motion/react";
import { PresentationIcon, DownloadIcon, ExternalLinkIcon, EyeIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { cn } from "@/lib/utils";

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

  const handleDownload = () => {
    setIsDownloading(true);
    try {
      const blob = new Blob([htmlContent], { type: "text/html" });
      const url = URL.createObjectURL(blob);
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
    } finally {
      setTimeout(() => setIsDownloading(false), 1000);
    }
  };

  const handleOpenInNewTab = () => {
    setIsOpening(true);
    try {
      const blob = new Blob([htmlContent], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } finally {
      setTimeout(() => setIsOpening(false), 1000);
    }
  };

  const colorSchemeLabels: Record<string, string> = {
    tech: "Tech Blue",
    energy: "Energy Red",
    nature: "Nature Green",
    luxury: "Luxury Gold",
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

          {/* Preview Info */}
          <div className="rounded-lg bg-muted/30 p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <EyeIcon className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                Features: Image frames, animations, responsive design
              </span>
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
