# Design Fidelity and Three-Language Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `apps/web` match the Penpot design screen for screen in both themes, and let every role switch between English, Sinhala and Tamil.

**Architecture:** One shared i18n module (`lib/i18n/`) with typed dictionaries replaces `lib/driver/i18n.ts`; a `LanguageProvider` in the root layout serves all roles. Visual work is done board by board: read exact values from Penpot's Inspect/Code tab, edit the page, compare screenshots of Penpot and the running app, commit.

**Tech Stack:** Next.js 15 (App Router, Turbopack), React 19, Tailwind 4, TypeScript. No web test runner exists; correctness gates are `npm run lint`, `npx tsc --noEmit`, `npm run build`, and side-by-side screenshots.

**Spec:** `docs/superpowers/specs/2026-09-30-design-fidelity-and-languages-design.md`

## Global Constraints

- Branch is `design-fidelity`. Never commit to `main`.
- Behaviour departures in `docs/design-departures.md` stay (email sign-in, 3 s polling, unenforced cutoff, dataset story data). No API or database changes.
- Penpot file: https://design.penpot.app/#/view?file-id=d8ac01df-6646-81d2-8008-a84c98706ee5&page-id=fcaf725b-5a58-8009-8008-b1a7dcdbdb96&share-id=a4d4178c-a479-453f-8719-a46d19fa2ce1 (pages: 03 Dispatcher, 04 Loader, 05 Driver, 06 Store manager, 07 Degradation, 08 Style guide). Decline non-essential cookies on first open.
- Languages are `en` (English), `si` (සිංහල), `ta` (தமிழ்). Default English. Persisted under `localStorage` key `wp_lang` (same key the driver app uses today).
- Theme key stays `wp_theme`; themes are Daylight (light) and Dark.
- IDs, outlet names, numbers and times are never translated.
- Strings shown on Penpot boards in Sinhala/Tamil are copied verbatim; all other Sinhala/Tamil is drafted and flagged for native review in `docs/ai-disclosure.md`.
- Viewports for comparison: desktop 1280×800 for dispatcher; 390×844 for loader, driver, store, sign-in. Loader also at 1024+ for tablet layout.
- Run commands from `apps/web` unless stated. The Docker stack serves the app at http://localhost:3000; after code changes run `docker compose up --build -d web` from the repo root (Docker is at `C:\Program Files\Docker\Docker\resources\bin`; add to PATH in PowerShell) or use `npm run dev` with `API_INTERNAL_URL=http://localhost:8000` in `apps/web/.env.local`.

## Review Focus

- Long Sinhala/Tamil strings overflow buttons, tabs and pills sized for English: each role task checks screens at 390 px in `si` and `ta`; text must wrap or truncate, never overflow or overlap.
- Sinhala/Tamil glyphs render as boxes without a font: Task 1 adds fonts; verified visually.
- Language must survive reload and the first paint must not flash English then switch: provider reads `localStorage` before hydration via the inline script in `app/layout.tsx`.
- A key present in `en` but missing in `si`/`ta` must fail the build, not silently show English: dictionaries typed `Record<Key, string>`.
- Dark theme regressions when primitives change: every visual task checks both themes.

---

## File Structure

| File | Responsibility |
|---|---|
| `lib/i18n/en.ts` | English dictionary; defines `Key` |
| `lib/i18n/si.ts`, `lib/i18n/ta.ts` | Sinhala/Tamil dictionaries, typed `Record<Key, string>` |
| `lib/i18n/index.tsx` | `LanguageProvider`, `useT()`, `useLang()`, `translate()` |
| `components/LanguageSwitch.tsx` | The English / සිංහල / தமிழ் segmented control used in every role |
| `app/layout.tsx` | Wraps app in `LanguageProvider`, sets `<html lang>`, loads fonts |
| `app/globals.css` | Tokens (already match style guide page; verified in Task 0), script font fallbacks |
| `lib/driver/i18n.ts` | Deleted in Task 2 |

---

### Task 0: Verify tokens and primitives against the Style guide (page 08)

**Files:**
- Modify: `app/globals.css`, `components/ui.tsx`, `components/Chrome.tsx`, `components/StatusPill.tsx` (only where they differ from Penpot)

**Interfaces:**
- Produces: confirmed colour/type/radius/spacing tokens and primitive components (`Button`, `Pill`, `Card`, `Segmented`, `Sheet`, `Bar`, `Empty`, phone header, bottom tabs) that later tasks rely on without re-checking.

- [ ] **Step 1: Open Penpot page "08 Style guide"** in the browser pane (page dropdown, top left) and, for each token group and component, open the Code/Inspect tab (`</>` icon) and record values: colours (light and dark), font families and sizes, radii, borders, paddings, button heights, pill styles.
- [ ] **Step 2: Diff against the code.** Compare to `app/globals.css` variables and to the class names in `components/ui.tsx`. List every mismatch (value, file, line).
- [ ] **Step 3: Fix each mismatch** in `globals.css` / `ui.tsx` / `Chrome.tsx` / `StatusPill.tsx`. Change tokens, not call sites, wherever possible.
- [ ] **Step 4: Verify**

Run: `npm run lint && npx tsc --noEmit && npm run build`
Expected: all exit 0.

- [ ] **Step 5: Compare** the style-guide board and a built screen using the same primitives (e.g. `/login`) in light and dark. Expected: same colours, radii, type.
- [ ] **Step 6: Commit**

```bash
git add apps/web
git commit -m "Style guide: align tokens and primitives with the design"
```

### Task 1: Script fonts and language-aware `<html>`

**Files:**
- Modify: `app/layout.tsx`, `app/globals.css`

**Interfaces:**
- Produces: CSS font stack that renders Sinhala and Tamil; `<html lang>` updated by the provider in Task 2.

- [ ] **Step 1: Add fonts** in `app/layout.tsx`:

```tsx
import { Geist, Geist_Mono, Newsreader, Noto_Sans_Sinhala, Noto_Sans_Tamil } from "next/font/google";

const notoSi = Noto_Sans_Sinhala({ variable: "--font-noto-si", subsets: ["sinhala"], weight: ["400", "500", "600", "700"] });
const notoTa = Noto_Sans_Tamil({ variable: "--font-noto-ta", subsets: ["tamil"], weight: ["400", "500", "600", "700"] });
```

Add `${notoSi.variable} ${notoTa.variable}` to the `<body>` className.

- [ ] **Step 2: Extend the font stacks** in `app/globals.css`: in `@theme inline` set

```css
--font-sans: var(--font-geist-sans), var(--font-noto-si), var(--font-noto-ta), system-ui, sans-serif;
--font-display: var(--font-newsreader), var(--font-noto-si), var(--font-noto-ta), Georgia, serif;
```

and in `body` use `font-family: var(--font-geist-sans), var(--font-noto-si), var(--font-noto-ta), system-ui, sans-serif;`.

- [ ] **Step 3: Verify**

Run: `npm run lint && npx tsc --noEmit && npm run build`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add apps/web
git commit -m "Add Sinhala and Tamil fonts to the font stack"
```

### Task 2: Shared i18n module; migrate the driver app

**Files:**
- Create: `lib/i18n/en.ts`, `lib/i18n/si.ts`, `lib/i18n/ta.ts`, `lib/i18n/index.tsx`, `components/LanguageSwitch.tsx`
- Modify: `app/layout.tsx`, `components/driver/DriverApp.tsx` (imports and `useLang` call at lines 7 and 17, and any `Lang` uses)
- Delete: `lib/driver/i18n.ts`

**Interfaces:**
- Produces:
  - `type Lang = "en" | "si" | "ta"`; `const LANGS: { value: Lang; label: string }[]` with labels `English`, `සිංහල`, `தமிழ்`
  - `type Key = keyof typeof en`
  - `translate(lang: Lang, key: Key, vars?: Record<string, string | number>): string`
  - `useT(): { lang: Lang; setLang: (l: Lang) => void; t: (key: Key, vars?: Record<string, string | number>) => string }` (same shape the driver app's `useLang()` returns, so call sites barely change)
  - `<LanguageProvider>{children}</LanguageProvider>`
  - `<LanguageSwitch />` — renders `Segmented` over `LANGS`, bound to `useT()`

- [ ] **Step 1: Create `lib/i18n/en.ts`** by moving the `en` object from `lib/driver/i18n.ts` verbatim and exporting it:

```ts
export const en = {
  run: "Run",
  stops: "Stops",
  // ... every key currently in lib/driver/i18n.ts `en` ...
  tripDone: "Run complete.",
} as const;
export type Key = keyof typeof en;
```

- [ ] **Step 2: Create `si.ts` and `ta.ts`** typed so a missing key is a compile error:

```ts
import type { Key } from "./en";
export const si: Record<Key, string> = {
  run: "ධාවනය",
  // ... all keys, current translations moved from the old file ...
};
```

The old `si`/`ta` were `Partial`; any key they lacked must now get a translation here (copy the exact text from the Penpot Sinhala/Tamil boards where one exists).

- [ ] **Step 3: Run type check to see it fail before filling gaps**

Run: `npx tsc --noEmit`
Expected: errors listing each missing key in `si.ts`/`ta.ts`. Fix until exit 0.

- [ ] **Step 4: Create `lib/i18n/index.tsx`:**

```tsx
"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { en, type Key } from "./en";
import { si } from "./si";
import { ta } from "./ta";

export type Lang = "en" | "si" | "ta";
export const LANGS: { value: Lang; label: string }[] = [
  { value: "en", label: "English" },
  { value: "si", label: "සිංහල" },
  { value: "ta", label: "தமிழ்" },
];

const dict: Record<Lang, Record<Key, string>> = { en, si, ta };
const LANG_KEY = "wp_lang";

export function translate(lang: Lang, key: Key, vars: Record<string, string | number> = {}): string {
  const raw = dict[lang][key] ?? en[key];
  return raw.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ""));
}

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: (key: Key, vars?: Record<string, string | number>) => string };
const LangContext = createContext<Ctx | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LANG_KEY) as Lang | null;
      if (saved && saved in dict) setLangState(saved);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(LANG_KEY, l);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo<Ctx>(
    () => ({ lang, setLang, t: (key, vars) => translate(lang, key, vars) }),
    [lang, setLang],
  );
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useT(): Ctx {
  const c = useContext(LangContext);
  if (!c) throw new Error("useT must be used inside LanguageProvider");
  return c;
}
```

- [ ] **Step 5: Create `components/LanguageSwitch.tsx`:**

```tsx
"use client";

import { Segmented } from "./ui";
import { LANGS, useT, type Lang } from "@/lib/i18n";

export function LanguageSwitch() {
  const { lang, setLang } = useT();
  return <Segmented<Lang> value={lang} onChange={setLang} options={LANGS} />;
}
```

- [ ] **Step 6: Wrap the app** in `app/layout.tsx`: import `LanguageProvider` and put it inside `AuthProvider`, around `{children}` and `<ToastHost />`.
- [ ] **Step 7: Migrate `DriverApp.tsx`:** replace `import { useLang, type Key, type Lang } from "@/lib/driver/i18n";` with `import { useT, LANGS, type Lang } from "@/lib/i18n"; import type { Key } from "@/lib/i18n/en";`, and `const l = useLang();` with `const l = useT();`. Replace any local language-option list with `LANGS`.
- [ ] **Step 8: Delete** `lib/driver/i18n.ts`.
- [ ] **Step 9: Verify**

Run: `npm run lint && npx tsc --noEmit && npm run build`
Expected: exit 0. Then open `/driver`, switch language, reload: the language persists and all three render (no boxes).

- [ ] **Step 10: Commit**

```bash
git add apps/web
git commit -m "Shared i18n module with English, Sinhala and Tamil; move the driver app onto it"
```

### Task 3: Sign-in, home and Store manager (boards S1–S6, R0a/R1-SI equivalents for sign-in)

**Files:**
- Modify: `app/login/page.tsx`, `app/page.tsx`, `app/loader/page.tsx` (PIN entry screen, board L1), `app/store/layout.tsx`, `app/store/page.tsx`, `app/store/track/page.tsx`, `app/store/history/page.tsx`, `app/store/contact/page.tsx`, `app/store/help/page.tsx`, `lib/i18n/en.ts`, `si.ts`, `ta.ts`

**Interfaces:**
- Consumes: `useT()`, `LanguageSwitch`, `Key` from Task 2.
- Produces: store-role and sign-in keys in the dictionaries, prefixed `store.` and `auth.` (e.g. `store.placeOrder`, `auth.signIn`).

For each board S1 to S6, repeat this loop:

- [ ] **Step 1: Open the board** in Penpot (page "06 Store manager"); use Inspect/Code for exact sizes, colours, spacing, font sizes and copy. Screenshot it at 390×844 (resize the browser pane with `resize_window` preset `mobile`).
- [ ] **Step 2: Screenshot the built screen** at the same viewport (sign in as `store@waypoint.demo` / `waypoint2026`), in light and dark.
- [ ] **Step 3: List differences** (layout, spacing, type, copy, icons, states) and fix them in the page file.
- [ ] **Step 4: Replace every hard-coded user-facing string** in the page with `t("store.xxx")`; add the key to `en.ts`, then `si.ts` and `ta.ts` (verbatim from the S1-TA Penpot board where it exists). Run `npx tsc --noEmit` to see which keys are still missing.
- [ ] **Step 5: Add `<LanguageSwitch />`** where the board places it (Help for store; sign-in screen per the board).
- [ ] **Step 6: Check `si` and `ta` at 390 px:** no overflow or overlap in buttons, tabs, pills.
- [ ] **Step 7: Verify and commit**

Run: `npm run lint && npx tsc --noEmit && npm run build`
Expected: exit 0.

```bash
git add apps/web
git commit -m "Store and sign-in: match boards S1-S6 and add three languages"
```

### Task 4: Dispatcher (boards D1–D5, D-L, Settings)

**Files:**
- Modify: `app/dispatcher/layout.tsx`, `app/dispatcher/orders/page.tsx`, `app/dispatcher/plan/page.tsx`, `app/dispatcher/live/page.tsx`, `app/dispatcher/demand/page.tsx`, `lib/i18n/*.ts`
- Create: Settings page `app/dispatcher/settings/page.tsx` if the build has none (board D5: Display card with Dark mode, Language, Text size, Density; Alerts card; Live board card), plus a menu entry in `app/dispatcher/layout.tsx`

**Interfaces:**
- Consumes: Task 2 interfaces, `Segmented`, `Card`.
- Produces: keys prefixed `disp.`; Settings page with working Dark mode toggle (writes `wp_theme`), Language (`LanguageSwitch`), and Text size / Density that set `data-text-size` / `data-density` on `<html>` (persisted in `localStorage` keys `wp_text`, `wp_density`; CSS in `globals.css` scales `body` font size and row padding).

Repeat per board (D1 Orders, D2 Plan board, D3 Live-related dialogs and sheets, D4 Demand, D5 Settings, D-L Live board on the Degradation page):

- [ ] **Step 1: Open the board** at desktop (1280×800) in light and dark; use Inspect/Code for exact values and copy.
- [ ] **Step 2: Screenshot the built screen** (sign in as `dispatcher@waypoint.demo`); after **Reset the demo day** and **Build Monday's plan** so the same data states are visible.
- [ ] **Step 3: Fix differences** in the page file; do Settings first so later boards can be checked in all themes and densities.
- [ ] **Step 4: Externalise strings** into `disp.*` keys with `en`, `si`, `ta` values (verbatim from D1-SI where present).
- [ ] **Step 5: Check overflow** in `si` and `ta` for the table headers, vehicle rows, warnings and pills.
- [ ] **Step 6: Verify and commit**

Run: `npm run lint && npx tsc --noEmit && npm run build`
Expected: exit 0.

```bash
git add apps/web
git commit -m "Dispatcher: match boards D1-D5 and live board, add Settings and three languages"
```

### Task 5: Loader (boards L1–L7, LT1, LT2)

**Files:**
- Modify: `app/loader/page.tsx`, `app/loader/(app)/layout.tsx`, `app/loader/(app)/departures/page.tsx`, `app/loader/(app)/help/page.tsx`, `app/loader/(app)/issues/page.tsx`, `app/loader/(app)/load/[tripId]/page.tsx`, `components/loader/LoadPanel.tsx`, `lib/i18n/*.ts`

**Interfaces:**
- Consumes: Task 2 interfaces.
- Produces: keys prefixed `loader.`; language switch in loader Help.

- [ ] **Step 1 to 6:** Same loop as Task 3, with page "04 Loader", phone viewport 390×844 and tablet viewport ≥1024 for LT1/LT2. Sign in via `/loader` → Kamal → PIN 1234. Exercise the flag sheet, release checks (reefer temperature 9 °C refusal, seal number) and "Plan changed" state, since each has its own board. Translate to `loader.*`; copy L2-TA verbatim.
- [ ] **Step 7: Verify and commit**

Run: `npm run lint && npx tsc --noEmit && npm run build`
Expected: exit 0.

```bash
git add apps/web
git commit -m "Loader: match boards L1-L7 and tablet layout, add three languages"
```

### Task 6: Driver (boards R0–R8) and Degradation page

**Files:**
- Modify: `components/driver/DriverApp.tsx`, `components/driver/SignaturePad.tsx`, `components/PhotoButton.tsx`, `lib/driver/engine.tsx` (only user-facing strings), `lib/i18n/*.ts`

**Interfaces:**
- Consumes: Task 2 interfaces (the driver keys already exist).
- Produces: additional `driver.*` keys for every string still hard-coded in `DriverApp.tsx` (the old dictionary covered only about 30 words).

- [ ] **Step 1 to 6:** Same loop, page "05 Driver" and "07 Degradation · Driver loses signal", phone viewport. Sign in as `driver@waypoint.demo`, choose a PIN, use Help → **Simulate no signal** to reach each offline and sync-conflict state. Copy R1-SI verbatim.
- [ ] **Step 7: Verify and commit**

Run: `npm run lint && npx tsc --noEmit && npm run build`
Expected: exit 0.

```bash
git add apps/web
git commit -m "Driver: match boards R0-R8 and degradation states, translate every string"
```

### Task 7: Full pass and documentation

**Files:**
- Modify: `docs/design-departures.md` (remove the **Languages** row and any departure now closed; add remaining gaps, e.g. assets that could not be exported), `docs/ai-disclosure.md` (note the drafted Sinhala/Tamil for all roles)

- [ ] **Step 1: Walk the README judge walkthrough** (steps 1–9) in each of the three languages, light and dark. Fix any overflow or missing strings found.
- [ ] **Step 2: Grep for leftover hard-coded English** in user-facing JSX:

Run: `grep -rnE ">[A-Z][a-z]+( [a-z]+)*<" app components --include=*.tsx`
Expected: only data, brand names or IDs remain; fix the rest.

- [ ] **Step 3: Run the complete checks**

Run: `npm run lint && npx tsc --noEmit && npm run build`
Expected: exit 0. From the repo root: `docker compose exec -T api sh -c "pip install -q pytest httpx && python -m pytest -q"` Expected: 8 passed.

- [ ] **Step 4: Update the docs** as described above.
- [ ] **Step 5: Commit**

```bash
git add docs apps/web
git commit -m "Docs: update design departures and AI disclosure after the fidelity pass"
```

---

## Self-review notes

- Spec coverage: tokens/primitives (Task 0), fonts (1), language layer (2), per-role visual + language work (3–6), final pass and docs (7), testing gates on every task. Spec phase "0" maps to Tasks 0–1, phase "1" to Task 2, phases 2–5 to Tasks 3–7.
- Tasks 0 and 3–6 are procedure-driven: the exact CSS and JSX depend on values read from Penpot's Inspect panel, which cannot be known before the design is opened. Each lists the files, the loop and the verification. Tasks 1, 2 and the Settings page carry the code.
- The Settings page, Text size and Density controls may need more than the listed CSS (row padding classes across pages); Task 4 step 3 handles that while matching the board.
