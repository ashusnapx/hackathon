"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
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
  consents,
  recordingRequired,
}: {
  language: string;
  caseReference?: string;
  consents: { safeToSpeak: boolean; transcription: boolean; recording: boolean };
  recordingRequired: boolean;
}) {
  const t = useT();
  const [phase, setPhase] = useState<Phase>("idle");
  const [failure, setFailure] = useState<Failure>("connect");
  const [captions, setCaptions] = useState<Caption[]>([]);
  const [muted, setMuted] = useState(false);
  const roomRef = useRef<{ disconnect: () => void; localParticipant: { setMicrophoneEnabled: (on: boolean) => Promise<unknown> } } | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const ready = consents.safeToSpeak && consents.transcription && (!recordingRequired || consents.recording);

  const teardown = useCallback(() => {
    socketRef.current?.close();
    socketRef.current = null;
    roomRef.current?.disconnect();
    roomRef.current = null;
  }, []);

  useEffect(() => teardown, [teardown]);

  const start = async () => {
    if (!ready || phase === "connecting" || phase === "live") return;
    setPhase("connecting");
    setCaptions([]);
    try {
      const response = await fetch("/api/vaani/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language,
          ...(caseReference ? { caseReference } : {}),
          safeToSpeak: consents.safeToSpeak,
          transcriptionConsent: consents.transcription,
          recordingConsent: consents.recording,
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
  };

  return (
    <div className="mt-2 rounded-ctl border border-rule bg-raised px-3 py-3">
      <p className="text-sm font-semibold">{t("intake.vaaniBrowser")}</p>
      <p className="mt-1 text-xs leading-[1.55] text-ink-3">{t("intake.vaaniBrowserBody")}</p>
      <p className="mt-1 text-xs leading-[1.55] text-ink-3">{t("intake.vaaniBrowserMicHint")}</p>

      {/* The agent's voice. Its captions are rendered below, in the caller's language. */}
      <audio ref={audioRef} autoPlay className="hidden" />

      {(phase === "idle" || phase === "ended" || phase === "error") && (
        <>
          <Button onClick={start} disabled={!ready} size="sm" variant="secondary" className="mt-3">
            {phase === "ended" ? t("intake.vaaniBrowserAgain") : t("intake.vaaniBrowserOpen")}
          </Button>
          {/* A disabled button with no stated reason reads as a broken one. */}
          {!ready && (
            <p className="mt-2 text-xs leading-[1.55] text-ink-3">{t("intake.vaaniBrowserNeedsConsent")}</p>
          )}
        </>
      )}
      {phase === "connecting" && (
        <p className="mt-3 text-sm text-ink-2">{t("intake.vaaniBrowserOpening")}…</p>
      )}
      {phase === "live" && (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-done">
            <span className="h-2 w-2 rounded-full bg-done animate-pulse" aria-hidden />
            {t("intake.vaaniBrowserLive")}
          </span>
          <Button onClick={toggleMute} size="sm" variant="secondary">
            {muted ? t("intake.vaaniBrowserUnmute") : t("intake.vaaniBrowserMute")}
          </Button>
          <Button onClick={end} size="sm" variant="secondary">{t("intake.vaaniBrowserEnd")}</Button>
        </div>
      )}
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
