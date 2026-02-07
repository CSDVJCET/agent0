"use client";

import { useCallback } from "react";
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
  // Load state from local storage on mount
  useEffect(() => {
    try {
      const savedModelId = localStorage.getItem(STORAGE_KEYS.MODEL);
      if (savedModelId) {
        const model = models.find((m) => m.id === savedModelId);
        if (model) setSelectedModel(model);
      }

      const savedThinking = localStorage.getItem(STORAGE_KEYS.THINKING);
      if (savedThinking != null) {
        setEnableThinking(savedThinking === "true");
      }

      const savedMessages = localStorage.getItem(STORAGE_KEYS.MESSAGES);
      if (savedMessages) {
        try {
          const parsed = JSON.parse(savedMessages);
          if (Array.isArray(parsed)) {
            setMessages(dedupeMessages(parsed));
          }
        } catch (e) {
          console.error("Failed to parse saved messages", e);
          localStorage.removeItem(STORAGE_KEYS.MESSAGES);
        }
      }

      // Fetch installed tools from API
      fetch("/api/tools/installed")
        .then((res) => res.json())
        .then((data) => {
          if (data.tools && Array.isArray(data.tools)) {
            setAddedIntegrations(data.tools.map((t: any) => t.id));
          }
        })
        .catch((e) => console.error("Failed to fetch installed tools", e));

      // Check Google Calendar auth status
      fetch("/api/auth/google?action=status")
        .then((res) => res.json())
        .then((data) => {
          setIsCalendarConnected(!!data.connected);
          // Forms uses the same tokens, check if forms scopes are authorized
          setIsFormsConnected(!!data.hasFormsScopes);
        })
        .catch((e) => console.error("Failed to check calendar auth status", e));
    } catch (e) {
      console.error("Failed to load from localStorage", e);
    }
    setIsLoaded(true);
  }, [setMessages]);

  // Save model to local storage when it changes
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(STORAGE_KEYS.MODEL, selectedModel.id);
      } catch (e) {
        // Handle quota exceeded or other localStorage errors
        console.error("Failed to save model to localStorage", e);
      }
    }
  }, [selectedModel, isLoaded]);

  // Save thinking preference to local storage
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(STORAGE_KEYS.THINKING, String(enableThinking));
      } catch (e) {
        console.error("Failed to save thinking to localStorage", e);
      }
    }
  }, [enableThinking, isLoaded]);

  // Save integrations to local storage
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(STORAGE_KEYS.INTEGRATIONS, JSON.stringify(addedIntegrations));
      } catch (e) {
        console.error("Failed to save integrations to localStorage", e);
      }
    }
  }, [addedIntegrations, isLoaded]);

  // If model doesn't support thinking, force thinking off
  useEffect(() => {
    if (!selectedModel.supportsThinking && enableThinking) {
      setEnableThinking(false);
    }
  }, [selectedModel, enableThinking]);

  const dedupedMessages = useMemo(() => dedupeMessages(messages), [messages]);

  // Save messages to local storage when they change
  useEffect(() => {
    if (isLoaded) {
      try {
        const serialized = JSON.stringify(dedupedMessages);
        localStorage.setItem(STORAGE_KEYS.MESSAGES, serialized);
      } catch (e) {
        // Handle quota exceeded - try to clear old messages
        if (e instanceof DOMException && e.name === "QuotaExceededError") {
          console.warn("localStorage quota exceeded, clearing old messages");
          try {
            localStorage.removeItem(STORAGE_KEYS.MESSAGES);
          } catch {
            // Ignore errors when clearing
          }
        } else {
          console.error("Failed to save messages to localStorage", e);
        }
      }
    }
  }, [dedupedMessages, isLoaded]);

  // Listen for extension messages (screenshot + text context + summarization)
  useEffect(() => {
    console.log('Setting up extension message listener');
    
    const setControlledTextareaValue = (textarea: HTMLTextAreaElement, value: string) => {
      const proto = window.HTMLTextAreaElement.prototype;
      const descriptor = Object.getOwnPropertyDescriptor(proto, "value");
      const setter = descriptor?.set;
      if (setter) {
        setter.call(textarea, value);
      } else {
        textarea.value = value;
      }
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
    };

    const handleExtensionMessage = (event: MessageEvent) => {
      console.log('Received message event:', {
        type: event.data?.type,
        origin: event.origin,
        windowOrigin: window.location.origin,
        data: event.data
      });
      
      // Only accept same-origin messages
      if (event.origin !== window.location.origin) {
        console.log('Rejected message - origin mismatch');
        return;
      }

      if (event.data?.type === 'AGENT0_SCREENSHOT') {
        const { screenshot, pageUrl, pageTitle, selectedText } = event.data.data;
        
        const filename = `${pageTitle || 'Screenshot'}.png`;
        const screenshotAttachment: FileAttachment = {
          name: filename,
          type: 'image/png',
          size: screenshot.length,
          url: screenshot,
        };
        
        setAttachments((prev) => [...prev, screenshotAttachment]);
        
        if (selectedText) {
          setInputValue((prev) => {
            const context = `[Screenshot from: ${pageTitle}]\n${selectedText}\n\n${prev}`;
            return context;
          });
        } else if (pageUrl) {
          setInputValue((prev) => {
            const context = `[Screenshot from: ${pageTitle || pageUrl}]\n\n${prev}`;
            return context;
          });
        }
        
        setTimeout(() => {
          const textarea = document.querySelector('textarea[placeholder="Send a message..."]') as HTMLTextAreaElement;
          textarea?.focus();
        }, 100);
        
        console.log('Screenshot received and attached:', {
          pageTitle,
          pageUrl,
          hasSelectedText: !!selectedText
        });
      } else if (event.data?.type === 'AGENT0_CONTEXT_TEXT') {
        const data = event.data?.data || {};
        const selectedText = typeof data.selectedText === "string" ? data.selectedText.trim() : "";
        if (!selectedText) return;

  const { handleFileSelect, handleFilesDropped, removeAttachment } = useFileHandlers(setAttachments);

  useExtensionListeners(
    setAttachments,
    setInputValue,
    setIsCalendarConnected,
    setIsFormsConnected,
    setIsTasksConnected
  );
        const existing = textarea.value || "";
        setControlledTextareaValue(textarea, `${context}${existing}`);
        textarea.focus();
      } else if (event.data?.type === 'AGENT0_SUMMARIZE_PAGE') {
        console.log('Received AGENT0_SUMMARIZE_PAGE message:', event.data);
        
        const { pageUrl, pageTitle, pageContent, fileData, fileName } = event.data.data;
        
        // Validate required data
        if (!fileData || !fileName) {
          console.error('Missing required data:', { hasFileData: !!fileData, fileName });
          return;
        }
        
        console.log('Processing page summarization:', {
          fileName,
          pageTitle,
          pageUrl,
          contentLength: pageContent?.length,
          fileDataLength: fileData.length
        });
        
        // Create file attachment from the extracted page content
        const fileAttachment: FileAttachment = {
          name: fileName,
          type: 'text/plain',
          size: fileData.length,
          url: fileData,
        };
        
        setAttachments((prev) => {
          console.log('Adding file attachment:', fileName);
          return [...prev, fileAttachment];
        });
        
        // Auto-enable search for fact-checking
        setEnableSearch(true);
        
        setTimeout(() => {
          const textarea = document.querySelector('textarea[placeholder="Send a message..."]') as HTMLTextAreaElement;
          textarea?.focus();
        }, 100);
        
        console.log('Page content successfully loaded for summarization');
      }
    };
    
    console.log('Adding message event listener');
    window.addEventListener('message', handleExtensionMessage);
    
    // Check for any pending summarization data that arrived before the listener was ready
    if ((window as any).__agent0PendingSummarization) {
      console.log('Found pending summarization data, processing now...');
      const pendingData = (window as any).__agent0PendingSummarization;
      delete (window as any).__agent0PendingSummarization;
      
      // Process the pending data
      setTimeout(() => {
        handleExtensionMessage({
          origin: window.location.origin,
          data: {
            type: 'AGENT0_SUMMARIZE_PAGE',
            data: pendingData
          }
        } as MessageEvent);
      }, 100);
    }
    
    console.log('Extension message listener is ready');
    
    return () => {
      console.log('Removing message event listener');
      window.removeEventListener('message', handleExtensionMessage);
    };
  }, []);

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
