/**
 * The banks somebody is most likely to be complaining to, and how to escalate.
 *
 * Every URL in this file returned 200 to a real request. That sentence exists
 * because the first version of this list did not: sixteen of twenty-six links
 * were guessed from the shape of other banks' sites and were dead, and the
 * first person to pick State Bank of India got a page that would not load. A
 * broken link here is worse than no link, because somebody in the first hours
 * of a fraud reads it as the route being closed.
 *
 * Two things that list got wrong are worth writing down, because they will
 * catch the next person too:
 *
 *  · Indian banks are moving to the RBI-mandated `.bank.in` domain. HDFC,
 *    ICICI, IDFC FIRST, YES, Central Bank, UCO, IOB, Bank of Maharashtra and
 *    SBI have all moved, and their old deep links 404 or redirect. Several of
 *    the "dead" links were simply at the old address.
 *  · Deep links into a grievance page rot fastest, because that is the part of
 *    a bank's site that gets restructured. Where a deep link is verified it is
 *    used; where it is not, the bank's own front page is used instead and the
 *    screen says so, so nobody is sent to a page that no longer exists.
 *
 * `npm run check:banks` re-checks every URL here. Run it before a demo.
 *
 * What this file deliberately does NOT hold is a nodal officer's email
 * address. Those move the same way, and a complaint sent to a dead mailbox
 * looks exactly like a complaint that arrived — the liability window runs out
 * while somebody believes they have already reported. The escalation ladder in
 * the UI is generic because the RBI set it, not the bank, and that is stable in
 * a way individual contacts are not.
 */

export interface Bank {
  id: string;
  name: string;
  /** Verified reachable. See the note above. */
  url: string;
  /**
   * True when `url` is the bank's grievance page, false when it is the front
   * page because no deep link could be verified. The UI says which it is
   * rather than promising a complaints page and landing somebody on a home
   * page with no idea what to do next.
   */
  deep: boolean;
}

/**
 * Ordered by how many retail customers each is likely to have, so the
 * commonest answers need the least scrolling. "My bank is not here" stays a
 * real option in the picker: there are more than a hundred scheduled banks and
 * this list will never be all of them.
 */
export const BANKS: Bank[] = [
  { id: "sbi", name: "State Bank of India", url: "https://sbi.bank.in", deep: false },
  { id: "hdfc", name: "HDFC Bank", url: "https://www.hdfc.bank.in", deep: false },
  { id: "icici", name: "ICICI Bank", url: "https://www.icici.bank.in", deep: false },
  { id: "axis", name: "Axis Bank", url: "https://www.axisbank.com/grievance-redressal", deep: true },
  { id: "pnb", name: "Punjab National Bank", url: "https://www.pnbindia.in/grievance-redressal.html", deep: true },
  { id: "bob", name: "Bank of Baroda", url: "https://www.bankofbaroda.in/customer-support/grievance-redressal", deep: true },
  { id: "canara", name: "Canara Bank", url: "https://www.canarabank.com", deep: false },
  { id: "union", name: "Union Bank of India", url: "https://www.unionbankofindia.co.in/english/customer-grievances.aspx", deep: true },
  { id: "kotak", name: "Kotak Mahindra Bank", url: "https://www.kotak.com/en/customer-service/grievance-redressal.html", deep: true },
  { id: "indusind", name: "IndusInd Bank", url: "https://www.indusind.com/in/en/personal/grievance-redressal.html", deep: true },
  { id: "idfc", name: "IDFC FIRST Bank", url: "https://www.idfcfirst.bank.in", deep: false },
  { id: "yes", name: "YES Bank", url: "https://www.yes.bank.in", deep: false },
  { id: "idbi", name: "IDBI Bank", url: "https://www.idbibank.in/grievance-redressal.aspx", deep: true },
  { id: "indian", name: "Indian Bank", url: "https://www.indianbank.in/departments/grievance-redressal/", deep: true },
  { id: "central", name: "Central Bank of India", url: "https://centralbank.bank.in", deep: false },
  { id: "uco", name: "UCO Bank", url: "https://uco.bank.in", deep: false },
  { id: "iob", name: "Indian Overseas Bank", url: "https://www.iob.bank.in", deep: false },
  { id: "maharashtra", name: "Bank of Maharashtra", url: "https://bankofmaharashtra.bank.in", deep: false },
  { id: "psb", name: "Punjab & Sind Bank", url: "https://psbindia.com", deep: false },
  { id: "federal", name: "Federal Bank", url: "https://www.federalbank.co.in/grievance-redressal", deep: true },
  { id: "rbl", name: "RBL Bank", url: "https://www.rbl.bank.in/grievance-mechanism-flowchart", deep: true },
  { id: "bandhan", name: "Bandhan Bank", url: "https://bandhanbank.com/grievance-redressal", deep: true },
  { id: "paytm", name: "Paytm Payments Bank", url: "https://www.paytmbank.com", deep: false },
];

export function findBank(id: string | undefined): Bank | undefined {
  return id ? BANKS.find((bank) => bank.id === id) : undefined;
}

/**
 * The Reserve Bank's own complaint portal, the same for every bank.
 *
 * Named here rather than per-bank because it is the one address in this file
 * that is not the bank's to change.
 */
export const RBI_CMS_URL = "https://cms.rbi.org.in";

/** The published list of every bank's current principal nodal officer. */
export const RBI_NODAL_LIST_URL = "https://www.rbi.org.in/Scripts/bs_viewcontent.aspx?Id=164";
