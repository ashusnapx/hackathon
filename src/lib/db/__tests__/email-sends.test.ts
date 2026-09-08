import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * The rule this table exists to enforce: one email per case per reason, decided
 * by whether the insert won rather than by anything a caller remembered.
 *
 * The failure it replaced is worth restating, because these tests are the guard
 * against it coming back. Both of Kavach's unprompted emails were guarded by a
 * record kept somewhere that was routinely overwritten — one in a browser's
 * local storage, one inside the case document the browser itself rewrites — so
 * both repeated, one of them on every tap between a case and its steps.
 */

const upsert = vi.fn();
const del = vi.fn();
const configured = vi.fn(() => true);

vi.mock("../supabase", () => ({
  databaseConfigured: () => configured(),
  database: () => ({
    from: () => ({
      upsert: (...args: unknown[]) => upsert(...args),
      delete: () => del(),
    }),
  }),
}));

const { claimEmailSend, releaseEmailSend, forgetEmailSends, reminderKind } =
  await import("../email-sends");

/** `.select()` is what reports the rows an ON CONFLICT DO NOTHING inserted. */
function inserted(rows: unknown[]) {
  return { select: () => Promise.resolve({ data: rows, error: null }) };
}
function refused(message: string) {
  return { select: () => Promise.resolve({ data: null, error: { message } }) };
}

afterEach(() => {
  vi.clearAllMocks();
  configured.mockReturnValue(true);
});

describe("claiming the right to send one email", () => {
  it("grants the claim when the row was actually inserted", async () => {
    upsert.mockReturnValue(inserted([{ kind: "case-created" }]));
    await expect(claimEmailSend("case-1", "case-created", "a@b.com")).resolves.toBe(true);
  });

  it("refuses the second caller, so a duplicate is never sent", async () => {
    // ON CONFLICT DO NOTHING inserts nothing and selects nothing back.
    upsert.mockReturnValue(inserted([]));
    await expect(claimEmailSend("case-1", "case-created", "a@b.com")).resolves.toBe(false);
  });

  it("claims on the primary key, ignoring rather than overwriting a duplicate", async () => {
    upsert.mockReturnValue(inserted([]));
    await claimEmailSend("case-1", "case-created", "a@b.com");
    expect(upsert).toHaveBeenCalledWith(
      { case_id: "case-1", kind: "case-created", to_email: "a@b.com" },
      { onConflict: "case_id,kind", ignoreDuplicates: true },
    );
  });

  it("separates a case's reminders from each other and from its reference", async () => {
    upsert.mockReturnValue(inserted([{ kind: "x" }]));
    await claimEmailSend("case-1", reminderKind("ombudsman"), "a@b.com");
    await claimEmailSend("case-1", reminderKind("bank-notice"), "a@b.com");
    expect(upsert.mock.calls.map((call) => (call[0] as { kind: string }).kind))
      .toEqual(["reminder:ombudsman", "reminder:bank-notice"]);
  });

  it("sends anyway when there is no database to ask", async () => {
    configured.mockReturnValue(false);
    await expect(claimEmailSend("case-1", "case-created", "a@b.com")).resolves.toBe(true);
    expect(upsert).not.toHaveBeenCalled();
  });

  it("sends anyway when the database refuses", async () => {
    // Failing open on purpose: a person whose money left an hour ago and never
    // receives their reference is worse off than one who receives it twice.
    upsert.mockReturnValue(refused("relation does not exist"));
    await expect(claimEmailSend("case-1", "case-created", "a@b.com")).resolves.toBe(true);
  });
});

describe("giving a claim back", () => {
  it("deletes only that case's claim for that reason", async () => {
    const eq = vi.fn().mockReturnThis();
    del.mockReturnValue({ eq });
    await releaseEmailSend("case-1", "case-created");
    expect(eq).toHaveBeenCalledWith("case_id", "case-1");
    expect(eq).toHaveBeenCalledWith("kind", "case-created");
  });

  it("stays quiet when the delete fails, rather than failing the request", async () => {
    del.mockImplementation(() => { throw new Error("gone"); });
    await expect(releaseEmailSend("case-1", "case-created")).resolves.toBeUndefined();
  });
});

describe("forgetting a deleted case", () => {
  it("sweeps every kind for that case, because the rows hold an address", async () => {
    const eq = vi.fn().mockResolvedValue({ error: null });
    del.mockReturnValue({ eq });
    await forgetEmailSends("case-1");
    expect(eq).toHaveBeenCalledWith("case_id", "case-1");
    expect(eq).toHaveBeenCalledTimes(1);
  });
});
