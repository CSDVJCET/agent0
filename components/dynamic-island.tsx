"use client";

import * as React from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { Blocks, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { UserButton, SignedIn, SignedOut, SignInButton, useUser } from "@clerk/nextjs";
import { ModelSelectorControl, Model, ModelSelectorControlProps } from "@/components/ai-elements/model-selector-control";

interface DynamicIslandProps extends Partial<ModelSelectorControlProps> {
  className?: string;
  onOpenIntegrations?: () => void;
  models?: Model[];
  selectedModel?: Model;
  onSelectModel?: (model: Model) => void;
  isModelOpen?: boolean;
  onModelOpenChange?: (open: boolean) => void;
  onNewChat?: () => void;
}

export function DynamicIsland({ 
  className,
  models = [],
  selectedModel,
  onSelectModel,
  isModelOpen = false,
  onModelOpenChange,
  onOpenIntegrations,
  onNewChat
}: DynamicIslandProps) {
  const { user, isLoaded } = useUser();
  const [showControls, setShowControls] = React.useState(false);
  const hideControlsTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const isIslandHoveredRef = React.useRef(false);
  const isModelOpenRef = React.useRef(isModelOpen);
  const controlsCloseDelayMs = 180;

  React.useEffect(() => {
    isModelOpenRef.current = isModelOpen;
  }, [isModelOpen]);

  const clearHideControlsTimeout = React.useCallback(() => {
    if (hideControlsTimeoutRef.current !== null) {
      clearTimeout(hideControlsTimeoutRef.current);
      hideControlsTimeoutRef.current = null;
    }
  }, []);

  const expandControls = React.useCallback(() => {
    if (isIslandHoveredRef.current && showControls) {
      clearHideControlsTimeout();
      return;
    }

    isIslandHoveredRef.current = true;
    clearHideControlsTimeout();
    setShowControls(true);
  }, [clearHideControlsTimeout, showControls]);

  const scheduleHideControls = React.useCallback(() => {
    clearHideControlsTimeout();
    hideControlsTimeoutRef.current = setTimeout(() => {
      if (isIslandHoveredRef.current || isModelOpenRef.current) {
        return;
      }
      setShowControls(false);
    }, controlsCloseDelayMs);
  }, [clearHideControlsTimeout, controlsCloseDelayMs]);

  React.useEffect(() => {
    return () => {
      clearHideControlsTimeout();
    };
  }, [clearHideControlsTimeout]);

  const handleModelOpenChange = React.useCallback((open: boolean) => {
    onModelOpenChange?.(open);
    isModelOpenRef.current = open;

    if (open) {
      clearHideControlsTimeout();
      setShowControls(true);
      return;
    }

    if (!isIslandHoveredRef.current) {
      scheduleHideControls();
    }
  }, [onModelOpenChange, clearHideControlsTimeout, scheduleHideControls]);

  return (
    <div className={cn("fixed top-6 left-1/2 -translate-x-1/2 z-50 w-max max-w-[min(92vw,960px)]", className)}>
      <motion.div
        layout
        onMouseEnter={expandControls}
        onMouseLeave={() => {
          isIslandHoveredRef.current = false;
          if (isModelOpenRef.current) {
            return;
          }
          scheduleHideControls();
        }}
        initial={{ y: -20, opacity: 0, filter: "blur(10px)" }}
        animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
        transition={{ 
          layout: { duration: 0.4, ease: [0.32, 0.72, 0, 1] },
          type: "spring", stiffness: 300, damping: 25 
        }}
        className="inline-flex w-max max-w-full items-center gap-2 p-1.5 rounded-full bg-[#0A0A0A]/40 backdrop-blur-[32px] border border-white/8 shadow-[0_16px_32px_-8px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.15),inset_0_-1px_0_rgba(0,0,0,0.2)]"
      >
        {/* Logo / New Chat */}
        <motion.button
          layout
          transition={{ layout: { duration: 0.4, ease: [0.32, 0.72, 0, 1] } }}
          whileHover={{ scale: 1.05, backgroundColor: "rgba(255,255,255,0.1)" }}
          whileTap={{ scale: 0.95 }}
          onMouseEnter={expandControls}
          onClick={onNewChat}
          className="flex items-center justify-center size-10 rounded-full bg-[#0ea5ff] text-white/90 transition-colors border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] shrink-0 overflow-hidden"
        >
          <Logo size="sm" className="scale-125" />
        </motion.button>

        <AnimatePresence initial={false} mode="wait">
            {showControls && (
            <motion.div
              layout
              key="island-controls"
              initial={{ opacity: 0, scaleX: 0.82, x: -10 }}
              animate={{ opacity: 1, scaleX: 1, x: 0 }}
              exit={{ opacity: 0, scaleX: 0.92, x: -6 }}
              transition={{
                layout: { duration: 0.4, ease: [0.32, 0.72, 0, 1] },
                opacity: { duration: 0.12, ease: "easeOut" },
                scaleX: { type: "spring", stiffness: 540, damping: 34, mass: 0.48 },
                x: { type: "spring", stiffness: 520, damping: 36, mass: 0.5 },
              }}
              style={{ transformOrigin: "left center" }}
              className="inline-flex max-w-full items-center overflow-hidden will-change-transform"
            >
              <div className="w-px h-6 bg-white/8 mx-1 shrink-0" />

              {/* Controls */}
              <div className="flex items-center gap-1.5 shrink-0 px-1">
                {selectedModel && onSelectModel && (
                  <ModelSelectorControl
                    models={models}
                    selectedModel={selectedModel}
                    onSelectModel={onSelectModel}
                    isOpen={isModelOpen || false}
                    onOpenChange={handleModelOpenChange}
                    className="h-10 border-none bg-transparent hover:bg-white/8 text-white/90 w-auto min-w-[130px] transition-colors rounded-full px-4 font-medium" 
                  />
                )}
                
                <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-10 gap-2 text-white/80 hover:text-white hover:bg-white/8 rounded-full px-4 transition-colors font-medium"
                    onClick={onOpenIntegrations}
                >
                    <Blocks className="size-4" />
                    <span>Tools</span>
                </Button>
              </div>
              
              <div className="w-px h-6 bg-white/8 mx-1 shrink-0" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* User Section */}
        <motion.div 
          layout
          transition={{ layout: { duration: 0.4, ease: [0.32, 0.72, 0, 1] } }}
          className="flex items-center gap-3 px-3 pr-1.5 shrink-0"
        >
          <span className="text-base font-medium text-white/70 tracking-tight">Hello,</span>

          <SignedIn>
            <div className="flex items-center gap-2">
              <div className="h-9 px-4 rounded-full border border-dashed border-white/20 flex items-center justify-center bg-white/2 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                <span className="text-sm font-medium text-white/90">{isLoaded ? user?.firstName : "..."}</span>
              </div>
              <div className="size-9 rounded-full border border-dashed border-white/20 p-0.5 flex items-center justify-center bg-white/2 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                <UserButton appearance={{ elements: { userButtonAvatarBox: "size-full" } }} />
              </div>
            </div>
          </SignedIn>

          <SignedOut>
            <SignInButton mode="modal">
              <button className="h-9 px-4 rounded-full border border-dashed border-white/20 flex items-center justify-center gap-2 hover:bg-white/8 hover:border-white/40 transition-all duration-300 cursor-pointer group bg-white/2 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                <Plus className="size-4 text-white/50 group-hover:text-white/90 transition-colors" />
                <span className="text-sm font-medium text-white/70 group-hover:text-white transition-colors">Add Name</span>
              </button>
            </SignInButton>
          </SignedOut>
        </motion.div>
      </motion.div>
    </div>
  );
}