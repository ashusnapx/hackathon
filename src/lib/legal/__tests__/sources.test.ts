import { describe, expect, it } from "vitest";

import { RBI_2017_CIRCULAR } from "../rbi";
import { RBI_OMBUDSMAN_2026 } from "../ombudsman";

/**
 * The links this product cites are not decoration: somebody reads them while
 * deciding whether to believe a deadline we have put in front of them. Two of
 * them had rotted silently — one to a host that no longer resolves, one to a
 * PDF path that answered with an HTML error page — and nothing here would have
 * noticed. These assertions are about shape rather than reachability, because a
 * unit test must not depend on RBI's website being up; the reachability check
 * is `npm run check:sources`.
 */
describe("the sources we cite", () => {
  const sources = [
    RBI_2017_CIRCULAR.url,
    RBI_2017_CIRCULAR.readableUrl,
    RBI_OMBUDSMAN_2026.url,
    RBI_OMBUDSMAN_2026.faqUrl,
  ];

  it("are all on rbi.org.in and served over https", () => {
    for (const url of sources) {
      expect(url, url).toMatch(/^https:\/\//);
      expect(new URL(url).hostname, url).toMatch(/(^|\.)rbi\.org\.in$/);
    }
  });

  it("never points at the retired old.rbi.org.in host", () => {
    // That host stopped resolving; the FAQ link sat on it and reached nothing.
    for (const url of sources) expect(new URL(url).hostname, url).not.toBe("old.rbi.org.in");
  });

  it("gives a citizen a readable page and a bank the citation", () => {
    // The circular index is written for compliance officers, and RBI files it
    // under a menu heading of "Circulars Withdrawn" — which reads to a victim
    // as though the protection is gone. They get the plain-language page.
    expect(RBI_2017_CIRCULAR.readableUrl).not.toBe(RBI_2017_CIRCULAR.url);
    expect(RBI_2017_CIRCULAR.url).toContain("NotificationUser.aspx");
  });

  it("still names the circular precisely enough to quote at a bank", () => {
    expect(RBI_2017_CIRCULAR.id).toBe("RBI/2017-18/15");
    expect(RBI_2017_CIRCULAR.number).toBe("DBR.No.Leg.BC.78/09.07.005/2017-18");
    expect(RBI_2017_CIRCULAR.issuedOn).toBe("2017-07-06");
  });

  it("says out loud that the framework is under revision", () => {
    // RBI put amendments out for comment in March 2026. Asserting the old rules
    // as settled, or the draft ones as law, would both be wrong.
    expect(RBI_2017_CIRCULAR.underRevision).toBe(true);
  });

  it("cites the ombudsman scheme actually in force", () => {
    // RB-IOS 2026 replaced the 2021 scheme on 1 July 2026.
    expect(RBI_OMBUDSMAN_2026.id).toBe("RB-IOS-2026");
    expect(RBI_OMBUDSMAN_2026.effectiveOn).toBe("2026-07-01");
  });
});
