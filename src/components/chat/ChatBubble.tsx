"use client";

import { cn } from "@/lib/utils";
import type { ChatMessage } from "./types";

function formatTime(d: Date): string {
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

export function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={cn("flex w-full mb-3", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-[#008069] flex items-center justify-center mr-2 mt-1 shrink-0">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        </div>
      )}
      <div className={cn("max-w-[80%] rounded-xl px-3 py-2 text-sm leading-relaxed relative", isUser ? "bg-[#d9fdd3] text-gray-900 rounded-tr-none" : "bg-white text-gray-900 rounded-tl-none shadow-sm")}>
        <div className="whitespace-pre-wrap break-words">{renderMarkdown(message.text)}</div>
        {message.quickReplies && message.quickReplies.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2 pt-2 border-t border-gray-200/50">
            {message.quickReplies.map((qr) => (
              <button key={qr.value} data-quick-reply={qr.value} className="px-3 py-1 text-xs font-medium rounded-full border border-[#008069] text-[#008069] hover:bg-[#008069] hover:text-white transition-colors cursor-pointer">
                {qr.label}
              </button>
            ))}
          </div>
        )}
        <div className={cn("text-[10px] mt-1 flex items-center gap-1", isUser ? "text-gray-500 justify-end" : "text-gray-400")}>
          {formatTime(message.timestamp)}
          {isUser && (
            <svg width="14" height="8" viewBox="0 0 14 8" fill="none" className="text-blue-500">
              <path d="M1 4l2.5 2.5L8 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M5 4l2.5 2.5L12 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
      </div>
    </div>
  );
}

function renderMarkdown(text: string): React.ReactNode {
  return text.split("\n").map((line, i) => {
    const parts = line.split(/\*\*(.*?)\*\*/g);
    const rendered = parts.length > 1 ? parts.map((p, j) => j % 2 === 1 ? <strong key={j} className="font-semibold">{p}</strong> : p) : line;
    return <span key={i}>{i > 0 && <br />}{rendered}</span>;
  });
}
