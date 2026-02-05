"use client";

import { useState } from "react";
import { 
  MailIcon, 
  SendIcon, 
  XIcon,
  Loader2Icon,
  CheckIcon,
  UserIcon,
  AlignLeftIcon,
  SparklesIcon,
  BrainIcon,
  ExternalLinkIcon
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { motion } from "motion/react";
import {
  ChainOfThought,
  ChainOfThoughtHeader,
  ChainOfThoughtContent,
  ChainOfThoughtStep,
} from "@/components/ai-elements/chain-of-thought";

interface EmailDetails {
  to: string;
  subject: string;
  body: string;
  cc?: string;
  bcc?: string;
  thread_id?: string;
}

interface SentEmailResult {
  to: string;
  subject: string;
  messageId?: string;
  threadId?: string;
}

interface EmailDraftConfirmationProps {
  toolCallId: string;
  emailDetails: EmailDetails;
  reasoning: string;
}

export function EmailDraftConfirmation({
  toolCallId,
  emailDetails,
  reasoning,
}: EmailDraftConfirmationProps) {
  const [formData, setFormData] = useState({
    to: emailDetails.to || "",
    subject: emailDetails.subject || "",
    body: emailDetails.body || "",
    cc: emailDetails.cc || "",
    bcc: emailDetails.bcc || "",
  });
  
  // Internal state management
  const [status, setStatus] = useState<"pending" | "sending" | "sent" | "cancelled" | "error">("pending");
  const [sentEmail, setSentEmail] = useState<SentEmailResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSend = async () => {
    setStatus("sending");
    setErrorMessage(null);

    try {
      // Call the API directly to send the email
      const response = await fetch("/api/gmail/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: formData.to,
          subject: formData.subject,
          body: formData.body,
          cc: formData.cc || undefined,
          bcc: formData.bcc || undefined,
          thread_id: emailDetails.thread_id || undefined,
        }),
      });

      const result = await response.json();

      if (result.error) {
        setStatus("error");
        setErrorMessage(result.message || "Failed to send email");
      } else {
        setStatus("sent");
        setSentEmail({
          to: result.to || formData.to,
          subject: result.subject || formData.subject,
          messageId: result.messageId,
          threadId: result.threadId,
        });
      }
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Failed to send email");
    }
  };

  const handleCancel = () => {
    setStatus("cancelled");
  };

  const isValid = formData.to && formData.subject && formData.body;

  // Show sent email success state
  if (status === "sent" && sentEmail) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="w-full max-w-lg my-4 not-prose"
      >
        <div className="rounded-xl border border-green-500/20 bg-gradient-to-br from-green-500/5 via-green-500/3 to-transparent backdrop-blur-sm shadow-lg overflow-hidden">
          <div className="border-b border-green-500/10 bg-gradient-to-br from-green-500/5 to-transparent p-4">
            <div className="flex items-center gap-3">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200 }}
                className="p-2 rounded-lg bg-green-500/10 text-green-600 ring-1 ring-green-500/20"
              >
                <CheckIcon className="w-5 h-5" />
              </motion.div>
              <div className="flex-1">
                <h3 className="font-semibold text-base text-green-700 dark:text-green-400">Email Sent Successfully</h3>
                <p className="text-xs text-green-600/70 dark:text-green-500/70 mt-0.5">Your message has been delivered</p>
              </div>
            </div>
          </div>
          <div className="p-5 space-y-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1">To</p>
              <p className="font-medium">{sentEmail.to}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Subject</p>
              <p className="font-semibold text-lg">{sentEmail.subject}</p>
            </div>
            {sentEmail.messageId && (
              <div className="pt-2">
                <p className="text-xs text-muted-foreground">Message ID: {sentEmail.messageId}</p>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  // Show cancelled state
  if (status === "cancelled") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg my-4 not-prose"
      >
        <div className="rounded-xl border border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600">
              <XIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-amber-700 dark:text-amber-400">Email Cancelled</h3>
              <p className="text-xs text-amber-600/70 dark:text-amber-500/70">The email was not sent</p>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // Show error state
  if (status === "error") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg my-4 not-prose"
      >
        <div className="rounded-xl border border-red-500/20 bg-gradient-to-br from-red-500/5 to-transparent p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/10 text-red-600">
              <XIcon className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-red-700 dark:text-red-400">Failed to Send Email</h3>
              <p className="text-xs text-red-600/70 dark:text-red-500/70">{errorMessage}</p>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setStatus("pending")}>
              Try Again
            </Button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="w-full max-w-lg my-4 not-prose">
      {/* Chain of Thought - Agent Reasoning */}
      <ChainOfThought defaultOpen={false} className="mb-4">
        <ChainOfThoughtHeader>
          <span className="flex items-center gap-1.5">
            <SparklesIcon className="h-3.5 w-3.5" />
            Email Draft Composed
          </span>
        </ChainOfThoughtHeader>
        <ChainOfThoughtContent>
          <ChainOfThoughtStep 
            icon={BrainIcon} 
            label="Composing your email"
            status="complete"
          >
            <p className="text-xs text-muted-foreground whitespace-pre-wrap">{reasoning}</p>
          </ChainOfThoughtStep>
        </ChainOfThoughtContent>
      </ChainOfThought>

      {/* Email Form */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm shadow-lg overflow-hidden"
      >
        {/* Header */}
        <div className="border-b border-border/50 bg-gradient-to-br from-primary/5 via-primary/3 to-transparent p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20">
              <MailIcon className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-base">Review Email Draft</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Confirm or edit before sending</p>
            </div>
          </div>
        </div>

        {/* Form Content */}
        <div className="p-5 space-y-4">
          {/* To */}
          <div className="space-y-2">
            <Label htmlFor={`to-${toolCallId}`} className="text-xs font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
              <UserIcon className="w-3 h-3" />
              To <span className="text-destructive">*</span>
            </Label>
            <Input
              id={`to-${toolCallId}`}
              value={formData.to}
              onChange={(e) => handleChange("to", e.target.value)}
              placeholder="recipient@example.com"
              className={cn(
                "h-10 transition-all",
                !formData.to && "border-destructive/50 focus-visible:ring-destructive/20"
              )}
              disabled={status === "sending"}
            />
          </div>

          {/* CC */}
          <div className="space-y-2">
            <Label htmlFor={`cc-${toolCallId}`} className="text-xs font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
              <UserIcon className="w-3 h-3" />
              CC
            </Label>
            <Input
              id={`cc-${toolCallId}`}
              value={formData.cc}
              onChange={(e) => handleChange("cc", e.target.value)}
              placeholder="cc@example.com (optional)"
              className="h-10"
              disabled={status === "sending"}
            />
          </div>

          {/* BCC */}
          <div className="space-y-2">
            <Label htmlFor={`bcc-${toolCallId}`} className="text-xs font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
              <UserIcon className="w-3 h-3" />
              BCC
            </Label>
            <Input
              id={`bcc-${toolCallId}`}
              value={formData.bcc}
              onChange={(e) => handleChange("bcc", e.target.value)}
              placeholder="bcc@example.com (optional)"
              className="h-10"
              disabled={status === "sending"}
            />
          </div>

          {/* Subject */}
          <div className="space-y-2">
            <Label htmlFor={`subject-${toolCallId}`} className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Subject <span className="text-destructive">*</span>
            </Label>
            <Input
              id={`subject-${toolCallId}`}
              value={formData.subject}
              onChange={(e) => handleChange("subject", e.target.value)}
              placeholder="Email subject"
              className={cn(
                "h-10 transition-all",
                !formData.subject && "border-destructive/50 focus-visible:ring-destructive/20"
              )}
              disabled={status === "sending"}
            />
          </div>

          {/* Body */}
          <div className="space-y-2">
            <Label htmlFor={`body-${toolCallId}`} className="text-xs font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
              <AlignLeftIcon className="w-3 h-3" />
              Message <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id={`body-${toolCallId}`}
              value={formData.body}
              onChange={(e) => handleChange("body", e.target.value)}
              placeholder="Email body..."
              className={cn(
                "min-h-[200px] resize-y transition-all",
                !formData.body && "border-destructive/50 focus-visible:ring-destructive/20"
              )}
              disabled={status === "sending"}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={status === "sending"}
              className="flex-1 h-11 gap-2"
            >
              <XIcon className="h-4 w-4" />
              Cancel
            </Button>
            <Button
              onClick={handleSend}
              disabled={!isValid || status === "sending"}
              className="flex-1 h-11 gap-2"
            >
              {status === "sending" ? (
                <>
                  <Loader2Icon className="h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <SendIcon className="h-4 w-4" />
                  Send Email
                </>
              )}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
