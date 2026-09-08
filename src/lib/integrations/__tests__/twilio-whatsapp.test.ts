import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";

import { readTwilioForm, twiml, verifyTwilioSignature } from "../twilio-whatsapp";

const TOKEN = "an-auth-token";
const URL_ = "https://kavach.example/api/whatsapp/twilio";

/** Twilio's own recipe: URL, then key+value in alphabetical order, HMAC-SHA1. */
function sign(url: string, params: Record<string, string>, token = TOKEN): string {
  const payload = Object.keys(params).sort().reduce((acc, k) => acc + k + params[k], url);
  return createHmac("sha1", token).update(Buffer.from(payload, "utf8")).digest("base64");
}

describe("verifyTwilioSignature", () => {
  const params = { From: "whatsapp:+919876543210", Body: "hello", MessageSid: "SM1" };

  it("accepts a correctly signed request", () => {
    expect(verifyTwilioSignature(URL_, params, sign(URL_, params), TOKEN)).toBe(true);
  });

  it("rejects a signature made with another account's token", () => {
    expect(verifyTwilioSignature(URL_, params, sign(URL_, params, "someone-else"), TOKEN)).toBe(false);
  });

  it("rejects when a field was changed after signing", () => {
    const signature = sign(URL_, params);
    expect(verifyTwilioSignature(URL_, { ...params, Body: "goodbye" }, signature, TOKEN)).toBe(false);
  });

  it("rejects when the URL differs — the proxy case that silently breaks this", () => {
    const signature = sign(URL_, params);
    expect(verifyTwilioSignature("https://internal.vercel/api/whatsapp/twilio", params, signature, TOKEN)).toBe(false);
  });

  it("rejects a missing or malformed header rather than passing it through", () => {
    expect(verifyTwilioSignature(URL_, params, null, TOKEN)).toBe(false);
    expect(verifyTwilioSignature(URL_, params, "", TOKEN)).toBe(false);
    expect(verifyTwilioSignature(URL_, params, "not-base64!!", TOKEN)).toBe(false);
  });

  it("is order-independent, because the fields are sorted before hashing", () => {
    const reordered = { MessageSid: "SM1", Body: "hello", From: "whatsapp:+919876543210" };
    expect(verifyTwilioSignature(URL_, reordered, sign(URL_, params), TOKEN)).toBe(true);
  });
});

describe("readTwilioForm", () => {
  it("reduces the sender to the digits the conversation table is keyed by", () => {
    const got = readTwilioForm({ From: "whatsapp:+919876543210", Body: "hi", MessageSid: "SM1" });
    expect(got).toMatchObject({ from: "919876543210", body: "hi", messageId: "SM1" });
  });

  it("picks up a voice note", () => {
    const got = readTwilioForm({
      From: "whatsapp:+911", MessageSid: "SM2", Body: "", NumMedia: "1",
      MediaUrl0: "https://api.twilio.com/media/1", MediaContentType0: "audio/ogg",
    });
    expect(got).toMatchObject({ mediaUrl: "https://api.twilio.com/media/1", mediaType: "audio/ogg" });
  });

  it("returns nothing when there is no sender or no message id to dedupe on", () => {
    expect(readTwilioForm({ Body: "hi" })).toBeNull();
    expect(readTwilioForm({ From: "whatsapp:+911" })).toBeNull();
  });

  it("falls back to SmsMessageSid, which is what the sandbox actually sends", () => {
    expect(readTwilioForm({ From: "whatsapp:+911", SmsMessageSid: "SM3" })?.messageId).toBe("SM3");
  });
});

describe("twiml", () => {
  it("wraps each message in its own bubble", () => {
    expect(twiml(["one", "two"])).toBe(
      '<?xml version="1.0" encoding="UTF-8"?><Response><Message>one</Message><Message>two</Message></Response>',
    );
  });

  it("escapes characters that would otherwise produce XML Twilio rejects", () => {
    // A pasted scam URL with a query string is the realistic case.
    expect(twiml(["look at kyc.link?a=1&b=2 <now>"])).toContain("kyc.link?a=1&amp;b=2 &lt;now&gt;");
  });

  it("drops empty messages instead of sending blank bubbles", () => {
    expect(twiml(["", "   ", "real"])).toBe(
      '<?xml version="1.0" encoding="UTF-8"?><Response><Message>real</Message></Response>',
    );
  });

  it("is a valid empty response when there is nothing to say", () => {
    expect(twiml([])).toBe('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
  });
});
