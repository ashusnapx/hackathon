"use client";

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
export function PhoneFrame({ children, statusTime }: { children: React.ReactNode; statusTime: string }) {
  return (
    <div
      className="relative sm:mx-auto"
      style={{
        // iPhone 17 Pro Max is 440 x 956 points. Floored so a short laptop gets
        // a usable handset, capped at the real height on a tall screen.
        height: "clamp(620px, 82vh, 956px)",
        width: "min(440px, calc(clamp(620px, 82vh, 956px) * 440 / 956))",
        maxWidth: "100%",
      }}
    >
      {/* Titanium body: a flat rounded rectangle reads as a wireframe, so the
          frame gets an edge highlight, a darker core and real side buttons. */}
      <div className="absolute inset-0 rounded-[3.1rem] bg-gradient-to-br from-[#6f6f76] via-[#26262a] to-[#5b5b62] shadow-[0_45px_90px_-35px_rgba(11,20,26,0.75)]" aria-hidden />
      <div className="absolute inset-[3px] rounded-[3rem] bg-[#111114]" aria-hidden />

      <span className="absolute -left-[2px] top-[19%] h-7 w-[3px] rounded-l-sm bg-gradient-to-b from-[#7b7b82] to-[#3f3f45]" aria-hidden />
      <span className="absolute -left-[2px] top-[27%] h-12 w-[3px] rounded-l-sm bg-gradient-to-b from-[#7b7b82] to-[#3f3f45]" aria-hidden />
      <span className="absolute -left-[2px] top-[37%] h-12 w-[3px] rounded-l-sm bg-gradient-to-b from-[#7b7b82] to-[#3f3f45]" aria-hidden />
      <span className="absolute -right-[2px] top-[30%] h-16 w-[3px] rounded-r-sm bg-gradient-to-b from-[#7b7b82] to-[#3f3f45]" aria-hidden />

      <div className="absolute inset-[10px] rounded-[2.65rem] overflow-hidden bg-white flex flex-col">
        <div className="relative shrink-0 bg-[#008069] text-white">
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

export function WhatsAppHeader({ name, status }: { name: string; status: string }) {
  return (
    <div className="shrink-0 flex items-center gap-3 px-3 sm:px-4 py-2.5 bg-[#008069] text-white">
      {/* The display picture is the site's own shield, the way a real contact
          photo would be — not an initial standing in for one. */}
      <span className="grid place-items-center w-10 h-10 rounded-full bg-white shrink-0 overflow-hidden" aria-hidden>
        <KavachShield />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[0.9375rem] font-medium leading-tight truncate">{name}</p>
        <p className="text-[0.6875rem] leading-tight text-white/80 truncate">{status}</p>
      </div>
      <span className="flex items-center gap-3.5 ps-1 text-white/90" aria-hidden>
        <VideoIcon />
        <PhoneIcon />
        <DotsIcon />
      </span>
    </div>
  );
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
          "relative max-w-[85%] sm:max-w-[75%] px-2.5 pt-1.5 pb-1 rounded-lg text-[0.9375rem] leading-[1.45] text-[#111b21]",
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
export function WhatsAppComposer({ suggestions, input, trailing, attachmentNote, hideCamera }: {
  /** Quick replies for the current question, scrolling in one row. */
  suggestions?: React.ReactNode;
  /** The text field, or a hint when the question expects a tap. */
  input: React.ReactNode;
  /** The green circle: microphone, or send. */
  trailing?: React.ReactNode;
  attachmentNote: string;
  /** WhatsApp drops the camera the moment you start typing. */
  hideCamera?: boolean;
}) {
  return (
    <div className="shrink-0 bg-[#f0f2f5] border-t border-black/5">
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
      <div className="px-2 py-2 flex items-end gap-1.5">
        <div className="flex-1 min-w-0 rounded-[1.5rem] bg-white px-2 py-1.5 flex items-end gap-1.5 shadow-[0_1px_1px_rgba(11,20,26,0.06)]">
          <span className="grid place-items-center w-8 h-8 shrink-0 text-[#54656f]" title={attachmentNote} aria-hidden>
            <EmojiIcon />
          </span>
          <div className="flex-1 min-w-0 py-1">{input}</div>
          <span className="grid place-items-center w-8 h-8 shrink-0 text-[#54656f] rotate-[-45deg]" title={attachmentNote} aria-hidden>
            <ClipIcon />
          </span>
          {!hideCamera && (
            <span className="grid place-items-center w-8 h-8 shrink-0 text-[#54656f]" title={attachmentNote} aria-hidden>
              <CameraIcon />
            </span>
          )}
        </div>
        {trailing}
      </div>
    </div>
  );
}

export const WHATSAPP_WALLPAPER = "bg-[#efeae2] bg-[radial-gradient(#00000008_1px,transparent_1px)] [background-size:18px_18px]";

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
      className="grid place-items-center w-11 h-11 shrink-0 rounded-full bg-[#008069] text-white disabled:opacity-50"
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M3.4 20.4 21 12 3.4 3.6 3.4 10.1 15.5 12 3.4 13.9z" />
      </svg>
    </button>
  );
}
