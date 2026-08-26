import jsPDF from "jspdf";
import type { ReportData } from "./use-report-data";
import { CRIME_CATEGORIES } from "./constants";

const BNS_SECTIONS: Record<string, { section: string; description: string }[]> = {
  "financial-fraud": [
    { section: "BNS §318", description: "Cheating (formerly IPC §420)" },
    { section: "BNS §316", description: "Criminal breach of trust (formerly IPC §406)" },
    { section: "BNS §61", description: "Criminal conspiracy (formerly IPC §120B)" },
    { section: "IT Act §66D", description: "Cheating by impersonation using computer resource" },
    { section: "IT Act §66C", description: "Identity theft" },
  ],
  "social-media": [
    { section: "BNS §356", description: "Defamation (formerly IPC §499)" },
    { section: "BNS §351", description: "Criminal intimidation (formerly IPC §506)" },
    { section: "BNS §63", description: "Stalking (formerly IPC §354D)" },
    { section: "IT Act §66A", description: "Sending offensive messages (struck down but relevant)" },
    { section: "IT Act §67", description: "Publishing obscene material" },
  ],
  "women-child": [
    { section: "BNS §63", description: "Rape (formerly IPC §376)" },
    { section: "BNS §67", description: "Sexual harassment (formerly IPC §354A)" },
    { section: "BNS §74", description: "Assault on woman with intent to outrage modesty" },
    { section: "IT Act §67A", description: "Publishing sexual explicit material" },
    { section: "POCSO Act", description: "Protection of Children from Sexual Offences" },
  ],
  hacking: [
    { section: "IT Act §66", description: "Computer-related offences" },
    { section: "IT Act §66A", description: "Sending offensive messages" },
    { section: "IT Act §66F", description: "Cyber terrorism" },
    { section: "BNS §223", description: "Criminal misconduct (formerly IPC §405)" },
  ],
  crypto: [
    { section: "BNS §318", description: "Cheating (formerly IPC §420)" },
    { section: "IT Act §66D", description: "Cheating by impersonation" },
    { section: "BNS §61", description: "Criminal conspiracy" },
    { section: "PMLA §3", description: "Money laundering (if applicable)" },
  ],
  trafficking: [
    { section: "BNS §143", description: "Human trafficking (formerly IPC §370)" },
    { section: "BNS §144", description: "Trafficking of minor" },
    { section: "IT Act §67", description: "Publishing obscene material" },
  ],
  gambling: [
    { section: "BNS §223", description: "Public gambling (formerly IPC §3)" },
    { section: "IT Act §66A", description: "Online gambling regulation" },
    { section: "State Gambling Acts", description: "Applicable state-specific laws" },
  ],
  other: [
    { section: "BNS §318", description: "Cheating (formerly IPC §420)" },
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

function formatDate(dateStr: string): string {
  if (!dateStr) return "Not specified";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function generatePDF(data: ReportData, trackingId: string) {
  const doc = new jsPDF("p", "mm", "a4");
  const pageW = 210;
  const margin = 20;
  const contentW = pageW - 2 * margin;
  let y = 20;

  const addLine = () => {
    doc.setDrawColor(200);
    doc.line(margin, y, pageW - margin, y);
    y += 4;
  };

  const checkPage = (needed: number) => {
    if (y + needed > 270) {
      doc.addPage();
      y = 20;
    }
  };

  // ── Header ──
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text("INDEPENDENT CYBERCRIME COMPLAINT", margin, y);
  doc.text(`Generated: ${new Date().toLocaleDateString("en-IN")}`, pageW - margin, y, { align: "right" });
  y += 8;

  doc.setFontSize(18);
  doc.setTextColor(37, 99, 235);
  doc.text("CYBERCOMPLAINT", margin, y);
  y += 7;

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text("Guided Cybercrime Complaint — Prepare Before Filing on NCRP", margin, y);
  y += 8;

  addLine();

  // ── Tracking ID ──
  doc.setFontSize(12);
  doc.setTextColor(22, 163, 74);
  doc.text(`Tracking ID: ${trackingId}`, margin, y);
  y += 8;

  // ── Complainant Details ──
  doc.setFontSize(13);
  doc.setTextColor(30);
  doc.text("1. COMPLAINANT DETAILS", margin, y);
  y += 7;

  doc.setFontSize(10);
  doc.setTextColor(60);
  const details: [string, string][] = [
    ["Full Name", data.name || "—"],
    ["Email", data.email || "—"],
    ["Phone", data.phone ? `+91 ${data.phone}` : "—"],
    ["State", data.state || "—"],
    ["District", data.district || "—"],
  ];

  details.forEach(([label, value]) => {
    doc.setFont("helvetica", "bold");
    doc.text(`${label}:`, margin, y);
    doc.setFont("helvetica", "normal");
    doc.text(value, margin + 35, y);
    y += 6;
  });
  y += 4;

  // ── Incident Details ──
  checkPage(40);
  doc.setFontSize(13);
  doc.setTextColor(30);
  doc.text("2. INCIDENT DETAILS", margin, y);
  y += 7;

  doc.setFontSize(10);
  doc.setTextColor(60);
  const cat = CRIME_CATEGORIES.find((c) => c.id === data.category);
  const incDetails: [string, string][] = [
    ["Crime Category", CRIME_LABELS[data.category] || data.category],
    ["Sub-Category", data.subcategory || "—"],
    ["Date of Incident", formatDate(data.date)],
    ["Time of Incident", data.time || "Not specified"],
    ["Location/Platform", data.location || "Not specified"],
    ["Financial Loss", data.lostMoney ? `₹${Number(data.amount).toLocaleString("en-IN")}` : "No financial loss"],
  ];

  incDetails.forEach(([label, value]) => {
    doc.setFont("helvetica", "bold");
    doc.text(`${label}:`, margin, y);
    doc.setFont("helvetica", "normal");
    doc.text(value, margin + 35, y);
    y += 6;
  });

  y += 2;
  doc.setFont("helvetica", "bold");
  doc.text("Description of Incident:", margin, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  const descLines = doc.splitTextToSize(data.description || "—", contentW);
  doc.text(descLines, margin, y);
  y += descLines.length * 5 + 4;

  // ── Applicable Laws ──
  checkPage(50);
  doc.setFontSize(13);
  doc.setTextColor(30);
  doc.text("3. APPLICABLE LAWS & SECTIONS", margin, y);
  y += 7;

  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text("The following sections may apply based on the crime category:", margin, y);
  y += 6;

  const sections = BNS_SECTIONS[data.category] || BNS_SECTIONS.other;

  doc.setFontSize(10);
  doc.setTextColor(60);
  sections.forEach(({ section, description }) => {
    checkPage(10);
    doc.setFont("helvetica", "bold");
    doc.text(section, margin + 2, y);
    doc.setFont("helvetica", "normal");
    doc.text(`— ${description}`, margin + 35, y);
    y += 6;
  });
  y += 4;

  // ── Evidence ──
  checkPage(30);
  doc.setFontSize(13);
  doc.setTextColor(30);
  doc.text("4. EVIDENCE & DOCUMENTS", margin, y);
  y += 7;

  doc.setFontSize(10);
  doc.setTextColor(60);
  if (data.files.length > 0) {
    doc.text(`${data.files.length} file(s) attached:`, margin, y);
    y += 5;
    data.files.forEach((f) => {
      doc.text(`• ${f.name} (${(f.size / 1024).toFixed(1)} KB)`, margin + 4, y);
      y += 5;
    });
  } else {
    doc.text("No files attached. Attach evidence before filing.", margin, y);
    y += 5;
  }

  if (data.notes) {
    y += 2;
    doc.setFont("helvetica", "bold");
    doc.text("Additional Notes:", margin, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    const noteLines = doc.splitTextToSize(data.notes, contentW);
    doc.text(noteLines, margin, y);
    y += noteLines.length * 5 + 4;
  }
  y += 4;

  // ── Legal Declaration ──
  checkPage(40);
  doc.setFontSize(13);
  doc.setTextColor(30);
  doc.text("5. LEGAL DECLARATION", margin, y);
  y += 7;

  doc.setFontSize(9);
  doc.setTextColor(60);
  const declaration = [
    "I hereby declare that the information provided above is true and accurate to the best of my knowledge and belief.",
    "I understand that filing a false complaint is punishable under Section 217 of the Bharatiya Nyaya Sanhita (BNS), 2023",
    "(formerly Section 182 of the Indian Penal Code) which provides for imprisonment up to 6 months, or fine, or both.",
    "",
    "I further understand that this is a preparatory document and does not constitute a formal FIR or complaint.",
    "To file a formal complaint, I must:",
    "  (a) Visit https://www.cybercrime.gov.in and submit using the Tracking ID above, OR",
    "  (b) Visit the nearest Cyber Crime Police Station with this document and evidence, OR",
    "  (c) Call 1930 (National Cyber Crime Helpline) for immediate assistance.",
  ];

  declaration.forEach((line) => {
    checkPage(6);
    const lines = doc.splitTextToSize(line, contentW);
    doc.text(lines, margin, y);
    y += lines.length * 4.5 + 1;
  });
  y += 6;

  // ── Signature ──
  checkPage(25);
  addLine();
  doc.setFontSize(10);
  doc.setTextColor(60);
  doc.text("Complainant Signature:", margin, y + 10);
  doc.text("_________________________", margin, y + 18);
  doc.text(`Date: ${new Date().toLocaleDateString("en-IN")}`, pageW - margin, y + 18, { align: "right" });
  y += 28;

  // ── Footer ──
  addLine();
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text(
    "This document was generated by CyberComplaint (cybercomplaint.in) — an independent tool not affiliated with any government body.",
    margin,
    y
  );
  y += 4;
  doc.text("Official portal: https://www.cybercrime.gov.in | Helpline: 1930", margin, y);

  // ── Save ──
  doc.save(`CyberComplaint-${trackingId}.pdf`);
}
