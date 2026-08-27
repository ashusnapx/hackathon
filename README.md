# Kavach

**The first hour, and the ninety days after.**

A cybercrime reporting assistant for India. Built for the
[Build What Moves India](https://buildwhatmovesindia.com) hackathon.

> Independent tool. Not affiliated with, endorsed by, or connected to any
> government body. It cannot submit anything on a citizen's behalf, and every
> reference number it generates is mock.

---

## The problem we actually went after

The obvious build here is a nicer version of the form on cybercrime.gov.in. We
started there and threw it away, because filing the complaint is roughly one
percent of the job.

What a fraud victim in India is actually facing is **eight separate obligations,
most of them on a clock, and nobody hands them the list**:

| # | What has to happen | Deadline | Where it comes from |
|---|---|---|---|
| I | Call 1930 | first hour | only mechanism that can freeze the money |
| II | File on the NCRP portal | 24 hours | creates the record, routes to the state cyber unit |
| III | **Notify your own bank in writing** | **3 working days** | RBI circular on unauthorised electronic transactions — liability becomes zero |
| IV | Get an FIR registered | as soon as possible | a portal complaint is *not* an FIR (BNSS s.173) |
| V | Report the number on Chakshu | any time | disconnects the fraudster's SIM |
| VI | Provisional credit from the bank | 10 working days after III | same RBI circular |
| VII | Escalate to the RBI Ombudsman | 30 days after III | free, online, banks often settle on filing |
| VIII | The bank's outer limit | 90 days after III | compensation becomes payable past this |

Track III is the one that matters most and the one almost nobody is told about.
Miss it and the citizen personally absorbs a loss the bank was obliged to carry.

Layered on top of that: **88% of Indians online prefer a language other than
English**, and two in five people in rural India search by voice because typing
is not realistic — but a police station wants a typed English narrative, and the
NCRP description box rejects most punctuation and demands 200+ characters.
Today the victim absorbs that gap.

## What Kavach does

1. **Speak or type in your own language.** No login, no OTP, no captcha.
2. **AI triage.** Classifies against the real NCRP category tree, extracts every
   UPI ID / UTR / phone / amount, infers the incident time, and rewrites the
   account as formal English suitable for a police application.
3. **A case file, with all eight clocks running** from the incident time —
   computed against the Indian banking calendar, so "three working days" skips
   Sundays and the second and fourth Saturdays.
4. **Every document written.** The NCRP description (inside the portal's own
   character rules), a 1930 call script, a bank dispute letter citing the RBI
   circular, an FIR application citing IT Act ss.66C/66D and BNS s.318, a
   Chakshu report, and an Ombudsman complaint.
5. **The citizen reads it in their language; the authorities get English.**

## Running it

```bash
npm install
cp .env.example .env.local     # add OPENAI_API_KEY for the live AI path
npm run dev
```

**It works with no API key.** Every AI route falls back to a deterministic rules
engine (`src/lib/ai/fallback.ts`) that classifies by keyword, extracts
identifiers by regex, and fills real document templates. The interface says
"demo mode" rather than implying a model ran. This is the degraded mode, not a
stub — somebody filing at 2am on a patchy connection still walks away with a
complete case pack.

## How the AI is wired

`src/lib/ai/provider.ts` is a thin client written against the OpenAI HTTP API
rather than the SDK, so the same code path works against any OpenAI-compatible
endpoint. `OPENAI_BASE_URL` is the only knob — useful because the voice side is
meant to run on an Indian-language speech provider while the reasoning stays on
OpenAI.

| Route | Model | Job |
|---|---|---|
| `/api/ai/triage` | `gpt-5` | classify, extract, infer time, render into English |
| `/api/ai/extract` | `gpt-5` | separate the *fraudster's* identifiers from the victim's |
| `/api/ai/draft` | `gpt-5` | write all six documents |
| `/api/ai/translate` | `gpt-5` | render a generated document into the citizen's language |
| `/api/ai/transcribe` | `gpt-4o-transcribe` | speech to text when the browser can't |
| `/api/ai/ask` | `gpt-5-mini` | answer questions grounded in the case file |

Two deliberate choices:

- **Regex runs first, and independently.** A UTR number is twelve digits — a
  regular expression gets that right every time and a language model
  occasionally does not. The model's job is what regex cannot do: reading
  "eighty-five thousand", and deciding whether an account number belongs to the
  fraudster or the victim. We run both and merge.
- **Structured outputs, strict.** Every call uses `json_schema` with
  `strict: true`, so a response either matches our TypeScript types or we fall
  back. There is no defensive parsing of half-formed JSON in the request path.

The prompts (`src/lib/ai/prompts.ts`) forbid inventing a fact — anything missing
stays a `[square-bracketed placeholder]`, because a fabricated UTR number in a
police application is worse than a blank one — and forbid echoing an Aadhaar
number, PAN, PIN, password or OTP into any output.

## Languages

The picker offers all 22 languages of the Eighth Schedule plus English, with
correct scripts and RTL for Urdu, Kashmiri and Sindhi. Fonts are one Noto family
per script, `preload: false`, so a citizen reading in Tamil never downloads the
Malayalam font.

**The interface itself is hand-translated into English, Hindi, Marathi and
Kannada.** The other nineteen fall back to English in the interface and are
marked `EN` in the picker — we would rather say so than quietly render English
under a Santali label. Generated documents can be translated into any of the 23
via the model at runtime.

Adding a language is one file in `src/lib/i18n/dict/` plus one line in
`src/lib/i18n/loader.ts`. Dictionaries are typed against the English one, so a
missing key is a compile error, and partial dictionaries fall through to English
key by key rather than rendering blanks.

## What is real, and what is mocked

**Real:** voice and text intake; AI classification against the official category
tree; identifier extraction; all eight deadline clocks computed from real RBI
and BNSS timelines against the Indian banking calendar; all six generated
documents; the downloadable PDF case pack; case files surviving a closed
browser.

**Mocked, on purpose:** nothing is submitted to cybercrime.gov.in — the citizen
copies the text across themselves; complaint status and police-station routing
are simulated; there is no OTP, login, Aadhaar or PAN anywhere; reference numbers
are generated locally and are not government numbers; the case file lives in
`localStorage` only, with no server database.

This is stated on the landing page itself, not just here.

## If this were real

Kavach is deliberately shaped as a layer *beside* the portal, not a replacement
for it. At scale it would submit through an authenticated I4C integration rather
than the clipboard; keep case files in an encrypted store with the citizen
holding the key; run the deadline engine as a scheduled job that sends SMS
rather than needing a tab open; and hand police a structured, machine-readable
case instead of a paragraph. Nothing in the design assumes the citizen has a
fast phone or a stable connection.

## Stack

Next.js 16 (App Router), React 19, TypeScript, Tailwind v4, jsPDF. No component
library, no animation library, no smooth-scroll library — the design system is
~280 lines of CSS in `src/app/globals.css`, and the "works on a slow phone"
claim on the landing page has to survive contact with the bundle.

```
src/
  app/
    page.tsx              landing
    start/                voice + text triage
    case/[id]/            the case file
    api/ai/               seven routes, each with a rules-engine fallback
  components/
    landing/  start/  case/  ui/
    LanguageSwitcher.tsx
  lib/
    ai/        provider, prompts, deterministic extraction, rules engine
    case/      types, the eight tracks, banking-calendar math, store, PDF pack
    i18n/      23 languages, lazy dictionaries, script-aware fonts
```

## Helplines

**1930** cyber fraud, 24×7 · **1091** women's helpline · **112** emergency ·
**14416** Tele-MANAS
