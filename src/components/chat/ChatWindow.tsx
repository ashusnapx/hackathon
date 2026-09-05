"use client";

import { useEffect, useRef, useCallback } from "react";
import { ChatBubble } from "./ChatBubble";
import type { ChatMessage } from "./types";

interface ChatWindowProps {
  messages: ChatMessage[];
  onQuickReply?: (value: string) => void;
}

export function ChatWindow({ messages, onQuickReply }: ChatWindowProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === "BUTTON" && target.hasAttribute("data-quick-reply")) {
      const value = target.getAttribute("data-quick-reply");
      if (value && onQuickReply) onQuickReply(value);
    }
  }, [onQuickReply]);

  return (
    <div onClick={handleClick} className="flex-1 overflow-y-auto px-4 py-4"
      style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23d1d5db\' fill-opacity=\'0.15\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }}>
      {messages.map((msg) => <ChatBubble key={msg.id} message={msg} />)}
      <div ref={bottomRef} />
    </div>
  );
}
