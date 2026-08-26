import jsPDF from "jspdf";
import type { ReportData } from "./use-report-data";
import { CRIME_CATEGORIES } from "./constants";

const BNS_SECTIONS: Record<string, { section: string; description: string }[]> = {
  "financial-fraud": [
    { section: "BNS §318", description: "Cheating" },
    { section: "BNS §316", description: "Criminal breach of trust" },
    { section: "BNS §61", description: "Criminal conspiracy" },
    { section: "IT Act §66D", description: "Cheating by impersonation using computer resource" },
    { section: "IT Act §66C", description: "Identity theft" },
  ],
  "social-media": [
    { section: "BNS §356", description: "Defamation" },
    { section: "BNS §351", description: "Criminal intimidation" },
    { section: "BNS §63", description: "Stalking" },
    { section: "IT Act §67", description: "Publishing obscene material" },
  ],
  "women-child": [
    { section: "BNS §63", description: "Rape" },
    { section: "BNS §67", description: "Sexual harassment" },
    { section: "BNS §74", description: "Assault on woman with intent to outrage modesty" },
    { section: "IT Act §67A", description: "Publishing sexual explicit material" },
    { section: "POCSO Act", description: "Protection of Children from Sexual Offences" },
  ],
  hacking: [
    { section: "IT Act §66", description: "Computer-related offences" },
    { section: "IT Act §66F", description: "Cyber terrorism" },
  ],
  crypto: [
    { section: "BNS §318", description: "Cheating" },
    { section: "IT Act §66D", description: "Cheating by impersonation" },
    { section: "PMLA §3", description: "Money laundering (if applicable)" },
  ],
  trafficking: [
    { section: "BNS §143", description: "Human trafficking" },
    { section: "BNS §144", description: "Trafficking of minor" },
  ],
  gambling: [
    { section: "BNS §223", description: "Public gambling" },
    { section: "State Gambling Acts", description: "Applicable state laws" },
  ],
  other: [
    { section: "BNS §318", description: "Cheating" },
    { section: "IT Act §43", description: "Penalty for damage to computer system" },
    { section: "IT Act §66", description: "Computer-related offences" },
  ],
};

const CRIME_LABELS: Record<string, string> = {
  "women-child": "Women/Child Related Crime",
  "financial-fraud": "Online Financial Fraud",
  "social-media": "Online and Social Media Related Crime",
  hacking: "Hacking",
  crypto: "Cryptocurrency Related Crime",
  trafficking: "Online Trafficking",
  gambling: "Online Gambling",
  other: "Any Other Cyber Crime",
};

function fmtDate(d: string) {
  if (!d) return "___/___/______";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function generatePDF(data: ReportData, trackingId: string) {
  const doc = new jsPDF("p", "mm", "a4");
  const W = 210;
  const H = 297;
  const ML = 25;
  const MR = 25;
  const CW = W - ML - MR;
  let y = 0;

  const line = (yy: number) => {
    doc.setDrawColor(180);
    doc.setLineWidth(0.3);
    doc.line(ML, yy, W - MR, yy);
  };

  const checkPage = (need: number) => {
    if (y + need > H - 20) {
      doc.addPage();
      y = 25;
    }
  };

  // ── TOP BORDER ──
  doc.setDrawColor(37, 99, 235);
  doc.setLineWidth(0.8);
  doc.line(15, 12, W - 15, 12);
  doc.setLineWidth(0.3);
  doc.line(15, 14, W - 15, 14);

  y = 22;

  // ── HEADER ──
  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text("CONFIDENTIAL — CYBERCRIME COMPLAINT APPLICATION", ML, y);
  doc.text(`Ref: CC-${trackingId}`, W - MR, y, { align: "right" });
  y += 4;
  doc.text(`Date of Generation: ${new Date().toLocaleDateString("en-IN")}`, ML, y);
  y += 8;

  // ── TITLE ──
  doc.setFontSize(16);
  doc.setTextColor(30);
  doc.text("APPLICATION FOR CYBERCRIME COMPLAINT", W / 2, y, { align: "center" });
  y += 6;
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text("Under the Bharatiya Nyaya Sanhita, 2023 and Information Technology Act, 2000", W / 2, y, { align: "center" });
  y += 10;

  line(y);
  y += 8;

  // ── TO ──
  doc.setFontSize(10);
  doc.setTextColor(30);
  doc.setFont("helvetica", "bold");
  doc.text("To,", ML, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.text("The Station House Officer (SHO),", ML, y);
  y += 5;
  doc.text("________________________________ Police Station,", ML, y);
  y += 5;
  doc.text("________________________________ District,", ML, y);
  y += 5;
  doc.text("________________________________ State.", ML, y);
  y += 10;

  // ── FROM ──
  doc.setFont("helvetica", "bold");
  doc.text("From,", ML, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.text(`${data.name || "____________________________"}`, ML, y);
  y += 5;
  doc.text(`${data.district || "____________"}, ${data.state || "____________"}`, ML, y);
  y += 5;
  doc.text(`Phone: ${data.phone ? `+91 ${data.phone}` : "___________________"}`, ML, y);
  y += 5;
  doc.text(`Email: ${data.email || "____________________________"}`, ML, y);
  y += 10;

  // ── SUBJECT ──
  line(y);
  y += 6;
  doc.setFont("helvetica", "bold");
  doc.text("SUBJECT:", ML, y);
  doc.setFont("helvetica", "normal");
  doc.text(
    `Complaint regarding ${CRIME_LABELS[data.category] || "cybercrime"} — ${data.subcategory || ""}`.trim(),
    ML + 18,
    y
  );
  y += 5;
  doc.text(`Tracking ID: CC-${trackingId}`, ML + 18, y);
  y += 10;

  // ── RESPECTED SIR/MADAM ──
  doc.setFont("helvetica", "normal");
  const salutation = "Respected Sir/Madam,";
  doc.text(salutation, ML, y);
  y += 7;

  const introLines = doc.splitTextToSize(
    `I, ${data.name || "the undersigned"}, son/daughter of ________________, residing at ${data.district || "____________"}, ${data.state || "____________"}, do hereby solemnly affirm and state as follows:`,
    CW
  );
  doc.text(introLines, ML, y);
  y += introLines.length * 5 + 8;

  // ── SECTION A: INCIDENT ──
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("A. DETAILS OF THE INCIDENT", ML, y);
  y += 7;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const incidentFields: [string, string][] = [
    ["1. Date of Incident", fmtDate(data.date)],
    ["2. Time of Incident", data.time || "___:___ AM/PM"],
    ["3. Place/Platform", data.location || "________________________________"],
    ["4. Crime Category", CRIME_LABELS[data.category] || data.category],
    ["5. Sub-Category", data.subcategory || "________________________________"],
  ];

  incidentFields.forEach(([label, val]) => {
    doc.setFont("helvetica", "bold");
    doc.text(label + ":", ML + 2, y);
    doc.setFont("helvetica", "normal");
    doc.text(val, ML + 50, y);
    y += 6;
  });

  if (data.lostMoney) {
    doc.setFont("helvetica", "bold");
    doc.text("6. Amount Lost (INR):", ML + 2, y);
    doc.setFont("helvetica", "normal");
    doc.text(
      `Rs. ${Number(data.amount).toLocaleString("en-IN")}/- (${amountWords(Number(data.amount))})`,
      ML + 50,
      y
    );
    y += 6;
  }

  y += 3;

  // ── SECTION B: DESCRIPTION ──
  checkPage(40);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("B. NARRATIVE OF THE INCIDENT", ML, y);
  y += 7;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const descLines = doc.splitTextToSize(
    data.description || "________________________________________________________________________",
    CW
  );
  doc.text(descLines, ML, y);
  y += descLines.length * 5 + 8;

  // ── SECTION C: APPLICABLE LAWS ──
  checkPage(40);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("C. APPLICABLE LAWS AND SECTIONS", ML, y);
  y += 7;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80);
  doc.text("The following provisions of law are attracted in the present case:", ML, y);
  y += 6;

  const sections = BNS_SECTIONS[data.category] || BNS_SECTIONS.other;

  // Table header
  doc.setFillColor(245, 245, 245);
  doc.rect(ML, y, CW, 7, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(30);
  doc.text("Section", ML + 2, y + 5);
  doc.text("Description", ML + 30, y + 5);
  y += 7;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(50);
  sections.forEach(({ section, description }) => {
    checkPage(8);
    doc.text(section, ML + 2, y + 4);
    const descLines = doc.splitTextToSize(description, CW - 30);
    doc.text(descLines[0], ML + 30, y + 4);
    y += 7;
  });
  y += 6;

  // ── SECTION D: EVIDENCE ──
  checkPage(25);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(30);
  doc.text("D. EVIDENCE AND DOCUMENTS", ML, y);
  y += 7;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  if (data.files.length > 0) {
    doc.text(`The following ${data.files.length} document(s) are enclosed herewith:`, ML, y);
    y += 6;
    data.files.forEach((f, i) => {
      doc.text(`${i + 1}. ${f.name} (${(f.size / 1024).toFixed(1)} KB)`, ML + 4, y);
      y += 5;
    });
  } else {
    doc.text("Documents to be attached separately.", ML, y);
    y += 5;
  }

  if (data.notes) {
    y += 2;
    doc.setFont("helvetica", "bold");
    doc.text("Additional Notes:", ML, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    const noteLines = doc.splitTextToSize(data.notes, CW);
    doc.text(noteLines, ML, y);
    y += noteLines.length * 5 + 4;
  }
  y += 4;

  // ── SECTION E: PRAYER ──
  checkPage(50);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("E. PRAYER / RELIEF SOUGHT", ML, y);
  y += 7;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const prayers = [
    "That the above complaint may be registered and investigated in accordance with law.",
    "That the accused may be traced and prosecuted under the applicable provisions of BNS and IT Act.",
    data.lostMoney
      ? "That urgent action may be taken to freeze the fraudulent accounts and recover the lost amount under the provisions of Section 43A of the IT Act and relevant banking regulations."
      : "That necessary action may be taken as per law.",
    "That the complainant may be informed of the progress of investigation from time to time.",
  ];

  prayers.forEach((p, i) => {
    checkPage(8);
    const pLines = doc.splitTextToSize(`${i + 1}. ${p}`, CW);
    doc.text(pLines, ML, y);
    y += pLines.length * 5 + 3;
  });
  y += 6;

  // ── DECLARATION ──
  checkPage(35);
  line(y);
  y += 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("DECLARATION", ML, y);
  y += 7;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const decl = doc.splitTextToSize(
    "I hereby declare that the contents of this application are true and correct to the best of my knowledge and belief. I am aware that making a false complaint is an offence punishable under Section 217 of the Bharatiya Nyaya Sanhita, 2023 (formerly Section 182 of the Indian Penal Code), which entails imprisonment up to six months, or fine up to Rs. 1,000, or both.",
    CW
  );
  doc.text(decl, ML, y);
  y += decl.length * 5 + 12;

  // ── SIGNATURE BLOCK ──
  checkPage(35);

  // Left: Complainant
  doc.setFont("helvetica", "bold");
  doc.text("Complainant", ML, y);
  y += 20;
  line(y);
  y += 4;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Name: ${data.name || ""}`, ML, y);
  y += 5;
  doc.text(`Date: ___/___/______`, ML, y);
  y += 10;

  // Right: Police Station
  const rx = W / 2 + 10;
  let ry = y - 30;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("For Office Use Only", rx, ry);
  ry += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("FIR No.: _______________", rx, ry);
  ry += 5;
  doc.text("Date of Registration: ___/___/______", rx, ry);
  ry += 5;
  doc.text("Investigating Officer: _______________", rx, ry);
  ry += 5;
  doc.text("Station Stamp & Seal:", rx, ry);
  ry += 20;
  line(ry);
  ry += 4;
  doc.text("SHO Signature: _______________", rx, ry);

  // ── BOTTOM BORDER ──
  doc.setDrawColor(37, 99, 235);
  doc.setLineWidth(0.8);
  doc.line(15, H - 12, W - 15, H - 12);
  doc.setLineWidth(0.3);
  doc.line(15, H - 14, W - 15, H - 14);

  // ── FOOTER ──
  doc.setFontSize(7);
  doc.setTextColor(150);
  doc.text(
    "Generated by CyberComplaint — An independent tool not affiliated with any government body. | cybercrime.gov.in | 1930",
    W / 2,
    H - 8,
    { align: "center" }
  );

  doc.save(`CyberComplaint-Application-${trackingId}.pdf`);
}

function amountWords(n: number): string {
  if (n === 0) return "Zero";
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  const convert = (num: number): string => {
    if (num < 20) return ones[num];
    if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 ? " " + ones[num % 10] : "");
    if (num < 1000) return ones[Math.floor(num / 100)] + " Hundred" + (num % 100 ? " and " + convert(num % 100) : "");
    if (num < 100000) return convert(Math.floor(num / 1000)) + " Thousand" + (num % 1000 ? " " + convert(num % 1000) : "");
    if (num < 10000000) return convert(Math.floor(num / 100000)) + " Lakh" + (num % 100000 ? " " + convert(num % 100000) : "");
    return convert(Math.floor(num / 10000000)) + " Crore" + (num % 10000000 ? " " + convert(num % 10000000) : "");
  };

  return convert(n) + " Only";
}
