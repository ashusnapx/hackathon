import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The route that mails somebody their case reference, and the rule it now
 * enforces: exactly one of these per case, whoever asks and however often.
 *
 * It is asked often. The sender is mounted on every case screen — it has to be,
 * because that is the only place with both a case and an address — so this is
 * called again on every move between a case and its steps, from every device
 * the person is signed in on, and from both tabs when they have two open. The
 * bug these tests exist to prevent was exactly that: a person tapping through
 * four steps received four copies of the same email.
 */

type SendResult = { sent: true } | { sent: false; reason: string };

const currentUser = vi.fn<() => Promise<{ email: string } | null>>(async () => null);
const emailConfigured = vi.fn<() => boolean>(() => true);
const sendCaseCreatedEmail =
  vi.fn<(to: string, input: unknown) => Promise<SendResult>>(async () => ({ sent: true }));
const claimEmailSend =
  vi.fn<(caseId: string, kind: string, to: string) => Promise<boolean>>(async () => true);
const releaseEmailSend = vi.fn<(caseId: string, kind: string) => Promise<void>>(async () => {});

vi.mock("@/lib/auth/server", () => ({ currentUser: () => currentUser() }));
vi.mock("@/lib/email/send", () => ({
  emailConfigured: () => emailConfigured(),
  sendCaseCreatedEmail: (to: string, input: unknown) => sendCaseCreatedEmail(to, input),
}));
vi.mock("@/lib/db/email-sends", () => ({
  claimEmailSend: (caseId: string, kind: string, to: string) => claimEmailSend(caseId, kind, to),
  releaseEmailSend: (caseId: string, kind: string) => releaseEmailSend(caseId, kind),
}));

const { POST } = await import("../case-created/route");

const CASE_ID = "12719252-ce8b-4550-8b1d-8eb3266e24ab";
const REF = "KVC-L4ZN-45RQ";

function ask(body: Record<string, unknown>) {
  return POST(new Request("https://kavach.test/api/email/case-created", {
    method: "POST",
    headers: { "Content-Type": "application/json", origin: "https://kavach.test" },
    body: JSON.stringify(body),
  }));
}

const valid = { to: "victim@example.com", ref: REF, caseId: CASE_ID };

beforeEach(() => {
  currentUser.mockResolvedValue(null);
  emailConfigured.mockReturnValue(true);
  sendCaseCreatedEmail.mockResolvedValue({ sent: true });
  claimEmailSend.mockResolvedValue(true);
});
afterEach(() => vi.clearAllMocks());

describe("one email per case, ever", () => {
  it("claims the send before making it", async () => {
    await ask(valid);
    expect(claimEmailSend).toHaveBeenCalledWith(CASE_ID, "case-created", "victim@example.com");
    expect(sendCaseCreatedEmail).toHaveBeenCalledOnce();
  });

  it("sends nothing when somebody else already holds the claim", async () => {
    claimEmailSend.mockResolvedValue(false);
    const response = await ask(valid);

    expect(await response.json()).toEqual({ sent: false, reason: "already-sent" });
    expect(sendCaseCreatedEmail).not.toHaveBeenCalled();
    // 200, not an error: a second screen asking is ordinary, not a fault.
    expect(response.status).toBe(200);
  });

  it("hands the claim back when delivery fails, so it can be retried", async () => {
    // Without this, one refused SMTP connection would silence this case's
    // reference permanently — a claim recording a message that never left.
    sendCaseCreatedEmail.mockResolvedValue({ sent: false, reason: "send-failed" });
    const response = await ask(valid);

    expect(releaseEmailSend).toHaveBeenCalledWith(CASE_ID, "case-created");
    expect(await response.json()).toEqual({ sent: false, reason: "send-failed" });
  });

  it("keeps the claim when the message actually went", async () => {
    await ask(valid);
    expect(releaseEmailSend).not.toHaveBeenCalled();
  });

  it("claims nothing when there is no email transport configured", async () => {
    emailConfigured.mockReturnValue(false);
    const response = await ask(valid);

    expect(claimEmailSend).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({ sent: false, reason: "not-configured" });
  });
});

describe("who the claim is made for", () => {
  it("uses the signed-in address, not the one in the body", async () => {
    // The account winning over the body is a security property, not a
    // convenience: otherwise this route posts a working case link to whatever
    // address a caller names. The claim has to follow the same address.
    currentUser.mockResolvedValue({ email: "account@example.com" });
    await ask({ ...valid, to: "attacker@example.com" });

    expect(claimEmailSend).toHaveBeenCalledWith(CASE_ID, "case-created", "account@example.com");
    expect(sendCaseCreatedEmail).toHaveBeenCalledWith("account@example.com", expect.anything());
  });

  it("refuses a request that did not come from this site", async () => {
    const response = await POST(new Request("https://kavach.test/api/email/case-created", {
      method: "POST",
      headers: { "Content-Type": "application/json", origin: "https://evil.example" },
      body: JSON.stringify(valid),
    }));

    expect(response.status).toBe(403);
    expect(claimEmailSend).not.toHaveBeenCalled();
  });

  it("claims nothing for a malformed request", async () => {
    for (const body of [
      { ...valid, ref: "not-a-reference" },
      { ...valid, caseId: "not-a-uuid" },
      { ...valid, to: "not-an-address" },
      { ...valid, surprise: true },
    ]) {
      const response = await ask(body);
      expect(response.status).toBe(400);
    }
    expect(claimEmailSend).not.toHaveBeenCalled();
  });
});
