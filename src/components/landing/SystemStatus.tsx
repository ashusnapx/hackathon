"use client";

import { useCallback, useEffect, useState } from "react";
import { useT } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";

/**
 * A live status line for the things this product runs on.
 *
 * It is in the footer rather than on an admin page because the claim it makes
 * is a public one: Kavach asks people to hand over the worst hour of their year
 * and tells them what is real and what is mocked. Saying out loud when a piece
 * of it is down belongs in the same paragraph.
 *
 * It never explains a failure. The dot goes amber, and that is all a stranger
 * learns — which service, not which key, which host or which error.
 */

type ServiceId = "database" | "ai" | "voice" | "email";
type ServiceState = "up" | "down" | "off";

interface Service { id: ServiceId; state: ServiceState; ms: number | null }
interface Report { status: "up" | "degraded" | "down" | "idle"; checkedAt: string; services: Service[] }

const LABELS: Record<ServiceId, string> = {
  database: "status.database",
  ai: "status.ai",
  voice: "status.voice",
  email: "status.email",
};

const REFRESH_MS = 60_000;

export function SystemStatus() {
  const t = useT();
  const [report, setReport] = useState<Report | null>(null);
  const [failed, setFailed] = useState(false);
  const [checkedLabel, setCheckedLabel] = useState("");

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/health", { cache: "no-store" });
      if (!response.ok) throw new Error("health-unavailable");
      const data = await response.json() as Report;
      setReport(data);
      setFailed(false);
      // Formatted in an effect, never during render: the server has a different
      // clock and a different locale, and this is not worth a hydration warning.
      setCheckedLabel(new Date(data.checkedAt).toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
      }));
    } catch {
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    // Deferred, like every other read of an external system on this site: the
    // first paint of the footer must not wait on four network probes.
    queueMicrotask(() => { void load(); });
    // Only while somebody is looking. A backgrounded tab polling all night is
    // how a status board becomes the thing generating the load.
    const timer = globalThis.setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, REFRESH_MS);
    return () => globalThis.clearInterval(timer);
  }, [load]);

  const headline = failed
    ? t("status.unknown")
    : !report
      ? `${t("status.checking")}…`
      : report.status === "up"
        ? t("status.up")
        : report.status === "degraded"
          ? t("status.degraded")
          : report.status === "down"
            ? t("status.down")
            : t("status.idle");

  return (
    <section
      className="mt-12 border-t border-rule pt-8"
      aria-label={t("status.title")}
    >
      <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
        <p className="label">{t("status.title")}</p>
        <p role="status" aria-live="polite" className="text-sm text-ink-2">
          {headline}
          {checkedLabel && !failed && (
            <span className="text-ink-3"> · {t("status.checked")} {checkedLabel}</span>
          )}
        </p>
      </div>

      <ul className="mt-5 flex flex-wrap gap-x-8 gap-y-3">
        {(Object.keys(LABELS) as ServiceId[]).map((id) => {
          const service = report?.services.find((item) => item.id === id);
          return (
            <li key={id} className="flex items-center gap-2.5 text-sm">
              <Dot state={failed ? "down" : service?.state} />
              <span className="text-ink-2">{t(LABELS[id] as Parameters<typeof t>[0])}</span>
              {service?.state === "off" && (
                <span className="text-xs text-ink-3">{t("status.off")}</span>
              )}
              {service?.state === "up" && service.ms !== null && (
                <span className="num text-xs text-ink-3">{service.ms}ms</span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Dot({ state }: { state?: ServiceState }) {
  return (
    <span
      className={cn(
        "h-2 w-2 shrink-0 rounded-full",
        state === "up" ? "bg-done"
          : state === "down" ? "bg-urgent"
            : state === "off" ? "bg-ink-3/40"
              : "bg-ink-3/40 animate-pulse",
      )}
      aria-hidden
    />
  );
}
