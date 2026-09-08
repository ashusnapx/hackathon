import { describe, expect, it } from "vitest";

import { RBI_2017_CIRCULAR, RBI_2026_AMENDMENT, rbiFrameworkFor } from "../rbi";
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

  it("says out loud that the framework is being replaced, and when", () => {
    // The March 2026 drafts were finalised on 24 June 2026. Asserting the old
    // rules as permanent, or the new ones as already in force, would both be
    // wrong — and they differ on the deadline a victim has to meet.
    expect(RBI_2017_CIRCULAR.underRevision).toBe(true);
    expect(RBI_2017_CIRCULAR.supersededFrom).toBe("2027-01-01");
  });

  it("names the replacing directions precisely enough to quote at a bank", () => {
    expect(RBI_2026_AMENDMENT.id).toBe("RBI/2026-27/167");
    expect(RBI_2026_AMENDMENT.number).toBe("DOR.MCS.REC.No.130/01-01-032/2026-27");
    expect(RBI_2026_AMENDMENT.issuedOn).toBe("2026-06-24");
    expect(RBI_2026_AMENDMENT.appliesFrom).toBe("2027-01-01");
    expect(RBI_2026_AMENDMENT.url).toContain("rbi.org.in");
  });

  it("picks the framework by the transaction date, not by today", () => {
    // A case opened in 2027 about a 2026 debit is still governed by the 2017
    // circular. Reading this off the current date would quietly tell thousands
    // of people the wrong deadline in the first weeks of January.
    expect(rbiFrameworkFor("2026-12-31T23:59:00.000Z")).toBe("2017");
    expect(rbiFrameworkFor("2027-01-01T00:00:00.000Z")).toBe("2026");
    expect(rbiFrameworkFor("2027-06-01")).toBe("2026");
    // No date, or an unusable one, must not silently promote a case into the
    // newer regime and its different deadline.
    expect(rbiFrameworkFor(undefined)).toBe("2017");
    expect(rbiFrameworkFor("not-a-date")).toBe("2017");
  });

  it("keeps the new five-calendar-day window distinct from three working days", () => {
    // The change reads like a relaxation and is not: across a long weekend the
    // calendar count expires first.
    expect(RBI_2026_AMENDMENT.reportWithinCalendarDays).toBe(5);
    expect(RBI_2026_AMENDMENT.smallValue.maxLossRupees).toBe(50_000);
    expect(RBI_2026_AMENDMENT.smallValue.capRupees).toBe(25_000);
  });

  it("cites the ombudsman scheme actually in force", () => {
    // RB-IOS 2026 replaced the 2021 scheme on 1 July 2026.
    expect(RBI_OMBUDSMAN_2026.id).toBe("RB-IOS-2026");
    expect(RBI_OMBUDSMAN_2026.effectiveOn).toBe("2026-07-01");
  });
});
