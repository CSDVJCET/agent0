"use client";

import { useMemo, useState } from "react";
import { motion } from "motion/react";
import {
  CheckIcon,
  Loader2Icon,
  PlusIcon,
  PresentationIcon,
  SparklesIcon,
  TrashIcon,
  XIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PresentationResult, PresentationLoading } from "@/components/ai-elements/presentation-result";
import {
  ChainOfThought,
  ChainOfThoughtContent,
  ChainOfThoughtHeader,
  ChainOfThoughtStep,
} from "@/components/ai-elements/chain-of-thought";

type ColorScheme = "tech" | "energy" | "nature" | "luxury" | "custom";

interface PresentationHeadingDetails {
  topic: string;
  title: string;
  subtitle?: string;
  slideCount: number;
  headings: string[];
  colorScheme?: ColorScheme;
}

interface PresentationResultPayload {
  title: string;
  slideCount: number;
  htmlContent: string;
  colorScheme?: string;
  message?: string;
  error?: boolean;
}

interface SlidesHeadingConfirmationProps {
  toolCallId: string;
  presentationDetails: PresentationHeadingDetails;
  reasoning?: string;
  model?: string;
}

export function SlidesHeadingConfirmation({
  toolCallId,
  presentationDetails,
  reasoning,
  model,
}: SlidesHeadingConfirmationProps) {
  const [title, setTitle] = useState(presentationDetails.title || "");
  const [subtitle, setSubtitle] = useState(presentationDetails.subtitle || "");
  const [topic, setTopic] = useState(presentationDetails.topic || "");
  const [headings, setHeadings] = useState<string[]>(
    presentationDetails.headings?.length > 0
      ? presentationDetails.headings
      : Array.from({ length: Math.max(3, presentationDetails.slideCount || 6) }, (_, index) => `${presentationDetails.topic} — Slide ${index + 1}`)
  );

  const [status, setStatus] = useState<"pending" | "creating" | "created" | "rejected" | "error">("pending");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createdResult, setCreatedResult] = useState<PresentationResultPayload | null>(null);

  const normalizedSlideCount = useMemo(() => Math.max(3, headings.length), [headings.length]);

  const handleHeadingChange = (index: number, value: string) => {
    setHeadings((prev) => prev.map((heading, i) => (i === index ? value : heading)));
  };

  const handleAddSlide = () => {
    setHeadings((prev) => [...prev, `${topic || "Presentation"} — Slide ${prev.length + 1}`]);
  };

  const handleRemoveSlide = (index: number) => {
    setHeadings((prev) => {
      if (prev.length <= 3) {
        return prev;
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleReject = () => {
    setStatus("rejected");
  };

  const handleConfirm = async () => {
    setStatus("creating");
    setErrorMessage(null);

    try {
      const cleanedHeadings = headings.map((heading) => heading.trim()).filter(Boolean);
      const response = await fetch("/api/slides/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          subtitle: subtitle.trim() || undefined,
          topic: topic.trim(),
          slideCount: cleanedHeadings.length,
          headings: cleanedHeadings,
          colorScheme: presentationDetails.colorScheme || "auto",
          model: model || "gemini-2.0-flash-exp",
        }),
      });

      const result = await response.json();
      if (!response.ok || result.error) {
        setStatus("error");
        setErrorMessage(result.message || "Failed to generate presentation");
        return;
      }

      setCreatedResult(result);
      setStatus("created");
    } catch (error) {
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Failed to generate presentation");
    }
  };

  const isValid =
    title.trim().length > 0 &&
    topic.trim().length > 0 &&
    headings.length >= 3 &&
    headings.every((heading) => heading.trim().length > 0);

  if (status === "creating") {
    return <PresentationLoading title={`Generating presentation for "${title || topic}"`} />;
  }

  if (status === "created" && createdResult) {
    return <PresentationResult {...createdResult} />;
  }

  if (status === "rejected") {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-2xl my-4 not-prose">
        <div className="rounded-xl border border-border bg-muted/20 p-4">
          <div className="flex items-center gap-3 text-muted-foreground">
            <XIcon className="w-5 h-5" />
            <span>Presentation generation cancelled</span>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-2xl my-4 not-prose">
      <div className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm shadow-lg overflow-hidden">
        {reasoning && (
          <div className="border-b border-border/50 p-4">
            <ChainOfThought defaultOpen={false}>
              <ChainOfThoughtHeader>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <SparklesIcon className="w-4 h-4" />
                  <span>Heading Plan</span>
                </div>
              </ChainOfThoughtHeader>
              <ChainOfThoughtContent>
                <ChainOfThoughtStep label="Drafted outline">{reasoning}</ChainOfThoughtStep>
              </ChainOfThoughtContent>
            </ChainOfThought>
          </div>
        )}

        <div className="border-b border-border/50 bg-linear-to-br from-primary/5 via-primary/3 to-transparent p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20">
              <PresentationIcon className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-base">Review Slide Headings</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Edit title, topic, and heading list before generating slides</p>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor={`slides-title-${toolCallId}`} className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Presentation Title
              </Label>
              <Input id={`slides-title-${toolCallId}`} value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`slides-topic-${toolCallId}`} className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Topic
              </Label>
              <Input id={`slides-topic-${toolCallId}`} value={topic} onChange={(e) => setTopic(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`slides-subtitle-${toolCallId}`} className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Subtitle (optional)
            </Label>
            <Input id={`slides-subtitle-${toolCallId}`} value={subtitle} onChange={(e) => setSubtitle(e.target.value)} />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Slide Headings ({normalizedSlideCount})</Label>
              <Button variant="outline" size="sm" onClick={handleAddSlide} className="gap-1">
                <PlusIcon className="w-3.5 h-3.5" />
                Add Slide
              </Button>
            </div>

            <div className="space-y-2">
              {headings.map((heading, index) => (
                <div key={`${toolCallId}-heading-${index}`} className="flex items-center gap-2">
                  <span className="w-7 text-xs text-muted-foreground text-right">{index + 1}.</span>
                  <Input value={heading} onChange={(e) => handleHeadingChange(index, e.target.value)} />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveSlide(index)}
                    disabled={headings.length <= 3}
                  >
                    <TrashIcon className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {status === "error" && errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}

          <div className="flex gap-3 pt-1">
            <Button variant="outline" onClick={handleReject} className="flex-1 gap-2">
              <XIcon className="w-4 h-4" />
              Cancel
            </Button>
            <Button onClick={handleConfirm} disabled={!isValid} className="flex-1 gap-2">
              <CheckIcon className="w-4 h-4" />
              Confirm & Generate
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
