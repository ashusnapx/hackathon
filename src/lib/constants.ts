// Scraped from cybercrime.gov.in + research data

export const PORTAL_INFO = {
  name: "National Cyber Crime Reporting Portal (NCRP)",
  url: "https://www.cybercrime.gov.in",
  managedBy: "Ministry of Home Affairs, Government of India",
  lastUpdated: "02/02/2024",
  helpline: "1930",
  womenHelpline: "181",
  police: "112",
} as const;

export const CRIME_CATEGORIES = [
  {
    id: "women-child",
    label: "Women/Child Related Crime",
    description: "Online sexual exploitation, CSEAM, Rape/Gang Rape content",
    options: ["Report Anonymously", "Report & Track"],
  },
  {
    id: "financial-fraud",
    label: "Online Financial Fraud",
    description: "UPI, internet banking, card fraud, wallet fraud",
    subcategories: [
      "Debit/Credit Card Fraud",
      "ATM Related Fraud",
      "Internet Banking Related Fraud",
      "UPI Related Fraud",
      "E-Wallet Related Fraud",
      "Cryptocurrency Fraud",
      "Insurance Fraud",
      "Tax/GST Fraud",
    ],
  },
  {
    id: "social-media",
    label: "Online and Social Media Related Crime",
    description: "Fake profiles, cyberbullying, stalking, defamation",
    subcategories: [
      "Cyber Blackmailing/Threatening",
      "Cyber Stalking/Bullying",
      "Defamation",
      "Impersonation",
      "Email Phishing",
      "Dissemination of Obscene Material",
      "Profile Hacking",
      "Fake Social Media Account",
    ],
  },
  {
    id: "hacking",
    label: "Hacking",
    description: "Unauthorized access, data breach, website defacement",
    subcategories: [
      "Website Defacement",
      "Email Hacking",
      "Damage to Computer System",
      "Data Breach",
      "Ransomware",
    ],
  },
  {
    id: "crypto",
    label: "Cryptocurrency Related Crime",
    description: "Crypto fraud, exchange scams, wallet theft",
  },
  {
    id: "trafficking",
    label: "Online Trafficking",
    description: "Human trafficking, drug trafficking online",
  },
  {
    id: "gambling",
    label: "Online Gambling",
    description: "Illegal betting, online casino fraud",
  },
  {
    id: "other",
    label: "Any Other Cyber Crime",
    description: "Any cybercrime not covered above",
  },
] as const;

export const COMPLAINT_FORM_CHECKLIST = {
  mandatory: [
    "Incident Date and Time",
    "Incident details (minimum 200 characters, no special characters #@$@^*'~|!)",
    "National ID copy (Voter ID, Driving License, Passport, PAN Card, Aadhaar Card) — .jpeg/.jpg/.png, max 5MB",
    "For financial fraud: Bank/Wallet/Merchant name, 12-digit Transaction ID/UTR No., Date of transaction, Fraud amount",
    "Soft copies of all relevant evidence (max 10MB each)",
  ],
  optional: [
    "Suspected website URLs / Social Media handles",
    "Suspect details: Mobile No, Email ID, Bank Account No, Address",
    "Photograph of suspect (.jpeg/.jpg/.png, max 5MB)",
    "Any other identifying document",
  ],
} as const;

export const COMPLAINT_STATES = [
  "Submitted",
  "Forwarded to Police",
  "Under Investigation",
  "Closed/Disposed",
] as const;

export const EVIDENCE_TIPS = [
  {
    title: "Screenshot everything",
    description:
      "Chat messages, transaction confirmations, emails, SMS — screenshot before they disappear",
  },
  {
    title: "Note transaction IDs",
    description:
      "UPI reference number, bank transaction ID, UTR number — these are critical for fund recovery",
  },
  {
    title: "Save sender details",
    description:
      "Phone numbers, email addresses, UPI IDs, bank account numbers, URLs — even partial info helps",
  },
  {
    title: "Keep original evidence",
    description:
      "Don't delete the original messages or emails. Forward them to yourself as backup",
  },
] as const;

export const GOLDEN_HOUR_INFO = {
  title: "Golden Hour — Time is Critical",
  description:
    "For financial fraud, the first 60 minutes are crucial. Reporting within the first hour gives ~52% recovery chance. After 24 hours, it drops to ~3%.",
  stats: [
    { label: "Within 1 hour", value: "~52%", description: "recovery chance" },
    { label: "After 24 hours", value: "~3%", description: "recovery chance" },
    {
      label: "Average recovery",
      value: "12-15%",
      description: "of reported losses",
    },
  ],
} as const;

export const USER_QUOTES = [
  {
    text: "I tried 4 times to register a complaint. After 5 minutes the portal got me out. Means no complaint means no fraud as per government.",
    author: "Siddhartha Mukherjee",
    source: "LinkedIn",
  },
  {
    text: "After filling the first page, the site becomes unresponsive. Refreshing asks for OTPs again. Session logs out repeatedly. 8 attempts, still no success.",
    author: "Deep Dave",
    source: "LinkedIn",
  },
  {
    text: "OTP and Captcha fields were completely inactive — you can't click, type, or enter anything in them. Yet clicking Submit threw 'Invalid Captcha' error.",
    author: "Abhishek Verma",
    source: "LinkedIn",
  },
  {
    text: "Some time otp don't come if you are middle of filing complain the web stop. What to do now I am trying from 7 hours.",
    author: "Reddit User",
    source: "r/India",
  },
] as const;

export const STATS = [
  {
    value: "22.5L+",
    label: "complaints filed in 2024-25",
    source: "I4C Annual Report",
  },
  {
    value: "78%",
    label: "are financial frauds",
    source: "I4C Annual Report",
  },
  {
    value: "~₹11,800Cr",
    label: "reported losses in 2024",
    source: "I4C Annual Report",
  },
  {
    value: "12-15%",
    label: "average recovery rate",
    source: "I4C Annual Report",
  },
] as const;

export const FAQ_ITEMS = [
  {
    question: "Is this the official government portal?",
    answer:
      "No. This is an independent tool built to help you prepare and file complaints more easily. We guide you through the process and link you to the official cybercrime.gov.in portal for final submission. We are not affiliated with any government body.",
  },
  {
    question: "Is my data safe?",
    answer:
      "We don't store your personal data on our servers. Your complaint details are saved locally in your browser and only transmitted when you choose to submit to the official portal. We recommend clearing local data after filing.",
  },
  {
    question: "What's the difference between a complaint and an FIR?",
    answer:
      "A complaint filed on cybercrime.gov.in generates a complaint number, not an FIR. The portal routes your complaint to the jurisdictional police station. An FIR is formally registered by the police under BNSS §173. For financial fraud, filing on the portal triggers the bank-freeze mechanism via 1930. For full legal process, you may need to visit a police station to register an FIR separately.",
  },
  {
    question: "Should I also call 1930?",
    answer:
      "Yes, especially for financial fraud. Call 1930 immediately — it's the National Cyber Crime Helpline (24/7). The first hour is critical for freezing fraudulent transactions. After reporting on 1930, file your complaint on cybercrime.gov.in within 24 hours with your acknowledgement number.",
  },
  {
    question: "How do I track my complaint after filing?",
    answer:
      "After submission, you'll receive a complaint reference number via SMS and email. Use the 'Track Your Complaint' feature on cybercrime.gov.in. Your complaint is forwarded to the concerned State/UT cyber cell. Status flow: Submitted → Forwarded → Under Investigation → Closed.",
  },
  {
    question: "What if the portal doesn't work or times out?",
    answer:
      "The official portal has known session timeout issues. Our tool auto-saves your progress so you don't lose work. If the portal still times out, you can file a written complaint at your nearest Cyber Crime Police Station with your evidence and acknowledgement number.",
  },
] as const;

export const REPORT_STEPS = [
  {
    number: 1,
    title: "Tell us what happened",
    description: "Select category and describe the incident",
    time: "~2 min",
  },
  {
    number: 2,
    title: "Upload evidence",
    description: "Screenshots, transactions, messages",
    time: "~1 min",
  },
  {
    number: 3,
    title: "Your details",
    description: "Contact info and location",
    time: "~1 min",
  },
  {
    number: 4,
    title: "Review & submit",
    description: "Check everything, then file",
    time: "~30 sec",
  },
] as const;

export const NAV_ITEMS = [
  { label: "How It Works", href: "#how-it-works" },
  { label: "FAQ", href: "#faq" },
] as const;
