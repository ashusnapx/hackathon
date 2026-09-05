import { describe, expect, it } from "vitest";

import { isFresh, summarise, type ServiceHealth } from "../report";

const service = (id: ServiceHealth["id"], state: ServiceHealth["state"]): ServiceHealth =>
  ({ id, state, ms: state === "off" ? null : 12 });

describe("one word for the whole status board", () => {
  it("is up only when everything that exists is answering", () => {
    expect(summarise([
      service("database", "up"),
      service("ai", "up"),
      service("voice", "up"),
      service("email", "up"),
    ])).toBe("up");
  });

  it("does not count a service nobody configured against it", () => {
    // A build with no email set up is a working build, not a degraded one.
    expect(summarise([
      service("database", "up"),
      service("ai", "up"),
      service("voice", "off"),
      service("email", "off"),
    ])).toBe("up");
  });

  it("says degraded when some of what exists is down", () => {
    expect(summarise([
      service("database", "up"),
      service("ai", "down"),
      service("email", "off"),
    ])).toBe("degraded");
  });

  it("says down only when nothing configured is answering", () => {
    expect(summarise([
      service("database", "down"),
      service("ai", "down"),
      service("email", "off"),
    ])).toBe("down");
  });

  it("reports a build with no external services as idle rather than healthy", () => {
    // Claiming "all systems operational" when there are no systems is the one
    // answer a status board must never give.
    expect(summarise([
      service("database", "off"),
      service("ai", "off"),
      service("voice", "off"),
      service("email", "off"),
    ])).toBe("idle");
    expect(summarise([])).toBe("idle");
  });
});

describe("the cache in front of the probes", () => {
  it("serves a recent answer and re-probes an old one", () => {
    const now = 1_000_000;
    expect(isFresh(now, now, 30_000)).toBe(true);
    expect(isFresh(now - 29_999, now, 30_000)).toBe(true);
    expect(isFresh(now - 30_000, now, 30_000)).toBe(false);
  });

  it("re-probes rather than trusting a clock that moved backwards", () => {
    expect(isFresh(2_000_000, 1_000_000, 30_000)).toBe(false);
  });
});
