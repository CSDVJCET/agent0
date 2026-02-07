"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import type { MyUIMessage } from "@/types/chat";

// Components
import { ChatHeader } from "@/components/chat-header";
import { PromptInputArea } from "@/components/prompt-input-area";
import { MessageList } from "@/components/ai-elements/message-list";
import { AttachmentsPreview } from "@/components/ai-elements/attachments-preview";
import { FeatureBadgesRow, FeatureBadge } from "@/components/ai-elements/feature-badges-row";
import { ChatEmptyState } from "@/components/ai-elements/chat-empty-state";
import { SuggestionsGrid } from "@/components/ai-elements/chat-suggestions-grid";
import { TableOfContents } from "@/components/table-of-contents";
import { IntegrationsModal } from "@/components/integrations-modal";
import { IntegrationPanel } from "@/components/integration-panel";
import { FileDropZone } from "@/components/file-drop-zone";

// Hooks and Constants
import { useChatState } from "@/hooks/use-chat-state";
import { useLocalStorageSync } from "@/hooks/use-local-storage-sync";
import { useFileHandlers } from "@/hooks/use-file-handlers";
import { useExtensionListeners } from "@/hooks/use-extension-listeners";
import { useIntegrationHandlers } from "@/hooks/use-integration-handlers";
import { MODELS, DEFAULT_SUGGESTIONS, STORAGE_KEYS } from "@/lib/chat-constants";

export function ChatUI() {
  // State management
  const state = useChatState();
  const {
    selectedModel, setSelectedModel,
    isModelOpen, setIsModelOpen,
    enableSearch, setEnableSearch,
    enableThinking, setEnableThinking,
    mentionedTools, setMentionedTools,
    attachments, setAttachments,
    inputValue, setInputValue,
    isLoaded,
    isIntegrationsModalOpen, setIsIntegrationsModalOpen,
    activeIntegration, setActiveIntegration,
    addedIntegrations, setAddedIntegrations,
    isCalendarConnected, setIsCalendarConnected,
    isFormsConnected, setIsFormsConnected,
    isTasksConnected, setIsTasksConnected,
    fileInputRef,
  } = state;

  const {
    messages,
    sendMessage,
    status,
    error,
    regenerate,
    setMessages,
  } = useChat<MyUIMessage>({
    id: "gemini-chat",
    transport: new DefaultChatTransport({
      api: "/api/chat",
    }),
    experimental_throttle: 50, // Throttle UI updates for better performance
    onFinish: () => {
      setAttachments([]);
      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    onError: (error) => {
      console.error("Chat error:", error);
    },
  });

  // Hooks for state management
  const { dedupedMessages } = useLocalStorageSync({
    messages,
    setMessages,
    selectedModel,
    setSelectedModel,
    enableThinking,
    setEnableThinking,
    setAddedIntegrations,
    setIsCalendarConnected,
    setIsFormsConnected,
    setIsTasksConnected,
    isLoaded,
    setIsLoaded: state.setIsLoaded,
  });

  const { handleFileSelect, handleFilesDropped, removeAttachment } = useFileHandlers(setAttachments);

  useExtensionListeners(
    setAttachments,
    setInputValue,
    setIsCalendarConnected,
    setIsFormsConnected,
    setIsTasksConnected,
    setEnableSearch
  );

  const { handleAddIntegration, handleRemoveIntegration } = useIntegrationHandlers({
    addedIntegrations,
    setAddedIntegrations,
    setActiveIntegration,
    activeIntegration,
    setIsCalendarConnected,
    setIsFormsConnected,
    setIsTasksConnected,
  });

  const isLoading = status === "streaming" || status === "submitted";

  // Chat handlers

  const handleNewChat = useCallback(() => {
    setMessages([]);
    setAttachments([]);
    setInputValue("");
    localStorage.removeItem(STORAGE_KEYS.MESSAGES);
    // Clear the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [setMessages]);

  // Simplified handleSubmit using AI SDK's new API
  const handleSubmit = async (value: { text: string; files: any[] }) => {
    if (!value.text.trim() && attachments.length === 0) return;

    // Build parts array for the message
    const parts: Array<{ type: "text"; text: string } | { type: "file"; url: string; mediaType: string }> = [];
    
    // Add text part (prompt processing happens on backend)
    if (value.text.trim()) {
      parts.push({ type: "text", text: value.text });
    }

    // Add file parts from attachments (using url for FileUIPart)
    for (const att of attachments) {
      parts.push({
        type: "file",
        url: att.url,
        mediaType: att.type,
      });
    }

    // Use parts-based message for multi-modal content
    sendMessage(
      {
        role: "user",
        parts,
      },
      {
        body: {
          model: selectedModel.id,
          enableSearch,
          enableThinking: selectedModel.supportsThinking ? enableThinking : false,
          enableUrlContext: true,
          enableCodeExecution: true,
          mentionedTools,
        },
      }
    );

    setInputValue("");
    setAttachments([]);
    // Clear the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Handle regenerate/reload
  const handleRegenerate = useCallback(() => {
    regenerate({
      body: {
        model: selectedModel.id,
        enableSearch,
        enableThinking: selectedModel.supportsThinking ? enableThinking : false,
        enableUrlContext: true,
        enableCodeExecution: true,
        mentionedTools,
      },
    });
  }, [regenerate, selectedModel, enableSearch, enableThinking, mentionedTools]);

  const handleSuggestionClick = useCallback((suggestion: string) => {
    setInputValue(suggestion);
    if (suggestion.includes("Search")) setEnableSearch(true);
  }, []);

  // Prevent hydration mismatch by not rendering until loaded
  if (!isLoaded) return null;

  const isStarted = dedupedMessages.length > 0;
  const hasCustomTools = mentionedTools.length > 0;
  
  const featureBadges: FeatureBadge[] = [
    { label: "Google Search", enabled: enableSearch && !hasCustomTools, color: "blue" },
    ...(selectedModel.supportsThinking
      ? [{ label: "Thinking", enabled: enableThinking, color: "amber" as const }]
      : []),
    { label: "URL Context", enabled: !hasCustomTools, color: "green" },
    { label: "Code Execution", enabled: !hasCustomTools, color: "purple" },
    ...(hasCustomTools
      ? mentionedTools.map((tool) => ({
          label: `@${tool}`,
          enabled: true,
          color: "cyan" as const,
        }))
      : []),
  ];

  return (
    <FileDropZone onFilesDropped={handleFilesDropped}>
      <div className="flex h-screen w-full flex-col bg-background text-foreground bg-grid">
        {/* Header */}
        <ChatHeader
          models={MODELS}
          selectedModel={selectedModel}
          onSelectModel={setSelectedModel}
          isModelOpen={isModelOpen}
          onModelOpenChange={setIsModelOpen}
          onNewChat={handleNewChat}
          onOpenIntegrations={() => setIsIntegrationsModalOpen(true)}
        />

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden relative flex flex-col">
        <TableOfContents messages={dedupedMessages} />
        
        {/* Conversation Area */}
        <div className={cn("flex-1 overflow-hidden relative", !isStarted && "hidden")}>
          <MessageList 
            messages={dedupedMessages} 
            isLoading={isLoading} 
            onRegenerate={handleRegenerate}
            status={status}
            error={error}
          />
        </div>

        {/* Input Area Container */}
        <motion.div
          className={cn(
            "w-full px-4",
            isStarted
              ? "border-t bg-background/80 backdrop-blur-sm pb-6 pt-4"
              : "flex-1 flex flex-col items-center justify-center pb-20"
          )}
          layout
          transition={{ duration: 0.5, ease: "easeInOut" }}
        >
          <div className="max-w-3xl mx-auto w-full space-y-8">
            {/* Empty State */}
            {!isStarted && <ChatEmptyState />}

            {/* Attachments Preview */}
            <AttachmentsPreview attachments={attachments} onRemove={removeAttachment} />

            {/* Prompt Input */}
            <motion.div layout className="w-full">
              <PromptInputArea
                value={inputValue}
                onChange={setInputValue}
                onSubmit={handleSubmit}
                isLoading={isLoading}
                enableSearch={enableSearch}
                onToggleSearch={() => setEnableSearch(!enableSearch)}
                enableThinking={enableThinking}
                thinkingSupported={selectedModel.supportsThinking}
                onToggleThinking={() => {
                  if (!selectedModel.supportsThinking) return;
                  setEnableThinking((prev) => !prev);
                }}
                onFilesSelected={handleFileSelect}
                mentionedTools={mentionedTools}
                onToolMentionsChange={setMentionedTools}
                addedIntegrations={addedIntegrations}
              />
            </motion.div>

            {/* Feature Indicators - only show when chat hasn't started */}
            {!isStarted && <FeatureBadgesRow badges={featureBadges} />}

            {/* Suggestions Grid - only show when chat hasn't started */}
            {!isStarted && (
              <SuggestionsGrid
                suggestions={DEFAULT_SUGGESTIONS}
                onSuggestionClick={handleSuggestionClick}
              />
            )}
          </div>
        </motion.div>
      </div>

      <IntegrationsModal
        isOpen={isIntegrationsModalOpen}
        onOpenChange={setIsIntegrationsModalOpen}
        onAddIntegration={handleAddIntegration}
        onRemoveIntegration={handleRemoveIntegration}
        addedIntegrations={addedIntegrations}
      />

      <IntegrationPanel
        isOpen={!!activeIntegration}
        onClose={() => setActiveIntegration(null)}
        integrationId={activeIntegration}
      />
      </div>
    </FileDropZone>
  );
}
