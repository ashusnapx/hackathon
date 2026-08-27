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

type Mode = "idle" | "listening" | "processing" | "unsupported";

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
  onerror: ((e: unknown) => void) | null;
  onend: (() => void) | null;
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
    const src = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    src.connect(analyser);
    const buf = new Uint8Array(analyser.frequencyBinCount);

    const tick = () => {
      analyser.getByteFrequencyData(buf);
      const avg = buf.reduce((s, v) => s + v, 0) / buf.length;
      setLevel(Math.min(1, avg / 90));
      rafRef.current = requestAnimationFrame(tick);
    };
    tick();
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      meter(stream);

      const rec = new MediaRecorder(stream);
      recorderRef.current = rec;
      chunksRef.current = [];
      rec.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);

      rec.onstop = async () => {
        cleanup();
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        if (blob.size < 1200) {
          setMode("idle");
          return;
        }
        setMode("processing");
        try {
          const form = new FormData();
          form.append("audio", blob);
          form.append("lang", lang.code);
          const res = await fetch("/api/ai/transcribe", { method: "POST", body: form });
          const data = await res.json();
          if (data.text) onResult(data.text);
          else setMode("unsupported");
        } catch {
          setMode("unsupported");
        } finally {
          setMode((m) => (m === "unsupported" ? m : "idle"));
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

    const rec = getRecognition();
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
      rec.onerror = () => {
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
