# Kavach — Deadline Engine Test Report

> **Hackathon:** Build What Moves India — Kavach (Cybercrime case-track deadlines)  
> **Scope:** `src/lib/case/` — deadline/case-track calculation engine  
> **Date:** 2026-08-28 (Asia/Kolkata)  
> **Environment:** Node 20 · Next 16.3.3 · Vitest 4.1.11 · TZ=Asia/Kolkata · TypeScript 5 strict  
> **Credit:** Audit structure & test harness reviewed with assistance from **Codex (OpenAI)** — mandatory hackathon credit — primary implementation in Muse Spark due to Codex token limits.

---

## 1. Executive Summary

- **Inspected:** 7 files under `src/lib/case/` + 4 consumer components. No existing tests were present.
- **Test framework added:** `vitest` (minimal, no UI churn) — `vitest.config.mjs` with `@` alias, `TZ=Asia/Kolkata`, `test:watch` scripts.
- **Tests added:** **84 deterministic tests** across 2 suites — 45 in `time.test.ts`, 39 in `tracks.test.ts`. All **PASS**.
- **Bugs found:** **0 genuine bugs.** Working-day logic (Sundays + 2nd/4th Saturdays) is correct. One mis-calculated *expected* date in a newly written test was corrected — engine behavior unchanged.
- **Verification:** `npm test` ✔ , `npx tsc --noEmit` ✔ , `npm run build` ✔ , `eslint` on deadline code ✔ (only pre-existing unrelated warning).

---

## 2. Step 1 — Understanding (before any change)

### 2.1 Files inspected
`src/lib/case/time.ts:1` · `tracks.ts:1` · `types.ts:1` · `categories.ts:1` · `store.ts:1` · `pack.ts:1` · `officers.ts` · `src/lib/utils.ts` · `TrackList.tsx:85` · `NextAction.tsx:16` · `Countdown.tsx:12` · `package.json` · `tsconfig.json`

### 2.2 How each track is calculated (10 tracks = 8 promise tracks + 2 ASAP without clock)
| # | Track ID | Deadline | Source | Depends on |
|---|----------|----------|--------|------------|
| 1 | `helpline` | `addHours(incidentDate, 1)` | `tracks.ts:60` | incidentAt → triage.incidentAt → createdAt |
| 2 | `ncrp` | `addHours(incidentDate, 24)` | `tracks.ts:71` | same |
| 3 | `bank-notice` | `addWorkingDays(alertDate, 3)` @17:00 | `tracks.ts:82` | bankAlertAt → incidentAt → createdAt |
| 4 | `fir` | `null` (ASAP) | `tracks.ts:92` | — |
| 5 | `chakshu` | `null` (ASAP) | `tracks.ts:103` | — |
| 6 | `bank-credit` | `addWorkingDays(notifiedDate, 10)` | `tracks.ts:114` | bank-notice.doneAt → bank.notifiedAt, blockedBy bank-notice |
| 7 | `mrm` | `null` (blockedBy ncrp) | `tracks.ts:136` | — |
| 8 | `ombudsman` | `addDays(notifiedDate, 30)` | `tracks.ts:149` | same notifiedDate, blockedBy |
| 9 | `bank-resolution` | `addDays(notifiedDate, 90)` | `tracks.ts:163` | same, blockedBy |
| 10 | `legal-aid` | `null` | `tracks.ts:177` | — |

Working-day vs calendar-day distinction is intentional: 3wd/10wd → 17:00 close-of-business, 30d/90d → preserve wall-time.

### 2.3 Working days determination
`time.ts:8` `isBankHoliday(d)` → `getDay()===0` (Sunday) OR `getDay()===6` with `nth = floor((date-1)/7)+1` in `{2,4}`. `addWorkingDays` advances day-by-day, skips holidays, then normalizes to 17:00. Verified against Jan–Mar 2026 calendars (Jan 10,24; Feb 14,28; Mar 14,28 are holidays; Jan 3,17,31 are working).

### 2.4 Sundays / 2nd & 4th Saturdays handling
**Correct.** Formula `floor((date-1)/7)+1` reliably maps 1-7→1st, 8-14→2nd, 15-21→3rd, 22-28→4th, 29-31→5th for Saturdays (spacing 7 days). Manually cross-checked Jan 3,10,17,24,31; Feb 7,14,21,28; Mar 7,14,21,28.

### 2.5 Potential bugs reviewed (no change made yet)
- Local TZ reliance (should be IST for Indian victims) — browser TZ = IST for target users; flagged as known limitation, not fixed to avoid rewrite.
- 17:00 normalization vs wall-time preservation — documented intent.
- `liveTracks` blockedBy precedence hides `missed` when deadline is `null` — correct (dependent clocks not started).
- No public-holiday table — matches task spec.
- **Conclusion pre-tests:** Engine appeared reliable; no obvious off-by-one.

---

## 3. Step 2 — Test Plan (A–H)

| Area | Scenarios |
|------|-----------|
| **A. Normal weekday** | Mon 5 Jan, Wed 7 Jan, Fri 9 Jan — 3wd / 10wd / 1h / 24h |
| **B. Weekend boundaries** | Sat 3 Jan (1st working), Sat 10 Jan (2nd holiday), Sun 4/11 Jan |
| **C. 2nd/4th Saturday** | Before/after 2nd Sat (Fri 9, Sun 11), before/after 4th Sat (Fri 23, Sun 25, Sat 24 itself) |
| **D. Month boundary** | Sat 31 Jan (5th Sat) → Wed 4 Feb (3wd); Fri 30 Jan → Tue 3 Feb; Jan 31 +30d → Mar 2 |
| **E. Year boundary** | Mon 29 Dec 2025 → Thu 1 Jan 2026 (3wd); Wed 31 Dec → Sat 3 Jan; 10wd/30d/90d crossing Dec→Jan/Mar |
| **F. Longer deadlines** | 10wd (Mon 5→Sat 17, Fri 9→Thu 22, Sat 31→Thu 12 Feb); 30d/90d calendar |
| **G. Midnight / exact boundaries** | 23:50 vs 00:05 normalization to 17:00; 23:30+1h midnight cross; 23:45+1d preservation; 3wd from Thu 8 → Tue 13 exact |
| **H. Regression** | All 10 track IDs preserved; fallback chains (incidentAt→triage→createdAt, bankAlertAt, notifiedDate); null clocks for fir/chakshu/mrm/legal-aid; financialOnly, blockedBy, missed/due/upcoming, nextAction priority, countdown/format |

---

## 4. Step 3 — Tests Implemented

### Tooling
- Added `vitest` as `devDependency` (minimal, Next-compatible), `vitest.config.mjs` with `@` alias + `TZ=Asia/Kolkata`, `npm test` / `test:watch`.
- No UI, README, or App Router changes.

### Suites
**`src/lib/case/__tests__/time.test.ts` — 45 tests**
- `isBankHoliday`: 5 tests (Sundays, 2nd Sat, 4th Sat, 1st/3rd/5th not holiday, weekdays)
- `addWorkingDays` (3wd): 15 tests (A–G + month/year)
- `addWorkingDays` (10wd): 3 tests + month cross
- `addHours`: 4 tests (1h,24h, midnight cross)
- `addDays`: 7 tests (30d,90d, Feb/leap, year, midnight preservation)
- `countdown` / `formatCountdown`: 5 tests

**`src/lib/case/__tests__/tracks.test.ts` — 39 tests**
- Registry: 2 (10 ids, map)
- helpline 1h: 5 (deadline math, Mon, midnight, fallbacks)
- ncrp 24h: 3 (math, Wed→Thu, year cross)
- bank-notice 3wd: 9 (uses bankAlertAt, priority over incidentAt, fallbacks, A/B/C/D/E/G)
- bank-credit 10wd: 5 (null when not notified, bank.notifiedAt, doneAt priority, Mon 5→Sat 17, year cross)
- ombudsman 30d: 4 (null, Mon 5→Feb 4, year cross, wall-time preserved)
- bank-resolution 90d: 3 (null, Jan 5→Apr 5, Dec 20→Mar 20)
- ASAP nulls: 1 (fir/chakshu/mrm/legal-aid)
- liveTracks/helpers: 7 (financialOnly na, blockedBy upcoming→due, missed, nextAction missed-priority, isFinancial, upcomingDeadline)

All assertions compare **actual calendar fields** (`getDate`/`getMonth`/`getFullYear`/`getHours`/`getTime`) against hand-computed deterministic dates — never `expect(x).toBeDefined()`.

---

## 5. Step 4 — Bugs: Found vs Fixed

| # | Bug | Status |
|---|-----|--------|
| — | Engine correctly skips Sundays + 2nd/4th Saturdays across all tested boundaries | No bug |
| — | 3wd/10wd correctly land at 17:00 regardless of incident time | No bug |
| — | Fallback chains (bankAlertAt, incidentAt, notifiedDate) correct | No bug |
| — | One test expectation error (`Sat 31 Jan +10wd` expected Fri 13 Feb, actual Thu 12 Feb) — debugged stepwise (Feb 1 & 8 are Sundays skipped, Feb 7 counted), **test corrected, code unchanged** | Test fix only |
| **Total genuine bugs** | **0** | **0 fixed** |

> Principle followed: *Do not change behavior merely for style.* Only a genuine incorrect date would have triggered a fix + regression test.

---

## 6. Step 5 — Verification

```
$ npm test
 ✓ src/lib/case/__tests__/time.test.ts   (45 tests) 13ms
 ✓ src/lib/case/__tests__/tracks.test.ts (39 tests) 13ms
 Test Files 2 passed, Tests 84 passed — 407ms

$ npx tsc --noEmit
 PASS (0 errors, strict)

$ npm run build
 ✓ Compiled successfully — 14 static routes

$ npx eslint src/lib/case/time.ts src/lib/case/tracks.ts src/lib/case/__tests__
 1 warning (pre-existing `countdown` unused in tracks.ts:2) — 0 errors in new code
```

Existing consumer components (`TrackList`, `NextAction`, `Countdown`, `store`, `pack`) unchanged and compile.

---

## 7. Step 6 — Why This Matters to Kavach

Kavach's core promise is that a victim **does not miss a statutory deadline**. The RBI 3-working-day window determines zero-liability; a naïve `+3 calendar days` from a Friday night would still be wrong by 2 days when the next week contains a 2nd Saturday. A single missed Ombudsman (30d) or resolution (90d) deadline closes the only escalation path beyond the bank. By locking the banking calendar into 84 regression tests, this work ensures:

1. Every working-day deadline is provably correct for Indian banking holidays.
2. Month/year/midnight boundaries can never silently shift a deadline.
3. Future contributors get instant feedback if they regress the calculation.
4. Victims in IST see the same date their bank uses — tested under `TZ=Asia/Kolkata`.

---

## Appendix

- **Run tests:** `npm test` (single run) or `npm run test:watch` (watch).
- **Add a new deadline scenario:** Add a case in `time.test.ts` or `tracks.test.ts` using helper `d(y,m,d,h,min)` — keep `TZ=Asia/Kolkata`.
- **Config:** `vitest.config.mjs:1` — alias `@` → `src`, `env.TZ`.
- **Credit note:** Files `time.test.ts:1` and `tracks.test.ts:1` contain `Credit: … Codex (OpenAI)` per hackathon requirement.
