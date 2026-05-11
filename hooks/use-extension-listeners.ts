import { useEffect } from "react";
import type { FileAttachment } from "@/components/ai-elements/attachments-preview";

export const PENDING_CONTEXT_TEXT_KEY = "agent0-pending-context-text";

export function useExtensionListeners(
  setAttachments: React.Dispatch<React.SetStateAction<FileAttachment[]>>,
  setInputValue: React.Dispatch<React.SetStateAction<string>>,
  setIsCalendarConnected: React.Dispatch<React.SetStateAction<boolean>>,
  setIsFormsConnected: React.Dispatch<React.SetStateAction<boolean>>,
  setIsTasksConnected: React.Dispatch<React.SetStateAction<boolean>>,
  setIsGmailConnected: React.Dispatch<React.SetStateAction<boolean>>,
  setEnableSearch: React.Dispatch<React.SetStateAction<boolean>>
) {
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

    const findPromptTextarea = () =>
      document.querySelector("textarea") as HTMLTextAreaElement | null;

    const applyContextText = (selectedText: string) => {
      const trimmed = selectedText.trim();
      if (!trimmed) return;

      const existing = findPromptTextarea()?.value ?? "";
      const nextValue = `${trimmed}\n\n${existing}`;

      try {
        sessionStorage.setItem(PENDING_CONTEXT_TEXT_KEY, nextValue);
      } catch {
        // Ignore storage failures and fall back to state only.
      }

      setInputValue(nextValue);

      const textarea = findPromptTextarea();
      if (textarea) setControlledTextareaValue(textarea, nextValue);

      requestAnimationFrame(() => {
        const focusedTextarea = findPromptTextarea();
        if (focusedTextarea) {
          setControlledTextareaValue(focusedTextarea, nextValue);
          focusedTextarea.focus();
        }
      });
    };

    const handleExtensionMessage = (event: MessageEvent) => {
      const messageType = event.data?.type;
      const isAgent0Message = typeof messageType === "string" && messageType.startsWith("AGENT0_");

      console.log('Received message event:', {
        type: messageType,
        origin: event.origin,
        windowOrigin: window.location.origin,
        data: event.data
      });
      
      // Allow Agent0 extension messages even if the browser reports a different origin.
      if (!isAgent0Message && event.origin !== window.location.origin) {
        console.log('Rejected message - origin mismatch');
        return;
      }

      if (messageType === 'AGENT0_SCREENSHOT') {
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
      } else if (messageType === 'AGENT0_CONTEXT_TEXT') {
        const data = event.data?.data || {};
        const selectedText = typeof data.selectedText === "string" ? data.selectedText.trim() : "";
        if (!selectedText) return;

        applyContextText(selectedText);
        delete (window as any).__agent0PendingContextText;
      } else if (messageType === 'AGENT0_SUMMARIZE_PAGE') {
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

    const handleAuthMessage = (event: MessageEvent) => {
      if (event.data?.type === 'GOOGLE_AUTH_SUCCESS') {
        console.log('Google Calendar Auth success received');
        setIsCalendarConnected(true);
      }
      if (event.data?.type === 'GOOGLE_FORMS_AUTH_SUCCESS') {
        console.log('Google Forms Auth success received');
        setIsFormsConnected(true);
      }
      if (event.data?.type === 'GOOGLE_TASKS_AUTH_SUCCESS') {
        console.log('Google Tasks Auth success received');
        setIsTasksConnected(true);
      }
      if (event.data?.type === 'GOOGLE_GMAIL_AUTH_SUCCESS') {
        console.log('Google Gmail Auth success received');
        setIsGmailConnected(true);
      }
    };
    
    console.log('Adding message event listener');
    window.addEventListener('message', handleExtensionMessage);
    window.addEventListener('message', handleAuthMessage);

    try {
      const pendingContextText = sessionStorage.getItem(PENDING_CONTEXT_TEXT_KEY);
      if (pendingContextText) {
        sessionStorage.removeItem(PENDING_CONTEXT_TEXT_KEY);
        applyContextText(pendingContextText);
      }
    } catch {
      // Ignore storage access errors.
    }
    
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

    if ((window as any).__agent0PendingContextText) {
      console.log('Found pending context text, processing now...');
      const pendingContextText = (window as any).__agent0PendingContextText;
      delete (window as any).__agent0PendingContextText;

      setTimeout(() => {
        handleExtensionMessage({
          origin: window.location.origin,
          data: {
            type: 'AGENT0_CONTEXT_TEXT',
            data: pendingContextText,
          }
        } as MessageEvent);
      }, 100);
    }
    
    console.log('Extension message listener is ready');
    
    return () => {
      console.log('Removing message event listener');
      window.removeEventListener('message', handleExtensionMessage);
      window.removeEventListener('message', handleAuthMessage);
    };
  }, [setAttachments, setInputValue, setIsCalendarConnected, setIsFormsConnected, setIsTasksConnected, setIsGmailConnected, setEnableSearch]);
}
