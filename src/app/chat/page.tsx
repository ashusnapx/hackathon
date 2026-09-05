"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { ChatInput } from "@/components/chat/ChatInput";
import { getInitialMessages, handleUserMessage } from "@/components/chat/ChatBot";
import type { ChatMessage, ChatStep } from "@/components/chat/types";
import type { CaseFile } from "@/lib/case/types";

export default function ChatPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>(() => getInitialMessages());
  const [step, setStep] = useState<ChatStep>("greeting");
  const [activeCase, setActiveCase] = useState<CaseFile | undefined>();

  const handleSend = useCallback((text: string) => {
    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: "user", text, timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setTimeout(() => {
      const response = handleUserMessage(text, step, activeCase);
      setMessages((prev) => [...prev, ...response.messages]);
      setStep(response.step);
      if (response.caseFile) setActiveCase(response.caseFile);
    }, 400);
  }, [step, activeCase]);

  const handleQuickReply = useCallback((value: string) => {
    if (value === "open_case" && activeCase) { router.push(`/case/${activeCase.id}`); return; }
    handleSend(value);
  }, [activeCase, router, handleSend]);

  return (
    <div className="h-dvh flex flex-col bg-[#eae6df]">
      <header className="bg-[#008069] text-white px-4 py-3 flex items-center gap-3 shrink-0">
        <button onClick={() => router.push("/start")} className="text-white/80 hover:text-white transition-colors" aria-label="Back">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        </button>
        <div className="w-9 h-9 rounded-full bg-[#008069] flex items-center justify-center border-2 border-white/30">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm">Kavach</div>
          <div className="text-xs text-white/70">{activeCase ? `Case ${activeCase.ref}` : "Cybercrime Assistant"}</div>
        </div>
        {activeCase && (
          <button onClick={() => router.push(`/case/${activeCase.id}`)} className="text-xs bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full transition-colors">Open Case</button>
        )}
      </header>
      <ChatWindow messages={messages} onQuickReply={handleQuickReply} />
      <ChatInput onSend={handleSend} />
    </div>
  );
}
