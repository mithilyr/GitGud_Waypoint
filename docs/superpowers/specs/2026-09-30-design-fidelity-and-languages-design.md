# Design fidelity and three-language support

Branch: `design-fidelity`. Date: 2026-09-30.

## Goal

Make the running web app (`apps/web`) match the submitted Penpot file (GitGud_Designathon) in layout, typography, colour, spacing, copy and both themes (Daylight and Dark). Add English, Sinhala and Tamil selection to all four roles (dispatcher, loader, driver, store manager) and the sign-in screens.

Penpot file (view link, pages 00–10): https://design.penpot.app/#/view?file-id=d8ac01df-6646-81d2-8008-a84c98706ee5&page-id=fcaf725b-5a58-8009-8008-b1a7dcdbdb96&share-id=a4d4178c-a479-453f-8719-a46d19fa2ce1

## Decisions already made

- Match the design's **visuals**. Keep the behaviour departures in `docs/design-departures.md` (email sign-in, 3 s polling, unenforced cutoff, dataset-driven story data). They stay listed there.
- Work on branch `design-fidelity`, in phases, each ending in a commit.

## Out of scope

- API or database changes (the API already returns what the screens need).
- SMS sign-in, SSE push, enforced cutoff, design's fixed story data.
- Replacing machine-drafted Sinhala/Tamil with native-reviewed text (flagged in `docs/ai-disclosure.md`; strings shown on Penpot boards are copied verbatim).

## Approach

### 1. Source of truth for "exactly"

- Tokens (colour, type scale, radius, spacing, shadows) come from the Penpot **Style guide** page (08) via the Inspect/Code tab, and are written once into `app/globals.css` for both themes.
- Every other board is compared by screenshot against the built screen at the same viewport: desktop width for dispatcher boards, 390×844 for loader, driver and store. Differences are fixed until the board and the screen agree, in both themes.
- Where a board uses an illustration or asset that cannot be exported from view mode (e.g. vine motifs), the build keeps its current inline-SVG version and the gap is recorded in `design-departures.md`.

### 2. Language layer

Replace `lib/driver/i18n.ts` with a shared module used by every role:

- `lib/i18n/` with `en.ts`, `si.ts`, `ta.ts` dictionaries (typed so a missing key is a compile error), a `LanguageProvider`, and a `useT()` hook.
- Selected language persisted in `localStorage`, mirrored to `<html lang>`; default English.
- Language switcher (English / සිංහල / தமிழ்) in: sign-in, dispatcher Settings, loader Help, driver sign-in and Help, store Help, matching the boards.
- Fonts: Noto Sans Sinhala and Noto Sans Tamil added as fallbacks in the font stack so the scripts render correctly.
- Server-provided text that is not a fixed UI string (outlet names, reason codes) is mapped through dictionaries where the API returns codes, and left as-is where it is data.
- Dates, times and numbers keep the existing `lib/format.ts` behaviour, extended to be locale-aware.

### 3. Phases

| # | Phase | Done when |
|---|---|---|
| 0 | Branch, design tokens, fonts, shared primitives (`components/ui.tsx`, `Chrome.tsx`, `StatusPill.tsx`) match the Style guide | Primitives match page 08 in both themes |
| 1 | i18n foundation; migrate the driver app's existing strings onto it | Driver app renders in all three languages, old `lib/driver/i18n.ts` removed |
| 2 | Sign-in, home, Store manager (S1–S6) | Boards match; all strings translated |
| 3 | Dispatcher (D1–D5, D-L, Settings) | Boards match; all strings translated |
| 4 | Loader (L1–L7) and Driver (R0–R8, Degradation page) | Boards match; all strings translated |
| 5 | Full pass: every board, both themes, three languages; update `design-departures.md` and `todo.md` | Checklist of boards all ticked |

Each phase ends with: `npm run lint`, `npx tsc --noEmit`, `npm run build`, a screenshot comparison of that phase's boards, and a commit.

## Testing

- Existing Python tests must still pass (no API changes expected).
- Web lint, type check and build on every phase.
- Visual comparison per board (screenshots of Penpot vs the running Docker app on http://localhost:3000).
- i18n: a small script/test that every key in `en.ts` exists in `si.ts` and `ta.ts`.

## Risks

- Size: about 2,500 lines of page code plus driver components. Phases keep reviews small.
- Exact pixel match is achievable for layout and tokens, not for assets that cannot be exported from view mode.
- Sinhala and Tamil text beyond the boards' own strings is drafted by Claude and needs native review.
- Long Sinhala/Tamil strings can overflow layouts sized for English; each phase checks this.
