"use client";

import { useEffect, useState } from "react";
import { freezeChance, windowPhase } from "@/lib/case/time";
import { useI18n } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";

/**
 * The product's one piece of chart.
 *
 * It plots the real thing at stake — the chance of the money being frozen —
 * against how long it has been since the fraud, and puts a marker where this
 * citizen actually is on that curve. A countdown to an abstract deadline does
 * not communicate loss; a curve falling off a cliff does.
 */

const HOURS = 48;
const W = 560;
const H = 150;

function curvePath(): { area: string; line: string } {
  const pts: [number, number][] = [];
  for (let i = 0; i <= 120; i++) {
    const hours = (i / 120) * HOURS;
    const x = (i / 120) * W;
    const y = H - freezeChance(hours * 60) * (H / 0.55);
    pts.push([x, y]);
  }
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  return { line, area: `${line} L${W} ${H} L0 ${H} Z` };
}

const { line, area } = curvePath();

export function RecoveryWindow({ incidentAt }: { incidentAt: string }) {
  const { t } = useI18n();
  const [now, setNow] = useState(() => Date.now());

  // One tick a minute. The number has to be alive for the urgency to land, but
  // a per-second repaint on a low-end phone is a waste of battery.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const minutes = Math.max(0, (now - new Date(incidentAt).getTime()) / 60_000);
  const chance = freezeChance(minutes);
  const phase = windowPhase(minutes);

  const clampedHours = Math.min(minutes / 60, HOURS);
  const markX = (clampedHours / HOURS) * W;
  const markY = H - chance * (H / 0.55);

  const tone = {
    strong: "text-urgent",
    fading: "text-wait",
    late: "text-ink-2",
    expired: "text-ink-3",
  }[phase];

  const headline = { strong: "window.strong", fading: "window.fading", late: "window.late", expired: "window.expired" } as const;
  const sub = { strong: "window.sub.strong", fading: "window.sub.fading", late: "window.sub.late", expired: "window.sub.late" } as const;

  const elapsed =
    minutes < 60
      ? `${Math.floor(minutes)} min`
      : minutes < 1440
        ? `${Math.floor(minutes / 60)} hr ${Math.floor(minutes % 60)} min`
        : `${Math.floor(minutes / 1440)} days`;

  return (
    <section className="sheet overflow-hidden" aria-label={t("window.title")}>
      <div className="px-5 pt-5 pb-4 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="label">{t("window.title")}</p>
          <h3 className={cn("mt-1.5 text-2xl", tone)}>{t(headline[phase])}</h3>
          <p className="mt-2 text-[0.9375rem] text-ink-2 leading-snug max-w-md">{t(sub[phase])}</p>
        </div>

        <div className="text-end shrink-0">
          <div className={cn("num text-5xl leading-none font-medium tracking-tight", tone)}>
            {Math.round(chance * 100)}
            <span className="text-2xl align-top">%</span>
          </div>
          <p className="mt-1.5 text-xs text-ink-3 max-w-[9rem] leading-tight ms-auto">{t("window.chance")}</p>
        </div>
      </div>

      <div className="relative px-1">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-[150px]"
          preserveAspectRatio="none"
          role="img"
          aria-label={`${Math.round(chance * 100)} percent chance of freezing funds, ${elapsed} after the incident`}
        >
          <defs>
            <linearGradient id="rw-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--urgent)" stopOpacity="0.20" />
              <stop offset="100%" stopColor="var(--urgent)" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {/* Hour gridlines at 1, 6, 12, 24 — the thresholds people are told about. */}
          {[1, 6, 12, 24].map((h) => (
            <line
              key={h}
              x1={(h / HOURS) * W}
              y1={0}
              x2={(h / HOURS) * W}
              y2={H}
              stroke="var(--rule)"
              strokeDasharray="2 4"
            />
          ))}

          <path d={area} fill="url(#rw-fill)" />
          <path d={line} fill="none" stroke="var(--urgent)" strokeWidth="1.75" vectorEffect="non-scaling-stroke" />

          <line x1={markX} y1={0} x2={markX} y2={H} stroke="var(--ink)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          <circle cx={markX} cy={markY} r="4.5" fill="var(--paper)" stroke="var(--ink)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        </svg>

        <div className="flex justify-between px-4 pb-3 -mt-1 text-[0.6875rem] num text-ink-3">
          <span>0h</span><span>1h</span><span>6h</span><span>12h</span><span>24h</span><span>48h</span>
        </div>
      </div>

      <div className="px-5 py-3 border-t border-rule bg-sunk flex items-baseline gap-2">
        <span className="num text-lg font-medium">{elapsed}</span>
        <span className="text-sm text-ink-3">{t("window.elapsed")}</span>
      </div>
    </section>
  );
}
