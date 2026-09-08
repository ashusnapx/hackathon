/**
 * Live caption lines from the provider's transcription socket.
 *
 * Captions are an aid while the call is happening; the transcript the case page
 * shows afterwards is the record. Keeping the parser separate from the call UI
 * keeps that distinction testable.
 *
 * Two shapes arrive on the socket. The documented Vaani live-captions protocol
 * sends typed frames — `transcript` with a `segment` carrying speaker, text,
 * finality and confidence, `history` with past segments on connect, and signals
 * such as `agent_thinking`, `turn_started` or `call_ended`. Anything else is
 * read with the old lenient rules, so a drifted frame still shows rather than
 * vanishes.
 */

export interface Caption {
  speaker: "agent" | "caller" | "unknown";
  text: string;
  /** A provisional line, still being spoken. Replaced when the final lands. */
  interim?: boolean;
}

export type LiveSignal =
  | "thinking"
  | "call-started"
  | "call-ended"
  | "interrupted";

export type LiveMessage =
  | { kind: "caption"; caption: Caption }
  | { kind: "history"; captions: Caption[] }
  | { kind: "signal"; signal: LiveSignal }
  | { kind: "unknown" };

function speakerOf(value: unknown): Caption["speaker"] {
  if (typeof value !== "string") return "unknown";
  if (/agent|assistant|bot/i.test(value)) return "agent";
  if (/user|caller|human|customer/i.test(value)) return "caller";
  return "unknown";
}

function textOf(record: Record<string, unknown>): string | null {
  const text = [record.text, record.transcript, record.message, record.content]
    .find((value): value is string => typeof value === "string" && value.trim().length > 0);
  return text ? text.trim() : null;
}

function captionFromSegment(segment: unknown): Caption | null {
  if (!segment || typeof segment !== "object") return null;
  const record = segment as Record<string, unknown>;
  const text = textOf(record);
  if (!text) return null;
  const caption: Caption = {
    speaker: speakerOf(record.speaker ?? record.role ?? record.participant ?? record.identity),
    text,
  };
  // The provider marks provisional segments explicitly. Interim lines render
  // muted and are replaced, never appended beside their own final.
  if (record.is_final === false) caption.interim = true;
  return caption;
}

function signalOf(type: string): LiveSignal | null {
  switch (type) {
    case "agent_thinking": return "thinking";
    case "call_started": return "call-started";
    case "call_ended": return "call-ended";
    case "interrupted": return "interrupted";
    default: return null;
  }
}

/**
 * One socket frame, classified.
 *
 * Unrecognised frames are `unknown`, never captions: a heartbeat or a protocol
 * addition must not be shown to the caller as if somebody said it.
 */
export function parseLiveMessage(data: unknown): LiveMessage {
  if (typeof data !== "string" || !data.trim()) return { kind: "unknown" };
  let payload: unknown = data;
  try {
    payload = JSON.parse(data);
  } catch {
    return { kind: "caption", caption: { speaker: "unknown", text: data.trim() } };
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { kind: "unknown" };
  }
  const record = payload as Record<string, unknown>;
  const type = typeof record.type === "string" ? record.type
    : typeof record.event_type === "string" ? record.event_type
      : typeof record.event === "string" ? record.event : null;

  if (type === "history" && Array.isArray(record.segments)) {
    const captions = record.segments.flatMap((segment) => {
      const caption = captionFromSegment(segment);
      return caption && !caption.interim ? [caption] : [];
    });
    return { kind: "history", captions };
  }

  if (type === "transcript") {
    const segment = record.segment ?? payload;
    const caption = captionFromSegment(segment);
    if (caption) return { kind: "caption", caption };
    return { kind: "unknown" };
  }

  if (type) {
    const signal = signalOf(type);
    if (signal) return { kind: "signal", signal };
    // `turn_started`, `turn_ended` and `connected` carry no words to show.
    // They are known protocol, not content, so they stay silent either way.
    return { kind: "unknown" };
  }

  // Untyped frame: the old lenient reading, kept for a drifted deployment.
  const text = textOf(record);
  if (!text) return { kind: "unknown" };
  return {
    kind: "caption",
    caption: {
      speaker: speakerOf(record.speaker ?? record.role ?? record.participant ?? record.identity),
      text,
    },
  };
}

/**
 * The captions socket is a provider stream whose exact shape is not documented,
 * so read it defensively: anything unrecognisable is dropped rather than shown
 * to the caller as if it were something they or the agent said.
 */
export function parseCaption(data: unknown): Caption | null {
  const message = parseLiveMessage(data);
  if (message.kind === "caption") return message.caption;
  if (message.kind === "history") return message.captions[0] ?? null;
  return null;
}
