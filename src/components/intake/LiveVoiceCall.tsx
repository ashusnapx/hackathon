"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { writeStoredVaaniSession } from "@/lib/integrations/vaani-client";
import { parseCaption, type Caption } from "@/lib/integrations/vaani-captions";
import { useT } from "@/lib/i18n/context";
import { LANGUAGES } from "@/lib/i18n/languages";

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
  safetyAnswer,
  childContext,
  callerName,
  onTranscriptToken,
  onCallEnded,
}: {
  /** The site language, used only to order the picker. */
  language: string;
  caseReference?: string;
  /** Already answered on screen; sent so the agent does not ask again. */
  safetyAnswer?: string;
  childContext?: string;
  /** Known only on a repeat call; empty means the agent asks once, itself. */
  callerName?: string;
  /** Handed up so the panel can offer the transcript for review afterwards. */
  onTranscriptToken?: (token: string) => void;
  onCallEnded?: () => void;
}) {
  const t = useT();
  const [phase, setPhase] = useState<Phase>("idle");
  const [picking, setPicking] = useState(false);
  const [showAllLanguages, setShowAllLanguages] = useState(false);

  // The language they are already reading the site in comes first; the rest keep
  // the picker's own order, which is by number of speakers.
  const ordered = [
    ...LANGUAGES.filter((option) => option.code === language),
    ...LANGUAGES.filter((option) => option.code !== language),
  ];
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

  const start = async (spokenLanguage: string) => {
    if (phase === "connecting" || phase === "live") return;
    setPicking(false);
    setPhase("connecting");
    setCaptions([]);
    try {
      const response = await fetch("/api/vaani/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language: spokenLanguage,
          ...(caseReference ? { caseReference } : {}),
          ...(safetyAnswer ? { safetyAnswer } : {}),
          ...(childContext ? { childContext } : {}),
          ...(callerName ? { callerName } : {}),
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

  const live = phase === "live";

  /**
   * The same shape as the front door: the control on the left where it does not
   * move, and the words filling a panel on the right. A call is the one input
   * where a live transcript is not a nicety — a caller who cannot hear well, or
   * who is somewhere audio is not safe, follows the conversation by reading it.
   * So the panel is there from the start with an empty state, rather than
   * appearing halfway through and shifting everything down the page.
   */
  return (
    <div className="mt-2 sheet p-3 sm:p-4">
      {/* The agent's voice. Its captions are rendered beside it, in the caller's language. */}
      <audio ref={audioRef} autoPlay className="hidden" />

      <div className="grid gap-4 sm:grid-cols-[8.5rem_minmax(0,1fr)] sm:items-start">
        <div className="flex flex-col items-center text-center sm:pt-2">
          <button
            onClick={live ? end : () => setPicking(true)}
            disabled={phase === "connecting"}
            aria-label={live ? t("intake.vaaniBrowserEnd") : t("intake.vaaniBrowserOpen")}
            className={cn(
              "relative grid place-items-center rounded-full transition-colors",
              "w-28 h-28 sm:w-32 sm:h-32",
              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4",
              live
                ? "bg-urgent text-white"
                : "bg-deep text-[#ffffeb] hover:opacity-90 disabled:opacity-60",
            )}
          >
            {live && <span className="absolute inset-0 rounded-full bg-urgent/35 animate-ping" aria-hidden />}
            <span className="relative">{live ? <StopGlyph /> : <MicGlyph />}</span>
          </button>

          <p className="mt-3 text-[0.9375rem] font-semibold leading-snug">
            {live
              ? t("intake.vaaniBrowserLive")
              : phase === "connecting"
                ? `${t("intake.vaaniBrowserOpening")}…`
                : phase === "ended"
                  ? t("intake.vaaniBrowserAgain")
                  : t("intake.vaaniBrowserOpen")}
          </p>

          {live && (
            <Button onClick={toggleMute} size="sm" variant="secondary" className="mt-3">
              {muted ? t("intake.vaaniBrowserUnmute") : t("intake.vaaniBrowserMute")}
            </Button>
          )}
        </div>

        <div className="min-w-0">
          <p className="flex items-center gap-2 text-xs text-ink-3">
            {t("talk.transcriptH")}
            {live && (
              <span className="inline-flex items-center gap-1.5 text-urgent">
                <span className="w-1.5 h-1.5 rounded-full bg-urgent animate-pulse" aria-hidden />
                {t("compose.listening")}
              </span>
            )}
          </p>
          <div
            aria-live="polite"
            className="mt-1.5 min-h-[7.5rem] max-h-64 overflow-y-auto no-scrollbar rounded-ctl border border-rule-strong bg-raised px-3 py-2.5"
          >
            {captions.length === 0 ? (
              <p className="text-[0.9375rem] leading-[1.6] text-ink-3/80">{t("talk.transcriptEmpty")}</p>
            ) : (
              captions.map((caption, index) => (
                <p key={index} className="text-[0.9375rem] leading-[1.6] [&+p]:mt-2">
                  <span className="text-ink-3">
                    {caption.speaker === "agent" ? t("intake.vaaniBrowserAgent") : t("intake.vaaniBrowserYou")}:{" "}
                  </span>
                  <span className="text-ink-2">{caption.text}</span>
                </p>
              ))
            )}
          </div>
        </div>
      </div>

      {phase === "error" && (
        <p role="alert" className="mt-3 text-sm text-urgent-ink">
          {failure === "microphone" ? t("intake.vaaniBrowserMicDenied") : t("intake.vaaniBrowserError")}
        </p>
      )}

      {picking && (
        <div className="mt-4 rounded-ctl border border-rule-strong bg-surface px-4 py-4 text-start">
          <p className="text-[0.9375rem] font-semibold">{t("intake.vaaniLangQ")}</p>
          <p className="mt-1 text-xs leading-[1.55] text-ink-3">{t("intake.vaaniLangSub")}</p>
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
            {(showAllLanguages ? ordered : ordered.slice(0, 8)).map((option) => (
              <button
                key={option.code}
                onClick={() => void start(option.code)}
                className="min-h-12 rounded-ctl border border-rule-strong bg-raised px-3 py-2 text-start hover:border-ink transition-colors"
              >
                <span className="block text-[0.9375rem] font-medium leading-tight">{option.endonym}</span>
                <span className="block text-[0.6875rem] text-ink-3 leading-tight mt-0.5">{option.english}</span>
              </button>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-4">
            {!showAllLanguages && (
              <button onClick={() => setShowAllLanguages(true)} className="min-h-11 text-sm font-medium underline underline-offset-4">
                {t("intake.vaaniLangMore")}
              </button>
            )}
            <button onClick={() => setPicking(false)} className="min-h-11 text-sm text-ink-3 underline underline-offset-4">
              {t("intake.vaaniLangCancel")}
            </button>
          </div>
        </div>
      )}

      <div className="mt-3 flex items-center gap-3 border-t border-rule pt-3">
        <p className="flex-1 min-w-0 text-xs leading-[1.4] text-ink-3">
          {phase === "idle" ? t("intake.vaaniBrowserMicHint") : t("intake.vaaniBrowserAfter")}
        </p>
      </div>
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
