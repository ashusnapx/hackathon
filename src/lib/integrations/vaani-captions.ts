/**
 * Live caption lines from the provider's transcription socket.
 *
 * Captions are an aid while the call is happening; the transcript the case page
 * shows afterwards is the record. Keeping the parser separate from the call UI
 * keeps that distinction testable.
 */

export interface Caption {
  speaker: "agent" | "caller" | "unknown";
  text: string;
}

/**
 * The captions socket is a provider stream whose exact shape is not documented,
 * so read it defensively: anything unrecognisable is dropped rather than shown
 * to the caller as if it were something they or the agent said.
 */
export function parseCaption(data: unknown): Caption | null {
  if (typeof data !== "string" || !data.trim()) return null;
  let payload: unknown = data;
  try {
    payload = JSON.parse(data);
  } catch {
    return { speaker: "unknown", text: data.trim() };
  }
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;
  const text = [record.text, record.transcript, record.message, record.content]
    .find((value): value is string => typeof value === "string" && value.trim().length > 0);
  if (!text) return null;
  const rawSpeaker = [record.speaker, record.role, record.participant, record.identity]
    .find((value): value is string => typeof value === "string");
  const speaker: Caption["speaker"] = rawSpeaker && /agent|assistant|bot/i.test(rawSpeaker)
    ? "agent"
    : rawSpeaker && /user|caller|human/i.test(rawSpeaker)
      ? "caller"
      : "unknown";
  return { speaker, text: text.trim() };
}
