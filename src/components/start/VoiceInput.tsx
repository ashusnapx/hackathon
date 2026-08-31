"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";

/**
 * Two paths to the same result, because neither one works everywhere.
 *
 * Chrome's SpeechRecognition is instant and free but is absent from most Android
 * WebViews and covers none of the smaller scheduled languages. So we prefer it
 * when it exists, and otherwise record audio and post it to the transcription
 * model. Two in five people in rural India search by voice; a text box alone
 * would exclude exactly the users this is meant for.
 */

/** `nothing` is "we heard you but got no words" — not the same failure as
    "this device cannot do voice at all", and it needs different advice. */
type Mode = "idle" | "listening" | "processing" | "unsupported" | "nothing";

interface Props {
  onResult: (text: string) => void;
  disabled?: boolean;
}

interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
  onend: (() => void) | null;
}

/**
 * Containers, best first. Safari on iOS cannot produce WebM at all — it records
 * MP4/AAC — so hard-coding `audio/webm` meant every iPhone posted a WebM-labelled
 * MP4 and the transcription model rejected it. Chrome's SpeechRecognition hid
 * this on desktop, because the recorder path only runs when that is missing.
 */
const MIME_CANDIDATES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4;codecs=mp4a.40.2",
  "audio/mp4",
  "audio/ogg;codecs=opus",
  "audio/ogg",
] as const;

function pickMime(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  return MIME_CANDIDATES.find((m) => {
    try {
      return MediaRecorder.isTypeSupported(m);
    } catch {
      return false;
    }
  });
}

/** The transcription API keys off the extension, so it has to match the bytes. */
function extFor(mime: string): string {
  if (mime.includes("mp4")) return "m4a";
  if (mime.includes("ogg")) return "ogg";
  if (mime.includes("wav")) return "wav";
  return "webm";
}

/**
 * A phone will not lend the microphone to two consumers at once.
 *
 * `webkitSpeechRecognition` exists on iOS Safari and Android Chrome, so the
 * recognition path was always taken there — and then a second getUserMedia was
 * opened alongside it purely to animate the level meter. Desktop operating
 * systems share a microphone happily; mobile ones do not, so recognition was
 * being starved on exactly the devices this app is built for. Touch devices now
 * record and transcribe server-side, which is one microphone, one consumer, and
 * covers all 23 languages rather than the handful Chrome speaks.
 */
function prefersRecorder(): boolean {
  if (typeof window === "undefined") return false;
  // Any touch capability at all is enough to prefer the recorder. Erring this
  // way costs a desktop-with-touchscreen its live interim text; erring the
  // other way costs every phone the feature entirely.
  const coarse = window.matchMedia?.("(any-pointer: coarse)")?.matches ?? false;
  const touch = (navigator.maxTouchPoints ?? 0) > 0 || "ontouchstart" in window;
  return coarse || touch;
}

function getRecognition(): SpeechRecognitionLike | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as Record<string, new () => SpeechRecognitionLike>;
  const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

export function VoiceInput({ onResult, disabled }: Props) {
  const { lang, t } = useI18n();
  const [mode, setMode] = useState<Mode>("idle");
  const [level, setLevel] = useState(0);
  const [interim, setInterim] = useState("");

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  /**
   * Loudest frame seen this take, and how many frames were measured.
   *
   * The transcription model will happily invent a sentence from silence, and
   * that sentence would be drafted straight into a police complaint — so a take
   * with no sound in it is never uploaded. `frames` guards the guard: iOS can
   * hand back a suspended AudioContext, in which case nothing is ever measured
   * and we must not mistake "did not listen" for "heard nothing".
   */
  const peakRef = useRef(0);
  const framesRef = useRef(0);

  const cleanup = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((tr) => tr.stop());
    streamRef.current = null;
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    setLevel(0);
  }, []);

  useEffect(() => cleanup, [cleanup]);

  /** Drives the level meter, so the user can see they are being heard. */
  const meter = useCallback((stream: MediaStream) => {
    const ctx = new AudioContext();
    audioCtxRef.current = ctx;
    // iOS hands back a suspended context when it is built outside the gesture
    // that opened the mic; without this the meter never moves and the user
    // gets no sign they are being heard.
    void ctx.resume().catch(() => {});
    const src = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    src.connect(analyser);
    const buf = new Uint8Array(analyser.frequencyBinCount);

    const tick = () => {
      analyser.getByteFrequencyData(buf);
      const avg = buf.reduce((s, v) => s + v, 0) / buf.length;
      const next = Math.min(1, avg / 90);
      if (next > peakRef.current) peakRef.current = next;
      framesRef.current += 1;
      setLevel(next);
      rafRef.current = requestAnimationFrame(tick);
    };
    tick();
  }, []);

  const startRecording = useCallback(async () => {
    if (recorderRef.current?.state === "recording") return;
    peakRef.current = 0;
    framesRef.current = 0;
    try {
      // Reuse a stream we already hold rather than asking for a second one.
      const stream =
        streamRef.current ?? (await navigator.mediaDevices.getUserMedia({ audio: true }));
      streamRef.current = stream;
      if (!audioCtxRef.current) meter(stream);

      const mime = pickMime();
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      recorderRef.current = rec;
      chunksRef.current = [];
      rec.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);

      rec.onstop = async () => {
        cleanup();
        // Trust what the recorder says it produced over what we asked for.
        const type = rec.mimeType || mime || "audio/webm";
        const blob = new Blob(chunksRef.current, { type });
        if (blob.size < 1200) {
          setMode("idle");
          return;
        }
        // Skip the upload only when the meter proved it was working and still
        // heard nothing. A peak of exactly zero across a whole take means the
        // analyser was never wired to the microphone — some WebViews and a
        // suspended iOS context both do this — and treating that as silence
        // would throw away a statement the citizen actually gave us. So this
        // fails open and lets the server decide; the cost is one wasted
        // request, against the cost of losing someone's words.
        const meterWorked = framesRef.current > 10 && peakRef.current > 0;
        if (meterWorked && peakRef.current < 0.04) {
          setMode("nothing");
          return;
        }
        setMode("processing");
        try {
          const form = new FormData();
          form.append("audio", blob, `speech.${extFor(type)}`);
          form.append("lang", lang.code);
          const res = await fetch("/api/ai/transcribe", { method: "POST", body: form });
          if (!res.ok) throw new Error(String(res.status));
          const data = await res.json();
          if (data.text) {
            onResult(data.text);
            setMode("idle");
          } else {
            // The call worked; there were just no words in it.
            setMode("nothing");
          }
        } catch {
          setMode("unsupported");
        }
      };

      rec.start();
      setMode("listening");
    } catch {
      setMode("unsupported");
    }
  }, [cleanup, lang.code, meter, onResult]);

  const start = useCallback(async () => {
    if (disabled) return;
    setInterim("");
    setMode((m) => (m === "nothing" ? "idle" : m));

    // On a touch device, skip recognition entirely — see prefersRecorder.
    const rec = prefersRecorder() ? null : getRecognition();
    if (rec) {
      rec.lang = lang.speech;
      rec.continuous = true;
      rec.interimResults = true;
      recognitionRef.current = rec;

      let finalText = "";
      rec.onresult = (e) => {
        let live = "";
        for (let i = 0; i < e.results.length; i++) {
          const alt = e.results[i][0];
          if (e.results[i].isFinal) finalText += alt.transcript + " ";
          else live += alt.transcript;
        }
        setInterim(live);
        // Emitting on every final phrase means a dropped connection mid-sentence
        // still leaves the citizen with what they already said.
        if (finalText.trim()) {
          onResult(finalText.trim());
          finalText = "";
        }
      };
      rec.onerror = (e) => {
        // `no-speech` fires when someone pauses to think and `aborted` fires
        // when they press stop. Neither is a failure, and starting a recorder
        // on them used to reopen the mic after the user had closed it.
        const kind = e?.error;
        if (kind === "no-speech" || kind === "aborted") return;
        recognitionRef.current = null;
        void startRecording();
      };
      rec.onend = () => {
        setInterim("");
        setMode((m) => (m === "listening" ? "idle" : m));
      };

      try {
        rec.start();
        // Still open the mic stream, purely to drive the level meter.
        navigator.mediaDevices
          ?.getUserMedia({ audio: true })
          .then((s) => {
            streamRef.current = s;
            meter(s);
          })
          .catch(() => {});
        setMode("listening");
        return;
      } catch {
        recognitionRef.current = null;
      }
    }

    await startRecording();
  }, [disabled, lang.speech, meter, onResult, startRecording]);

  const stop = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
      cleanup();
      setMode("idle");
      setInterim("");
      return;
    }
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  }, [cleanup]);

  const listening = mode === "listening";
  const busy = mode === "processing";

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={listening ? stop : start}
        disabled={disabled || busy || mode === "unsupported"}
        aria-pressed={listening}
        aria-label={listening ? t("start.micStop") : t("start.mic")}
        className={cn(
          "relative flex items-center justify-center rounded-full transition-all duration-200",
          "w-20 h-20 border disabled:opacity-45",
          listening
            ? "bg-urgent border-urgent text-white"
            : "bg-raised border-rule-strong text-ink hover:border-ink",
        )}
        style={
          listening
            ? { boxShadow: `0 0 0 ${4 + level * 22}px color-mix(in srgb, var(--urgent) 12%, transparent)` }
            : undefined
        }
      >
        {busy ? <Spinner /> : listening ? <StopIcon /> : <MicIcon />}
      </button>

      <p className="text-sm text-ink-3 text-center min-h-[1.25rem]">
        {mode === "unsupported"
          ? t("start.voiceUnsupported")
          : mode === "nothing"
            ? t("start.voiceNothing")
            : busy
            ? t("start.analysing")
            : listening
              ? t("start.micStop")
              : `${t("start.mic")} · ${t("start.micHint")} ${lang.endonym}`}
      </p>

      {interim && (
        <p className="max-w-lg text-center text-[0.9375rem] text-ink-2 italic leading-snug">{interim}</p>
      )}
    </div>
  );
}

function MicIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v4" strokeLinecap="round" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <rect x="6" y="6" width="12" height="12" rx="1.5" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden className="animate-spin">
      <path d="M21 12a9 9 0 1 1-6.2-8.6" strokeLinecap="round" />
    </svg>
  );
}
