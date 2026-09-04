/**
 * A deliberately small WhatsApp cost model for the no-provider prototype.
 * Rates are estimates from Meta's India INR rate card and stay date-versioned
 * because platform pricing changes. Never use this as an invoice calculator.
 */
export type WhatsAppCategory = "service" | "utility" | "authentication" | "marketing";
export type WhatsAppDeliveryStatus = "queued" | "sent" | "delivered" | "read" | "failed";

export interface SimulatedWhatsAppMessage {
  category: WhatsAppCategory;
  delivered: boolean;
  withinCustomerServiceWindow: boolean;
  createdAt?: string;
  deliveredAt?: string;
}

export interface WhatsAppSimulationMessage extends SimulatedWhatsAppMessage {
  id: string;
  direction: "inbound" | "outbound";
  text: string;
  status: WhatsAppDeliveryStatus;
  createdAt: string;
  templateName?: string;
  /** Stable journey prompt identity; display text may change with language. */
  promptId?: string;
}

export interface WhatsAppSimulationState {
  now: string;
  optedIn: boolean;
  optedOut: boolean;
  customerWindowOpenedAt?: string;
  messages: WhatsAppSimulationMessage[];
  processedWebhookIds: string[];
}

export interface WhatsAppSendResult {
  state: WhatsAppSimulationState;
  error?: "opt-in-required" | "opted-out" | "template-required" | "template-not-approved" | "invalid-category";
}

const SERVICE_WINDOW_MS = 24 * 60 * 60 * 1000;
const DELIVERY_ORDER: Record<Exclude<WhatsAppDeliveryStatus, "failed">, number> = {
  queued: 0,
  sent: 1,
  delivered: 2,
  read: 3,
};

export function createWhatsAppSimulation(now = new Date()): WhatsAppSimulationState {
  return {
    now: now.toISOString(),
    optedIn: false,
    optedOut: false,
    messages: [],
    processedWebhookIds: [],
  };
}

/** Advance canonical simulation time with wall time without undoing fast-forward. */
export function refreshWhatsAppSimulationClock(
  state: WhatsAppSimulationState,
  wallClock = new Date(),
): WhatsAppSimulationState {
  const current = Date.parse(state.now);
  const observed = wallClock.getTime();
  if (!Number.isFinite(observed) || observed <= current) return state;
  return { ...state, now: wallClock.toISOString() };
}

export function isCustomerServiceWindowOpen(state: WhatsAppSimulationState): boolean {
  if (!state.customerWindowOpenedAt) return false;
  const elapsed = Date.parse(state.now) - Date.parse(state.customerWindowOpenedAt);
  return elapsed >= 0 && elapsed < SERVICE_WINDOW_MS;
}

export function advanceWhatsAppSimulation(
  state: WhatsAppSimulationState,
  hours: number,
): WhatsAppSimulationState {
  return { ...state, now: new Date(Date.parse(state.now) + hours * 60 * 60 * 1000).toISOString() };
}

/**
 * Mimics a webhook-delivered user message. STOP is a durable opt-out; START is
 * an explicit opt-in. A normal reply refreshes the 24-hour service window but
 * does not silently undo an earlier STOP.
 */
export function receiveSimulatedWhatsAppMessage(
  state: WhatsAppSimulationState,
  text: string,
  messageId = `wamid.in.${state.messages.length + 1}`,
): WhatsAppSimulationState {
  if (state.messages.some((message) => message.direction === "inbound" && message.id === messageId)) {
    return state;
  }
  const command = text.trim().toUpperCase();
  const optedOut = command === "STOP" ? true : command === "START" ? false : state.optedOut;
  const optedIn = command === "STOP" ? false : command === "START" ? true : state.optedIn;
  const message: WhatsAppSimulationMessage = {
    id: messageId,
    direction: "inbound",
    text,
    status: "read",
    category: "service",
    delivered: true,
    withinCustomerServiceWindow: true,
    createdAt: state.now,
    deliveredAt: state.now,
  };
  return {
    ...state,
    optedIn,
    optedOut,
    customerWindowOpenedAt: state.now,
    messages: [...state.messages, message],
  };
}

export function sendSimulatedWhatsAppMessage(
  state: WhatsAppSimulationState,
  input: {
    text: string;
    category?: WhatsAppCategory;
    templateName?: string;
    templateApproved?: boolean;
    messageId?: string;
    promptId?: string;
  },
): WhatsAppSendResult {
  if (state.optedOut) return { state, error: "opted-out" };
  if (!state.optedIn) return { state, error: "opt-in-required" };

  const withinWindow = isCustomerServiceWindowOpen(state);
  const category = withinWindow ? (input.category ?? "service") : (input.category ?? "utility");
  if (!withinWindow && category === "service") return { state, error: "invalid-category" };
  const needsTemplate = !withinWindow || category !== "service";
  if (needsTemplate && !input.templateName) return { state, error: "template-required" };
  if (needsTemplate && input.templateApproved !== true) return { state, error: "template-not-approved" };

  const message: WhatsAppSimulationMessage = {
    id: input.messageId ?? `wamid.out.${state.messages.length + 1}`,
    direction: "outbound",
    text: input.text,
    status: "queued",
    category,
    delivered: false,
    withinCustomerServiceWindow: withinWindow,
    createdAt: state.now,
    templateName: input.templateName,
    promptId: input.promptId,
  };
  return { state: { ...state, messages: [...state.messages, message] } };
}

/**
 * User-facing demo helper: retain the real queue/status state underneath, but
 * complete the synthetic delivery callbacks automatically so the interview is
 * a chat rather than a webhook debugger.
 */
export function ensureSimulatedWhatsAppPromptDelivered(
  state: WhatsAppSimulationState,
  prompt?: { text: string; promptId?: string },
): WhatsAppSimulationState {
  if (!prompt || !state.optedIn || state.optedOut || !isCustomerServiceWindowOpen(state)) {
    return state;
  }

  const samePrompt = (message: WhatsAppSimulationMessage) =>
    message.direction === "outbound"
    && message.text === prompt.text
    && (message.promptId ? message.promptId === prompt.promptId : true);
  let next = state;
  const latest = next.messages.at(-1);
  // A historic copy does not count. After a resume reply, safety-gate rewind or
  // language switch, place the current question back at the conversation tail.
  let outbound = latest && samePrompt(latest) && latest.status !== "failed"
    ? latest
    : undefined;
  if (!outbound) {
    const result = sendSimulatedWhatsAppMessage(next, prompt);
    if (result.error) return next;
    next = result.state;
    outbound = next.messages.at(-1);
  }
  if (!outbound || outbound.delivered) return next;

  next = applySimulatedWhatsAppStatus(next, {
    eventId: `auto-${outbound.id}-sent`,
    messageId: outbound.id,
    status: "sent",
  });
  return applySimulatedWhatsAppStatus(next, {
    eventId: `auto-${outbound.id}-delivered`,
    messageId: outbound.id,
    status: "delivered",
  });
}

/** Apply Meta-shaped status webhooks idempotently and ignore stale order. */
export function applySimulatedWhatsAppStatus(
  state: WhatsAppSimulationState,
  event: { eventId: string; messageId: string; status: WhatsAppDeliveryStatus },
): WhatsAppSimulationState {
  if (state.processedWebhookIds.includes(event.eventId)) return state;
  const messages = state.messages.map((message) => {
    if (message.id !== event.messageId || message.direction !== "outbound") return message;
    if (message.status === "failed") return message;
    // A provider may report failure after acceptance/sent, but it must not
    // overwrite proof that the message was already delivered or read.
    if (event.status === "failed" && (message.status === "delivered" || message.status === "read")) {
      return message;
    }
    if (event.status !== "failed" && DELIVERY_ORDER[event.status] < DELIVERY_ORDER[message.status]) return message;
    return {
      ...message,
      status: event.status,
      delivered: event.status === "delivered" || event.status === "read",
      deliveredAt: event.status === "delivered" || event.status === "read"
        ? message.deliveredAt ?? state.now
        : message.deliveredAt,
    };
  });
  return {
    ...state,
    messages,
    processedWebhookIds: [...state.processedWebhookIds, event.eventId],
  };
}

export const WHATSAPP_INDIA_PRICING = {
  market: "India",
  currency: "INR",
  verifiedOn: "2026-09-04",
  current: {
    marketing: 0.8631,
    utility: 0.115,
    authentication: 0.115,
    service: 0,
  },
  announcedFrom2026_10_01: {
    marketing: 0.8631,
    utility: 0.115,
    authentication: 0.115,
    service: 0.115,
  },
  source: "https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing",
} as const;

export interface WhatsAppCostEstimate {
  totalInr: number;
  chargedMessages: number;
  freeMessages: number;
  regime: "through-2026-09-30" | "from-2026-10-01" | "mixed";
}

export function estimateWhatsAppIndiaCost(
  messages: SimulatedWhatsAppMessage[],
  effectiveAt: Date,
): WhatsAppCostEstimate {
  if (Number.isNaN(effectiveAt.getTime())) throw new RangeError("A valid pricing date is required.");
  const transition = Date.parse("2026-10-01T00:00:00+05:30");
  let totalInr = 0;
  let chargedMessages = 0;
  let freeMessages = 0;
  let sawCurrent = false;
  let sawFuture = false;

  for (const message of messages) {
    if (message.category === "service" && !message.withinCustomerServiceWindow) {
      throw new Error("A service message cannot be sent outside the customer service window.");
    }
    if (!message.delivered) continue;
    const pricedAt = new Date(message.deliveredAt ?? message.createdAt ?? effectiveAt);
    if (Number.isNaN(pricedAt.getTime())) throw new RangeError("Each message must have a valid delivery date.");
    const future = pricedAt.getTime() >= transition;
    if (future) sawFuture = true;
    else sawCurrent = true;

    let price = 0;
    if (!future) {
      if (message.category === "marketing" || message.category === "authentication") {
        price = WHATSAPP_INDIA_PRICING.current[message.category];
      } else if (message.category === "utility" && !message.withinCustomerServiceWindow) {
        price = WHATSAPP_INDIA_PRICING.current.utility;
      }
    } else {
      price = WHATSAPP_INDIA_PRICING.announcedFrom2026_10_01[message.category];
    }

    if (price > 0) {
      chargedMessages += 1;
      totalInr += price;
    } else {
      freeMessages += 1;
    }
  }

  return {
    totalInr: Math.round(totalInr * 10_000) / 10_000,
    chargedMessages,
    freeMessages,
    regime: sawCurrent && sawFuture
      ? "mixed"
      : sawFuture || (!sawCurrent && effectiveAt.getTime() >= transition)
        ? "from-2026-10-01"
        : "through-2026-09-30",
  };
}
