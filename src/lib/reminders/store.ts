import fs from "fs";
import path from "path";
import type { TrackId } from "@/lib/case/types";

export interface ReminderEntry {
  id: string;
  caseId: string;
  caseRef: string;
  email: string;
  /** Which tracks to remind for. Empty = all applicable. */
  trackIds: TrackId[];
  /** ISO date — when the case incident happened. */
  incidentAt: string;
  /** ISO date — when the bank alert was received (for bank-notice clock). */
  bankAlertAt?: string;
  /** Tracks already reminded for, to avoid duplicates. */
  reminded: Record<string, string>; // trackId -> last reminded ISO
  createdAt: string;
}

const DATA_DIR = path.join(process.cwd(), ".kavach-data");
const FILE = path.join(DATA_DIR, "reminders.json");

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readAll(): ReminderEntry[] {
  try {
    ensureDir();
    if (!fs.existsSync(FILE)) return [];
    return JSON.parse(fs.readFileSync(FILE, "utf-8")) as ReminderEntry[];
  } catch {
    return [];
  }
}

function writeAll(entries: ReminderEntry[]) {
  ensureDir();
  fs.writeFileSync(FILE, JSON.stringify(entries, null, 2));
}

export function addReminder(entry: Omit<ReminderEntry, "id" | "reminded" | "createdAt">): ReminderEntry {
  const all = readAll();
  // Upsert: if same caseId + email, update instead of duplicate
  const existing = all.findIndex((r) => r.caseId === entry.caseId && r.email === entry.email);
  const full: ReminderEntry = {
    ...entry,
    id: existing >= 0 ? all[existing].id : crypto.randomUUID(),
    reminded: existing >= 0 ? all[existing].reminded : {},
    createdAt: existing >= 0 ? all[existing].createdAt : new Date().toISOString(),
  };
  if (existing >= 0) all[existing] = full;
  else all.push(full);
  writeAll(all);
  return full;
}

export function getReminders(): ReminderEntry[] {
  return readAll();
}

export function markReminded(caseId: string, trackId: string, at: string) {
  const all = readAll();
  const entry = all.find((r) => r.caseId === caseId);
  if (entry) {
    entry.reminded[trackId] = at;
    writeAll(all);
  }
}

export function removeReminder(caseId: string, email: string) {
  const all = readAll().filter((r) => !(r.caseId === caseId && r.email === email));
  writeAll(all);
}
