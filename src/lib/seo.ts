import type { Metadata } from "next";

/**
 * One place that knows how a Kavach link should look when it is pasted.
 *
 * This exists because of a specific Next behaviour: metadata merges shallowly,
 * and nested objects like `openGraph` are *overwritten* by the deepest segment
 * that defines them rather than merged into. A route that sets nothing but its
 * own `openGraph.title` therefore silently drops the image, the site name and
 * the locale from the root layout. Every route builds its card through
 * `pageMetadata` so that cannot happen by omission.
 *
 * The image is a real PNG. It was an SVG, which is the reason previews were
 * blank everywhere: Facebook, WhatsApp, X, LinkedIn, Slack, iMessage, Telegram
 * and Discord all refuse `image/svg+xml` and fall back to a bare link, without
 * reporting an error anywhere a developer would look.
 */

export const SITE_URL = "https://cybercrime-assistant.vercel.app";
export const SITE_NAME = "Kavach";

const OG_IMAGE = {
  url: "/og-image.png",
  width: 1200,
  height: 630,
  /* Stated explicitly. Some crawlers use `og:image:type` to decide whether the
     image is worth fetching at all, and getting this wrong is what the bug was. */
  type: "image/png",
  alt: "Kavach. You have sixty minutes, and we know exactly what to do with them.",
} as const;

interface Page {
  /** Appears in the tab and, with the template applied, on the card. */
  title: string;
  /** One or two sentences. Shown under the title in every preview. */
  description: string;
  /** Path, for the canonical and og:url. Omit for the home page. */
  path?: string;
  /** Keep a page out of search results without hiding it from link unfurlers. */
  noIndex?: boolean;
}

export function pageMetadata({ title, description, path = "", noIndex }: Page): Metadata {
  const url = `${SITE_URL}${path}`;
  /* The root layout's template appends " · Kavach", but og:title is consumed
     raw by every platform, so the suffix has to be applied by hand here. */
  const social = path ? `${title} · ${SITE_NAME}` : title;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: social,
      description,
      url,
      siteName: SITE_NAME,
      type: "website",
      locale: "en_IN",
      images: [OG_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title: social,
      description,
      images: [OG_IMAGE.url],
    },
    ...(noIndex ? { robots: { index: false, follow: true } } : {}),
  };
}
