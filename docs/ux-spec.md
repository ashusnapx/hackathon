# UX Specification — CyberComplaint

## Context
Indian citizens filing cybercrime complaints through the official NCRP portal (cybercrime.gov.in) face broken sessions, OTP failures, captcha errors, and confusing forms. This tool wraps the process with auto-save, guided flows, and plain language.

## Target Users
- Stressed users who just lost money to fraud
- Mobile-first (60%+ traffic from phones)
- Low-to-moderate digital literacy
- Need to file fast — golden hour matters for financial fraud

## User Journey

### Landing → File Complaint
1. User arrives (often from Google or social media)
2. Sees emergency callout (1930 helpline) — immediate trust
3. Reads one-line value prop: "The government portal is broken. We made a better one."
4. Clicks "Start Report" → guided form flow

### File Complaint Flow
1. **Tell us what happened** (~2 min) — category selection, plain-language incident description
2. **Upload evidence** (~1 min) — screenshots, transaction IDs, messages
3. **Your details** (~1 min) — contact info, location
4. **Review & submit** (~30 sec) — check everything, then file to NCRP

### Post-Filing
- Receipt PDF download
- Complaint tracking via reference number
- Status updates: Submitted → Forwarded → Under Investigation → Closed

## Key UX Decisions

### Auto-Save
- Progress saves to localStorage on every step
- User can close browser and return later
- No account required — local storage only

### Golden Hour Timer
- Prominent countdown for financial fraud
- Stats: 52% recovery within 1 hour → 3% after 24 hours
- Drives urgency without anxiety

### Plain Language
- No legal jargon in forms
- "What happened?" not "Incident Description (min 200 chars)"
- Validation messages explain *why*, not just *what*

### Trust Signals
- Auto-saves progress
- Golden hour timer
- 22.5L+ complaints filed (social proof)
- Not affiliated with government (transparency)

### Emergency Fallback
- 1930 helpline always visible
- Emergency callout in hero
- Footer repeats all emergency numbers

## Pain Points Addressed
| Official Portal | This Tool |
|----------------|-----------|
| Session timeout loses work | Auto-saves every step |
| OTP failures block progress | Guided flow, OTP handled upstream |
| Captcha errors on submit | We prepare, portal submits |
| Confusing form fields | Plain language + examples |
| No mobile optimization | Mobile-first responsive |
| No progress tracking | Status flow + tracking link |

## Accessibility
- Mobile-first responsive design
- High contrast text on light background
- Semantic HTML structure
- Keyboard navigable
- Screen reader friendly labels

## Content Strategy
- Hero: 3 lines max. Emergency callout → headline → one subhead
- Social Proof: One big stat (78%) + two urgency cards
- How It Works: 3 steps, 5 words each
- FAQ: 6 items covering data safety, portal differences, tracking
- Footer: CTA repeat + emergency numbers + disclaimer

## Error Handling
- Form validation with helpful messages
- Auto-save prevents data loss
- Fallback instructions if portal is down
- Clear next steps after filing
