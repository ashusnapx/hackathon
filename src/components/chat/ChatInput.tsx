"use client";

import { useCallback, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSend: (text: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText("");
    inputRef.current?.focus();
  }, [text, disabled, onSend]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }, [handleSend]);

  return (
    <div className="flex items-end gap-2 p-3 bg-[#f0f2f5] border-t border-gray-200">
      <button className="w-9 h-9 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors shrink-0" aria-label="Emoji">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" /><path d="M8 14s1.5 2 4 2 4-2 4-2" /><line x1="9" y1="9" x2="9.01" y2="9" /><line x1="15" y1="9" x2="15.01" y2="9" />
        </svg>
      </button>
      <div className="flex-1 bg-white rounded-xl border border-gray-200 overflow-hidden">
        <textarea ref={inputRef} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={handleKeyDown} placeholder="Type a message" rows={1} disabled={disabled}
          className={cn("w-full px-3 py-2 text-sm resize-none outline-none bg-transparent placeholder:text-gray-400 max-h-24")} style={{ minHeight: "36px" }} />
      </div>
      <button className="w-9 h-9 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors shrink-0" aria-label="Attach file">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
        </svg>
      </button>
      {text.trim() ? (
        <button onClick={handleSend} disabled={disabled} className="w-9 h-9 rounded-full bg-[#008069] flex items-center justify-center text-white hover:bg-[#006d59] transition-colors shrink-0 disabled:opacity-50" aria-label="Send">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" /></svg>
        </button>
      ) : (
        <button className="w-9 h-9 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors shrink-0" aria-label="Voice message">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" /><path d="M19 10v2a7 7 0 01-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" />
          </svg>
        </button>
      )}
    </div>
  );
}
