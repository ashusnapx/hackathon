import { describe, expect, it } from "vitest";
import { parseCaption, parseLiveMessage } from "../vaani-captions";

describe("Vaani live-captions protocol", () => {
  it("reads a typed transcript frame with its segment", () => {
    const message = parseLiveMessage(JSON.stringify({
      type: "transcript",
      segment: { speaker: "agent", text: "Is it safe to speak?", is_final: true, confidence: 0.97 },
    }));
    expect(message).toEqual({
      kind: "caption",
      caption: { speaker: "agent", text: "Is it safe to speak?" },
    });
  });

  it("marks provisional segments interim rather than final", () => {
    const message = parseLiveMessage(JSON.stringify({
      type: "transcript",
      segment: { speaker: "user", text: "Haan, mere saath", is_final: false },
    }));
    expect(message).toEqual({
      kind: "caption",
      caption: { speaker: "caller", text: "Haan, mere saath", interim: true },
    });
  });

  it("replays history as a batch, dropping any interim tail", () => {
    const message = parseLiveMessage(JSON.stringify({
      type: "history",
      segments: [
        { speaker: "agent", text: "Hello.", is_final: true },
        { speaker: "user", text: "Haan", is_final: true },
        { speaker: "user", text: "half a wor", is_final: false },
      ],
    }));
    expect(message).toEqual({
      kind: "history",
      captions: [
        { speaker: "agent", text: "Hello." },
        { speaker: "caller", text: "Haan" },
      ],
    });
  });

  it("surfaces agent thinking and call end as signals, not speech", () => {
    expect(parseLiveMessage(JSON.stringify({ type: "agent_thinking" })))
      .toEqual({ kind: "signal", signal: "thinking" });
    expect(parseLiveMessage(JSON.stringify({ type: "call_ended" })))
      .toEqual({ kind: "signal", signal: "call-ended" });
  });

  it("stays silent on turn markers and heartbeats", () => {
    expect(parseLiveMessage(JSON.stringify({ type: "turn_started" }))).toEqual({ kind: "unknown" });
    expect(parseLiveMessage(JSON.stringify({ event: "heartbeat" }))).toEqual({ kind: "unknown" });
    expect(parseCaption(JSON.stringify({ event: "heartbeat" }))).toBeNull();
  });
});
