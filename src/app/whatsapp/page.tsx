import type { Metadata } from "next";

import { WhatsAppDemo } from "./WhatsAppDemo";

export const metadata: Metadata = {
  title: "Kavach on WhatsApp",
  description: "A working prototype of the Kavach interview running inside a WhatsApp conversation.",
};

export default function WhatsAppPage() {
  return <WhatsAppDemo />;
}
