"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * WhatsApp's own furniture, rebuilt.
 *
 * The point is recognition: most people this is built for have never used a
 * government portal, but they have used this screen every day for years. Making
 * the preview look like the real thing removes a learning step at the worst
 * possible moment.
 *
 * It is a replica, not a connection — nothing here reaches Meta, and the header
 * says so rather than implying a WhatsApp integration that does not exist.
 */

/**
 * A phone around the preview.
 *
 * On a desktop the WhatsApp screen otherwise reads as a website pretending to
 * be a chat. In a handset, with a status bar above it, it reads as the thing
 * people will actually use — which is the whole argument this product makes.
 * On a real phone the frame is dropped: you are already holding one.
 */
/**
 * The handset, from a small tablet up — and nothing at all below that.
 *
 * On a phone this was drawing a picture of a phone inside a phone, at a third
 * of the width, with the conversation clipped to a fixed height that nothing
 * could scroll. The frame is decoration in service of an idea ("this is what
 * it looks like on WhatsApp"), and on a phone the idea needs no help: the chat
 * simply fills the screen and the page scrolls, which is what the real app
 * does. So every fixed dimension here starts at `sm`.
 */
export function PhoneFrame({ children, statusTime }: { children: React.ReactNode; statusTime: string }) {
  return (
    <div
      className={cn(
        // min-w-0: this is a grid item, and a grid item refuses to shrink below
        // its content unless told to. Without it a long bubble pushes the whole
        // page sideways on a narrow screen.
        "relative w-full min-w-0",
        // iPhone 17 Pro Max is 440 x 956 points. The floor keeps a short laptop
        // window from rendering a sliver, and is low enough that the handset
        // still fits without the page itself having to scroll.
        "sm:mx-auto sm:max-w-full",
        "sm:[height:clamp(540px,80vh,956px)]",
        "sm:[width:min(440px,calc(clamp(540px,80vh,956px)*440/956))]",
      )}
    >
      {/* Titanium body: a flat rounded rectangle reads as a wireframe, so the
          frame gets an edge highlight, a darker core and real side buttons. */}
      <div className="hidden sm:block absolute inset-0 rounded-[3.1rem] bg-gradient-to-br from-[#6f6f76] via-[#26262a] to-[#5b5b62] shadow-[0_45px_90px_-35px_rgba(11,20,26,0.75)]" aria-hidden />
      <div className="hidden sm:block absolute inset-[3px] rounded-[3rem] bg-[#111114]" aria-hidden />

      <span className="hidden sm:block absolute -left-[2px] top-[19%] h-7 w-[3px] rounded-l-sm bg-gradient-to-b from-[#7b7b82] to-[#3f3f45]" aria-hidden />
      <span className="hidden sm:block absolute -left-[2px] top-[27%] h-12 w-[3px] rounded-l-sm bg-gradient-to-b from-[#7b7b82] to-[#3f3f45]" aria-hidden />
      <span className="hidden sm:block absolute -left-[2px] top-[37%] h-12 w-[3px] rounded-l-sm bg-gradient-to-b from-[#7b7b82] to-[#3f3f45]" aria-hidden />
      <span className="hidden sm:block absolute -right-[2px] top-[30%] h-16 w-[3px] rounded-r-sm bg-gradient-to-b from-[#7b7b82] to-[#3f3f45]" aria-hidden />

      <div className="rounded-card border border-rule sm:border-0 sm:absolute sm:inset-[10px] sm:rounded-[2.65rem] overflow-hidden bg-white flex flex-col">
        {/* The status bar belongs to the drawing of a phone. A real one already
            has its own, an inch above this. */}
        <div className="hidden sm:block relative shrink-0 bg-[#008069] text-white">
          <div className="flex items-center justify-between px-7 pt-2.5 pb-1 text-[0.8125rem] font-semibold">
            <span className="tabular-nums">{statusTime}</span>
            <span className="flex items-center gap-1.5" aria-hidden>
              <SignalIcon />
              <WifiIcon />
              <BatteryIcon />
            </span>
          </div>
          <span
            className="absolute left-1/2 top-1.5 -translate-x-1/2 h-[26px] w-[86px] rounded-full bg-black"
            aria-hidden
          />
        </div>
        {children}
      </div>
    </div>
  );
}

function SignalIcon() {
  return <svg width="16" height="11" viewBox="0 0 18 12" fill="currentColor" aria-hidden><rect x="0" y="8" width="3" height="4" rx="1" /><rect x="5" y="5.5" width="3" height="6.5" rx="1" /><rect x="10" y="3" width="3" height="9" rx="1" /><rect x="15" y="0.5" width="3" height="11.5" rx="1" opacity=".45" /></svg>;
}

function WifiIcon() {
  return <svg width="15" height="11" viewBox="0 0 16 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden><path d="M1 4.2a10.5 10.5 0 0 1 14 0M3.6 7a6.8 6.8 0 0 1 8.8 0" /><circle cx="8" cy="10" r="1" fill="currentColor" stroke="none" /></svg>;
}

function BatteryIcon() {
  return <svg width="24" height="12" viewBox="0 0 26 12" fill="none" aria-hidden><rect x="0.7" y="0.7" width="21" height="10.6" rx="3" stroke="currentColor" strokeOpacity=".55" /><rect x="2.4" y="2.4" width="16" height="7.2" rx="1.8" fill="currentColor" /><path d="M23.5 4.2v3.6a2 2 0 0 0 0-3.6z" fill="currentColor" fillOpacity=".55" /></svg>;
}

export function WhatsAppHeader({ name, status, typing }: {
  name: string;
  status: string;
  /** Real WhatsApp replaces the contact's status with this while they write. */
  typing?: boolean;
}) {
  return (
    <div className="shrink-0 flex items-center gap-2 ps-1.5 pe-3 py-2 bg-[#008069] text-white">
      <span className="grid place-items-center w-7 shrink-0 text-white/95" aria-hidden><BackIcon /></span>
      {/* The display picture is the site's own shield, the way a real contact
          photo would be — not an initial standing in for one. */}
      <span className="grid place-items-center w-10 h-10 rounded-full bg-white shrink-0 overflow-hidden" aria-hidden>
        <KavachShield />
      </span>
      <div className="min-w-0 flex-1 ps-0.5">
        <p className="text-[0.9375rem] font-medium leading-tight truncate">{name}</p>
        <p className="text-[0.6875rem] leading-tight text-white/80 truncate">
          {typing ? "typing…" : status}
        </p>
      </div>
      <span className="flex items-center gap-4 ps-1 text-white/95" aria-hidden>
        <VideoIcon />
        <PhoneIcon />
        <DotsIcon />
      </span>
    </div>
  );
}

function BackIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M15 5l-7 7 7 7" /></svg>;
}

/**
 * The centred notice WhatsApp puts at the head of a chat. It carries the
 * disclaimer where that app carries its encryption notice — read as part of the
 * conversation, and out of the header, where it was crushing the contact name.
 */
export function WhatsAppSystemNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex justify-center pb-1">
      <span className="rounded-md bg-[#ffeecd] px-2.5 py-1.5 text-center text-[0.6875rem] leading-[1.4] text-[#54656f] shadow-[0_1px_0.5px_rgba(11,20,26,0.13)]">
        {children}
      </span>
    </div>
  );
}

/** A bubble with WhatsApp's tail, timestamp and read receipt. */
export function WhatsAppBubble({ children, outgoing, time, urgent }: {
  children: React.ReactNode;
  outgoing?: boolean;
  time: string;
  urgent?: boolean;
}) {
  return (
    <div className={cn("flex", outgoing ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "relative max-w-[85%] sm:max-w-[75%] ps-2.5 pe-2 pt-1.5 pb-1 rounded-lg text-[0.9375rem] leading-[1.4] text-[#111b21]",
          "shadow-[0_1px_0.5px_rgba(11,20,26,0.13)]",
          outgoing ? "bg-[#d9fdd3] rounded-tr-none" : "bg-white rounded-tl-none",
          urgent && !outgoing && "bg-[#fff5c4]",
        )}
      >
        <span className="whitespace-pre-wrap">{children}</span>
        <span className="float-end flex items-center gap-1 ps-2 pt-1 translate-y-1 text-[0.6875rem] text-[#667781] select-none">
          {time}
          {outgoing && <ReadTicks />}
        </span>
        <span
          aria-hidden
          className={cn(
            "absolute top-0 w-2 h-3 overflow-hidden",
            outgoing ? "-end-2" : "-start-2",
          )}
        >
          <span
            className={cn(
              "block w-4 h-4 -translate-y-1",
              outgoing ? "bg-[#d9fdd3] -translate-x-2 rounded-bl-full" : "bg-white translate-x-0 rounded-br-full",
            )}
          />
        </span>
      </div>
    </div>
  );
}

/**
 * The composer.
 *
 * Two rows, like a chat bot on WhatsApp actually looks: suggested replies
 * scrolling above, and the real input bar below. The previous version put every
 * step's controls inside the input pill, which meant a paragraph of consent text
 * rendered one word per line inside a text field.
 *
 * Emoji, attachment and camera are shown because the bar is incomplete without
 * them, and are inert because this preview cannot honour them — evidence is
 * attached later, in the case file, where it can be hashed and kept.
 */
/**
 * What the composer becomes while a voice note is being recorded.
 *
 * This is WhatsApp's own behaviour and not decoration: the field disappears,
 * a bin appears where the emoji was, and a running timer sits beside a blinking
 * red dot. It is the difference between "the microphone is on" being something
 * you infer from a colour and something the screen tells you.
 */
export function WhatsAppRecordingBar({ seconds, onCancel, cancelLabel }: {
  seconds: number;
  onCancel: () => void;
  cancelLabel: string;
}) {
  const mm = Math.floor(seconds / 60);
  const ss = String(seconds % 60).padStart(2, "0");
  return (
    <div className="flex-1 min-w-0 h-[46px] rounded-[1.5rem] bg-white ps-2 pe-4 flex items-center gap-3 shadow-[0_1px_1px_rgba(11,20,26,0.06)]">
      <button
        type="button"
        onClick={onCancel}
        aria-label={cancelLabel}
        className="grid place-items-center w-9 h-9 shrink-0 rounded-full text-[#54656f] hover:bg-black/5"
      >
        <BinIcon />
      </button>
      <span className="w-2 h-2 rounded-full bg-[#e5533d] animate-pulse shrink-0" aria-hidden />
      <span className="num text-[0.9375rem] text-[#111b21] tabular-nums">{mm}:{ss}</span>
      <span className="ms-auto truncate text-[0.8125rem] text-[#8696a0]">{cancelLabel}</span>
    </div>
  );
}

function BinIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M4 7h16M10 7V5h4v2M6 7l1 13h10l1-13M10 11v6M14 11v6" /></svg>;
}

export function WhatsAppComposer({ suggestions, input, trailing, attachmentNote, hideCamera, hint, recording }: {
  /** Quick replies for the current question, scrolling in one row. */
  suggestions?: React.ReactNode;
  /** The text field, or a hint when the question expects a tap. */
  input: React.ReactNode;
  /** The green circle: microphone, or send. */
  trailing?: React.ReactNode;
  attachmentNote: string;
  /** WhatsApp drops the camera the moment there is something in the field. */
  hideCamera?: boolean;
  /** Shown instead of the field while a voice note is being recorded. */
  recording?: React.ReactNode;
  /**
   * One line naming what the bar can do, on the steps where it takes an answer.
   *
   * The microphone and send are two green circles to somebody who has only ever
   * received messages on this screen. Saying it in words costs a line of type
   * and removes the guess.
   */
  hint?: string;
}) {
  return (
    <div className="shrink-0 bg-[#f0f2f5] border-t border-black/5">
      {hint && (
        <p className="px-3.5 pt-2 text-[0.6875rem] leading-[1.35] text-[#667781]">{hint}</p>
      )}
      {suggestions && (
        <div
          className={cn(
            "px-2 pt-2 pb-1 flex gap-2 overflow-x-auto",
            "[&_[role=group]]:flex-nowrap [&_[role=group]]:justify-start [&_[role=group]]:gap-2",
            "[&_button]:whitespace-nowrap [&_button]:shrink-0",
          )}
        >
          {suggestions}
        </div>
      )}
      <div className="px-1.5 pb-1.5 pt-1 flex items-end gap-1.5">
        {recording ?? (
        <div className="flex-1 min-w-0 rounded-[1.5rem] bg-white ps-1.5 pe-2 py-1 flex items-end gap-1 shadow-[0_1px_1px_rgba(11,20,26,0.06)]">
          <span className="grid place-items-center w-9 h-9 shrink-0 text-[#54656f]" title={attachmentNote} aria-hidden>
            <EmojiIcon />
          </span>
          <div className="flex-1 min-w-0 py-[0.4375rem]">{input}</div>
          <span className="grid place-items-center w-8 h-9 shrink-0 text-[#54656f] rotate-[-45deg]" title={attachmentNote} aria-hidden>
            <ClipIcon />
          </span>
          {!hideCamera && (
            <span className="grid place-items-center w-8 h-9 shrink-0 text-[#54656f]" title={attachmentNote} aria-hidden>
              <CameraIcon />
            </span>
          )}
        </div>
        )}
        {trailing}
      </div>
    </div>
  );
}

/**
 * The doodle wallpaper.
 *
 * A flat beige rectangle is the single biggest tell that a WhatsApp mock-up is
 * a mock-up: the real chat has a hand-drawn pattern behind it that people
 * recognise before they read a word. These are our own glyphs, drawn in the
 * same register — outline, single weight, scattered and rotated — rather than
 * Meta's artwork, which is theirs.
 */
const GLYPHS = [
  "M12 20C6 16 3 13 3 9.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 9 2.5C21 13 18 16 12 20Z",
  "M4 5h11v7a5.5 5.5 0 0 1-11 0ZM15 7h2.5a2.5 2.5 0 0 1 0 5H15M3 19h13",
  "M3 7h3.5L8 5h8l1.5 2H21v12H3ZM12 8.5a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9Z",
  "M10 18V5l9-2v11M7 18a3 3 0 1 0 6 0 3 3 0 0 0-6 0ZM16 14a3 3 0 1 0 6 0 3 3 0 0 0-6 0Z",
  "M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20ZM8 9v2M16 9v2M8 15a5.5 5.5 0 0 0 8 0",
  "M2 5h20v14H2ZM2 5l10 8 10-8",
  "M12 2a7 7 0 0 1 4 12.8V17H8v-2.2A7 7 0 0 1 12 2ZM8 20h8",
  "M12 2.5l2.9 6.2 6.6.8-4.9 4.6 1.3 6.6L12 17.4 6.1 20.7l1.3-6.6L2.5 9.5l6.6-.8Z",
  "M12 2a7.5 7.5 0 0 1 7.5 7.5C19.5 15 12 22 12 22S4.5 15 4.5 9.5A7.5 7.5 0 0 1 12 2ZM12 6.5a3 3 0 1 1 0 6 3 3 0 0 1 0-6Z",
  "M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20ZM12 6.5V12l3.5 2.5",
  "M5 8h14v13H5ZM9 3v4M15 3v4M5 12h14",
  "M4 20c0-6 3.6-11 8-11s8 5 8 11ZM2 20h20",
  "M12 3a6 6 0 0 1 6 6v4h-12V9a6 6 0 0 1 6-6ZM8 17h8l-1.4 4h-5.2Z",
  "M3 5h18v9h-7l-4 5-1-5H3Z M7 9h10",
  "M12 3v18M5 10l7-7 7 7",
  "M4 6h16v12H4ZM4 10h16M10 6v12",
  "M12 3l5 9H7ZM17 13v6M6 21h13",
  "M5 5h14l-3 14H8Z M5 5l-2-3h4",
  "M6 15a6 6 0 1 1 12 0v5H6ZM12 4v5",
  "M4 3h10l6 6v12H4Z M14 3v6h6",
];

/**
 * Scattered so the tile repeats without a seam.
 *
 * Every glyph is drawn in its own 24-unit box and placed inside the tile with
 * room to spare, so nothing is cut in half at the edge — which is what makes a
 * repeating pattern read as wallpaper rather than as a grid of squares.
 */
const PLACEMENTS: [number, number, number, number][] = [
  [6, 8, 0.85, -12], [58, 4, 0.75, 14], [112, 10, 0.8, -6], [162, 6, 0.7, 18],
  [30, 46, 0.7, 22], [84, 40, 0.85, -18], [136, 48, 0.75, 8], [176, 44, 0.65, -24],
  [8, 88, 0.8, 10], [56, 84, 0.7, -14], [108, 90, 0.75, 20], [156, 86, 0.85, -8],
  [30, 128, 0.75, -20], [80, 132, 0.8, 12], [130, 126, 0.7, -10], [172, 130, 0.75, 24],
  [10, 166, 0.7, 16], [60, 170, 0.85, -22], [110, 164, 0.75, 6], [158, 168, 0.8, -16],
];

const WALLPAPER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">`
  + `<g fill="none" stroke="#cdc4b8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.5">`
  + PLACEMENTS.map(([x, y, scale, angle], i) =>
    `<g transform="translate(${x} ${y}) rotate(${angle} 12 12) scale(${scale})">`
    + `<path d="${GLYPHS[i % GLYPHS.length]}"/></g>`).join("")
  + `</g></svg>`;

export const WHATSAPP_WALLPAPER = "bg-[#efe7de]";

/** The pattern itself, as a style so the SVG can live in this file. */
export const whatsappWallpaperStyle: React.CSSProperties = {
  backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(WALLPAPER_SVG)}")`,
  backgroundSize: "200px 200px",
};

/**
 * The date separator WhatsApp puts between days, and above the first message.
 */
export function WhatsAppDateChip({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex justify-center py-1.5">
      <span className="rounded-md bg-white/85 px-2.5 py-1 text-[0.6875rem] font-medium uppercase tracking-wide text-[#54656f] shadow-[0_1px_0.5px_rgba(11,20,26,0.13)]">
        {children}
      </span>
    </div>
  );
}

/**
 * The reply buttons a WhatsApp bot actually sends.
 *
 * Interactive replies arrive attached under the message they belong to: white,
 * the full width of the bubble, the label in WhatsApp's link blue, with a hair
 * of a gap between them. Putting the same choices on a strip above the keyboard
 * is a website's idea of a chat, and it was the thing that most gave this away.
 */
export function WhatsAppButtons({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-[3px] pt-[3px]" role="group">
      {children}
    </div>
  );
}

export function WhatsAppButton({ children, onClick, href, selected, disabled, primary }: {
  children: React.ReactNode;
  onClick?: () => void;
  /** A call button is a real link, the way a bot's phone-number button is. */
  href?: string;
  selected?: boolean;
  disabled?: boolean;
  /** The one that completes the step, drawn filled the way a bot's CTA is. */
  primary?: boolean;
}) {
  const className = cn(
    "w-[85%] sm:w-[75%] min-h-[38px] px-3 py-2 rounded-lg text-[0.875rem] font-medium",
    "flex items-center justify-center gap-1.5 text-center leading-[1.3]",
    "shadow-[0_1px_0.5px_rgba(11,20,26,0.13)] transition-colors",
    disabled && "opacity-50",
    primary
      ? "bg-[#00a884] text-white"
      : selected
        ? "bg-[#d9fdd3] text-[#027a5b]"
        : "bg-white text-[#00a5f4] hover:bg-[#f5f6f6]",
  );
  if (href) {
    const call = href.startsWith("tel:");
    return (
      <a href={href} target={call ? undefined : "_blank"} rel={call ? undefined : "noreferrer"} className={className}>
        {call ? <CallGlyph /> : <LinkGlyph />}
        {children}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={className}>
      {selected && <TickGlyph />}
      {children}
    </button>
  );
}

function CallGlyph() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.24 11.4 11.4 0 0 0 3.6.58 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1 11.4 11.4 0 0 0 .57 3.6 1 1 0 0 1-.25 1z" /></svg>;
}

function LinkGlyph() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M14 5h5v5M19 5l-9 9M17 14v4a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1h4" /></svg>;
}

function TickGlyph() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M4 12.5 9.5 18 20 6.5" /></svg>;
}

/** The three dots that mean the other side is writing. */
export function WhatsAppTyping() {
  return (
    <div className="flex justify-start">
      <div className="relative rounded-lg rounded-tl-none bg-white px-3.5 py-3 shadow-[0_1px_0.5px_rgba(11,20,26,0.13)]">
        <span className="sr-only">…</span>
        <span className="flex items-center gap-1" aria-hidden>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-[7px] h-[7px] rounded-full bg-[#9aa6ac] animate-pulse"
              style={{ animationDelay: `${i * 180}ms`, animationDuration: "1.1s" }}
            />
          ))}
        </span>
        <span aria-hidden className="absolute top-0 -start-2 w-2 h-3 overflow-hidden">
          <span className="block w-4 h-4 -translate-y-1 bg-white rounded-br-full" />
        </span>
      </div>
    </div>
  );
}

/**
 * The bottom sheet a WhatsApp list message opens.
 *
 * Thirty-six states cannot be reply buttons, and they are not a thing to type
 * either. WhatsApp's own answer to a long list is a sheet that slides over the
 * conversation, which is what this is.
 */
export function WhatsAppListSheet({ title, items, onPick, onClose }: {
  title: string;
  items: string[];
  onPick: (item: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="absolute inset-0 z-30 flex flex-col justify-end">
      <button
        type="button"
        aria-label={title}
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />
      <div className="relative max-h-[70%] flex flex-col rounded-t-2xl bg-white shadow-[0_-6px_24px_rgba(11,20,26,0.25)]">
        <div className="shrink-0 flex items-center gap-3 px-4 py-3 border-b border-black/10">
          <button type="button" onClick={onClose} aria-label="✕" className="text-[#54656f] text-lg leading-none">✕</button>
          <p className="text-[0.9375rem] font-medium text-[#111b21]">{title}</p>
        </div>
        <div className="overflow-y-auto no-scrollbar">
          {items.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => onPick(item)}
              className="w-full px-4 py-3 text-start text-[0.9375rem] text-[#111b21] border-b border-black/5 hover:bg-[#f5f6f6]"
            >
              {item}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/** The wordmark's shield, sized for a contact photo. */
function KavachShield() {
  return (
    <svg width="26" height="26" viewBox="0 0 32 32" fill="none" aria-hidden>
      <path
        d="M16 2.5 4.5 7v10.2c0 6.6 4.7 10.9 11.5 12.3 6.8-1.4 11.5-5.7 11.5-12.3V7L16 2.5Z"
        stroke="#111b21"
        strokeWidth="1.9"
        strokeLinejoin="round"
      />
      <path d="M16 8v11M11 13.5h10" stroke="#e5533d" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

function ReadTicks() {
  return (
    <svg width="16" height="11" viewBox="0 0 16 11" fill="none" aria-hidden>
      <path d="M11.07.65 5.46 8.2 3.2 5.94l-.71.7 3.02 3.03L11.86 1.3zM15.5.65 9.89 8.2l-.6-.6-.71.71 1.31 1.32L16.2 1.3z" fill="#53bdeb" />
    </svg>
  );
}

function VideoIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M17 10.5V7a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3.5l4 4v-11z" /></svg>;
}

function PhoneIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.24 11.4 11.4 0 0 0 3.6.58 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1 11.4 11.4 0 0 0 .57 3.6 1 1 0 0 1-.25 1z" /></svg>;
}

function DotsIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden><circle cx="12" cy="5" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="12" cy="19" r="1.8" /></svg>;
}

function EmojiIcon() {
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden><circle cx="12" cy="12" r="9" /><path d="M8.5 14.5a4.5 4.5 0 0 0 7 0" strokeLinecap="round" /><circle cx="9" cy="10" r="1" fill="currentColor" stroke="none" /><circle cx="15" cy="10" r="1" fill="currentColor" stroke="none" /></svg>;
}

function ClipIcon() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden><path d="M16 6.5 8.9 13.6a2.5 2.5 0 0 0 3.5 3.5l7.1-7a4.5 4.5 0 0 0-6.4-6.3L5.6 11.3a6.5 6.5 0 0 0 9.2 9.2l6.2-6.2" /></svg>;
}

function CameraIcon() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden><path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" /><circle cx="12" cy="13" r="3.2" /></svg>;
}

/** WhatsApp's send button: the same circle the microphone occupies when empty. */
export function WhatsAppSendButton({ onClick, disabled, label }: {
  onClick: () => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="grid place-items-center w-[46px] h-[46px] shrink-0 rounded-full bg-[#00a884] text-white disabled:opacity-50"
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M3.4 20.4 21 12 3.4 3.6 3.4 10.1 15.5 12 3.4 13.9z" />
      </svg>
    </button>
  );
}

/**
 * The message field, growing with what is typed.
 *
 * A fixed one-line box makes someone describing a fraud scroll inside a 30px
 * window to reread their own sentence. WhatsApp grows the field to about six
 * lines and only then scrolls, so this does the same: the height is recomputed
 * from the content on every change, and the cap lives in CSS.
 */
export function WhatsAppInput({ value, onChange, onSend, placeholder, ariaLabel }: {
  value: string;
  onChange: (value: string) => void;
  /** Enter sends and Shift+Enter breaks the line, as it does on WhatsApp Web. */
  onSend?: () => void;
  placeholder: string;
  ariaLabel: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Collapse first, or the box can only ever grow.
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={(event) => {
        if (event.key !== "Enter" || event.shiftKey || !onSend) return;
        event.preventDefault();
        onSend();
      }}
      rows={1}
      placeholder={placeholder}
      aria-label={ariaLabel}
      className={cn(
        "block w-full bg-transparent resize-none focus:outline-none",
        "text-[0.9375rem] leading-[1.45] text-[#111b21] placeholder:text-[#8696a0]",
        "max-h-32 overflow-y-auto no-scrollbar",
      )}
    />
  );
}
