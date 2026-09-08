# Measuring the claim

This project holds every legal claim to a source and every statistic to a
primary document. Its central claim — that reporting here is easier than
reporting on the portal — has never been measured against a person.

`src/lib/report/benchmark.ts` closes the structural half: the portal will not
submit without **16** fields; this prototype blocks on **3**. Those are counted
from the schema and tested, so they cannot drift.

Counting fields is not measuring people. A form with three questions can still
be slower than one with sixteen if the three are badly asked, and nothing in the
codebase would notice. This is the protocol for finding out.

It needs five people and about two hours. That is not a shortcut — five is the
point at which usability testing stops finding new problems per participant, and
a sixth is worth less than fixing what the first five found.

---

## Who to sit down

Not five developers. The product is built for a specific person and the test is
worthless without them:

| # | Who | Why |
|---|---|---|
| 1 | Over 55, reading glasses | The accessibility controls exist for them |
| 2 | Comfortable speaking, not typing, a language other than English | The voice path is the whole thesis |
| 3 | Under 25, fast on a phone | Finds the places the pace is patronising |
| 4 | Has actually been defrauded | The only one who knows what the state feels like |
| 5 | Anyone, on a slow Android over mobile data | The stated target device |

Do not use anyone who has seen the product before.

## The task

Read it aloud, once, and do not elaborate:

> "Two days ago you got a call from someone saying they were from your bank.
> They said your KYC had expired and your account would be blocked. You gave
> them a code from an SMS, and ₹40,000 left your account. You have a screenshot
> of the bank message. Report it."

Give them the phone. Then be quiet. The strongest instinct in this room will be
to help; helping destroys the measurement.

## What to record

Per participant, both journeys — Kavach and `cybercrime.gov.in` — order
alternated between participants so fatigue does not favour whichever came second.

| Measure | How |
|---|---|
| Completed without help | Yes / No — the headline |
| Time to first substantive question | Stopwatch from tap to *"what happened"* |
| Time to a filed or ready-to-file complaint | Stopwatch |
| Assists | Every time you had to say anything |
| Abandonment point | Where they stopped, if they stopped |
| Errors they had to recover from | Wrong turns, re-entry, lost work |
| Confidence, 1–5 | *"How sure are you that this was submitted correctly?"* asked after each |

Record the last one for both. If people finish faster here but trust it less,
that is a finding, and it is one this product cannot afford to leave unmeasured.

## What would falsify the claim

Write these down before you run it. A test with no failing condition is a demo.

- Fewer than 4 of 5 complete unassisted here
- Median time-to-complete is not meaningfully better than the portal's
- The voice path is abandoned more often than the typing path
- Confidence here is lower than confidence on the portal

Any one of those and the landing page has to change. That is the point of
running it.

## Afterwards

1. Put the numbers in `docs/usability-results.md`, dated, with the build tested.
2. If they support the claim, cite that file next to the claim, the way
   `SCALE_SOURCE` is cited next to the statistics.
3. If they do not, change the claim first and the product second.

## What not to do

- **No live users without consent and a way out.** Anyone who has actually been
  defrauded is re-entering the worst hour of their year. Say what the session is
  for, that they can stop at any point, that nothing is filed anywhere, and
  delete their case afterwards.
- **No real personal data in a test.** Use the scenario's invented facts. A test
  case containing somebody's actual bank details is a data breach with a
  clipboard next to it.
- **Do not report a single number as "x% faster".** Five participants gives a
  direction, not a percentage, and dressing it as precision is the exact move
  this project criticises elsewhere.
