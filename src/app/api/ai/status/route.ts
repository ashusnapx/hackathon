import { NextResponse } from "next/server";
import { MODEL, aiConfigured } from "@/lib/ai/provider";

/** Drives the honest "demo mode" banner rather than pretending AI ran. */
export function GET() {
  return NextResponse.json({ configured: aiConfigured, model: aiConfigured ? MODEL : null });
}
