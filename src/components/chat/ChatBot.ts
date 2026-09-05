import { ruleTriage, ruleDocs } from "@/lib/ai/fallback";
import { newCase, saveCase } from "@/lib/case/store";
import { TRACKS } from "@/lib/case/tracks";
import type { TrackDef } from "@/lib/case/tracks";
import { calculateReadiness } from "@/lib/case/evidence";
import type { CaseFile } from "@/lib/case/types";
import type { ChatMessage, ChatStep, QuickReply } from "./types";

let counter = 0;

function msg(role: "bot" | "user", text: string, quickReplies?: QuickReply[]): ChatMessage {
  return { id: `${Date.now()}-${++counter}`, role, text, timestamp: new Date(), quickReplies };
}

function formatDeadline(def: TrackDef, c: CaseFile): string {
  const d = def.deadline(c);
  if (!d) return "";
  const diff = d.getTime() - Date.now();
  const hours = Math.floor(diff / 3600_000);
  const days = Math.floor(hours / 24);
  const label = days > 0 ? `${days}d ${hours % 24}h` : `${hours}h`;
  const date = d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
  const time = d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  return `  ${def.index}. ${def.id} — ${diff < 0 ? "OVERDUE" : label + " left"} (by ${date} ${time})`;
}

function formatReadiness(c: CaseFile): string {
  const r = calculateReadiness(c);
  const bar = r.level === "READY" ? "[========]" : r.level === "PARTIALLY_READY" ? "[=====   ]" : "[==      ]";
  let out = `${bar} ${r.percentage}%\nLevel: ${r.level.replace("_", " ")}\n`;
  if (r.recommendations.length > 0) {
    out += "\nStill needed:\n";
    for (const m of r.recommendations.slice(0, 5)) out += `  - ${m.title}\n`;
  }
  return out;
}

export interface BotResponse {
  messages: ChatMessage[];
  step: ChatStep;
  caseFile?: CaseFile;
}

export function handleUserMessage(input: string, currentStep: ChatStep, existingCase?: CaseFile): BotResponse {
  const text = input.trim();

  switch (currentStep) {
    case "greeting":
    case "awaiting_description": {
      if (text.length < 20) {
        return { messages: [msg("bot", "Please describe what happened in a bit more detail so I can help you properly. Even 2-3 sentences work.")], step: currentStep };
      }
      const triage = ruleTriage(text);
      const amountStr = triage.amount ? ` Amount: ₹${triage.amount.toLocaleString("en-IN")}.` : "";
      return {
        messages: [msg("bot", `I understand. Based on your description, this looks like a **${triage.categoryId.replace(/-/g, " ")}** case.${amountStr}\n\nIs that correct?`, [
          { label: "Yes, that's right", value: "confirm" },
          { label: "No, it was something else", value: "wrong" },
        ])],
        step: "category_pick",
        caseFile: (() => {
          const c = newCase({ rawStatement: text, triage, entities: { upiIds: [], phones: [], accounts: [], refs: [], urls: [], emails: [], handles: [], apps: [] } });
          if (triage.amount) c.amount = triage.amount;
          saveCase(c);
          return c;
        })(),
      };
    }

    case "category_pick": {
      const lower = text.toLowerCase();
      if (!(lower.includes("confirm") || lower.includes("yes") || lower === "confirm")) {
        return { messages: [msg("bot", "No problem. Could you tell me more about what happened? For example: was it a phone call, SMS, UPI, or something else?")], step: "awaiting_description", caseFile: existingCase };
      }
      const c = existingCase;
      if (!c) return { messages: [msg("bot", "Something went wrong. Let's start over. Please describe what happened.")], step: "greeting" };

      const deadlines: string[] = [];
      for (const tid of (c.triage?.applicableTracks ?? [])) {
        const def = TRACKS.find((t) => t.id === tid);
        if (def) deadlines.push(formatDeadline(def, c));
      }

      let out = `Case created: **${c.ref}**\nCategory: ${c.triage?.categoryId.replace(/-/g, " ")}\n`;
      if (c.amount) out += `Amount: ₹${c.amount.toLocaleString("en-IN")}\n`;
      out += "\n--- Your 8 Clocks ---\n";
      out += (deadlines.length > 0 ? deadlines.join("\n") : "No deadlines applicable.") + "\n";
      out += "\n--- Evidence Readiness ---\n" + formatReadiness(c);

      const docs = ruleDocs(c);
      const docNames = Object.keys(docs).filter((k) => docs[k as keyof typeof docs]);
      out += "\n--- Documents Ready ---\n" + (docNames.length > 0 ? docNames.map((k) => `  - ${k}`).join("\n") : "  (none yet)") + "\n";
      out += "\nWhat would you like to do next?";

      return {
        messages: [msg("bot", out, [
          { label: "View deadlines", value: "deadlines" },
          { label: "View evidence", value: "evidence" },
          { label: "Download summary PDF", value: "pdf" },
          { label: "Open my case", value: "open_case" },
        ])],
        step: "case_created",
        caseFile: c,
      };
    }

    case "case_created": {
      const c = existingCase;
      if (!c) return { messages: [msg("bot", "No active case found. Please describe what happened first.")], step: "greeting" };
      const lower = text.toLowerCase();

      if (lower.includes("deadline")) {
        const deadlines: string[] = [];
        for (const tid of (c.triage?.applicableTracks ?? [])) {
          const def = TRACKS.find((t) => t.id === tid);
          if (def) deadlines.push(formatDeadline(def, c));
        }
        return { messages: [msg("bot", `--- Your 8 Clocks ---\n${deadlines.join("\n") || "No deadlines applicable."}\n\nAnything else?`, [
          { label: "View evidence", value: "evidence" },
          { label: "Open my case", value: "open_case" },
          { label: "Back to menu", value: "menu" },
        ])], step: "case_created", caseFile: c };
      }

      if (lower.includes("evidence") && !lower.includes("upload")) {
        return { messages: [msg("bot", `--- Evidence Readiness ---\n${formatReadiness(c)}\n\nAnything else?`, [
          { label: "Open my case", value: "open_case" },
          { label: "View deadlines", value: "deadlines" },
          { label: "Back to menu", value: "menu" },
        ])], step: "case_created", caseFile: c };
      }

      if (lower.includes("pdf") || lower.includes("summary")) {
        return { messages: [msg("bot", "To download your evidence summary PDF, open your case page.", [
          { label: "Open my case", value: "open_case" },
          { label: "Back to menu", value: "menu" },
        ])], step: "case_created", caseFile: c };
      }

      return { messages: [msg("bot", "I can help with deadlines, evidence, or documents. What would you like?", [
        { label: "View deadlines", value: "deadlines" },
        { label: "View evidence", value: "evidence" },
        { label: "Open my case", value: "open_case" },
      ])], step: "case_created", caseFile: c };
    }

    default:
      return { messages: [msg("bot", "Type `menu` to see your options, or describe a new issue.")], step: currentStep, caseFile: existingCase };
  }
}

export function getInitialMessages(): ChatMessage[] {
  return [msg("bot", "Welcome to **Kavach** - your cybercrime assistance assistant.\n\nI can help you:\n  - Report a fraud or cybercrime\n  - Track your case deadlines\n  - Manage your evidence\n  - Generate documents\n\n**What happened?** Describe the incident and I will help you get started.")];
}
