import { describe, expect, it } from "vitest";
import {
  advanceWhatsAppSimulation,
  applySimulatedWhatsAppStatus,
  createWhatsAppSimulation,
  ensureSimulatedWhatsAppPromptDelivered,
  estimateWhatsAppIndiaCost,
  isCustomerServiceWindowOpen,
  receiveSimulatedWhatsAppMessage,
  refreshWhatsAppSimulationClock,
  sendSimulatedWhatsAppMessage,
} from "../whatsapp-simulator";

describe("WhatsApp India cost simulation", () => {
  it("keeps current-window service and utility replies free before October 2026", () => {
    const result = estimateWhatsAppIndiaCost([
      { category: "service", delivered: true, withinCustomerServiceWindow: true },
      { category: "utility", delivered: true, withinCustomerServiceWindow: true },
    ], new Date("2026-09-04T12:00:00+05:30"));
    expect(result.totalInr).toBe(0);
    expect(result.freeMessages).toBe(2);
  });

  it("charges a delivered utility template outside the current window", () => {
    const result = estimateWhatsAppIndiaCost([
      { category: "utility", delivered: true, withinCustomerServiceWindow: false },
    ], new Date("2026-09-04T12:00:00+05:30"));
    expect(result.totalInr).toBe(0.115);
    expect(result.chargedMessages).toBe(1);
  });

  it("does not charge an accepted message that was never delivered", () => {
    const result = estimateWhatsAppIndiaCost([
      { category: "marketing", delivered: false, withinCustomerServiceWindow: false },
    ], new Date("2026-09-04T12:00:00+05:30"));
    expect(result.totalInr).toBe(0);
  });

  it("charges every delivered service message from October 2026 with no legacy allowance", () => {
    const result = estimateWhatsAppIndiaCost([
      { category: "service", delivered: true, withinCustomerServiceWindow: true },
    ], new Date("2026-10-01T12:00:00+05:30"));
    expect(result.totalInr).toBe(0.115);
    expect(result.regime).toBe("from-2026-10-01");
  });

  it("prices each delivered message at its own timestamp across the transition", () => {
    const result = estimateWhatsAppIndiaCost([
      {
        category: "service",
        delivered: true,
        withinCustomerServiceWindow: true,
        deliveredAt: "2026-09-30T18:29:59.000Z",
      },
      {
        category: "service",
        delivered: true,
        withinCustomerServiceWindow: true,
        deliveredAt: "2026-09-30T18:30:00.000Z",
      },
    ], new Date("2026-10-02T12:00:00+05:30"));
    expect(result.totalInr).toBe(0.115);
    expect(result.freeMessages).toBe(1);
    expect(result.chargedMessages).toBe(1);
    expect(result.regime).toBe("mixed");
  });
});

describe("WhatsApp journey simulation", () => {
  it("lets real wall time expire a still-open tab without undoing fast-forward", () => {
    let state = receiveSimulatedWhatsAppMessage(
      createWhatsAppSimulation(new Date("2026-09-04T10:00:00Z")),
      "START",
    );
    state = refreshWhatsAppSimulationClock(state, new Date("2026-09-05T10:00:00Z"));
    expect(isCustomerServiceWindowOpen(state)).toBe(false);
    const fastForwarded = advanceWhatsAppSimulation(state, 24);
    expect(refreshWhatsAppSimulationClock(fastForwarded, new Date("2026-09-05T11:00:00Z"))).toBe(fastForwarded);
  });

  it("refreshes the service window on a user reply and closes it after 24 hours", () => {
    let state = createWhatsAppSimulation(new Date("2026-09-04T10:00:00Z"));
    expect(isCustomerServiceWindowOpen(state)).toBe(false);
    state = receiveSimulatedWhatsAppMessage(state, "START", "in-start");
    state = advanceWhatsAppSimulation(state, 23.9);
    expect(isCustomerServiceWindowOpen(state)).toBe(true);
    state = advanceWhatsAppSimulation(state, 0.1);
    expect(isCustomerServiceWindowOpen(state)).toBe(false);
    state = receiveSimulatedWhatsAppMessage(state, "Continue");
    expect(isCustomerServiceWindowOpen(state)).toBe(true);
  });

  it("retains a stable prompt identity when translated display text changes", () => {
    let state = receiveSimulatedWhatsAppMessage(
      createWhatsAppSimulation(new Date("2026-09-04T10:00:00Z")),
      "START",
    );
    state = sendSimulatedWhatsAppMessage(state, {
      text: "Are you safe?",
      promptId: "safety",
    }).state;
    expect(state.messages.at(-1)).toMatchObject({
      promptId: "safety",
      text: "Are you safe?",
      status: "queued",
    });
  });

  it("auto-delivers one latest copy and re-sends after a reply or translation", () => {
    let state = receiveSimulatedWhatsAppMessage(
      createWhatsAppSimulation(new Date("2026-09-04T10:00:00Z")),
      "START",
    );
    state = ensureSimulatedWhatsAppPromptDelivered(state, {
      text: "Are you safe?",
      promptId: "safety",
    });
    expect(state.messages.at(-1)).toMatchObject({
      promptId: "safety",
      status: "delivered",
      delivered: true,
    });

    const unchanged = ensureSimulatedWhatsAppPromptDelivered(state, {
      text: "Are you safe?",
      promptId: "safety",
    });
    expect(unchanged).toBe(state);

    state = receiveSimulatedWhatsAppMessage(state, "Continue");
    state = ensureSimulatedWhatsAppPromptDelivered(state, {
      text: "Are you safe?",
      promptId: "safety",
    });
    expect(state.messages.at(-1)).toMatchObject({ promptId: "safety", status: "delivered" });
    expect(state.messages.filter((message) => message.promptId === "safety")).toHaveLength(2);

    state = ensureSimulatedWhatsAppPromptDelivered(state, {
      text: "क्या आप सुरक्षित हैं?",
      promptId: "safety",
    });
    expect(state.messages.at(-1)).toMatchObject({
      text: "क्या आप सुरक्षित हैं?",
      status: "delivered",
    });
    expect(state.messages.filter((message) => message.promptId === "safety")).toHaveLength(3);
  });

  it("does not auto-send before start or through a closed window", () => {
    const closed = createWhatsAppSimulation(new Date("2026-09-04T10:00:00Z"));
    expect(ensureSimulatedWhatsAppPromptDelivered(closed, { text: "Question", promptId: "q" }))
      .toBe(closed);
    const expired = advanceWhatsAppSimulation(
      receiveSimulatedWhatsAppMessage(closed, "START"),
      25,
    );
    expect(ensureSimulatedWhatsAppPromptDelivered(expired, { text: "Question", promptId: "q" }))
      .toBe(expired);
  });

  it("requires an approved template outside the service window", () => {
    let state = createWhatsAppSimulation(new Date("2026-09-04T10:00:00Z"));
    state = receiveSimulatedWhatsAppMessage(state, "START");
    state = advanceWhatsAppSimulation(state, 25);
    expect(sendSimulatedWhatsAppMessage(state, { text: "Sensitive free-form reminder" }).error).toBe("template-required");
    expect(sendSimulatedWhatsAppMessage(state, {
      text: "You asked us to remind you. Open Kavach when safe.",
      templateName: "neutral_resume_v1",
      templateApproved: false,
    }).error).toBe("template-not-approved");
    const result = sendSimulatedWhatsAppMessage(state, {
      text: "You asked us to remind you. Open Kavach when safe.",
      templateName: "neutral_resume_v1",
      templateApproved: true,
    });
    expect(result.error).toBeUndefined();
    state = result.state;
    expect(state.messages.at(-1)?.withinCustomerServiceWindow).toBe(false);
    expect(state.messages.at(-1)?.category).toBe("utility");
  });

  it("honours STOP until the user explicitly sends START", () => {
    let state = createWhatsAppSimulation(new Date("2026-09-04T10:00:00Z"));
    state = receiveSimulatedWhatsAppMessage(state, "START");
    state = receiveSimulatedWhatsAppMessage(state, "STOP");
    expect(sendSimulatedWhatsAppMessage(state, { text: "Are you there?" }).error).toBe("opted-out");
    state = receiveSimulatedWhatsAppMessage(state, "hello");
    expect(sendSimulatedWhatsAppMessage(state, { text: "Still blocked" }).error).toBe("opted-out");
    state = receiveSimulatedWhatsAppMessage(state, "START");
    expect(sendSimulatedWhatsAppMessage(state, { text: "Welcome back" }).error).toBeUndefined();
  });

  it("deduplicates status events and ignores out-of-order regressions", () => {
    let state = createWhatsAppSimulation(new Date("2026-09-04T10:00:00Z"));
    state = receiveSimulatedWhatsAppMessage(state, "START");
    state = sendSimulatedWhatsAppMessage(state, { text: "Question", messageId: "out-1" }).state;
    state = applySimulatedWhatsAppStatus(state, { eventId: "evt-read", messageId: "out-1", status: "read" });
    state = applySimulatedWhatsAppStatus(state, { eventId: "evt-sent-late", messageId: "out-1", status: "sent" });
    const afterDuplicate = applySimulatedWhatsAppStatus(state, { eventId: "evt-read", messageId: "out-1", status: "read" });
    expect(afterDuplicate.messages.find((message) => message.id === "out-1")?.status).toBe("read");
    expect(afterDuplicate.processedWebhookIds.filter((id) => id === "evt-read")).toHaveLength(1);
  });

  it("starts unconsented and closed, and deduplicates inbound webhooks", () => {
    let state = createWhatsAppSimulation(new Date("2026-09-04T10:00:00Z"));
    expect(state.optedIn).toBe(false);
    expect(sendSimulatedWhatsAppMessage(state, { text: "Not allowed" }).error).toBe("opt-in-required");
    state = receiveSimulatedWhatsAppMessage(state, "START", "in-1");
    state = receiveSimulatedWhatsAppMessage(state, "START", "in-1");
    expect(state.messages.filter((message) => message.id === "in-1")).toHaveLength(1);
  });

  it("requires approved templates for non-service categories even inside the window", () => {
    const state = receiveSimulatedWhatsAppMessage(
      createWhatsAppSimulation(new Date("2026-09-04T10:00:00Z")),
      "START",
    );
    expect(sendSimulatedWhatsAppMessage(state, { text: "Offer", category: "marketing" }).error).toBe("template-required");
    expect(sendSimulatedWhatsAppMessage(state, {
      text: "Code 123456",
      category: "authentication",
      templateName: "otp_v1",
      templateApproved: true,
    }).error).toBeUndefined();
  });

  it("does not let a late failure regress a read message", () => {
    let state = receiveSimulatedWhatsAppMessage(
      createWhatsAppSimulation(new Date("2026-09-04T10:00:00Z")),
      "START",
    );
    state = sendSimulatedWhatsAppMessage(state, { text: "Question", messageId: "out-read" }).state;
    state = applySimulatedWhatsAppStatus(state, { eventId: "read", messageId: "out-read", status: "read" });
    state = applySimulatedWhatsAppStatus(state, { eventId: "failed-late", messageId: "out-read", status: "failed" });
    expect(state.messages.find((message) => message.id === "out-read")?.status).toBe("read");
  });

  it("accepts a terminal failure after sent but not after delivery", () => {
    let state = receiveSimulatedWhatsAppMessage(
      createWhatsAppSimulation(new Date("2026-09-04T10:00:00Z")),
      "START",
    );
    state = sendSimulatedWhatsAppMessage(state, { text: "Question", messageId: "out-fail" }).state;
    state = applySimulatedWhatsAppStatus(state, { eventId: "sent", messageId: "out-fail", status: "sent" });
    state = applySimulatedWhatsAppStatus(state, { eventId: "failed", messageId: "out-fail", status: "failed" });
    expect(state.messages.find((message) => message.id === "out-fail")?.status).toBe("failed");

    let delivered = sendSimulatedWhatsAppMessage(state, { text: "Another", messageId: "out-delivered" }).state;
    delivered = applySimulatedWhatsAppStatus(delivered, { eventId: "delivered", messageId: "out-delivered", status: "delivered" });
    delivered = applySimulatedWhatsAppStatus(delivered, { eventId: "failed-after", messageId: "out-delivered", status: "failed" });
    expect(delivered.messages.find((message) => message.id === "out-delivered")?.status).toBe("delivered");
  });

  it("rejects invalid cost dates and impossible outside-window service messages", () => {
    expect(() => estimateWhatsAppIndiaCost([], new Date("invalid"))).toThrow(/valid pricing date/);
    expect(() => estimateWhatsAppIndiaCost([
      { category: "service", delivered: true, withinCustomerServiceWindow: false },
    ], new Date("2026-09-04T12:00:00+05:30"))).toThrow(/service message/);
  });
});
