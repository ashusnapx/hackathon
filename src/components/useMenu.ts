"use client";

import { useEffect } from "react";

/**
 * The shared behaviour of every popup the header owns.
 *
 * Research converges on the same checklist for a hamburger sheet and an
 * account menu — move focus in on open, keep Tab inside while open, close on
 * Escape and on outside tap, hand focus back on close, and stop the page
 * scrolling underneath — so it lives here once instead of drifting apart in
 * two components that must feel identical under the fingers.
 */

function focusables(root: HTMLElement): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>(
    'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
  )].filter((el) => el.offsetParent !== null || el === document.activeElement);
}

/** Freeze the page behind an open sheet. The offset quirk is load-bearing. */
export function useScrollLock(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    // `overflow: hidden` alone lets the page jump sideways where a scrollbar
    // was. Holding the width keeps the pill header exactly where it was.
    const { overflow, paddingRight } = document.body.style;
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (scrollbar > 0) document.body.style.paddingRight = `${scrollbar}px`;
    return () => {
      document.body.style.overflow = overflow;
      document.body.style.paddingRight = paddingRight;
    };
  }, [active ]);
}

/**
 * One effect for the whole open state: focus the first item, trap Tab inside,
 * close on Escape or outside pointerdown.
 *
 * Closing from inside (a link click) stays the caller's job — only the panel
 * knows which tap is a choice and which is scenery.
 */
export function useMenuBehaviour({
  open,
  onClose,
  containerRef,
  extraRefs,
  triggerRef,
  trap = true,
}: {
  open: boolean;
  onClose: () => void;
  /** The popup. Focus starts at its first item. */
  containerRef: React.RefObject<HTMLElement | null>;
  /** Anything else a tap may land on without closing — the trigger, a twin. */
  extraRefs?: React.RefObject<HTMLElement | null>[];
  /** Focus returns here on Escape. Outside taps leave focus where it is. */
  triggerRef?: React.RefObject<HTMLElement | null>;
  /** False for small dropdowns, where arrows + Escape are the whole contract. */
  trap?: boolean;
}): void {
  const refs = [containerRef, ...(extraRefs ?? [])];

  useEffect(() => {
    if (!open) return;
    const container = containerRef.current;
    // Paint first: measuring a closed panel finds nothing focusable.
    const frame = requestAnimationFrame(() => {
      const first = container ? focusables(container)[0] : null;
      first?.focus({ preventScroll: true });
    });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        // Keyboard users stay in the header, on the button that opened this —
        // not dropped wherever the page happens to be.
        triggerRef?.current?.focus({ preventScroll: true });
        return;
      }
      if (!trap || e.key !== "Tab" || !container) return;
      const items = focusables(container);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    const onDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (refs.some((ref) => ref.current?.contains(target))) return;
      onClose();
    };
    document.addEventListener("keydown", onKey, true);
    document.addEventListener("pointerdown", onDown);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKey, true);
      document.removeEventListener("pointerdown", onDown);
    };
    // onClose is a stable closer from the caller; refs are stable objects.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, trap ]);
}

/** Arrow-key travel for `role="menu"` containers. Wraps at both ends. */
export function moveMenuFocus(container: HTMLElement | null, direction: 1 | -1): void {
  if (!container) return;
  const items = [...container.querySelectorAll<HTMLElement>('[role="menuitem"]')];
  if (!items.length) return;
  const at = items.indexOf(document.activeElement as HTMLElement);
  const next = items[(at + direction + items.length) % items.length] ?? items[0];
  next.focus();
}
