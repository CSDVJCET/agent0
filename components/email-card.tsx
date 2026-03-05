import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Paperclip, Check } from "lucide-react";

/** Category color palette — matches /api/gmail/categorize output */
const CATEGORY_STYLES: Record<string, { bg: string; border: string }> = {
  work: { bg: "rgba(80,160,221,0.55)", border: "rgba(80,160,221,0.3)" },
  personal: { bg: "rgba(100,200,130,0.55)", border: "rgba(100,200,130,0.3)" },
  marketing: { bg: "rgba(228,167,157,0.55)", border: "rgba(228,167,157,0.3)" },
  finance: { bg: "rgba(220,190,80,0.55)", border: "rgba(220,190,80,0.3)" },
  social: { bg: "rgba(180,130,220,0.55)", border: "rgba(180,130,220,0.3)" },
  newsletter: { bg: "rgba(160,170,180,0.55)", border: "rgba(160,170,180,0.3)" },
  updates: { bg: "rgba(100,200,200,0.55)", border: "rgba(100,200,200,0.3)" },
};

/** Format a date string to relative time (e.g. "2h ago", "3d ago") */
function formatRelativeTime(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

export interface EmailCardProps {
  /** Sender display name */
  senderName: string;
  /** Sender email address */
  senderEmail: string;
  /** Email subject */
  subject: string;
  /** Email body snippet */
  bodySnippet: string;
  /** AI-categorized labels (e.g. ["work", "marketing"]) */
  categories?: string[];
  /** Date string for relative time display */
  date?: string;
  /** Whether the email has file attachments */
  hasAttachments?: boolean;
  /** Number of file attachments */
  attachmentCount?: number;
  /** Gmail message ID */
  messageId?: string;
  /** Gmail thread ID */
  threadId?: string;
  /** Whether the email is unread */
  isUnread?: boolean;
  /** Callback when reply button is clicked */
  onReply?: (email: { subject: string; senderEmail: string; threadId?: string }) => void;
  /** Callback when mark-as-read button is clicked */
  onMarkRead?: (messageId: string) => void;
}

export function EmailCard({
  senderName,
  senderEmail,
  subject,
  bodySnippet,
  categories = [],
  date,
  hasAttachments = false,
  attachmentCount = 0,
  messageId,
  threadId,
  isUnread = false,
  onReply,
  onMarkRead,
}: EmailCardProps) {
  const [markedRead, setMarkedRead] = useState(false);
  const [markingRead, setMarkingRead] = useState(false);

  const avatarUrl = `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(senderEmail)}`;
  const relativeTime = date ? formatRelativeTime(date) : "";

  const handleMarkRead = async () => {
    if (!messageId || markingRead || markedRead) return;
    setMarkingRead(true);
    try {
      await onMarkRead?.(messageId);
      setMarkedRead(true);
    } finally {
      setMarkingRead(false);
    }
  };

  const handleReply = () => {
    onReply?.({ subject, senderEmail, threadId });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: markedRead ? 0.6 : 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="relative flex flex-col w-full min-w-[450px] max-w-[506px] bg-white/15 backdrop-blur-2xl border border-white/40 rounded-[32px] p-5 shrink-0 select-none"
      style={{
        fontFamily: 'var(--font-rubik), Rubik, sans-serif',
        boxShadow: "inset 0 1.5px 1px rgba(255,255,255,0.55), inset 0 -1px 1px rgba(0,0,0,0.06), 0 8px 32px rgba(0,0,0,0.10)",
      }}
    >
      {/* Unread indicator dot */}
      {isUnread && !markedRead && (
        <div className="absolute top-5 right-5 w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
      )}

      {/* Email Subject Section */}
      <h2 className="font-['Rubik'] text-[24px] text-black tracking-[-0.23px] leading-[1.2] mb-1 px-2 line-clamp-2">
        {subject}
      </h2>

      {/* Date */}
      {relativeTime && (
        <span className="font-['Rubik'] text-[11px] text-black/50 px-2 mb-3">{relativeTime}</span>
      )}

      {/* Main Content Area (White Box) */}
      <div className="bg-white/80 rounded-[20px] p-4 mb-4">
        {/* Category Badges */}
        {categories.length > 0 && (
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            {categories.map((cat) => {
              const style = CATEGORY_STYLES[cat] || CATEGORY_STYLES.updates;
              return (
                <div
                  key={cat}
                  className="px-3 py-1 rounded-[10px] h-[22px] flex items-center justify-center relative overflow-hidden"
                  style={{
                    background: `linear-gradient(135deg, ${style.bg} 0%, ${style.bg.replace("0.55", "0.35")} 50%, ${style.bg.replace("0.55", "0.45")} 100%)`,
                    backdropFilter: "blur(12px) saturate(180%)",
                    WebkitBackdropFilter: "blur(12px) saturate(180%)",
                    border: "1px solid rgba(255,255,255,0.55)",
                    boxShadow: `inset 0 1px 1.5px rgba(255,255,255,0.7), inset 0 -1px 1px ${style.border}, 0 2px 8px ${style.border}`,
                  }}
                >
                  <div
                    className="absolute inset-0 rounded-[10px]"
                    style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.25) 0%, transparent 60%)" }}
                  />
                  <span className="font-['Rubik'] text-[10px] font-medium text-black/80 relative z-10">
                    {cat}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Snippet Text */}
        <p className="font-['Rubik'] text-[14px] text-black leading-[20px] tracking-[-0.23px] line-clamp-3">
          {bodySnippet}
        </p>
      </div>

      {/* Divider */}
      <div className="w-[calc(100%+40px)] -ml-5 border-b-[1px] border-black/10 mb-4" />

      {/* Bottom Header Section */}
      <div className="flex items-center justify-between w-full relative z-10 px-1">
        <div className="flex items-center gap-3">
          <div className="w-[42px] h-[42px] rounded-full overflow-hidden shrink-0 bg-white">
            <img
              src={avatarUrl}
              alt={senderName}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex flex-col -gap-1">
            <span className="font-['Rubik'] text-black text-[18px] tracking-[-0.23px] leading-tight">
              {senderName}
            </span>
            <span className="font-['Rubik'] text-black/80 text-[10px] tracking-[-0.115px]">
              {senderEmail}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Attachment indicator */}
          {hasAttachments && attachmentCount > 0 && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-black/5">
              <Paperclip className="w-3.5 h-3.5 text-black/60" strokeWidth={2} />
              <span className="font-['Rubik'] text-[10px] text-black/60">{attachmentCount}</span>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleReply}
              className="flex items-center justify-center bg-black/10 hover:bg-black/20 backdrop-blur-sm transition-colors h-[26px] px-4 rounded-[15px]"
            >
              <span className="font-['Rubik'] text-black text-[11px] leading-none">reply</span>
            </button>
            <AnimatePresence mode="wait">
              {markedRead ? (
                <motion.div
                  key="done"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="flex items-center justify-center bg-green-500/20 h-[26px] px-4 rounded-[15px]"
                >
                  <Check className="w-3 h-3 text-green-700 mr-1" />
                  <span className="font-['Rubik'] text-green-700 text-[11px] leading-none">Read</span>
                </motion.div>
              ) : (
                <motion.button
                  key="unread"
                  onClick={handleMarkRead}
                  disabled={markingRead}
                  className="flex items-center justify-center bg-black/10 hover:bg-black/20 backdrop-blur-sm transition-colors h-[26px] px-4 rounded-[15px] disabled:opacity-50"
                >
                  <span className="font-['Rubik'] text-black text-[11px] leading-none">
                    {markingRead ? "..." : "Mark as read"}
                  </span>
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
