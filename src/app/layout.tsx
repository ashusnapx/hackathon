import type { Metadata } from "next";
import { Inter, DM_Serif_Display, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { SmoothScrolling } from "@/components/SmoothScrolling";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const dmSerif = DM_Serif_Display({
  variable: "--font-dm-serif",
  weight: "400",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CyberComplaint — Report Cybercrime, Guided",
  description:
    "A simpler way to file cybercrime complaints in India. Auto-saved, guided, step-by-step. Built for stressed users on mobile.",
  keywords: [
    "cybercrime",
    "india",
    "complaint",
    "cyber crime",
    "report",
    "fraud",
    "UPI fraud",
    "online scam",
  ],
  openGraph: {
    title: "CyberComplaint — Report Cybercrime, Guided",
    description:
      "A simpler way to file cybercrime complaints in India. Auto-saved, guided, step-by-step.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${dmSerif.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <SmoothScrolling>{children}</SmoothScrolling>
      </body>
    </html>
  );
}
