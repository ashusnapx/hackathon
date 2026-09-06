"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n/context";
import { appendPhrase, readRecognition } from "@/lib/intake/recognition";
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
  /**
   * "page" is the full control with its status line and disclosure.
   * "compact" is the green circle WhatsApp puts at the end of its composer.
   */
  variant?: "page" | "compact" | "hero";
  /**
   * Told whenever the microphone changes state.
   *
   * WhatsApp does not put a recording indicator next to the button — while you
   * are recording the whole composer becomes the recorder, with a timer and a
   * way out. That is drawn by whoever owns the composer, so it has to be told.
   */
  onModeChange?: (mode: Mode) => void;
  /** Filled with a way to throw the take away, for the composer's bin button. */
  controller?: React.MutableRefObject<{ cancel: () => void } | null>;
  /**
   * The words as they are being said, before the engine commits to them.
   *
   * Only the recognition path can produce these; the recorder path has nothing
   * to show until the take is uploaded. A composer that wants to show live text
   * has to cope with both, which is why this is a callback rather than a
   * promise that it will ever fire.
   */
  onInterim?: (text: string) => void;
}

interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort?(): void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
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

export function VoiceInput({ onResult, disabled, variant = "page", onModeChange, controller, onInterim }: Props) {
  const { lang, t } = useI18n();
  const [mode, setMode] = useState<Mode>("idle");
  const [level, setLevel] = useState(0);
  const [interim, setInterim] = useState("");
  const disclosureId = useId();

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const activityRef = useRef(0);
  const transcriptionRequestRef = useRef<AbortController | null>(null);
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
  /**
   * What the browser's own recogniser heard this take.
   *
   * It is a preview and a safety net, never the record. The record comes from
   * the server model, which is markedly better at Indian languages and accents
   * than Chrome's engine and is the same everywhere — but if that call fails or
   * the audio is refused, handing back these words beats handing back nothing.
   */
  const previewRef = useRef("");

  const cleanup = useCallback((invalidate = true) => {
    if (invalidate) activityRef.current += 1;
    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    if (recognition) {
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      try {
        if (recognition.abort) recognition.abort();
        else recognition.stop();
      } catch { /* already ended */ }
    }
    const recorder = recorderRef.current;
    recorderRef.current = null;
    if (recorder?.state === "recording" && invalidate) {
      recorder.ondataavailable = null;
      recorder.onstop = null;
      try { recorder.stop(); } catch { /* already ended */ }
    }
    if (invalidate) {
      transcriptionRequestRef.current?.abort();
      transcriptionRequestRef.current = null;
    }
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((tr) => tr.stop());
    streamRef.current = null;
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    setLevel(0);
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  const modeRef = useRef(onModeChange);
  useEffect(() => { modeRef.current = onModeChange; }, [onModeChange]);
  useEffect(() => { modeRef.current?.(mode); }, [mode]);

  const interimRef = useRef(onInterim);
  useEffect(() => { interimRef.current = onInterim; }, [onInterim]);
  useEffect(() => { interimRef.current?.(interim); }, [interim]);

  // Bound once when the session opens, called for the length of it.
  const resultRef = useRef(onResult);
  useEffect(() => { resultRef.current = onResult; }, [onResult]);

  useEffect(() => {
    if (!controller) return;
    const ref = controller;
    ref.current = { cancel: () => { cleanup(); setMode("idle"); } };
    return () => { ref.current = null; };
  }, [cleanup, controller]);

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

  const startRecording = useCallback(async (activity: number): Promise<boolean> => {
    if (recorderRef.current?.state === "recording") return true;
    peakRef.current = 0;
    framesRef.current = 0;
    try {
      // Reuse a stream we already hold rather than asking for a second one.
      const stream =
        streamRef.current ?? (await navigator.mediaDevices.getUserMedia({ audio: true }));
      if (activityRef.current !== activity) {
        stream.getTracks().forEach((track) => track.stop());
        return false;
      }
      streamRef.current = stream;
      if (!audioCtxRef.current) meter(stream);

      const mime = pickMime();
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      recorderRef.current = rec;
      chunksRef.current = [];
      rec.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);

      rec.onstop = async () => {
        if (activityRef.current !== activity) return;
        cleanup(false);
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
          const controller = new AbortController();
          transcriptionRequestRef.current = controller;
          const form = new FormData();
          form.append("audio", blob, `speech.${extFor(type)}`);
          form.append("lang", lang.code);
          const res = await fetch("/api/ai/transcribe", { method: "POST", body: form, signal: controller.signal });
          if (!res.ok) throw new Error(String(res.status));
          const data = await res.json();
          if (activityRef.current !== activity) return;
          if (data.text) {
            resultRef.current(data.text);
            setInterim("");
            previewRef.current = "";
            setMode("idle");
          } else if (previewRef.current) {
            // The model heard nothing it would commit to, but the browser did.
            // Its words are worse; they are not worth throwing away.
            resultRef.current(previewRef.current);
            setInterim("");
            previewRef.current = "";
            setMode("idle");
          } else {
            // The call worked; there were just no words in it.
            setMode("nothing");
          }
        } catch {
          if (activityRef.current !== activity) return;
          if (previewRef.current) {
            resultRef.current(previewRef.current);
            setInterim("");
            previewRef.current = "";
            setMode("idle");
          } else {
            setMode("unsupported");
          }
        } finally {
          if (transcriptionRequestRef.current) transcriptionRequestRef.current = null;
        }
      };

      rec.start();
      setMode("listening");
      return true;
    } catch {
      // No recorder here — no microphone, a refused permission, or a WebView
      // without MediaRecorder. The caller decides what to fall back to.
      return false;
    }
  }, [cleanup, lang.code, meter]);

  /**
   * Live words while the person is still speaking.
   *
   * Chrome's recogniser is fast and free and wrong often enough that it should
   * not be the record — it drops words, and it has no support at all for
   * several of the languages this ships in. It is perfect for the one job left
   * to it: showing something on screen so nobody wonders whether the microphone
   * is on. On a touch device it is skipped entirely; see prefersRecorder.
   */
  const startPreview = useCallback((recording: boolean) => {
    const rec = prefersRecorder() ? null : getRecognition();
    if (rec) {
      rec.lang = lang.speech;
      rec.continuous = true;
      rec.interimResults = true;
      recognitionRef.current = rec;

      rec.onresult = (e) => {
        const { settled, live } = readRecognition(e);
        if (settled) previewRef.current = appendPhrase(previewRef.current, settled);
        // Everything heard this take: the phrases the engine has settled on,
        // plus the one it is still revising. None of it is committed while a
        // recording is running, because the recording is what gets transcribed.
        // With no recorder there is nothing better coming, so these words are
        // the record and are handed over as they settle.
        if (!recording && settled) {
          resultRef.current(settled);
          previewRef.current = "";
          setInterim(live);
          return;
        }
        setInterim(appendPhrase(previewRef.current, live));
      };
      // The preview failing costs live text and nothing else, because the
      // recorder is running alongside it and holds the actual take.
      rec.onerror = () => {};
      rec.onend = () => {
        // Without a recorder this is the end of the take, so the control has to
        // stop saying it is listening.
        if (!recording) setMode((m) => (m === "listening" ? "idle" : m));
      };

      try {
        rec.start();
        if (!recording) setMode("listening");
        return true;
      } catch {
        recognitionRef.current = null;
      }
    }
    return false;
  }, [lang.speech]);

  const start = useCallback(async () => {
    if (disabled) return;
    const activity = ++activityRef.current;
    setInterim("");
    previewRef.current = "";
    setMode((m) => (m === "nothing" ? "idle" : m));
    // The recorder always runs: it is what produces the transcript. Recognition
    // is started beside it, where it exists, purely so there is something on
    // screen while somebody is still talking.
    const recording = await startRecording(activity);
    const previewing = startPreview(recording);
    // Neither the recorder nor the recogniser would start: there is no way to
    // hear this person, and the control should say so rather than sit there
    // looking armed.
    if (!recording && !previewing) setMode("unsupported");
  }, [disabled, startPreview, startRecording]);

  const stop = useCallback(() => {
    // The preview goes quiet first, then the take is closed. Ending the
    // recorder is what produces the transcript, so it is never skipped.
    const rec = recognitionRef.current;
    recognitionRef.current = null;
    if (rec) {
      rec.onresult = null;
      rec.onerror = null;
      rec.onend = null;
      try { rec.stop(); } catch { /* already ended */ }
    }
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
      return;
    }
    cleanup();
    setMode("idle");
    setInterim("");
  }, [cleanup]);

  const listening = mode === "listening";
  const busy = mode === "processing";

  if (variant === "compact") {
    // The full control carries a status line under it; the circle in a composer
    // carried nothing at all, so tapping it and being heard, being transcribed,
    // or being on a browser that cannot record all looked identical. The pill
    // floats above the button rather than taking a row, because the composer is
    // pinned to the bottom of a phone screen.
    const status = mode === "unsupported"
      ? t("start.voiceUnsupported")
      : mode === "nothing"
        ? t("start.voiceNothing")
        : busy
          ? t("start.transcribing")
          : null;

    return (
      <span className="relative shrink-0">
        {status && (
          <span
            role="status"
            aria-live="polite"
            className={cn(
              "absolute bottom-full end-0 mb-2 w-max max-w-[15rem] rounded-lg px-2.5 py-1.5",
              "text-[0.6875rem] leading-[1.35] text-white shadow-lg pointer-events-none",
              mode === "unsupported" || mode === "nothing" ? "bg-[#8a3d2f]" : "bg-[#111b21]/92",
            )}
          >
            {status}
          </span>
        )}
        <button
          type="button"
          onClick={listening ? stop : start}
          disabled={disabled || busy || mode === "unsupported"}
          aria-pressed={listening}
          aria-label={listening ? t("start.micStop") : t("start.mic")}
          className={cn(
            "relative grid place-items-center w-[46px] h-[46px] rounded-full text-white transition-colors",
            listening ? "bg-[#e5533d]" : "bg-[#00a884] disabled:opacity-50",
          )}
          style={
            listening
              ? { boxShadow: `0 0 0 ${3 + level * 12}px color-mix(in srgb, #e5533d 18%, transparent)` }
              : undefined
          }
        >
          {busy ? <Spinner /> : listening ? <SendIcon /> : <MicIcon />}
        </button>
      </span>
    );
  }

  const hero = variant === "hero";

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={listening ? stop : start}
        disabled={disabled || busy || mode === "unsupported"}
        aria-pressed={listening}
        aria-label={listening ? t("start.micStop") : t("start.mic")}
        aria-describedby={hero ? undefined : disclosureId}
        className={cn(
          "relative flex items-center justify-center rounded-full transition-all duration-200",
          "border disabled:opacity-45",
          // The one thing to do on the front door, sized like it. A 46px circle
          // is a control; this is an invitation, and it has to read as one to
          // somebody holding the phone at arm's length.
          hero ? "w-28 h-28 sm:w-32 sm:h-32" : "w-20 h-20",
          listening
            ? "bg-urgent border-urgent text-white"
            // The hero is the one thing to do on the page, so it is filled
            // rather than outlined: an outline reads as "one of several".
            : hero
              ? "bg-deep border-deep text-[#ffffeb] hover:opacity-90"
              : "bg-raised border-rule-strong text-ink hover:border-ink",
        )}
        style={
          listening
            ? { boxShadow: `0 0 0 ${4 + level * 22}px color-mix(in srgb, var(--urgent) 12%, transparent)` }
            : undefined
        }
      >
        <span className={cn(hero && "scale-[1.6]")}>
          {busy ? <Spinner /> : listening ? <StopIcon /> : <MicIcon />}
        </span>
      </button>

      <p className={cn("text-center min-h-[1.25rem]", hero ? "text-[0.9375rem] text-ink-2" : "text-sm text-ink-3")}>
        {mode === "unsupported"
          ? t("start.voiceUnsupported")
          : mode === "nothing"
            ? t("start.voiceNothing")
            : busy
            ? t("start.transcribing")
            : listening
              ? t("start.micStop")
              : `${t("start.mic")} · ${t("start.micHint")} ${lang.endonym}`}
      </p>

      {hero ? null : (
        <p id={disclosureId} className="max-w-lg text-xs leading-[1.55] text-ink-3 text-center">
          {t("start.voiceDisclosure")}
        </p>
      )}

      {/* Only when nobody else is showing it. A composer that takes `onInterim`
          is already painting these words in its own field, and rendering them
          here as well put the same half-sentence on screen twice. */}
      {interim && !onInterim && (
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

function SendIcon() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M3.4 20.4 21 12 3.4 3.6 3.4 10.1 15.5 12 3.4 13.9z" /></svg>;
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
