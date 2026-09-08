"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { CLAIM_PATTERN } from "@/lib/whatsapp/claim";
import { saveBrowserIntakeDraft } from "@/lib/intake/persistence";
import type { IntakeDraft } from "@/lib/intake/interview";

/**
 * Picking up an interview that started on WhatsApp.
 *
 * The link Kavach sends at the end of the chat is `/assist?wa=<token>`. This
 * trades that token for the draft behind it, writes it where the interview on
 * this page already looks for one, and takes the token out of the address bar.
 *
 * ── Why the token is spent from the browser and not on the server ───────────
 *
 * The obvious shape is a server component that reads the query, fetches the
 * draft and renders the interview with it. It is the wrong shape here: the
 * draft would then arrive in the HTML of a page whose URL contains the token,
 * and both would sit in whatever cache, history entry or shared screenshot the
 * link ended up in. Trading it from the client means the narrative arrives in a
 * POST body, and the token leaves the address bar a moment later.
 *
 * ── Why a spent token is not an error ───────────────────────────────────────
 *
 * It is single-use, so the second open of the same link — a refresh, a tap on
 * the WhatsApp preview, the link forwarded to a laptop — gets nothing back.
 * That is the normal case, not a failure: the draft is already in this
 * browser's storage from the first open. So a failed claim says nothing at all
 * and lets the interview carry on with whatever it already has. The only
 * person who sees a message is somebody whose browser has no draft either,
 * which is the one case where something really has gone missing.
 */
export function WhatsAppHandoff({ onDraft }: { onDraft?: (draft: IntakeDraft) => void }) {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("wa");
  const [lost, setLost] = useState(false);
  // Strict mode mounts effects twice in development, and this one spends a
  // single-use token. Without the guard the second run burns it and the first
  // run's draft is the only copy.
  const claimed = useRef(false);

  useEffect(() => {
    if (!token || claimed.current) return;
    if (!CLAIM_PATTERN.test(token)) return;
    claimed.current = true;

    let live = true;
    (async () => {
      try {
        const res = await fetch("/api/whatsapp/claim", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ token }),
        });
        if (!live) return;

        if (res.ok) {
          const { draft } = (await res.json()) as { draft: IntakeDraft };
          if (draft?.version === 1) {
            saveBrowserIntakeDraft(draft);
            onDraft?.(draft);
            // Straight to the question they are actually on. Landing them back
            // on "tell us what happened" after they just spent ten minutes
            // telling us on WhatsApp is the worst thing this could do.
            router.replace("/say/questions");
            return;
          }
        } else {
          // Already spent is indistinguishable from expired, on purpose. Only
          // say so if this browser has nothing of its own either.
          setLost(!localStorage.getItem("kavach.intake.v1"));
        }
      } catch {
        // A network failure is not a lost interview: this browser may already
        // hold the draft from the first open of the link.
        setLost(false);
      }

      // Out of the address bar: it is a credential, and by now it has either
      // been used or it is useless. Only reached when the claim did not
      // navigate away by itself.
      if (live) router.replace("/assist");
    })();

    return () => { live = false; };
  }, [token, router, onDraft]);

  if (!lost) return null;

  return (
    <p className="rounded-card border border-rule bg-urgent-soft px-4 py-3 text-[0.9375rem] leading-[1.5]">
      That link has already been opened once, and this browser does not have the
      interview saved. Nothing is lost — message us on WhatsApp again and we
      will send a fresh link, or start here and we will not ask you to repeat
      anything you have already sent.
    </p>
  );
}
