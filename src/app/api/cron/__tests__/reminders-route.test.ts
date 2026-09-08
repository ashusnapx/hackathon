import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The nightly job that says a date has arrived, and the rule it now enforces:
 * one email per step per case, decided by a claim rather than by a stamp.
 *
 * The stamp could not work. It was written into the case document itself, and
 * the browser — which is the author of that document and has never heard of the
 * field — erased it with the next edit the person made. The following night's
 * run found no stamp and sent the same reminder again.
 *
 * The scheduling itself is not retested here; `liveTracks` and `daysLeftFor`
 * have their own tests, and mocking them keeps these about the decision the
 * route makes once a step is known to be due.
 */

interface Owned { caseId: string; caseKey: string; email: string }

const everyOwnedCase =
  vi.fn<() => Promise<Owned[]>>(async () => [{ caseId: "case-1", caseKey: "k", email: "a@b.com" }]);
const readCaseRow = vi.fn<(id: string, hash: string) => Promise<unknown>>(
  async () => ({ data: CASE, revision: 1, updatedAt: "" }),
);
const sendReminderEmail = vi.fn<(to: string, input: unknown) => Promise<{ sent: boolean; reason?: string }>>(
  async () => ({ sent: true }),
);
const claimEmailSend =
  vi.fn<(caseId: string, kind: string, to: string) => Promise<boolean>>(async () => true);
const releaseEmailSend = vi.fn<(caseId: string, kind: string) => Promise<void>>(async () => {});
const daysLeft = vi.fn<() => { days: number } | null>(() => ({ days: 0 }));

const CASE = {
  ref: "KVC-L4ZN-45RQ",
  tracks: [{ id: "ncrp", state: "todo" }],
  remindedAt: undefined as Record<string, string> | undefined,
};

const TRACK = {
  state: "todo",
  deadline: new Date("2026-09-08"),
  def: { id: "ombudsman", titleKey: "track.ombudsman", dueKey: "track.ombudsmanDue" },
};

vi.mock("@/lib/db/case-owners", () => ({ everyOwnedCase: () => everyOwnedCase() }));
vi.mock("@/lib/db/cases", () => ({ readCaseRow: (id: string, hash: string) => readCaseRow(id, hash) }));
vi.mock("@/lib/db/email-sends", () => ({
  claimEmailSend: (caseId: string, kind: string, to: string) => claimEmailSend(caseId, kind, to),
  releaseEmailSend: (caseId: string, kind: string) => releaseEmailSend(caseId, kind),
  reminderKind: (id: string) => `reminder:${id}`,
}));
vi.mock("@/lib/email/send", () => ({
  emailConfigured: () => true,
  sendReminderEmail: (to: string, input: unknown) => sendReminderEmail(to, input),
}));
vi.mock("@/lib/case/tracks", () => ({ liveTracks: () => [TRACK] }));
vi.mock("@/lib/case/days-left", () => ({ daysLeftFor: () => daysLeft() }));

const { GET } = await import("../reminders/route");

function run() {
  return GET(new Request("https://kavach.test/api/cron/reminders", {
    headers: { authorization: "Bearer test-secret" },
  }));
}

beforeEach(() => {
  process.env.CRON_SECRET = "test-secret";
  CASE.remindedAt = undefined;
  claimEmailSend.mockResolvedValue(true);
  sendReminderEmail.mockResolvedValue({ sent: true });
  daysLeft.mockReturnValue({ days: 0 });
  readCaseRow.mockResolvedValue({ data: CASE, revision: 1, updatedAt: "" });
});
afterEach(() => vi.clearAllMocks());

describe("one reminder per step, ever", () => {
  it("claims the step before mailing about it", async () => {
    const response = await run();

    expect(claimEmailSend).toHaveBeenCalledWith("case-1", "reminder:ombudsman", "a@b.com");
    expect(sendReminderEmail).toHaveBeenCalledOnce();
    expect(await response.json()).toMatchObject({ sent: 1 });
  });

  it("stays quiet on the second night, when the step is still due", async () => {
    // The exact case that repeated: due today and still due tomorrow.
    claimEmailSend.mockResolvedValue(false);
    const response = await run();

    expect(sendReminderEmail).not.toHaveBeenCalled();
    expect(await response.json()).toMatchObject({ sent: 0, skipped: 1 });
  });

  it("hands the claim back when the message could not be delivered", async () => {
    sendReminderEmail.mockResolvedValue({ sent: false, reason: "send-failed" });
    await run();

    // A night lost, not the message: tomorrow's run may claim it again.
    expect(releaseEmailSend).toHaveBeenCalledWith("case-1", "reminder:ombudsman");
  });

  it("still honours a stamp left by the old scheme", async () => {
    // Nothing writes `remindedAt` now. It is read so that a case stamped before
    // the change does not get one duplicate on the way past.
    CASE.remindedAt = { ombudsman: "2026-09-01T00:00:00.000Z" };
    await run();

    expect(claimEmailSend).not.toHaveBeenCalled();
    expect(sendReminderEmail).not.toHaveBeenCalled();
  });

  it("claims nothing for a step that is not due yet", async () => {
    daysLeft.mockReturnValue({ days: 4 });
    await run();

    expect(claimEmailSend).not.toHaveBeenCalled();
  });

  it("claims nothing for a step with no date at all", async () => {
    // Most of the ten are urgent without being time-barred. Inventing a due
    // date to have something to send would be the worst use of somebody's
    // trust this product could make.
    daysLeft.mockReturnValue(null);
    await run();

    expect(sendReminderEmail).not.toHaveBeenCalled();
  });
});

describe("who may trigger a night's mail", () => {
  it("refuses without the shared secret", async () => {
    const response = await GET(new Request("https://kavach.test/api/cron/reminders"));
    expect(response.status).toBe(401);
    expect(claimEmailSend).not.toHaveBeenCalled();
  });

  it("refuses to run at all when no secret is configured", async () => {
    delete process.env.CRON_SECRET;
    const response = await run();

    // Open would be a way to make Kavach mail its own users on demand.
    expect(response.status).toBe(503);
  });
});
