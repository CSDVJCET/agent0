import { useEffect } from "react";
import type { FileAttachment } from "@/components/ai-elements/attachments-preview";

export function useExtensionListeners(
  setAttachments: React.Dispatch<React.SetStateAction<FileAttachment[]>>,
  setInputValue: React.Dispatch<React.SetStateAction<string>>,
  setIsCalendarConnected: React.Dispatch<React.SetStateAction<boolean>>,
  setIsFormsConnected: React.Dispatch<React.SetStateAction<boolean>>,
  setIsTasksConnected: React.Dispatch<React.SetStateAction<boolean>>
) {
  useEffect(() => {
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
      if (event.origin !== window.location.origin) return;

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

        const context = `${selectedText}\n\n`;
        const textarea = document.querySelector('textarea[placeholder="Send a message..."]') as HTMLTextAreaElement | null;
        if (!textarea) return;

        const existing = textarea.value || "";
        setControlledTextareaValue(textarea, `${context}${existing}`);
        textarea.focus();
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
    };
    
    window.addEventListener('message', handleExtensionMessage);
    window.addEventListener('message', handleAuthMessage);
    
    return () => {
      window.removeEventListener('message', handleExtensionMessage);
      window.removeEventListener('message', handleAuthMessage);
    };
  }, [setAttachments, setInputValue, setIsCalendarConnected, setIsFormsConnected, setIsTasksConnected]);
}
