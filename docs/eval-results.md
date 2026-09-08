# Classifier evaluation — results

Produced by `npm run eval:triage` against `src/lib/ai/eval/dataset.ts`.
Record every run that changes a prompt, a model or the taxonomy. The number to
watch is the trend, not the absolute: 20 hand-built cases can tell you something
got worse, and cannot tell you the classifier is good.

---

## 2026-09-08 — `gemini-3.5-flash-lite`, live

| | |
|---|---|
| **Balanced accuracy** | **92%** |
| Accuracy | 95% |
| Decisive accuracy | 94% |
| Subcategory accuracy | 86% |
| Confidently wrong | 1 |
| Answers that never arrived | 0 of 20 |

Per class — digital-arrest 100%, financial-fraud 100%, women-child 100%,
social-media 100%, other 100%, hacking 50%.
Per origin — handwritten 100%, from-transcript 100%, near-miss 83%.

**The one confidently wrong.** `hack-02` — *"My WhatsApp got taken over after I
forwarded a six digit code"* — classified as `social-media` at 0.95. Defensible
in ordinary English, wrong against the NCRP tree, which puts account compromise
under hacking. Left alone rather than tuned: one arguable miss inside the
threshold is a better signal than a set bent until it agrees.

## 2026-09-08 — rules fallback, no key

| | |
|---|---|
| **Balanced accuracy** | **92%** (was **58%** before the same day's fix) |
| Confidently wrong | 0 |

This is the path that runs whenever the model is unavailable, so it is the one
CI scores on every pull request — it needs no key and is deterministic.

**What the first run of this found.** At 58%, the fallback had **0% recall on
women-and-children**, including a fourteen-year-old being groomed on a game,
filed as `other`. `childFromAnalysis` then turned that miss into
`"adult-or-no-child"`, which `nextIntakeStep` reads as the age question having
been *answered* — so the interview stopped asking, and the 1098 helpline was
never offered. Fixed in two places: the hints, and the rule that a guess no
longer closes a safety question.

---

## An operational finding, not an accuracy one

The first live run scored **69%** with four cases returning nothing. That was
not the model. `gemini-3.5-flash-lite` on the **free tier allows 15 requests per
minute**, and the harness was firing twenty back to back; a third of the run was
measuring HTTP 429.

The harness now paces itself and retries once. But the same limit applies in
production, and `/api/ai/triage` answers a null model by falling through to
`ruleTriage` — silently, with `source: "rules"` the only trace. At any burst of
traffic, or a demo with several people at once, a share of complaints get
classified by keyword matching rather than by the model.

That is survivable now, because the fallback is decent and no longer closes the
child-safety question on a guess. It was not survivable this morning.

**Before this carries real traffic:** move off the free tier, or add backoff and
a queue in front of the triage route.
