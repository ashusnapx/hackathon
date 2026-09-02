"use client";

import Image from "next/image";
import { BrandIcon } from "@/components/ui/BrandIcon";
import { useT } from "@/lib/i18n/context";

/**
 * Who built this.
 *
 * Two portraits, no biographies. A hackathon submission benefits from a face
 * against the work, but a landing page that has just been cut in half does not
 * need a paragraph each.
 *
 * The portraits are duotoned toward the accent so two photographs taken on
 * different phones in different light sit together and belong to the page.
 * Colour returns on hover, which is the one place on this site where a purely
 * decorative interaction is fair: it is a person, not a deadline.
 */

interface Person {
  name: string;
  photo: string | null;
  /** Exposure match against the other portraits. See `--lift` in globals.css. */
  lift?: number;
  links: { name: string; href: string; label: string }[];
}

const HANDLE = "ashusnapx";

const PEOPLE: Person[] = [
  {
    name: "Ashutosh Kumar",
    photo: "/team/ashutosh.jpg",
    links: [
      { name: "github", href: `https://github.com/${HANDLE}`, label: "GitHub" },
      { name: "x", href: `https://x.com/${HANDLE}`, label: "X" },
      { name: "linkedin", href: `https://www.linkedin.com/in/${HANDLE}`, label: "LinkedIn" },
      { name: "instagram", href: `https://instagram.com/${HANDLE}`, label: "Instagram" },
    ],
  },
  {
    name: "Kaustubh Tripathi",
    photo: "/team/kaustubh.jpg",
    // Shot indoors under warm light, so it needs lifting to sit beside the
    // other. Tuned against the dark footer, where both portraits now sit.
    lift: 1.16,
    links: [{ name: "github", href: "https://github.com/ktripathi2281", label: "GitHub" }],
  },
];

const initials = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

export function Builders() {
  const t = useT();

  return (
    <div id="builders" className="lg:min-w-[17rem]">
      <p className="label">{t("built.label")}</p>
      <div className="mt-5 flex flex-col gap-6">
          {PEOPLE.map((p, i) => (
            <div
              key={p.name}
              className="flex items-center gap-5"
              data-reveal
              style={{ "--i": i, "--lift": p.lift } as React.CSSProperties}
            >
              <span className="portrait shrink-0">
                {p.photo ? (
                  <Image
                    src={p.photo}
                    alt={p.name}
                    width={112}
                    height={112}
                    className="w-[5.5rem] h-[5.5rem] sm:w-24 sm:h-24 rounded-full object-cover"
                    sizes="96px"
                  />
                ) : (
                  <span
                    className="grid place-items-center w-[5.5rem] h-[5.5rem] sm:w-24 sm:h-24 rounded-full bg-raised figure text-2xl text-ink-2"
                    aria-hidden
                  >
                    {initials(p.name)}
                  </span>
                )}
              </span>

              <div className="min-w-0">
                <p className="text-[1.25rem] leading-tight">{p.name}</p>
                <p className="mt-1 text-sm text-ink-3">{t("built.role")}</p>

                {p.links.length > 0 && (
                  <ul className="mt-2.5 flex items-center gap-1">
                    {p.links.map((l) => (
                      <li key={l.name}>
                        <a
                          href={l.href}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={`${p.name} on ${l.label}`}
                          title={l.label}
                          className="press grid place-items-center w-9 h-9 -m-0.5 rounded-full text-ink-3 hover:text-ink focus-visible:text-ink transition-colors"
                        >
                          <BrandIcon name={l.name} className="w-[1.15rem] h-[1.15rem]" />
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ))}
        </div>
    </div>
  );
}
