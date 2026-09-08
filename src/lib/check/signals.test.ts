import { describe, expect, it } from "vitest";
import { CHECK_GROUPS, checkText, groupOf } from "@/lib/check/signals";

const verdictOf = (s: string) => checkText(s).verdict;
const idsOf = (s: string) => checkText(s).signals.map((x) => x.id);

describe("checkText — world-class coverage", () => {
  it("flags a lone 'digital arrest' phrase as danger (the old false-green)", () => {
    expect(verdictOf("You are under digital arrest. Stay on video call.")).toBe("danger");
    expect(idsOf("You are under digital arrest.")).toContain("digital-arrest");
  });

  it("flags authority + threat combos", () => {
    expect(verdictOf("CBI Mumbai. A parcel with narcotics in your name. Arrest warrant issued.")).toBe("danger");
  });

  it("flags QR / PIN to receive (RBI: PIN only ever pays)", () => {
    expect(verdictOf("Scan this QR to receive your refund of Rs 5000")).toBe("danger");
    expect(verdictOf("Enter your UPI PIN to receive the cashback")).toBe("danger");
  });

  it("flags APK lures", () => {
    expect(verdictOf("Download wedding-invitation.apk to view photos")).toBe("danger");
    expect(idsOf("Download wedding-invitation.apk")).toContain("apk-file");
  });

  it("flags remote-access takeover", () => {
    expect(verdictOf("Install AnyDesk so our support can fix your KYC")).toBe("danger");
  });

  it("flags KYC-block smishing with a link", () => {
    expect(verdictOf("Your SBI KYC expired. Update within 24 hours at http://sbi-kyc-verify.xyz")).toBe("danger");
  });

  it("flags electricity / SIM block threats with a rail", () => {
    expect(verdictOf("Electricity bill unpaid. Connection disconnects tonight. Pay at eb-fastpay.top")).toBe("danger");
  });

  it("flags task / job fraud", () => {
    expect(verdictOf("Part time job, like YouTube videos, earn Rs 3000 daily on Telegram, Rs 500 joining fee")).toBe("danger");
    expect(idsOf("Part time job, like YouTube videos, earn Rs 3000 daily")).toContain("job-task");
  });

  it("flags investment lures with groups", () => {
    expect(verdictOf("Guaranteed daily profit, join our VIP Telegram trading signals, deposit to start")).toBe("danger");
  });

  it("flags lottery + fee", () => {
    expect(verdictOf("KBC lottery! You won Rs 25 lakh. Pay Rs 5000 gift tax to claim")).toBe("danger");
  });

  it("flags personal mobiles posing as banks", () => {
    expect(verdictOf("This is SBI customer care. Call 9876543210 immediately to unblock")).toBe("danger");
    expect(idsOf("This is SBI customer care. Call 9876543210 immediately")).toContain("phone-personal-official");
  });

  it("flags combosquat and typosquat domains", () => {
    expect(idsOf("Verify at https://onlinesbi-update-secure.com/login")).toContain("url-lookalike");
    expect(idsOf("Login at https://payttm.com/wallet")).toContain("url-typosquat");
    expect(verdictOf("Login at https://payttm.com/wallet")).toBe("danger");
  });

  it("flags free-hosting bank pages and @-tricks", () => {
    expect(idsOf("KYC at https://sbi-kyc.pages.dev/login")).toContain("url-freehost");
    expect(idsOf("Open https://safe.com@evil.xyz/login")).toContain("url-at");
  });

  it("flags spoofed free-mailbox officials", () => {
    expect(verdictOf("Write to sbisupport.kyc@gmail.com with your OTP to verify")).toBe("danger");
  });

  it("flags secrecy / isolation as high", () => {
    expect(idsOf("Do not tell anyone and stay on this video call")).toContain("secrecy");
    expect(verdictOf("Do not tell anyone and stay on this video call, CBI case")).toBe("danger");
  });

  it("flags sextortion and mule recruitment", () => {
    expect(verdictOf("We have your nude video call recording. Pay or we leak it")).toBe("danger");
    expect(verdictOf("Rent your bank account to us, Rs 10000 commission per month")).toBe("danger");
  });

  it("never returns safe: unknown text is nothing-found with score 0", () => {
    const r = checkText("What are the bank timings on Saturday?");
    expect(r.verdict).toBe("nothing-found");
    expect(r.riskScore).toBe(0);
    expect(r.checksRun).toBeGreaterThan(10);
  });

  it("obfuscated OTP still triggers", () => {
    expect(verdictOf("Share your O T P to verify")).toBe("danger");
    expect(verdictOf("Tell me your o.t.p now")).toBe("danger");
  });

  it("extracts identifiers for the official repository", () => {
    const r = checkText("Pay refund fee to refund.amazon@okpay or call 9812345670. See http://sbi-kyc-verify.xyz");
    const kinds = r.identifiers.map((i) => i.kind);
    expect(kinds).toContain("upi");
    expect(kinds).toContain("phone");
    expect(kinds).toContain("url");
  });

  it("flags card reward-points smishing", () => {
    expect(verdictOf("Your SBI card reward points expire today. Redeem at http://sbirewards-claim.top")).toBe("danger");
    expect(idsOf("Your SBI card reward points expire today. Redeem at http://sbirewards-claim.top")).toContain("reward-scam");
  });

  it("handles family-emergency texts honestly: rail+pressure danger, rail alone caution", () => {
    expect(verdictOf("Mumma, accident, hospital, urgent, send Rs 50000 to 9876543210@ybl immediately")).toBe("danger");
    expect(idsOf("Mumma, accident, hospital, send Rs 50000 to 9876543210@ybl")).toContain("emergency-verify");
    expect(verdictOf("Hospital bill for yesterday, please send to 9876543210@ybl")).toBe("caution");
  });

  it("flags army-buyer, recovery-fee and complaint-fee scripts", () => {
    expect(verdictOf("I am army officer, will pay advance, scan this QR to receive token")).toBe("danger");
    expect(idsOf("I am army officer, scan QR to receive token amount")).toContain("army-olx");
    expect(verdictOf("We will recover your lost money, pay Rs 2000 chargeback fee to start")).toBe("danger");
    expect(verdictOf("Pay Rs 500 NCRP portal fee to register your FIR complaint")).toBe("danger");
  });

  it("flags refund, offer-letter, boss-scam and fake-endorsement lures", () => {
    expect(verdictOf("EPFO withdrawal approved, verify at http://epfo-claim.xyz with your UPI")).toBe("danger");
    expect(verdictOf("Your offer letter is ready, pay Rs 5000 joining fee to confirm")).toBe("danger");
    expect(verdictOf("This is your CEO. Strictly confidential vendor payment, transfer immediately, do not discuss")).toBe("danger");
    expect(verdictOf("Sadhguru reveals secret trading platform, guaranteed daily profit, deposit to start")).toBe("danger");
  });

  it("maps every signal to exactly one board group", () => {
    const r = checkText("Digital arrest CBI video call. Share OTP. Install AnyDesk. Pay to 1@okpay. See http://x.xyz. Do not tell anyone, urgent.");
    const groups = new Set(r.signals.map((s) => groupOf(s.id)));
    expect(groups.size).toBeGreaterThan(3);
    for (const g of groups) expect(CHECK_GROUPS.some((c) => c.id === g)).toBe(true);
    expect(r.checksRun).toBe(CHECK_GROUPS.length);
  });
});
