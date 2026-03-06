import React, { useRef, useCallback, useState, useEffect } from "react";
import { animate, motion } from "motion/react";
import { EmailCard, type EmailCardProps } from "./email-card";
import { Mail } from "lucide-react";

/** Shape returned by /api/gmail/messages */
interface GmailMessageResponse {
  id: string;
  threadId: string;
  from: string;
  fromName: string;
  fromEmail: string;
  to: string;
  subject: string;
  snippet: string;
  date: string;
  labelIds: string[];
  hasAttachments: boolean;
  attachmentCount: number;
  isUnread: boolean;
}

/** Merged email data (message + category) */
interface EnrichedEmail extends GmailMessageResponse {
  categories: string[];
}

interface EmailCardCarouselProps {
  /** Whether Gmail is connected — if false, shows connect prompt */
  isGmailConnected?: boolean;
  /** Called when user clicks "reply" on a card */
  onReply?: (email: { subject: string; senderEmail: string; threadId?: string }) => void;
}

export function EmailCardCarousel({ isGmailConnected = false, onReply }: EmailCardCarouselProps) {
  const [emails, setEmails] = useState<EnrichedEmail[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);
  // Velocity tracking
  const lastX = useRef(0);
  const lastTime = useRef(0);
  const velocity = useRef(0);
  // Hold a reference to any in-flight animation so we can cancel it on new drag
  const motionStop = useRef<(() => void) | null>(null);

  // ─── Fetch emails on mount (when connected) ────────────────────────────────
  useEffect(() => {
    if (!isGmailConnected) return;
    let cancelled = false;

    async function fetchEmails() {
      setIsLoading(true);
      setError(null);
      try {
        // Step 1: Fetch inbox messages
        const msgRes = await fetch("/api/gmail/messages?maxResults=10&q=is:inbox");
        const msgData = await msgRes.json();

        if (msgData.error || !msgData.messages) {
          setError(msgData.message || "Failed to load emails");
          return;
        }

        const messages: GmailMessageResponse[] = msgData.messages;
        if (messages.length === 0) {
          setEmails([]);
          return;
        }

        // Step 2: AI-categorize in parallel
        let categories: { index: number; category: string }[] = [];
        try {
          const catRes = await fetch("/api/gmail/categorize", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              messages: messages.map((m) => ({
                subject: m.subject,
                snippet: m.snippet,
                from: m.fromName || m.fromEmail,
              })),
            }),
          });
          const catData = await catRes.json();
          if (!catData.error && catData.categories) {
            categories = catData.categories;
          }
        } catch {
          // Categorization is non-critical — continue without it
        }

        if (cancelled) return;

        // Merge categories into messages
        const enriched: EnrichedEmail[] = messages.map((msg, i) => {
          const cats = categories
            .filter((c) => c.index === i)
            .map((c) => c.category);
          return { ...msg, categories: cats };
        });

        setEmails(enriched);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load emails");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchEmails();
    return () => { cancelled = true; };
  }, [isGmailConnected]);

  // ─── Mark as read handler ─────────────────────────────────────────────────
  const handleMarkRead = useCallback(async (messageId: string) => {
    try {
      const res = await fetch("/api/gmail/mark-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId }),
      });
      const data = await res.json();
      if (!data.error) {
        setEmails((prev) =>
          prev.map((e) => (e.id === messageId ? { ...e, isUnread: false } : e))
        );
      }
    } catch (err) {
      console.error("Failed to mark as read:", err);
    }
  }, []);

  // Allow horizontal scrolling on mouse wheel — project + snap
  const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    if (!scrollRef.current || e.deltaY === 0) return;
    e.preventDefault();
    if (motionStop.current) { motionStop.current(); motionStop.current = null; }
    const container = scrollRef.current;
    const projected = container.scrollLeft + e.deltaY * 2;
    const target = findSnapTarget(container, projected);
    const controls = animate(container.scrollLeft, target, {
      type: "spring",
      stiffness: 260,
      damping: 32,
      mass: 0.8,
      onUpdate: (v) => { if (scrollRef.current) scrollRef.current.scrollLeft = v; },
    });
    motionStop.current = () => controls.stop();
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!scrollRef.current) return;
    // Cancel any running animation
    if (motionStop.current) { motionStop.current(); motionStop.current = null; }
    isDragging.current = true;
    startX.current = e.pageX - scrollRef.current.offsetLeft;
    scrollLeft.current = scrollRef.current.scrollLeft;
    lastX.current = e.pageX;
    lastTime.current = performance.now();
    velocity.current = 0;
    scrollRef.current.style.cursor = "grabbing";
    // Disable native snap while dragging so we control it entirely
    scrollRef.current.style.scrollSnapType = "none";
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging.current || !scrollRef.current) return;
    e.preventDefault();
    const now = performance.now();
    const dt = now - lastTime.current;
    if (dt > 0) {
      // velocity in px/s, positive = scrolling right
      velocity.current = ((lastX.current - e.pageX) / dt) * 1000;
    }
    lastX.current = e.pageX;
    lastTime.current = now;
    const x = e.pageX - scrollRef.current.offsetLeft;
    scrollRef.current.scrollLeft = scrollLeft.current - (x - startX.current);
  }, []);

  const handleMouseUp = useCallback(() => {
    if (!scrollRef.current) return;
    isDragging.current = false;
    scrollRef.current.style.cursor = "grab";
    scrollRef.current.style.scrollSnapType = "none";

    const container = scrollRef.current;
    const v = velocity.current; // px/s

    // Project where a natural deceleration would land, then snap to nearest card
    const DECEL = 1800; // px/s² — tune this to taste
    const coasting = (v * Math.abs(v)) / (2 * DECEL);
    const projected = container.scrollLeft + coasting;
    const target = findSnapTarget(container, projected);

    const controls = animate(container.scrollLeft, target, {
      type: "spring",
      velocity: v,
      stiffness: 260,
      damping: 32,
      mass: 0.8,
      onUpdate: (latest) => { if (scrollRef.current) scrollRef.current.scrollLeft = latest; },
    });
    motionStop.current = () => controls.stop();
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (isDragging.current) handleMouseUp();
  }, [handleMouseUp]);

  // ─── Not connected state ──────────────────────────────────────────────────
  if (!isGmailConnected) {
    return (
      <div className="relative w-full pointer-events-auto my-4 select-none flex justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-3 py-10 px-6 rounded-[32px] bg-white/10 backdrop-blur-xl border border-white/20"
          style={{ fontFamily: 'var(--font-rubik), Rubik, sans-serif' }}
        >
          <Mail className="w-8 h-8 text-white/40" />
          <p className="text-white/50 text-sm font-medium">Connect Gmail to see your inbox</p>
        </motion.div>
      </div>
    );
  }

  // ─── Loading state (skeleton cards) ─────────────────────────────────────────
  if (isLoading) {
    return (
      <div
        className="relative w-full pointer-events-auto my-4 select-none"
        style={{
          maskImage: "linear-gradient(to right, transparent, black 8%, black 92%, transparent)",
          WebkitMaskImage: "linear-gradient(to right, transparent, black 8%, black 92%, transparent)",
        }}
      >
        <div className="flex gap-4 overflow-hidden pb-4 pt-4" style={{ paddingLeft: "calc(50% - 253px)", paddingRight: "calc(50% - 253px)" }}>
          {[0, 1, 2].map((i) => (
            <div key={i} className="shrink-0 w-[506px] h-[280px] rounded-[32px] bg-white/10 backdrop-blur-xl border border-white/20 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // ─── Error state ────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="relative w-full pointer-events-auto my-4 select-none flex justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-2 py-8 px-6 rounded-[32px] bg-white/10 backdrop-blur-xl border border-white/20"
          style={{ fontFamily: 'var(--font-rubik), Rubik, sans-serif' }}
        >
          <p className="text-white/50 text-sm">{error}</p>
        </motion.div>
      </div>
    );
  }

  // ─── Empty inbox state ──────────────────────────────────────────────────────
  if (emails.length === 0) {
    return (
      <div className="relative w-full pointer-events-auto my-4 select-none flex justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-3 py-10 px-6 rounded-[32px] bg-white/10 backdrop-blur-xl border border-white/20"
          style={{ fontFamily: 'var(--font-rubik), Rubik, sans-serif' }}
        >
          <Mail className="w-8 h-8 text-white/40" />
          <p className="text-white/50 text-sm font-medium">Your inbox is empty</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div
      className="relative w-full pointer-events-auto my-4 select-none"
      style={{
        maskImage: "linear-gradient(to right, transparent, black 8%, black 92%, transparent)",
        WebkitMaskImage: "linear-gradient(to right, transparent, black 8%, black 92%, transparent)",
      }}
    >
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto pb-4 pt-4"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          cursor: "grab",
          scrollSnapType: "none",
          WebkitOverflowScrolling: "touch",
          userSelect: "none",
          WebkitUserSelect: "none",
          // First/last card always centred
          paddingLeft: "calc(50% - 253px)",
          paddingRight: "calc(50% - 253px)",
        }}
      >
        {emails.map((email) => (
          <div key={email.id} className="shrink-0" data-snap-card>
            <EmailCard
              senderName={email.fromName}
              senderEmail={email.fromEmail}
              subject={email.subject}
              bodySnippet={email.snippet}
              categories={email.categories}
              date={email.date}
              hasAttachments={email.hasAttachments}
              attachmentCount={email.attachmentCount}
              messageId={email.id}
              threadId={email.threadId}
              isUnread={email.isUnread}
              onReply={onReply}
              onMarkRead={handleMarkRead}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Returns the scrollLeft value that centres the card nearest to `projectedScrollLeft`. */
function findSnapTarget(container: HTMLDivElement, projectedScrollLeft: number): number {
  const cards = Array.from(container.querySelectorAll<HTMLElement>("[data-snap-card]"));
  if (!cards.length) return container.scrollLeft;
  const projectedCenter = projectedScrollLeft + container.clientWidth / 2;
  let closest = cards[0];
  let minDist = Infinity;
  for (const card of cards) {
    const cardCenter = card.offsetLeft + card.offsetWidth / 2;
    const dist = Math.abs(cardCenter - projectedCenter);
    if (dist < minDist) { minDist = dist; closest = card; }
  }
  return closest.offsetLeft + closest.offsetWidth / 2 - container.clientWidth / 2;
}