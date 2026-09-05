"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { writeStoredVaaniSession } from "@/lib/integrations/vaani-client";
import { parseCaption, type Caption } from "@/lib/integrations/vaani-captions";
import { useT } from "@/lib/i18n/context";

type Phase = "idle" | "connecting" | "live" | "ended" | "error";
type Failure = "connect" | "microphone";

/**
 * A voice call with Kavach Saathi that happens in this tab.
 *
 * No number is dialled and none is collected, which removes the two worst
 * failure modes of a callback: ringing a phone that may not be safe to answer,
 * and leaving a voicemail somebody else can hear. The live captions matter for
 * the same reason the whole product does — a caller who cannot hear well, or who
 * is in a room where audio is unsafe, can still follow the conversation.
 */
export function LiveVoiceCall({
  language,
  caseReference,
  onTranscriptToken,
  onCallEnded,
}: {
  language: string;
  caseReference?: string;
  /** Handed up so the panel can offer the transcript for review afterwards. */
  onTranscriptToken?: (token: string) => void;
  onCallEnded?: () => void;
}) {
  const t = useT();
  const [phase, setPhase] = useState<Phase>("idle");
  const [failure, setFailure] = useState<Failure>("connect");
  const [captions, setCaptions] = useState<Caption[]>([]);
  const [muted, setMuted] = useState(false);
  const roomRef = useRef<{ disconnect: () => void; localParticipant: { setMicrophoneEnabled: (on: boolean) => Promise<unknown> } } | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const teardown = useCallback(() => {
    socketRef.current?.close();
    socketRef.current = null;
    roomRef.current?.disconnect();
    roomRef.current = null;
  }, []);

  useEffect(() => teardown, [teardown]);

  const start = async () => {
    if (phase === "connecting" || phase === "live") return;
    setPhase("connecting");
    setCaptions([]);
    try {
      const response = await fetch("/api/vaani/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language,
          ...(caseReference ? { caseReference } : {}),
          // Starting the call is the consent: the line above the button states
          // that Vaani processes and records it, and Kavach Saathi confirms
          // safety, transcription and recording again in its first turn.
          safeToSpeak: true,
          transcriptionConsent: true,
          recordingConsent: true,
        }),
      });
      const data = await response.json() as {
        connectionUrl?: string; token?: string; captionsUrl?: string; transcriptToken?: string;
      };
      if (!response.ok || !data.connectionUrl || !data.token) {
        setPhase("error");
        return;
      }

      if (data.transcriptToken) {
        onTranscriptToken?.(data.transcriptToken);
        // The case page reads this to show the recording and transcript once the
        // call is over and the provider has finished processing it.
        writeStoredVaaniSession({
          version: 1,
          requestId: globalThis.crypto.randomUUID(),
          state: "requested",
          transcriptToken: data.transcriptToken,
          createdAt: new Date().toISOString(),
        });
      }

      // Loaded on demand: the media client is large, and most people who open
      // this page never start a call.
      const { Room, RoomEvent, Track } = await import("livekit-client");
      const room = new Room({ adaptiveStream: false, dynacast: false });

      room.on(RoomEvent.TrackSubscribed, (track) => {
        if (track.kind === Track.Kind.Audio && audioRef.current) track.attach(audioRef.current);
      });
      room.on(RoomEvent.Disconnected, () => {
        setPhase("ended");
        socketRef.current?.close();
        onCallEnded?.();
      });

      await room.connect(data.connectionUrl.replace(/^https:/, "wss:"), data.token);
      try {
        await room.localParticipant.setMicrophoneEnabled(true);
      } catch {
        // A blocked microphone is a one-line fix for the caller, so name it
        // rather than reporting a generic connection failure.
        setFailure("microphone");
        setPhase("error");
        room.disconnect();
        return;
      }
      roomRef.current = room as unknown as typeof roomRef.current;
      setPhase("live");

      if (data.captionsUrl) openCaptions(data.captionsUrl);
    } catch {
      setFailure("connect");
      setPhase("error");
      teardown();
    }
  };

  const openCaptions = (url: string) => {
    try {
      const socket = new WebSocket(url);
      socket.onmessage = (event) => {
        const line = parseCaption(event.data);
        if (line) setCaptions((current) => [...current.slice(-40), line]);
      };
      socketRef.current = socket;
    } catch {
      // Captions are an aid, never the record. Losing them does not end the call.
    }
  };

  const toggleMute = async () => {
    const room = roomRef.current;
    if (!room) return;
    const next = !muted;
    await room.localParticipant.setMicrophoneEnabled(!next);
    setMuted(next);
  };

  const end = () => {
    teardown();
    setPhase("ended");
    onCallEnded?.();
  };

  return (
    <div className="mt-2 rounded-ctl border border-rule bg-raised px-3 py-3">
      <p className="text-sm font-semibold">{t("intake.vaaniBrowser")}</p>
      <p className="mt-1 text-xs leading-[1.55] text-ink-3">{t("intake.vaaniBrowserBody")}</p>
      <p className="mt-1 text-xs leading-[1.55] text-ink-3">{t("intake.vaaniBrowserMicHint")}</p>

      {/* The agent's voice. Its captions are rendered below, in the caller's language. */}
      <audio ref={audioRef} autoPlay className="hidden" />

      {/* One control, the size of a thumb. Tapping it starts the conversation. */}
      <div className="mt-4 flex flex-col items-center text-center">
        <button
          onClick={phase === "live" ? end : start}
          disabled={phase === "connecting"}
          aria-label={phase === "live" ? t("intake.vaaniBrowserEnd") : t("intake.vaaniBrowserOpen")}
          className={cn(
            "relative grid place-items-center w-24 h-24 rounded-full transition-colors",
            "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4",
            phase === "live"
              ? "bg-urgent text-white"
              : "bg-ink text-paper hover:opacity-90 disabled:opacity-60",
          )}
        >
          {phase === "live" && (
            <span className="absolute inset-0 rounded-full bg-urgent/35 animate-ping" aria-hidden />
          )}
          <span className="relative">{phase === "live" ? <StopGlyph /> : <MicGlyph />}</span>
        </button>

        <p className="mt-3 text-[0.9375rem] font-semibold">
          {phase === "live"
            ? t("intake.vaaniBrowserLive")
            : phase === "connecting"
              ? `${t("intake.vaaniBrowserOpening")}…`
              : phase === "ended"
                ? t("intake.vaaniBrowserAgain")
                : t("intake.vaaniBrowserOpen")}
        </p>

        {phase === "live" && (
          <Button onClick={toggleMute} size="sm" variant="secondary" className="mt-3">
            {muted ? t("intake.vaaniBrowserUnmute") : t("intake.vaaniBrowserMute")}
          </Button>
        )}
      </div>
      {phase === "error" && (
        <p role="alert" className="mt-2 text-sm text-urgent-ink">
          {failure === "microphone" ? t("intake.vaaniBrowserMicDenied") : t("intake.vaaniBrowserError")}
        </p>
      )}

      {captions.length > 0 && (
        <div className="mt-3 max-h-56 overflow-y-auto rounded-ctl border border-rule bg-surface px-3 py-2" aria-live="polite">
          {captions.map((caption, index) => (
            <p key={index} className="text-sm leading-[1.6] [&+p]:mt-1.5">
              <span className="text-ink-3">
                {caption.speaker === "agent" ? t("intake.vaaniBrowserAgent") : t("intake.vaaniBrowserYou")}:{" "}
              </span>
              <span className="text-ink-2">{caption.text}</span>
            </p>
          ))}
        </div>
      )}

      <p className="mt-2 text-xs leading-[1.55] text-ink-3">{t("intake.vaaniBrowserAfter")}</p>
    </div>
  );
}

function MicGlyph() {
  return (
    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
      <rect x="9" y="2.5" width="6" height="11" rx="3" fill="currentColor" stroke="none" />
      <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7" />
    </svg>
  );
}

function StopGlyph() {
  return <svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor" aria-hidden><rect x="6.5" y="6.5" width="11" height="11" rx="2.5" /></svg>;
}
