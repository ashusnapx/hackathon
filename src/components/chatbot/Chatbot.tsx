"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Bot, User } from "lucide-react";
import { Kavach } from "@/components/Kavach";

interface Message {
  role: "user" | "bot";
  text: string;
}

const STEP_TIPS: Record<string, { greeting: string; tips: string[] }> = {
  "/report": {
    greeting:
      "Hi! I'm Kavach, your complaint guide. Click Start to begin — it takes about 5 minutes.",
    tips: [
      "Your progress auto-saves, so you can close and return later.",
      "Keep your ID and evidence ready before starting.",
    ],
  },
  "/report/category": {
    greeting:
      "Pick the crime type that matches your situation. If it has sub-categories, select one to continue.",
    tips: [
      "Financial fraud? Choose 'Online Financial Fraud' — fastest path to fund recovery.",
      "Not sure? Pick 'Any Other Cyber Crime' and describe in the next step.",
    ],
  },
  "/report/incident": {
    greeting:
      "Describe what happened. Be specific — this helps police investigate.",
    tips: [
      "Minimum 20 characters required in the description.",
      "No special characters (#@$!*) — the official portal rejects them.",
      "Lost money? The Golden Hour matters — call 1930 right now.",
    ],
  },
  "/report/evidence": {
    greeting:
      "Upload anything that supports your complaint. Screenshots, transaction IDs, messages.",
    tips: [
      "UTR/RRN numbers are critical for fund recovery.",
      "Screenshot chat messages before they disappear.",
      "Max 5MB per file. JPG, PNG, or PDF.",
    ],
  },
  "/report/details": {
    greeting:
      "Enter your contact info. Everything stays in your browser — we never store it.",
    tips: [
      "Use the same name as your government ID.",
      "Your phone number is needed for the official portal.",
    ],
  },
  "/report/review": {
    greeting:
      "Check everything before submitting. Once submitted, you'll get a tracking ID.",
    tips: [
      "After submission, call 1930 if you lost money.",
      "File on cybercrime.gov.in with your tracking ID.",
    ],
  },
};

export function Chatbot({
  currentStep,
  pathname,
}: {
  currentStep: number;
  pathname: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevPath = useRef(pathname);

  // Send greeting when path changes
  useEffect(() => {
    if (prevPath.current !== pathname || messages.length === 0) {
      prevPath.current = pathname;
      const step = STEP_TIPS[pathname] || STEP_TIPS["/report"];
      setMessages([{ role: "bot", text: step.greeting }]);
    }
  }, [pathname, messages.length]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    const userMsg = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: userMsg }]);

    // Simple keyword-based responses (ready for Gemini integration)
    const lower = userMsg.toLowerCase();
    let reply = "";

    if (lower.includes("1930") || lower.includes("call") || lower.includes("helpline")) {
      reply = "Call 1930 — the National Cyber Crime Helpline. Available 24/7. First hour is critical for fund recovery.";
    } else if (lower.includes("track") || lower.includes("status")) {
      reply = "After filing, use your tracking ID on cybercrime.gov.in to check status. You'll also get SMS updates.";
    } else if (lower.includes("fir") || lower.includes("police")) {
      reply = "A complaint on the portal is NOT an FIR. It routes to your jurisdictional police. For an FIR, visit your local Cyber Crime Police Station.";
    } else if (lower.includes("safe") || lower.includes("data") || lower.includes("privacy")) {
      reply = "Your data stays in your browser (localStorage). We never store anything on servers. Clear local data after filing.";
    } else if (lower.includes("evidence") || lower.includes("proof") || lower.includes("screenshot")) {
      reply = "Screenshot everything: chats, transaction confirmations, bank SMS, emails. Save sender details (phone, UPI ID, email). Keep originals.";
    } else if (lower.includes("time") || lower.includes("how long") || lower.includes("fast")) {
      reply = "The whole process takes about 5 minutes. Your progress auto-saves, so you can take breaks.";
    } else if (lower.includes("money") || lower.includes("refund") || lower.includes("recover")) {
      reply = "For fund recovery, call 1930 within 1 hour (52% recovery chance). After 24 hours, it drops to 3%. Act fast.";
    } else if (lower.includes("thank") || lower.includes("help") || lower.includes("great")) {
      reply = "Happy to help! Remember, filing quickly is the most important thing. You've got this!";
    } else {
      // Fallback tips from current step
      const step = STEP_TIPS[pathname] || STEP_TIPS["/report"];
      const randomTip = step.tips[Math.floor(Math.random() * step.tips.length)];
      reply = randomTip || "I'm here to help with any questions about filing your complaint. Try asking about 1930, evidence, tracking, or privacy.";
    }

    setTimeout(() => {
      setMessages((prev) => [...prev, { role: "bot", text: reply }]);
    }, 500);
  };

  return (
    <>
      {/* Toggle button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 flex items-center justify-center hover:bg-primary/90 transition-colors"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
            >
              <X className="w-6 h-6" />
            </motion.div>
          ) : (
            <motion.div
              key="chat"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
            >
              <MessageCircle className="w-6 h-6" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Chat window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="fixed bottom-24 right-6 z-50 w-[340px] max-w-[calc(100vw-3rem)] bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="bg-primary p-4 flex items-center gap-3">
              <Kavach mood="happy" size="sm" />
              <div>
                <div className="text-sm font-semibold text-primary-foreground">
                  Kavach
                </div>
                <div className="text-xs text-primary-foreground/70">
                  Your complaint guide
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="h-72 overflow-y-auto p-4 space-y-3">
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-2 ${msg.role === "user" ? "justify-end" : ""}`}
                >
                  {msg.role === "bot" && (
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Bot className="w-3.5 h-3.5 text-primary" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] px-3 py-2 rounded-xl text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-muted text-foreground rounded-bl-sm"
                    }`}
                  >
                    {msg.text}
                  </div>
                  {msg.role === "user" && (
                    <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                      <User className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                  )}
                </motion.div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-border p-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder="Ask Kavach anything..."
                  className="flex-1 h-10 px-3 bg-muted border border-border rounded-lg text-sm focus:outline-none focus:border-primary transition-colors"
                />
                <button
                  onClick={handleSend}
                  className="w-10 h-10 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg flex items-center justify-center transition-colors shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
