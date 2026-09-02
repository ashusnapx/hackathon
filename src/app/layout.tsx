import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import {
  Caveat,
  EB_Garamond,
  Figtree,
  JetBrains_Mono,
  Noto_Sans_Arabic,
  Noto_Sans_Bengali,
  Noto_Sans_Devanagari,
  Noto_Sans_Gujarati,
  Noto_Sans_Gurmukhi,
  Noto_Sans_Kannada,
  Noto_Sans_Malayalam,
  Noto_Sans_Meetei_Mayek,
  Noto_Sans_Ol_Chiki,
  Noto_Sans_Oriya,
  Noto_Sans_Tamil,
  Noto_Sans_Telugu,
} from "next/font/google";
import "./globals.css";
import { I18nProvider } from "@/lib/i18n/context";
import { LANG_COOKIE, SCRIPT_CLASS, getLanguage } from "@/lib/i18n/languages";
import { SITE_URL, pageMetadata } from "@/lib/seo";

/* Figtree for everything a person has to operate, EB Garamond for everything
   the page says. The pairing is lifted wholesale from the reference the design
   is built against; both are open licence and both are on Google Fonts, so the
   whole stack still self-hosts through next/font with no third-party request. */
const ui = Figtree({
  variable: "--font-ui",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});
/* Italic is not decoration here — it is the only emphasis mechanism the display
   face gets, so it has to load with the roman. */
const serif = EB_Garamond({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
  display: "swap",
});
const mono = JetBrains_Mono({ variable: "--font-mono-ui", subsets: ["latin"], display: "swap" });
/* The pen in the margin. Decorative only — never the sole carrier of meaning,
   so it can load late without holding anything up. */
const hand = Caveat({ variable: "--font-hand", weight: ["500", "600"], subsets: ["latin"], display: "swap" });

/**
 * One Noto family per script. `preload: false` matters: a citizen reading in
 * Tamil should not pay for the Malayalam font, and the browser only fetches a
 * family once a rule actually matches rendered text.
 */
const devanagari = Noto_Sans_Devanagari({ variable: "--font-devanagari", subsets: ["devanagari"], weight: ["400", "600"], display: "swap", preload: false });
const bengali = Noto_Sans_Bengali({ variable: "--font-bengali", subsets: ["bengali"], weight: ["400", "600"], display: "swap", preload: false });
const gujarati = Noto_Sans_Gujarati({ variable: "--font-gujarati", subsets: ["gujarati"], weight: ["400", "600"], display: "swap", preload: false });
const gurmukhi = Noto_Sans_Gurmukhi({ variable: "--font-gurmukhi", subsets: ["gurmukhi"], weight: ["400", "600"], display: "swap", preload: false });
const kannada = Noto_Sans_Kannada({ variable: "--font-kannada", subsets: ["kannada"], weight: ["400", "600"], display: "swap", preload: false });
const malayalam = Noto_Sans_Malayalam({ variable: "--font-malayalam", subsets: ["malayalam"], weight: ["400", "600"], display: "swap", preload: false });
const odia = Noto_Sans_Oriya({ variable: "--font-odia", subsets: ["oriya"], weight: ["400", "600"], display: "swap", preload: false });
const tamil = Noto_Sans_Tamil({ variable: "--font-tamil", subsets: ["tamil"], weight: ["400", "600"], display: "swap", preload: false });
const telugu = Noto_Sans_Telugu({ variable: "--font-telugu", subsets: ["telugu"], weight: ["400", "600"], display: "swap", preload: false });
const arabic = Noto_Sans_Arabic({ variable: "--font-arabic", subsets: ["arabic"], weight: ["400", "600"], display: "swap", preload: false });
const meetei = Noto_Sans_Meetei_Mayek({ variable: "--font-meetei", subsets: ["meetei-mayek"], weight: ["400", "600"], display: "swap", preload: false });
const olchiki = Noto_Sans_Ol_Chiki({ variable: "--font-olchiki", subsets: ["ol-chiki"], weight: ["400", "600"], display: "swap", preload: false });

const FONT_VARS = [
  ui, serif, mono, hand, devanagari, bengali, gujarati, gurmukhi, kannada,
  malayalam, odia, tamil, telugu, arabic, meetei, olchiki,
]
  .map((f) => f.variable)
  .join(" ");

export const metadata: Metadata = {
  ...pageMetadata({
    title: "Kavach — the first hour, and the ninety days after",
    description:
      "Speak in your language. We write the complaint, the bank letter and the FIR application, and track every deadline.",
  }),
  title: {
    default: "Kavach — the first hour, and the ninety days after",
    template: "%s · Kavach",
  },
  description:
    "Report cybercrime in India in any of 23 languages. Kavach turns what you say into the NCRP complaint, the letter to your bank and the FIR application — and counts down all ten legal deadlines nobody tells victims about.",
  applicationName: "Kavach",
  keywords: ["cybercrime", "India", "NCRP", "1930", "cyber fraud", "UPI fraud", "FIR", "RBI", "digital arrest"],
  metadataBase: new URL(SITE_URL),
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffeb" },
    { media: "(prefers-color-scheme: dark)", color: "#141410" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Read the language on the server so the first paint is already correct —
  // no flash of English for someone who chose Tamil last week.
  const stored = (await cookies()).get(LANG_COOKIE)?.value;
  const lang = getLanguage(stored);

  return (
    <html
      lang={lang.code}
      dir={lang.dir}
      data-script={lang.script}
      // Light is the canonical look. GIGW 3.0 is written around a light,
      // high-contrast surface, and the people this is for are reading in
      // daylight on cheap screens — the design is judged there, not on a
      // developer's dark monitor.
      data-theme="light"
      className={`${FONT_VARS} ${SCRIPT_CLASS[lang.script]}`}
      suppressHydrationWarning
    >
      <body className="min-h-dvh antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:bg-ink focus:text-paper focus:px-4 focus:py-2 focus:rounded"
        >
          Skip to content
        </a>
        <I18nProvider initial={lang.code}>{children}</I18nProvider>
      </body>
    </html>
  );
}
