"use client";

import { motion } from "motion/react";
import { FileIcon, FileTextIcon, FileImageIcon, XIcon } from "lucide-react";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

// Use a type that's compatible with the AI SDK's FileUIPart
// but includes additional properties needed for preview (size)
export type FileAttachment = {
  name: string;
  type: string;      // Maps to mediaType in FileUIPart
  size: number;      // Used for preview info
  url: string;       // Maps to url in FileUIPart
};

export type AttachmentsPreviewProps = {
  attachments: FileAttachment[];
  onRemove: (index: number) => void;
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(type: string) {
  if (type.startsWith("image/")) {
    return <FileImageIcon className="size-4 text-muted-foreground" />;
  }
  if (type === "application/pdf" || type.startsWith("text/")) {
    return <FileTextIcon className="size-4 text-muted-foreground" />;
  }
  return <FileIcon className="size-4 text-muted-foreground" />;
}

function AttachmentItem({ 
  attachment, 
  index, 
  onRemove 
}: { 
  attachment: FileAttachment; 
  index: number; 
  onRemove: (index: number) => void;
}) {
  const isImage = attachment.type.startsWith("image/");
  
  const content = (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-lg text-sm cursor-default group">
      {isImage ? (
        <div className="size-4 rounded overflow-hidden flex-shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            src={attachment.url} 
            alt={attachment.name}
            className="size-full object-cover"
          />
        </div>
      ) : (
        getFileIcon(attachment.type)
      )}
      <span className="truncate max-w-[150px]">{attachment.name}</span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove(index);
        }}
        className="hover:bg-background rounded p-0.5 opacity-60 group-hover:opacity-100 transition-opacity"
      >
        <XIcon className="size-3" />
      </button>
    </div>
  );

  // Only show hover preview for images
  if (isImage) {
    return (
      <HoverCard openDelay={200} closeDelay={100}>
        <HoverCardTrigger asChild>
          {content}
        </HoverCardTrigger>
        <HoverCardContent 
          side="top" 
          align="center"
          className="w-auto p-2"
        >
          <div className="flex flex-col gap-2">
            <div className="max-w-[300px] max-h-[200px] overflow-hidden rounded-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={attachment.url} 
                alt={attachment.name}
                className="w-full h-full object-contain"
              />
            </div>
            <div className="text-xs text-muted-foreground text-center">
              <span className="font-medium">{attachment.name}</span>
              <span className="mx-1">•</span>
              <span>{formatFileSize(attachment.size)}</span>
            </div>
          </div>
        </HoverCardContent>
      </HoverCard>
    );
  }

  // For non-image files, show a simpler hover card with file info
  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        {content}
      </HoverCardTrigger>
      <HoverCardContent 
        side="top" 
        align="center"
        className="w-auto p-3"
      >
        <div className="flex items-center gap-3">
          {getFileIcon(attachment.type)}
          <div className="flex flex-col">
            <span className="text-sm font-medium">{attachment.name}</span>
            <span className="text-xs text-muted-foreground">
              {formatFileSize(attachment.size)} • {attachment.type.split("/")[1]?.toUpperCase() || "File"}
            </span>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

export function AttachmentsPreview({ attachments, onRemove }: AttachmentsPreviewProps) {
  if (attachments.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      className="flex flex-wrap gap-2"
    >
      {attachments.map((att, i) => (
        <AttachmentItem
          key={i}
          attachment={att}
          index={i}
          onRemove={onRemove}
        />
      ))}
    </motion.div>
  );
}
