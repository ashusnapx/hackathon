"use client";

import type { CSSProperties, RefObject } from "react";

/**
 * What the microphone looks like while somebody is talking to it.
 *
 * The old answer was a `box-shadow` spread driven by React state at 60fps. It
 * worked, and it cost more than anything else on the screen: every frame
 * re-rendered VoiceInput, rebuilt its class strings, and repainted a growing
 * blurred ring around a 128px circle — on a phone that was already encoding
 * Opus. Nothing here calls setState. A single rAF loop reads the analyser and
 * writes a handful of CSS custom properties; everything visible is a `transform`
 * or an `opacity`, which the compositor handles without a style recalc or a
 * repaint. React renders twice per take — into "listening" and back out.
 *
 * The picture has three parts, and only the first two are ever driven by JS:
 *
 *   the pulli   Sixteen dots on a fixed circle just outside the button. They
 *               never travel. Each one is a band of what the microphone is
 *               actually hearing, mirrored about the vertical axis, so the low
 *               end of a voice — where nearly all of its energy is — sits at
 *               the crown and the pair either side of it move together. A dot
 *               grows and brightens; it does not stretch into a bar. That is
 *               the whole difference between a kolam's dot grid and the polar
 *               equaliser every voice assistant on earth already draws.
 *
 *   the rim     One hairline ring hugging the button, tracking overall loudness.
 *               It is the part that answers within a frame of somebody speaking,
 *               and it is the only part that survives reduced motion, forced
 *               colours and high contrast — so it is never allowed to be
 *               decorative.
 *
 *   the waves   Three hairline rings that leave the button every ~700ms and
 *               drift out past the dots. Each one is born carrying the loudest
 *               thing heard since the last one left, frozen into `--m0/1/2`, and
 *               keeps that brightness for its whole journey. So a sentence
 *               leaves three rings of different weights in the air at once: not
 *               a needle showing the present instant, but a short record of what
 *               was just said, drifting outward and being kept. Which is, not by
 *               accident, what this product does with the statement.
 *
 * The waves travel on a CSS animation, not on our clock. JS touches them once
 * per birth — about 1.4 property writes a second — and the browser does the rest
 * off the main thread.
 *
 * globals.css already makes the case for the motif better than a comment here
 * can: a kolam is "a grid of dots with a path traced through it, which is what
 * this product is: fixed points and a route between them". The dots are the
 * fixed points. The route is the citizen's.
 */

export type RingSize = "hero" | "page" | "compact";

/* ── Geometry ───────────────────────────────────────────────────────────────
   Sixteen dots, nine bands. Dot i takes band `i <= 8 ? i : 16 - i`, so the ring
   is symmetric about the vertical axis and nine numbers move sixteen marks —
   near enough half the DOM writes, and the symmetry is what stops it reading as
   a meter. Band 0 sits at twelve o'clock.

   Sixteen and not twenty-four because the hero button is 112–128px inside an
   8.5rem (136px) column in VoiceComposer: there is room for a thin ring of
   marks around it and for nothing else. That constraint is the reason this is a
   ring of dots rather than the lattice a pulli grid really is — a lattice needs
   a field, and there is no field here to give it. */
const DOTS = 16;
const BANDS = 9;

const DOT_LAYOUT = Array.from({ length: DOTS }, (_, i) => ({
  angle: (i * 360) / DOTS,
  band: i <= BANDS - 1 ? i : DOTS - i,
}));

/* ── The audio ──────────────────────────────────────────────────────────────
   Two analyser nodes off one source, and the split is a safety decision rather
   than a tidiness one.

   `gate` is the node the silence guard reads. Its fftSize and every default it
   was given stay exactly where they were, because `peakRef.current < 0.04` in
   VoiceInput decides whether a take is uploaded at all, and that number is
   calibrated against this node's settings and no others. A take wrongly judged
   silent is a citizen's statement thrown away; a take wrongly judged loud gets
   a sentence invented for it that ends up in a police complaint. Neither is
   recoverable, and both are invisible in testing.

   `viz` is ours. Its fftSize, its smoothing and the bands below can be retuned
   to make the picture better without any of that being able to reach the guard.
   The previous version of this file had one node and a comment begging future
   editors not to fold the two readings together; a second node makes the
   mistake structurally impossible for the price of one graph node. */
const GATE_FFT = 256;
const VIZ_FFT = 512;

/** Cheap first-pass smoothing, done in the audio thread before a single float
    of ours is touched. Above the 0.8 default because it takes the flicker off
    the top of a sibilant and costs the dots nothing they can be seen to lose. */
const VIZ_SMOOTHING = 0.82;

/** The band a human voice occupies. Below 150Hz is a ceiling fan and a hand on
    the phone; above 5.4kHz there is nothing a dot could honestly show. */
const BAND_LO_HZ = 150;
const BAND_HI_HZ = 5400;

/** Fast up, slow down. Speech is transient: a mark that falls as fast as it
    rises flickers and reads as alarm, and one that rises as slowly as it falls
    reads as broken. 0.35 up is about three frames; 0.10 down is about 170ms of
    settle. This is the entire difference between "alive" and "twitchy", and it
    is deliberately calmer than a meter would be — the person watching it has
    just lost money and does not need something jumping at them. */
const ATTACK = 0.35;
const RELEASE = 0.1;
const BREATH_ATTACK = 0.4;
const BREATH_RELEASE = 0.09;

/** Frames of a bit-for-bit flat analyser before we conclude it was never wired
    to the microphone. About three quarters of a second. */
const FLAT_FRAMES = 45;

/** Values are written in fiftieths. At these sizes one step moves a dot by less
    than a tenth of a pixel, and the coarser grid means a frame of ordinary
    speech writes five or six properties instead of ten — and a silent room
    writes none at all. */
const STEP = 50;

/**
 * Log-spaced bin edges, derived from the context's real sample rate.
 *
 * Not from an assumed 48kHz. Android WebViews routinely hand back a 16kHz
 * microphone stream, and a hardcoded bin table puts every band into the bottom
 * fifth of the spectrum there — the ring goes visibly dead on exactly the
 * ₹8,000 handsets this product exists for, which is the one place nobody
 * developing it will see it happen.
 */
function bandEdges(sampleRate: number, fftSize: number, binCount: number): Int16Array {
  const edges = new Int16Array(BANDS + 1);
  let prev = -1;
  for (let i = 0; i <= BANDS; i++) {
    const hz = BAND_LO_HZ * Math.pow(BAND_HI_HZ / BAND_LO_HZ, i / BANDS);
    let bin = Math.round((hz * fftSize) / sampleRate);
    // Every band gets at least one bin of its own, and none runs off the end.
    if (bin <= prev) bin = prev + 1;
    if (bin > binCount - 1) bin = binCount - 1;
    edges[i] = bin;
    prev = bin;
  }
  return edges;
}

export interface VoiceMeterOptions {
  stream: MediaStream;
  /** The ring wrapper. Null is survivable: the loop still measures. */
  el: HTMLElement | null;
  size: RingSize;
  /**
   * Handed the ORIGINAL level metric — mean of all 128 gate bins over 90 —
   * every single frame, before any drawing decision is taken and before every
   * early return below. VoiceInput keeps peakRef/framesRef from it, and those
   * decide whether the recording is uploaded. Nothing the ring does, including
   * the fallback it draws when it cannot hear, is ever allowed to reach here.
   */
  onLevel: (level: number) => void;
}

/**
 * Opens the meter for one take. Returns the AudioContext, because VoiceInput
 * owns closing it, and a `stop` that tears the loop down and leaves the ring
 * exactly as it found it.
 */
export function startVoiceMeter(opts: VoiceMeterOptions): { ctx: AudioContext; stop: () => void } {
  const { stream, el, size, onLevel } = opts;

  const ctx = new AudioContext();
  // iOS hands back a suspended context when it is built outside the gesture
  // that opened the mic; without this nothing is ever measured and the user
  // gets no sign they are being heard.
  void ctx.resume().catch(() => {});
  const src = ctx.createMediaStreamSource(stream);

  const gate = ctx.createAnalyser();
  gate.fftSize = GATE_FFT;
  src.connect(gate);

  const viz = ctx.createAnalyser();
  viz.fftSize = VIZ_FFT;
  viz.smoothingTimeConstant = VIZ_SMOOTHING;
  src.connect(viz);

  const gbuf = new Uint8Array(gate.frequencyBinCount);
  const vbuf = new Uint8Array(viz.frequencyBinCount);
  const edges = bandEdges(ctx.sampleRate, VIZ_FFT, viz.frequencyBinCount);

  /**
   * Motion preference, read once for the take.
   *
   * It has to be handled here and not only in CSS. The blanket reduce block in
   * globals.css crushes every transition to 0.01ms, so a loop writing a fresh
   * value sixty times a second would snap between them — motion with none of
   * the smoothing that made it bearable, which is the worst possible answer to
   * somebody who asked for less movement. Under reduce this loop damps hard and
   * quantises to four steps, and the CSS hides everything that travels.
   */
  const still = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  const compact = size === "compact";

  const level = new Float32Array(BANDS);
  /**
   * The quietest thing each band has lately been, subtracted before anything is
   * drawn. No room in India is silent — a ceiling fan, a fridge, a road outside
   * — and a fixed gate would be wrong in a quiet room and wrong in a loud one.
   * This drops instantly and recovers slowly, so the ring is still in a still
   * room and honest in a busy one. It starts high and only falls: somebody who
   * speaks in the first 200ms sees slightly small dots, which is a better error
   * than a fan pushing the ring up while nobody is talking.
   */
  const floor = new Float32Array(BANDS).fill(0.3);
  const sentBand = new Int16Array(BANDS).fill(-1);

  let breath = 0;
  let sentBreath = -1;
  /** Loudest frame since the last wave left, so a short syllable is not missed
      by a snapshot that happened to land between two of them. */
  let since = 0;
  let flat = 0;
  let deaf = false;
  let raf = 0;
  let stopped = false;

  const setVar = (name: string, value: string) => {
    if (el) el.style.setProperty(name, value);
  };

  /* ── The waves ────────────────────────────────────────────────────────────
     Travel is a CSS animation on its own clock; all we do is stamp each ring
     with a brightness at the moment it leaves. `animationiteration` is the only
     drift-free way to know when that is — a timestamp of our own would slide
     against the compositor's and make the stamp land mid-flight, where it would
     show as a pop. The keyframe is at zero opacity at 0%, so even a late write
     changes something invisible. */
  const waves = el ? Array.from(el.querySelectorAll<HTMLElement>(".pulli-wave")) : [];

  const shed = (index: number) => {
    if (deaf) return;
    // A floor of 0.18 under the snapshot, on purpose. A ring leaves the button
    // every 700ms from the instant the microphone opens, before anybody has
    // said anything — because "the microphone is on" and "I can hear you" are
    // two different reassurances, and the old meter collapsed them into one
    // signal that looked dead until you made a noise. A constant floor cannot
    // be mistaken for a response; the brightness above it is the response.
    setVar(`--m${index}`, (0.18 + 0.82 * Math.min(1, since * 1.2)).toFixed(2));
    since = 0;
  };

  const listeners = waves.map((wave, index) => {
    const handler = () => shed(index);
    wave.addEventListener("animationiteration", handler);
    return { wave, handler };
  });
  for (let i = 0; i < waves.length; i++) setVar(`--m${i}`, "0.30");

  const tick = () => {
    if (stopped) return;
    raf = requestAnimationFrame(tick);

    /* ── The guard ──────────────────────────────────────────────────────────
       Byte for byte the metric this component has always used: the mean of all
       128 gate bins over 90. A plain loop rather than `reduce`, because 128
       closure invocations a frame is not free on the phone this is for, but the
       arithmetic is identical and it must stay identical — the 0.04 threshold
       in VoiceInput is calibrated against this number and nothing else. It runs
       first, ahead of every early return below, so a motion preference or a
       dead analyser can never quietly switch the safety check off. */
    gate.getByteFrequencyData(gbuf);
    let sum = 0;
    let loudest = 0;
    for (let i = 0; i < gbuf.length; i++) {
      sum += gbuf[i];
      if (gbuf[i] > loudest) loudest = gbuf[i];
    }
    const overall = Math.min(1, sum / gbuf.length / 90);
    onLevel(overall);
    if (overall > since) since = overall;

    if (!el) return;

    /* ── Did the analyser ever wake up? ─────────────────────────────────────
       A suspended iOS context and a WebView that hands back a source connected
       to nothing both look like this: every bin exactly zero, forever. A real
       microphone in a silent room does not — it has a noise floor.

       `flat` counts consecutive dead frames rather than latching once, so an
       analyser that flickers alive, recovers and then dies for good still
       reaches the fallback. The take itself is unaffected: peakRef stays at
       exactly 0, `meterWorked` stays false, and the recording still fails open
       and gets uploaded, which is the promise VoiceInput already makes. */
    if (loudest === 0) flat += 1;
    else flat = 0;
    if (!deaf && flat >= FLAT_FRAMES) {
      deaf = true;
      el.dataset.deaf = "1";
      // Written once, and then never again for as long as the analyser stays
      // dead. This is the invariant that matters: from here the picture is
      // generated by a fixed CSS keyframe and is structurally incapable of
      // responding to sound, so it can say "the microphone is open" and can
      // never be read as "I heard you". Every other visual state in this file
      // is driven by real audio; this one has no path to it at all.
      for (let i = 0; i < waves.length; i++) setVar(`--m${i}`, "0.34");
    } else if (deaf && flat === 0) {
      deaf = false;
      delete el.dataset.deaf;
    }

    /* ── Reduced motion ─────────────────────────────────────────────────────
       Nothing travels. One heavily damped number, quantised to four steps, sets
       the opacity of the rim — a level, not an animation. It is written a
       handful of times per utterance rather than sixty times a second, and the
       CSS hides the dots and the waves outright. The person still gets the
       answer to "is it hearing me?"; they do not get a wave. */
    if (still) {
      breath += (overall - breath) * 0.06;
      const step = Math.min(3, (breath * 5) | 0);
      if (step !== sentBreath) {
        sentBreath = step;
        setVar("--b", String(step / 3));
      }
      return;
    }

    // CSS owns the picture from here while the analyser is dead. Note that we
    // have already fed the guard above; only the drawing stops.
    if (deaf) return;

    breath += (overall - breath) * (overall > breath ? BREATH_ATTACK : BREATH_RELEASE);
    const qb = (breath * STEP) | 0;
    if (qb !== sentBreath) {
      sentBreath = qb;
      setVar("--b", String(qb / STEP));
    }

    // The 46px circle in the composer has no room for sixteen dots, so the band
    // loop is never run for it at all. That is most of this function's cost,
    // skipped, on the variant that sits in a screen full of other work.
    if (compact) return;

    viz.getByteFrequencyData(vbuf);
    for (let b = 0; b < BANDS; b++) {
      const lo = edges[b];
      const hi = Math.max(lo + 1, edges[b + 1]);
      let peak = 0;
      for (let i = lo; i < hi && i < vbuf.length; i++) if (vbuf[i] > peak) peak = vbuf[i];
      let v = peak / 255;

      floor[b] = v < floor[b] ? v : Math.min(v, floor[b] + 0.0004);
      // The top of a voice runs 20–30dB below the bottom of it. Without the
      // tilt every bit of movement piles up at twelve o'clock and the other
      // fourteen dots sit there looking broken.
      v = (v - floor[b] - 0.02) * (1 + b * 0.09) * 1.9;
      v = v < 0 ? 0 : v > 1 ? 1 : v;

      const cur = level[b];
      level[b] = cur + (v - cur) * (v > cur ? ATTACK : RELEASE);

      const q = (level[b] * STEP) | 0;
      if (q !== sentBand[b]) {
        sentBand[b] = q;
        setVar(`--p${b}`, String(q / STEP));
      }
    }
  };

  tick();

  return {
    ctx,
    stop: () => {
      stopped = true;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      for (const { wave, handler } of listeners) {
        wave.removeEventListener("animationiteration", handler);
      }
      if (el) {
        // One call clears all thirteen properties, so a stale ring cannot flash
        // on the next take.
        el.removeAttribute("style");
        delete el.dataset.deaf;
      }
    },
  };
}

/**
 * The marks themselves. Rendered always, inert until `live` — so the ref is
 * there the moment the microphone opens, and the ring fades rather than
 * appearing from nothing.
 *
 * `aria-hidden` and no role, because it is decoration and must never be the
 * only thing saying what state the control is in. The status line under the
 * hero button and the pill above the compact one carry that in words.
 */
export function VoiceRing({
  ringRef,
  live,
  size,
}: {
  ringRef: RefObject<HTMLSpanElement | null>;
  live: boolean;
  size: RingSize;
}) {
  return (
    <span
      ref={ringRef}
      aria-hidden
      className="pulli"
      data-size={size}
      data-live={live ? "1" : undefined}
    >
      <span className="pulli-rim" />
      {/* Negative delays so all three rings are already in flight on the first
          frame — a ring leaves the button the instant it is tapped rather than
          1.4 seconds later. The delay is inline rather than in a :nth-child
          rule so that adding a fourth element to this span cannot silently
          re-time the ones already here. */}
      <span className="pulli-wave" style={{ "--m": "var(--m0)", animationDelay: "0ms" } as CSSProperties} />
      <span className="pulli-wave" style={{ "--m": "var(--m1)", animationDelay: "-700ms" } as CSSProperties} />
      <span className="pulli-wave" style={{ "--m": "var(--m2)", animationDelay: "-1400ms" } as CSSProperties} />
      {size !== "compact" &&
        DOT_LAYOUT.map((dot, i) => (
          <span
            key={i}
            className="pulli-dot"
            style={
              {
                "--a": `${dot.angle}deg`,
                "--band": String(dot.band),
                "--p": `var(--p${dot.band})`,
              } as CSSProperties
            }
          />
        ))}
    </span>
  );
}
