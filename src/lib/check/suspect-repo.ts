/**
 * Bridge to I4C's Suspect Repository search.
 *
 * The repository page is an ASP.NET WebForms form with a viewstate, an
 * UpdatePanel and a captcha, so it cannot be prefilled by URL — there is no
 * query contract and cross-origin writes are impossible. What we can do is
 * the next best thing: copy the identifiers in the repository's own language
 * and give the citizen a one-click bookmarklet that, run on the government
 * page, picks the right search type (Mobile / E-mail / Bank Account /
 * Social Media / UPI ID), fills the box and lands the cursor in the captcha.
 * The captcha stays human, as it should.
 *
 * Field map, verified against suspect_search_repository.aspx:
 *   radios  ContentPlaceHolder1_rblMeasurementSystem_{0..4}
 *           0 Mobile · 1 E-mail · 2 Bank Account Number · 3 Social Media · 4 UPI ID
 *   input   ContentPlaceHolder1_idverify
 *   captcha ContentPlaceHolder1_txtcapcha
 */

export const SUSPECT_REPO_URL =
  "https://cybercrime.gov.in/Webform/suspect_search_repository.aspx";

export const SUSPECT_WEBSITE_URL =
  "https://cybercrime.gov.in/Webform/suspect_search_websites.aspx";

export type RepoKind = "upi" | "phone" | "account" | "url" | "email" | "handle";

export interface RepoIdentifier {
  kind: RepoKind;
  value: string;
}

const REPO_LABEL: Record<RepoKind, string> = {
  phone: "Mobile",
  email: "E-mail",
  account: "Bank Account Number",
  handle: "Social Media",
  upi: "UPI ID",
  url: "Website",
};

/** The repository wants bare 10-digit mobiles, never +91. */
export function repoLabel(kind: RepoKind): string {
  return REPO_LABEL[kind];
}

export function repoValue(id: RepoIdentifier): string {
  if (id.kind === "phone") return id.value.replace(/[\s-]/g, "").replace(/^\+?91/, "");
  return id.value;
}

/** One block of text that pastes straight into the portal's world. */
export function repoCopyAll(ids: RepoIdentifier[]): string {
  return ids
    .map((id) => `${repoLabel(id.kind)}: ${repoValue(id)}`)
    .join("\n");
}

/**
 * Runs on cybercrime.gov.in, never here. Written comment-free on purpose:
 * it is serialised into a javascript: URL, where line comments would eat
 * the rest of the payload.
 */
function fillSuspectRepo(): void {
  const RADIO = "ContentPlaceHolder1_rblMeasurementSystem_";
  const GROUP = "ctl00$ContentPlaceHolder1$rblMeasurementSystem";
  const INPUT = "ContentPlaceHolder1_idverify";
  const CAPTCHA = "ContentPlaceHolder1_txtcapcha";
  const PLACEHOLDERS = ["Enter Mobile No", "Enter E-mail ID", "Enter Bank Account Number", "Enter Social Media Detail", "Enter UPI ID"];
  function detect(raw: string): { t: number; v: string } | null {
    const v = (raw || "").replace(/[\s]+/g, "").trim();
    if (!v) return null;
    if (v.indexOf("@") > 0) {
      const domain = v.split("@").pop() || "";
      return { t: domain.indexOf(".") > 0 ? 1 : 4, v };
    }
    const digits = v.replace(/^\+?91/, "");
    if (/^[6-9]\d{9}$/.test(digits)) return { t: 0, v: digits };
    if (/^\d{9,18}$/.test(digits)) return { t: 2, v: digits };
    if (v.charAt(0) === "@" || v.toLowerCase().indexOf("t.me/") >= 0) return { t: 3, v };
    return null;
  }
  function fill(v: string, tries: number): void {
    const inp = document.getElementById(INPUT) as HTMLInputElement | null;
    if (!inp) {
      if (tries > 0) {
        setTimeout(function () { fill(v, tries - 1); }, 300);
        return;
      }
      alert("Kavach: search box not found. Open the Suspect Repository page first.");
      return;
    }
    inp.focus();
    inp.value = v;
    try {
      inp.dispatchEvent(new Event("input", { bubbles: true }));
      inp.dispatchEvent(new Event("change", { bubbles: true }));
    } catch { /* older engines: value is set, events are best-effort */ }
    const cap = document.getElementById(CAPTCHA) as HTMLInputElement | null;
    if (cap) cap.focus();
  }
  function selectType(t: number): void {
    const group = document.getElementsByName(GROUP) as NodeListOf<HTMLInputElement>;
    for (let i = 0; i < group.length; i++) group[i].checked = false;
    const r = document.getElementById(RADIO + t) as HTMLInputElement | null;
    if (r) r.checked = true;
    const inp = document.getElementById(INPUT) as HTMLInputElement | null;
    if (inp && PLACEHOLDERS[t]) inp.placeholder = PLACEHOLDERS[t];
  }
  function go(raw: string): void {
    let d = detect(raw);
    if (!d) {
      const pasted = prompt("Paste the mobile number, UPI ID, email, account number or handle to check:", "") || "";
      d = detect(pasted);
      if (!d) {
        if (pasted && pasted.indexOf(".") > 0) {
          alert("Kavach: that looks like a website — check it on the portal's 'Check Suspect (Website/App)' page instead.");
        }
        return;
      }
    }
    const r = document.getElementById(RADIO + d.t) as HTMLInputElement | null;
    if (r) selectType(d.t);
    fill(d.v, 20);
  }
  try {
    if (navigator.clipboard && navigator.clipboard.readText) {
      navigator.clipboard.readText().then(go, function () { go(""); });
    } else {
      go("");
    }
  } catch {
    go("");
  }
}

/** Drag-to-bookmarks-bar link. Spaces collapsed; runs only on the gov page. */
export const SUSPECT_REPO_BOOKMARKLET: string =
  `javascript:(${fillSuspectRepo.toString().replace(/\s+/g, " ")})()`;
