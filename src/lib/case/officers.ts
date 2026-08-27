import type { CaseFile } from "./types";

/**
 * Every state's cyber Nodal Officer and Grievance Officer.
 *
 * The single most common thing that happens to a victim after filing is
 * nothing. There is an escalation path — the NCRP grievance route names an
 * officer per state and publishes how to reach them — and essentially no
 * victim is ever told it exists. This table is that list, so the case file can
 * hand a citizen the specific person to chase instead of "contact the police".
 *
 * Source: the State/UT Nodal Officer and Grievance Officer table published for
 * complainants at mrm-ncrp.mha.gov.in/public-info, captured on the date below.
 *
 * Names go stale as officers are transferred; the addresses are mostly role
 * mailboxes and survive it. The UI leads with the office and treats the name as
 * "who was listed when we captured this", which is the honest way to show a
 * table we cannot keep live.
 */
export const OFFICERS_CAPTURED_ON = "2026-08-28";
export const OFFICERS_SOURCE = "https://mrm-ncrp.mha.gov.in/public-info?tab=contact";

export interface StateOfficers {
  state: string;
  nodal: { name: string; rank: string; email: string };
  grievance: { name: string; phone: string; email: string };
}

export const OFFICERS: StateOfficers[] = [
  { state: "Andaman and Nicobar", nodal: { name: "Sh. Sanjay Kumar", rank: "IGP", email: "igpint.and@nic.in" }, grievance: { name: "Sh.Deependra Pathak", phone: "03192-230216", email: "dgp.and@nic.in" } },
  { state: "Andhra Pradesh", nodal: { name: "Ms. D Mary Prasanthi", rank: "SP", email: "cybercrimes-cid@ap.gov.in" }, grievance: { name: "Sh. J Prabhakar Rao", phone: "0863-2340152", email: "cybercrimes-cid@ap.gov.in" } },
  { state: "Arunachal Pradesh", nodal: { name: "Sh Navdeep Singh Brar", rank: "SP", email: "spcr@arunpol.nic.in" }, grievance: { name: "Sh. Take Ringu", phone: "0360-2215518", email: "sit@arunpol.nic.in" } },
  { state: "Assam", nodal: { name: "Sh Mridulananda Sarma", rank: "DIGP", email: "digp-cid@assampolice.gov.in" }, grievance: { name: "Sh. Surendra kumar", phone: "0361-2524494", email: "igp-cid@assampolice.gov.in" } },
  { state: "Bihar", nodal: { name: "Sh D. Amarcase", rank: "ASP", email: "cybercell-bih@nic.in" }, grievance: { name: "Sh. Shiv Kumar Jha", phone: "0612-2238098", email: "dgp-bih@nic.in" } },
  { state: "Chandigarh", nodal: { name: "Sh Omvir Singh Bishnoi", rank: "DIG", email: "dig-chd@nic.in" }, grievance: { name: "Ms. Nilambari Jagadale", phone: "0172-2760001", email: "pssput-chd@nic.in" } },
  { state: "Chhattisgarh", nodal: { name: "Ms. Manisha Thakur Rawte", rank: "AIGP", email: "aigtech-phq.cg@gov.in" }, grievance: { name: "Sh. R K Vij", phone: "0771-2511623", email: "vijrk@gov.in" } },
  { state: "Dadra and Nagar Haveli", nodal: { name: "Ms. Manasvi Jain", rank: "Dy. SP", email: "dnhp@mha.gov.in" }, grievance: { name: "Sh. Sharad Bhaskar", phone: "0260-2643022", email: "sp-sil-dnh@nic.in" } },
  { state: "Daman and Diu", nodal: { name: "Sh Rajnikant Awadhiya", rank: "DySP", email: "sdpo-daman-dd@gov.in" }, grievance: { name: "Sh. Vikramjit Singh IPS", phone: "0260-2250942", email: "sp-dmn-dd@nic.in" } },
  { state: "Delhi", nodal: { name: "Sh Anyesh Roy", rank: "DCP", email: "acp.cybercell@delhipolice.gov.in" }, grievance: { name: "Mr. Prem Nath", phone: "011-20892633", email: "jtcp-ops-dl@delhipolice.gov.in" } },
  { state: "Goa", nodal: { name: "Sh Pankaj Kumar Singh", rank: "DIGP", email: "picyber@goapolice.gov.in" }, grievance: { name: "Sh. Paramaditya", phone: "0832-2420883", email: "digpgoa@goapolice.gov.in" } },
  { state: "Gujarat", nodal: { name: "Sh Rajesh Gadhiya", rank: "SP", email: "cc-cid@gujarat.gov.in" }, grievance: { name: "Sh. Ajay Tomar", phone: "079-23250798", email: "cc-cid@gujarat.gov.in" } },
  { state: "Haryana", nodal: { name: "Sh Ashwin Shenvi", rank: "SP", email: "sp.crime2pkl@hry.nic.in" }, grievance: { name: "Sh. Kuldip Singh Siag", phone: "01733-253230", email: "igp.crime2-hry@nic.in" } },
  { state: "Himachal Pradesh", nodal: { name: "Sh Narveer Rathore", rank: "DSP", email: "polcyberps-shi-hp@nic.in" }, grievance: { name: "Sh. Sandeep Dhawal", phone: "0177-2627955", email: "sp-cyber-hp@nic.in" } },
  { state: "Jammu and Kashmir", nodal: { name: "Sh Mukesh Singh", rank: "IGP", email: "igcrime-jk@nic.in" }, grievance: { name: "Sh. B Srinivas", phone: "0191-2582996", email: "adgpcidjk@jkpolice.gov.in" } },
  { state: "Jharkhand", nodal: { name: "Ms. Vijaya Laxmi", rank: "SP", email: "cyberps@jhpolice.gov.in" }, grievance: { name: "Sh. Ranjit Prasad", phone: "0651-2490046", email: "ig-orgcid@jhpolice.gov.in" } },
  { state: "Karnataka", nodal: { name: "Sh S. Badrinath", rank: "Dy. SP", email: "badri@ksp.gov.in" }, grievance: { name: "Sh. T D Pawar", phone: "080-22251817", email: "digadmincod@ksp.gov.in" } },
  { state: "Kerala", nodal: { name: "Sh Sreejith", rank: "IGP", email: "igpcrimes.pol@kerala.gov.in" }, grievance: { name: "Sh. Dr. Shaik Darvesh", phone: "0471-2722215", email: "adgpcrimes.pol@kerala.gov.in" } },
  { state: "Lakshadweep", nodal: { name: "Sh Ramdulesh Meena", rank: "DSP", email: "lak-sop@nic.in" }, grievance: { name: "Sh. Shibesh Singh", phone: "04896-262258", email: "lak-sop@nic.in" } },
  { state: "Madhya Pradesh", nodal: { name: "Sh Niranjan B Vayangankar", rank: "DIGP", email: "mpcyberpolice@mppolice.gov.in" }, grievance: { name: "Smt. Aruna Mohan Rao", phone: "0755-2770248", email: "spl.dgp-cybercell@mppolice.gov.in" } },
  { state: "Maharashtra", nodal: { name: "Sh Sanjay Shintre", rank: "SP", email: "sp.cbr-mah@gov.in" }, grievance: { name: "Sh. Brijesh Singh", phone: "8657013913", email: "ig.cbr-mah@gov.in" } },
  { state: "Manipur", nodal: { name: "Ms. Joyce Lalremmawi", rank: "SP", email: "cidcb-mn@nic.in" }, grievance: { name: "Sh. Themthing Ngashangva", phone: "0385-2450573", email: "themthing.ng@gov.in" } },
  { state: "Meghalaya", nodal: { name: "Sh M.G.T Sangma", rank: "SP", email: "sspcid-meg@gov.in" }, grievance: { name: "Sh. F G Kharshiing", phone: "0364-2550141", email: "fg.kharshiing@ips.gov.in" } },
  { state: "Mizoram", nodal: { name: "Sh Lalhuliana.Sanai", rank: "SP", email: "cidcrime-mz@nic.in" }, grievance: { name: "Sh.Balaji Srivastava IPS", phone: "0389-2334682", email: "polmizo@rediffmail.com" } },
  { state: "Nagaland", nodal: { name: "Sh Zekotso Mero", rank: "IGP", email: "cybercrimeps-ngl@gov.in" }, grievance: { name: "Sh. Renchamo P. Kikon", phone: "0370-2223897", email: "renchamo.p@gov.in" } },
  { state: "Odisha", nodal: { name: "Sh Bijay Kr Mallick", rank: "DSP", email: "dirscrb.odpol@nic.in" }, grievance: { name: "Sh. Madkar Sandeep Sampat", phone: "0671-2306071", email: "sp1cidcb.orpol@nic.in" } },
  { state: "Puducherry", nodal: { name: "Sh Mahesh kumar Barnwal", rank: "SSP", email: "cybercell-police.py@gov.in" }, grievance: { name: "Sh. Dr. VJ Chandran", phone: "0413-2231386", email: "dig.pon@nic.in" } },
  { state: "Punjab", nodal: { name: "Sh Inderbir Singh", rank: "AIG", email: "aigcc@punjabpolice.gov.in" }, grievance: { name: "Sh. Hardial Singh Mann", phone: "0172-2226258", email: "aigcc@punjabpolice.gov.in" } },
  { state: "Rajasthan", nodal: { name: "Sh Mohar singh Punia", rank: "Dy. SP", email: "ccps-raj@nic.in" }, grievance: { name: "Sh. Sharat Kaviraj", phone: "0141-2740898", email: "sharat.kaviraj@rajasthan.gov.in" } },
  { state: "Sikkim", nodal: { name: "Sh Manish Kumar Verma", rank: "SP", email: "spcid@sikkimpolice.nic.in" }, grievance: { name: "Sh. Sonam Detchu Bhutia", phone: "03592-204297", email: "spcid@sikkimpolice.nic.in" } },
  { state: "Tamil Nadu", nodal: { name: "Ms. B Shamoondeswari", rank: "SP", email: "spcybercbcid.tnpol@nic.in" }, grievance: { name: "Sh. C Sridhar", phone: "022-28512503", email: "cbcyber@nic.in" } },
  { state: "Telangana", nodal: { name: "Sh B. Ravi Kumar Reddy", rank: "DySP", email: "ccps.cid@tspolice.gov.in" }, grievance: { name: "Smt. Swathi Lakra", phone: "040-23147604", email: "igp_wpc@cid.tspolice.gov.in" } },
  { state: "Tripura", nodal: { name: "Sh Sharmistha Chakraborty", rank: "TPS", email: "spcybercrime@tripurapolice.nic.in" }, grievance: { name: "Shri Subrata Chakraborty", phone: "0381-2321741", email: "aigcrime@tripurapolice.nic.in" } },
  { state: "Uttar Pradesh", nodal: { name: "Sh Vivek Ranjan", rank: "DSP", email: "ccpsnoida@upstf.com" }, grievance: { name: "DR. kalluri SP Kumar", phone: "0522-2208598", email: "ccpsnoida@upstf.com" } },
  { state: "Uttarakhand", nodal: { name: "Ms. Riddhima Aggarwal", rank: "DIG", email: "ccps.deh@uttarakhandpolice.uk.gov.in" }, grievance: { name: "Sh. Deepam Seth", phone: "0135-2712563", email: "dgc-police-ua@nic.in" } },
  { state: "West Bengal", nodal: { name: "Sh Dhruba Das, IPS", rank: "Addl. SP", email: "ccpwb@cidwestbengal.gov.in" }, grievance: { name: "Sh. Ashok Kumar Prasad", phone: "033-24791830", email: "ig2@cidwestbengal.gov.in" } },
];

const norm = (s: string) =>
  s.toLowerCase().replace(/&/g, "and").replace(/[^a-z]/g, "");

/** Free-typed states have to match anyway: "J&K", "NCR Delhi", "TN" all arrive. */
const ALIASES: Record<string, string> = {
  ncrdelhi: "Delhi", newdelhi: "Delhi", delhincr: "Delhi",
  jk: "Jammu and Kashmir", jandk: "Jammu and Kashmir",
  tn: "Tamil Nadu", up: "Uttar Pradesh", mp: "Madhya Pradesh",
  ap: "Andhra Pradesh", ts: "Telangana", wb: "West Bengal",
  hp: "Himachal Pradesh", jandknbsp: "Jammu and Kashmir",
  orissa: "Odisha", pondicherry: "Puducherry", uttaranchal: "Uttarakhand",
  bombay: "Maharashtra", bengaluru: "Karnataka", bangalore: "Karnataka",
  mumbai: "Maharashtra", chennai: "Tamil Nadu", hyderabad: "Telangana",
  kolkata: "West Bengal", pune: "Maharashtra", noida: "Uttar Pradesh",
  gurgaon: "Haryana", gurugram: "Haryana",
};

export function findOfficers(state?: string): StateOfficers | null {
  if (!state) return null;
  const key = norm(state);
  if (!key) return null;
  const alias = ALIASES[key];
  const target = alias ? norm(alias) : key;
  return (
    OFFICERS.find((o) => norm(o.state) === target) ??
    // "Kerala State", "Govt of Bihar" — a contains match is right far more
    // often than it is wrong, and the UI lets them override it anyway.
    OFFICERS.find((o) => target.includes(norm(o.state)) || norm(o.state).includes(target)) ??
    null
  );
}

export function officersForCase(c: CaseFile): StateOfficers | null {
  return findOfficers(c.victim.state);
}
