export type MessageRole = "user" | "bot";

export interface QuickReply {
  label: string;
  value: string;
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  text: string;
  timestamp: Date;
  quickReplies?: QuickReply[];
}

export type ChatStep =
  | "greeting"
  | "awaiting_description"
  | "category_pick"
  | "case_created"
  | "menu";
