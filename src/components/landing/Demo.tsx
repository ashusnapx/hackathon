"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useT } from "@/lib/i18n/context";
import { useIsClient } from "@/lib/useIsClient";
import { cn } from "@/lib/utils";

/**
 * The two-minute walkthrough, with a full control surface.
 *
 * Self-hosted rather than embedded from Drive, because a Drive iframe hands the
 * viewer Drive's player — no speed control, no picture-in-picture, no quality
 * choice, and a consent interstitial. The trade-off is bytes, so:
 *
 *   · `preload="none"` plus a poster — nothing but a 70KB JPEG is fetched until
 *     someone actually presses play. The brief's users are on metered data.
 *   · two encodes, and the viewer picks. Data saver is 3.9MB, higher quality is
 *     9.2MB, and switching keeps your place.
 *   · both are `-movflags +faststart`, so playback begins before the file has
 *     finished arriving instead of waiting for the whole download.
 */

const SOURCES = {
  sd: { src: "/demo-sd.mp4", labelKey: "demo.qualitySd" },
  hd: { src: "/demo-hd.mp4", labelKey: "demo.qualityHd" },
} as const;

type Quality = keyof typeof SOURCES;

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;
const DRIVE_URL = "https://drive.google.com/file/d/15YK3JONlj1ai6QRl9LvdUHIlY1PBIXUr/view";

/** 0 → "0:00", 137 → "2:17". */
function clock(s: number): string {
  if (!Number.isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

export function Demo() {
  const t = useT();
  const videoRef = useRef<HTMLVideoElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<number | null>(null);
  /** Set while a quality swap is in flight, so the new element resumes in place. */
  const resumeAt = useRef<{ time: number; playing: boolean } | null>(null);

  const [started, setStarted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [speed, setSpeed] = useState<number>(1);
  const [quality, setQuality] = useState<Quality>("sd");
  const [fullscreen, setFullscreen] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [failed, setFailed] = useState(false);
  const [showControls, setShowControls] = useState(true);
  /** >0 while a speed/quality popover is open. A ref, not state — it only
      gates a timer and never needs to paint anything. */
  const menusOpen = useRef(0);
  const isClient = useIsClient();
  const canPip = isClient && !!document.pictureInPictureEnabled;

  // ── Controls auto-hide while playing, but never on a touch screen, where
  //    there is no hover to bring them back. ────────────────────────────────
  const nudgeControls = useCallback(() => {
    setShowControls(true);
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    // Never hide on touch (there is no hover to bring the bar back), while
    // paused, or out from under an open speed/quality popover.
    if (coarse || menusOpen.current > 0 || !videoRef.current || videoRef.current.paused) return;
    hideTimer.current = window.setTimeout(() => setShowControls(false), 2800);
  }, []);

  useEffect(() => () => { if (hideTimer.current) window.clearTimeout(hideTimer.current); }, []);

  const play = useCallback(async () => {
    const v = videoRef.current;
    if (!v) return;
    setStarted(true);
    try {
      await v.play();
    } catch {
      /* autoplay policy or a decode failure — the poster stays, the links work */
    }
  }, []);

  const toggle = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) void play();
    else v.pause();
    nudgeControls();
  }, [nudgeControls, play]);

  const seekBy = useCallback((delta: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.min(Math.max(0, v.currentTime + delta), v.duration || 0);
    nudgeControls();
  }, [nudgeControls]);

  const toggleFullscreen = useCallback(async () => {
    const shell = shellRef.current;
    const v = videoRef.current;
    if (!shell || !v) return;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else if (shell.requestFullscreen) {
        await shell.requestFullscreen();
      } else {
        // iPhone Safari has no Element fullscreen — only the video goes native.
        (v as HTMLVideoElement & { webkitEnterFullscreen?: () => void }).webkitEnterFullscreen?.();
      }
    } catch {
      /* refused — not worth surfacing */
    }
  }, []);

  const togglePip = useCallback(async () => {
    const v = videoRef.current;
    if (!v) return;
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else await v.requestPictureInPicture();
    } catch {
      /* unsupported or refused */
    }
  }, []);

  useEffect(() => {
    const onFs = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  /** Keyboard, scoped to the player so it cannot hijack the rest of the page. */
  const onKeyDown = (e: React.KeyboardEvent) => {
    // Let the range inputs keep their own arrow-key behaviour.
    if ((e.target as HTMLElement).tagName === "INPUT") return;
    const v = videoRef.current;
    if (!v) return;
    const keys: Record<string, () => void> = {
      " ": toggle,
      k: toggle,
      ArrowRight: () => seekBy(5),
      ArrowLeft: () => seekBy(-5),
      l: () => seekBy(10),
      j: () => seekBy(-10),
      ArrowUp: () => { const n = Math.min(1, v.volume + 0.1); v.volume = n; setVolume(n); },
      ArrowDown: () => { const n = Math.max(0, v.volume - 0.1); v.volume = n; setVolume(n); },
      m: () => { v.muted = !v.muted; setMuted(v.muted); },
      f: () => void toggleFullscreen(),
      Home: () => { v.currentTime = 0; },
      End: () => { v.currentTime = v.duration || 0; },
    };
    const run = keys[e.key];
    if (run) { e.preventDefault(); run(); nudgeControls(); }
  };

  /** Swap encodes without losing the viewer's place. */
  const changeQuality = (q: Quality) => {
    const v = videoRef.current;
    if (v && q !== quality) resumeAt.current = { time: v.currentTime, playing: !v.paused };
    setQuality(q);
  };

  const onLoadedMetadata = () => {
    const v = videoRef.current;
    if (!v) return;
    setDuration(v.duration || 0);
    const resume = resumeAt.current;
    if (resume) {
      v.currentTime = resume.time;
      if (resume.playing) void v.play().catch(() => {});
      resumeAt.current = null;
    }
  };

  const onProgress = () => {
    const v = videoRef.current;
    if (!v || !v.buffered.length) return;
    setBuffered(v.buffered.end(v.buffered.length - 1));
  };

  const pct = duration ? (time / duration) * 100 : 0;
  const bufPct = duration ? Math.min(100, (buffered / duration) * 100) : 0;

  return (
    <section id="demo" className="relative border-t border-rule">
      <div className="mx-auto max-w-6xl px-5 sm:px-8 py-16 sm:py-24">
        <p className="label">{t("demo.label")}</p>

        <h2 className="mt-4 text-[2.25rem] sm:text-5xl lg:text-[3.5rem] leading-[1.05]">
          <span className="block font-normal">{t("demo.h1")}</span>
          <span className="block airy text-ink-2">{t("demo.h2")}</span>
        </h2>

        <p className="mt-6 max-w-2xl text-[1.0625rem] leading-[1.65] text-ink-2 font-light">
          {t("demo.sub")}
        </p>

        {/* ── Player ─────────────────────────────────────────────────────── */}
        <div
          ref={shellRef}
          onKeyDown={onKeyDown}
          onPointerMove={nudgeControls}
          tabIndex={0}
          role="region"
          aria-label={t("demo.play")}
          className={cn(
            "group relative mt-10 overflow-hidden bg-black rounded-[4px] border border-rule",
            "focus-visible:outline-2 focus-visible:outline-urgent focus-visible:outline-offset-2",
            fullscreen && "flex flex-col justify-center rounded-none border-0",
          )}
        >
          <video
            ref={videoRef}
            /* `key` forces a fresh element on a quality swap so the browser
               re-reads the source instead of keeping the old buffer. */
            key={quality}
            poster="/demo-poster.jpg"
            preload={started ? "auto" : "none"}
            playsInline
            controls={false}
            className="w-full aspect-[8/5] bg-black"
            onClick={toggle}
            onLoadedMetadata={onLoadedMetadata}
            onTimeUpdate={() => setTime(videoRef.current?.currentTime ?? 0)}
            onDurationChange={() => setDuration(videoRef.current?.duration ?? 0)}
            onProgress={onProgress}
            onPlay={() => { setPlaying(true); nudgeControls(); }}
            onPause={() => { setPlaying(false); setShowControls(true); }}
            onWaiting={() => setWaiting(true)}
            onPlaying={() => setWaiting(false)}
            onCanPlay={() => setWaiting(false)}
            onEnded={() => { setPlaying(false); setShowControls(true); }}
            onVolumeChange={() => {
              const v = videoRef.current;
              if (!v) return;
              setVolume(v.volume);
              setMuted(v.muted);
            }}
            onError={() => setFailed(true)}
          >
            <source src={SOURCES[quality].src} type="video/mp4" />
            {t("demo.unsupported")}
          </video>

          {/* Poster overlay — the only thing on screen before the first play. */}
          {!started && !failed && (
            <button
              onClick={play}
              className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/35 hover:bg-black/25 transition-colors"
              aria-label={t("demo.play")}
            >
              <span className="flex h-20 w-20 items-center justify-center rounded-full bg-urgent text-white shadow-lg pulse-ring">
                <PlayIcon size={30} />
              </span>
              <span className="text-white text-[1.0625rem] font-semibold drop-shadow">
                {t("demo.play")}
              </span>
              <span className="num text-white/80 text-sm drop-shadow">
                {duration ? clock(duration) : "2:00"}
              </span>
            </button>
          )}

          {waiting && started && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <Spinner />
            </div>
          )}

          {failed && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80 px-6 text-center">
              <p className="text-white font-medium">{t("demo.unsupported")}</p>
              <a href={DRIVE_URL} target="_blank" rel="noopener noreferrer" className="text-urgent underline underline-offset-4 font-semibold">
                {t("demo.drive")}
              </a>
            </div>
          )}

          {/* ── Control bar ───────────────────────────────────────────────
              Only after the first play. Before that the poster overlay owns
              the frame, and the two used to sit on top of each other. */}
          <div
            className={cn(
              "absolute inset-x-0 bottom-0 transition-opacity duration-200",
              "bg-gradient-to-t from-black/92 via-black/70 to-transparent pt-10 pb-2 px-2 sm:px-3",
              !started || failed ? "opacity-0 pointer-events-none" : showControls ? "opacity-100" : "opacity-0 pointer-events-none",
            )}
            aria-hidden={!started}
          >
            {/* Scrub. A native range input so it is draggable, tappable and
                keyboard-operable without reimplementing any of that. */}
            <div className="relative px-1">
              <div className="absolute inset-x-1 top-1/2 -translate-y-1/2 h-1 rounded bg-white/25" aria-hidden />
              <div
                className="absolute start-1 top-1/2 -translate-y-1/2 h-1 rounded bg-white/40"
                style={{ width: `calc(${bufPct}% - 0.25rem)` }}
                aria-hidden
              />
              <div
                className="absolute start-1 top-1/2 -translate-y-1/2 h-1 rounded bg-urgent"
                style={{ width: `calc(${pct}% - 0.25rem)` }}
                aria-hidden
              />
              <input
                type="range"
                min={0}
                max={duration || 0}
                step={0.1}
                value={time}
                onChange={(e) => {
                  const v = videoRef.current;
                  if (!v) return;
                  const next = Number(e.target.value);
                  v.currentTime = next;
                  setTime(next);
                }}
                aria-label={t("demo.seek")}
                aria-valuetext={`${clock(time)} / ${clock(duration)}`}
                className="scrub relative w-full h-6 cursor-pointer appearance-none bg-transparent"
              />
            </div>

            <div className="mt-0.5 flex items-center gap-0.5 sm:gap-1 flex-wrap">
              <IconButton onClick={toggle} label={playing ? t("demo.pause") : t("demo.play")}>
                {playing ? <PauseIcon /> : <PlayIcon />}
              </IconButton>

              <IconButton onClick={() => seekBy(-10)} label={t("demo.back10")}>
                <Back10 />
              </IconButton>
              <IconButton onClick={() => seekBy(10)} label={t("demo.fwd10")}>
                <Fwd10 />
              </IconButton>

              <IconButton
                onClick={() => {
                  const v = videoRef.current;
                  if (!v) return;
                  v.muted = !v.muted;
                  setMuted(v.muted);
                }}
                label={muted || volume === 0 ? t("demo.unmute") : t("demo.mute")}
              >
                {muted || volume === 0 ? <MuteIcon /> : <VolumeIcon />}
              </IconButton>

              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={muted ? 0 : volume}
                onChange={(e) => {
                  const v = videoRef.current;
                  if (!v) return;
                  const next = Number(e.target.value);
                  v.volume = next;
                  v.muted = next === 0;
                  setVolume(next);
                  setMuted(next === 0);
                }}
                aria-label={t("demo.volume")}
                className="vol hidden sm:block w-16 md:w-20 h-6 cursor-pointer appearance-none bg-transparent"
              />

              <span className="num text-white/90 text-xs sm:text-[0.8125rem] px-1.5 tabular-nums whitespace-nowrap">
                {clock(time)} <span className="text-white/45">/ {clock(duration)}</span>
              </span>

              <span className="ms-auto flex items-center gap-0.5 sm:gap-1">
                <MenuButton
                  onOpenChange={(o) => {
                    menusOpen.current = Math.max(0, menusOpen.current + (o ? 1 : -1));
                    if (menusOpen.current === 0) nudgeControls();
                  }}
                  label={t("demo.speed")}
                  value={speed === 1 ? "1×" : `${speed}×`}
                  options={SPEEDS.map((s) => ({ id: String(s), label: s === 1 ? "1× (normal)" : `${s}×` }))}
                  selected={String(speed)}
                  onSelect={(id) => {
                    const n = Number(id);
                    if (videoRef.current) videoRef.current.playbackRate = n;
                    setSpeed(n);
                  }}
                />

                <MenuButton
                  onOpenChange={(o) => {
                    menusOpen.current = Math.max(0, menusOpen.current + (o ? 1 : -1));
                    if (menusOpen.current === 0) nudgeControls();
                  }}
                  label={t("demo.quality")}
                  value={quality.toUpperCase()}
                  options={[
                    { id: "sd", label: `${t("demo.qualitySd")} · 3.9 MB` },
                    { id: "hd", label: `${t("demo.qualityHd")} · 9.2 MB` },
                  ]}
                  selected={quality}
                  onSelect={(id) => changeQuality(id as Quality)}
                />

                <IconButton
                  onClick={() => { if (videoRef.current) videoRef.current.currentTime = 0; }}
                  label={t("demo.restart")}
                >
                  <RestartIcon />
                </IconButton>

                {canPip && (
                  <IconButton onClick={togglePip} label={t("demo.pip")} className="hidden sm:inline-flex">
                    <PipIcon />
                  </IconButton>
                )}

                <IconButton onClick={toggleFullscreen} label={t("demo.fullscreen")}>
                  {fullscreen ? <ExitFullIcon /> : <FullIcon />}
                </IconButton>
              </span>
            </div>
          </div>
        </div>

        {/* Everything the control bar cannot hold, in plain text under it. */}
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
          <a href={SOURCES[quality].src} download="kavach-demo.mp4" className="link font-medium">
            {t("demo.download")}
          </a>
          <a href={DRIVE_URL} target="_blank" rel="noopener noreferrer" className="link font-medium">
            {t("demo.drive")}
          </a>
          <span className="hand text-ink-3">
            space to play · ← → to skip · <span className="font-semibold">f</span> for full screen
          </span>
        </div>
      </div>
    </section>
  );
}

/* ── Bits ─────────────────────────────────────────────────────────────────── */

function IconButton({
  onClick, label, children, className,
}: { onClick: () => void; label: string; children: React.ReactNode; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      /* 40px square: below the 44px ideal, but this bar has to hold ten
         controls on a 360px screen and every one stays tappable. */
      className={cn(
        "inline-flex h-10 w-10 items-center justify-center rounded text-white/90",
        "hover:text-white hover:bg-white/15 active:bg-white/25 transition-colors",
        className,
      )}
    >
      {children}
    </button>
  );
}

/** A small popover list — used for speed and quality. */
function MenuButton({
  label, value, options, selected, onSelect, onOpenChange,
}: {
  label: string;
  value: string;
  options: { id: string; label: string }[];
  selected: string;
  onSelect: (id: string) => void;
  onOpenChange?: (open: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Latest-ref, synced in an effect, so `close` stays referentially stable and
  // the listener effect below does not resubscribe on every parent render.
  const onOpenChangeRef = useRef(onOpenChange);
  useEffect(() => {
    onOpenChangeRef.current = onOpenChange;
  });

  // The callback stays outside the updater — React may invoke an updater twice,
  // and this one is a side effect that must fire exactly once per change.
  const setOpenAnd = (next: boolean) => {
    if (open === next) return;
    setOpen(next);
    onOpenChange?.(next);
  };

  // Stable across renders, so the listener effect below needs no extra deps.
  // Only ever called while the popover is open — the listeners that call it
  // are attached only in that state.
  const close = useCallback(() => {
    setOpen(false);
    onOpenChangeRef.current?.(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpenAnd(!open)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        title={label}
        className={cn(
          "num inline-flex h-10 min-w-10 items-center justify-center rounded px-2 text-xs font-semibold",
          "text-white/90 hover:text-white hover:bg-white/15 transition-colors",
          open && "bg-white/20 text-white",
        )}
      >
        {value}
      </button>
      {open && (
        <div
          role="menu"
          className="absolute bottom-full end-0 mb-2 min-w-[11rem] rounded-[4px] border border-white/15 bg-black/95 p-1 shadow-xl"
        >
          <p className="label !text-white/45 px-2.5 py-1.5">{label}</p>
          {options.map((o) => (
            <button
              key={o.id}
              role="menuitemradio"
              aria-checked={selected === o.id}
              onClick={() => { onSelect(o.id); setOpenAnd(false); }}
              className={cn(
                "flex w-full items-center gap-2 rounded px-2.5 py-2 text-start text-[0.8125rem]",
                "hover:bg-white/15 transition-colors",
                selected === o.id ? "text-white font-semibold" : "text-white/70 font-light",
              )}
            >
              {/* aria-hidden: `aria-checked` already states the selection, and
                  an invisible tick was being read out on every option. */}
              <span aria-hidden className={cn("w-3 shrink-0", selected === o.id ? "opacity-100" : "opacity-0")}>✓</span>
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function PlayIcon({ size = 18 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M8 5.5v13l11-6.5z" /></svg>;
}
function PauseIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" /></svg>;
}
function Back10() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M12 5V2L7 6l5 4V7a6 6 0 1 1-6 6" strokeLinecap="round" strokeLinejoin="round" />
      <text x="12" y="18.5" textAnchor="middle" fontSize="7.5" fill="currentColor" stroke="none" fontWeight="700">10</text>
    </svg>
  );
}
function Fwd10() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M12 5V2l5 4-5 4V7a6 6 0 1 0 6 6" strokeLinecap="round" strokeLinejoin="round" />
      <text x="12" y="18.5" textAnchor="middle" fontSize="7.5" fill="currentColor" stroke="none" fontWeight="700">10</text>
    </svg>
  );
}
function VolumeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M11 5 6 9H3v6h3l5 4z" fill="currentColor" strokeLinejoin="round" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" strokeLinecap="round" />
    </svg>
  );
}
function MuteIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M11 5 6 9H3v6h3l5 4z" fill="currentColor" strokeLinejoin="round" />
      <path d="m16 9.5 5 5m0-5-5 5" strokeLinecap="round" />
    </svg>
  );
}
function RestartIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden>
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 3v5h5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function PipIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <rect x="12" y="11" width="7" height="6" rx="1" fill="currentColor" />
    </svg>
  );
}
function FullIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden strokeLinecap="round">
      <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
    </svg>
  );
}
function ExitFullIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden strokeLinecap="round">
      <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" />
    </svg>
  );
}
function Spinner() {
  return (
    <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" aria-hidden className="animate-spin drop-shadow">
      <path d="M21 12a9 9 0 1 1-6.2-8.6" strokeLinecap="round" />
    </svg>
  );
}
