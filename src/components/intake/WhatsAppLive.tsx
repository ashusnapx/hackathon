import { Button } from "@/components/ui/Button";

/**
 * The way in to the real thing, shown only when there is a real thing.
 *
 * `NEXT_PUBLIC_WHATSAPP_NUMBER` is the business number in international format.
 * It is deliberately the only part of this integration that is public: the
 * token, the app secret and the phone *number id* are server-side, and this is
 * just the number anybody could read off a poster.
 *
 * When it is unset this renders nothing, and /whatsapp keeps saying it is a
 * replica — which is the honest thing for a deployment with no credentials, and
 * is why the claim lives in the environment rather than in the copy.
 */
export function WhatsAppLive({
  title, body, cta, note,
}: { title: string; body: string; cta: string; note: string }) {
  const number = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.replace(/\D/g, "");
  if (!number) return null;

  // A prefilled first message, so the conversation opens on the person's terms
  // rather than on a blank thread they have to think of an opening line for.
  const href = `https://wa.me/${number}?text=${encodeURIComponent("Hi Kavach, I need help with an online fraud.")}`;

  return (
    <section className="mt-6 rounded-card border border-rule bg-raised p-5 sm:p-6">
      <div className="flex items-center gap-2.5">
        <span className="relative flex h-2 w-2 shrink-0" aria-hidden>
          <span className="absolute inline-flex h-full w-full rounded-full bg-done opacity-70 pulse-ring" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-done" />
        </span>
        <h2 className="text-[1.25rem] leading-tight">{title}</h2>
      </div>

      <p className="mt-3 text-[0.9375rem] leading-[1.55] text-ink-2">{body}</p>

      <Button href={href} external size="lg" className="press mt-5">
        {cta}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden className="rtl:-scale-x-100">
          <path d="M7 17L17 7M9 7h8v8" />
        </svg>
      </Button>

      <p className="mt-4 text-[0.8125rem] leading-[1.5] text-ink-3">{note}</p>
    </section>
  );
}
