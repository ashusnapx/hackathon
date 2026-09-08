import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";

import { readInbound, verifySubscription, verifyWebhookSignature } from "../whatsapp";

/**
 * The webhook's front door.
 *
 * These are the tests that matter most in the integration: the route behind
 * them starts fraud interviews and writes case rows, so an endpoint that can be
 * driven by anyone who learns the URL is not a bug, it is the whole problem.
 */

const SECRET = "an-app-secret";
const sign = (body: string, secret = SECRET) =>
  `sha256=${createHmac("sha256", secret).update(body, "utf8").digest("hex")}`;

describe("verifyWebhookSignature", () => {
  const body = JSON.stringify({ entry: [{ changes: [] }] });

  it("accepts a body signed with our app secret", () => {
    expect(verifyWebhookSignature(body, sign(body), SECRET)).toBe(true);
  });

  it("rejects a body signed with someone else's secret", () => {
    expect(verifyWebhookSignature(body, sign(body, "not-ours"), SECRET)).toBe(false);
  });

  it("rejects a body that was altered after signing", () => {
    const signature = sign(body);
    expect(verifyWebhookSignature(body.replace("entry", "entrx"), signature, SECRET)).toBe(false);
  });

  it("rejects a missing header rather than treating it as unsigned-but-fine", () => {
    expect(verifyWebhookSignature(body, null, SECRET)).toBe(false);
    expect(verifyWebhookSignature(body, "", SECRET)).toBe(false);
  });

  it("rejects a header with the wrong algorithm prefix", () => {
    const hex = createHmac("sha256", SECRET).update(body).digest("hex");
    expect(verifyWebhookSignature(body, `sha1=${hex}`, SECRET)).toBe(false);
    expect(verifyWebhookSignature(body, hex, SECRET)).toBe(false);
  });

  it("survives a malformed header instead of throwing", () => {
    expect(verifyWebhookSignature(body, "sha256=zzzz", SECRET)).toBe(false);
    expect(verifyWebhookSignature(body, "sha256=", SECRET)).toBe(false);
    expect(verifyWebhookSignature(body, "=", SECRET)).toBe(false);
  });

  it("is sensitive to whitespace, because the digest is over raw bytes", () => {
    // A JSON round-trip is the classic way this breaks: same object, new bytes.
    const reencoded = JSON.stringify(JSON.parse(body), null, 2);
    expect(verifyWebhookSignature(reencoded, sign(body), SECRET)).toBe(false);
  });
});

describe("verifySubscription", () => {
  const params = (o: Record<string, string>) => new URLSearchParams(o);

  it("returns the challenge when the token matches", () => {
    const got = verifySubscription(
      params({ "hub.mode": "subscribe", "hub.verify_token": "tok", "hub.challenge": "1234" }),
      "tok",
    );
    expect(got).toBe("1234");
  });

  it("refuses a wrong token", () => {
    expect(
      verifySubscription(
        params({ "hub.mode": "subscribe", "hub.verify_token": "nope", "hub.challenge": "1234" }),
        "tok",
      ),
    ).toBeNull();
  });

  it("refuses a mode that is not subscribe", () => {
    expect(
      verifySubscription(
        params({ "hub.mode": "unsubscribe", "hub.verify_token": "tok", "hub.challenge": "1234" }),
        "tok",
      ),
    ).toBeNull();
  });

  it("refuses when there is no challenge to echo", () => {
    expect(verifySubscription(params({ "hub.mode": "subscribe", "hub.verify_token": "tok" }), "tok")).toBeNull();
  });
});

describe("readInbound", () => {
  const wrap = (messages: unknown[]) => ({
    entry: [{ changes: [{ value: { messages } }] }],
  });

  it("reads a text message", () => {
    const [m] = readInbound(wrap([{ id: "wamid.1", from: "919876543210", type: "text", text: { body: "hello" }, timestamp: "1700000000" }]));
    expect(m).toMatchObject({ id: "wamid.1", from: "919876543210", kind: "text", text: "hello" });
  });

  it("reads a voice note as audio, with its media id", () => {
    const [m] = readInbound(wrap([{ id: "wamid.2", from: "919876543210", type: "audio", audio: { id: "media-1", mime_type: "audio/ogg" }, timestamp: "1" }]));
    expect(m).toMatchObject({ kind: "audio", mediaId: "media-1", mimeType: "audio/ogg" });
  });

  it("flattens a button tap to the option id the engine matches on", () => {
    const [m] = readInbound(wrap([{ id: "wamid.3", from: "919876543210", type: "interactive", interactive: { button_reply: { id: "1", title: "Yes" } }, timestamp: "1" }]));
    expect(m).toMatchObject({ kind: "text", text: "1" });
  });

  it("marks a type it cannot open rather than dropping the message silently", () => {
    const [m] = readInbound(wrap([{ id: "wamid.4", from: "919876543210", type: "sticker", timestamp: "1" }]));
    expect(m.kind).toBe("unsupported");
  });

  it("returns nothing for a delivery receipt", () => {
    expect(readInbound({ entry: [{ changes: [{ value: { statuses: [{ id: "wamid.1", status: "read" }] } }] }] })).toEqual([]);
  });

  it("reads every message in a batched delivery", () => {
    const payload = {
      entry: [
        { changes: [{ value: { messages: [{ id: "a", from: "911", type: "text", text: { body: "one" }, timestamp: "1" }] } }] },
        { changes: [{ value: { messages: [{ id: "b", from: "912", type: "text", text: { body: "two" }, timestamp: "1" }] } }] },
      ],
    };
    expect(readInbound(payload).map((m) => m.id)).toEqual(["a", "b"]);
  });

  it("survives junk instead of throwing at the top of the webhook", () => {
    expect(readInbound(null)).toEqual([]);
    expect(readInbound({})).toEqual([]);
    expect(readInbound({ entry: "not-an-array" })).toEqual([]);
    expect(readInbound({ entry: [{ changes: [{ value: {} }] }] })).toEqual([]);
  });
});
