# Departures from the Day-5 design

We built the submitted Designathon file (screens D1–D5, L1–L7, R0–R8, S1–S6 and the Daylight and Dark systems). Where the build differs, it is listed here with the reason. Everything not listed follows the design.

## What we changed

| Screen / flow | What changed | Why |
|---|---|---|
| **R0a driver sign-in** | Email + password instead of mobile number, driver ID and an SMS code. The 4-digit PIN is then chosen on the phone and stored only as a salted hash on the device. | No SMS gateway in a self-contained, judge-runnable stack. The intent is kept: sign in once online, unlock later by PIN with no signal. |
| **R0b PIN unlock** | The PIN is set by the driver on first sign-in, not issued by the depot. | The server never stores or sends a driver PIN, so nothing secret leaves the API. Offline unlock needs only the device. |
| **Live board (D-L)** | Polls every 3 s instead of pushing. | Server-Sent Events add a stateful connection that many hosts drop. Three seconds is fast enough for a board that is read, not watched. Architecture doc lists SSE as the next step. |
| **Loader on a phone (L1–L6)** | The phone layout is the primary build. The tablet layout (LT1, LT2) is the same components at ≥1024 px: departures on the left, load list on the right, flag as a side sheet. | The booklet judges the loader on a phone-sized screen. One responsive component set avoids two divergent UIs. |
| **Driver stops, one per order** | An outlet with both a chilled and a dry order appears as two stops, each with its own proof. | The dataset (and the booklet's trip-time formula) treats each order as a delivery. Merging would break the shared time rules. |
| **Load lines** | Loader, driver and store count the same units: crates or cartons per load group (Dairy, Yoghurt & curd, Meat & fish, Dry groceries…). The store's receipt (S3) counts groups, not each SKU. | One vocabulary across four roles keeps counts comparable. Item-level receipts would need SKU-level loading, which the cut list excludes. |
| **Order dates and the 4 PM cutoff (S1)** | The countdown and the "waits for the next run" copy are shown, but the cutoff is **not enforced** (`ENFORCE_CUTOFF=false`). New orders join the first delivery day whose plan is not yet released. | A judge may run the walkthrough at any hour. Enforcing against the wall clock would make the demo depend on when it is run. Set `ENFORCE_CUTOFF=true` to enforce. |
| **Demand outlook (D4)** | Two-week window starts 30 Mar 2026 (two weeks before Avurudu, inside the dataset). Percentages come from a fitted model and stated capacity assumptions, not the mock numbers on the screen. | The design's numbers were illustrative. The build computes them (see `services/api/app/services/demand.py`) and shows its assumptions under the chart. |
| **Story data** | Vehicles, capacities, outlets and depots are the dataset's. Outlet display names are ours (the dataset only has IDs). The design's fixed story (Nuwan on VEH041 with six stops) cannot come from the real data: only 4 of Kandy's 12 Fresh outlets accept trucks. Instead, when a plan is released the two demo drivers are pointed at the vehicles that serve the demo store, so order, plan, load, deliver and receipt meet on one truck whatever the engine decided. | Consistency with the booklet's rules beats matching one illustrative vehicle number. Driver rostering is on the cut list (the booklet says every vehicle has a driver). A test (`test_demo_story_…`) protects this. |
| **Languages** | The language switch is on the driver sign-in and in Help, and translates the driver app's main words (Sinhala, Tamil, English). The dispatcher, loader and store are English only. | The design shows Sinhala and Tamil as exemplar screens (R1-SI, D1-SI, L2-TA, S1-TA) outside the flows. Strings are Claude-drafted and need native review (see `ai-disclosure.md`). |
| **Vine motifs (page 08)** | A simplified vine horizon above the phone tab bars and the Vine Ridges scene on the sign-in screens. The hill-contour wash sits behind the live board. | Same intent, drawn as light inline SVG so pages stay small and work offline. |
| **Cut list, kept** | No live GPS map, no chat, no drag-and-drop routes, no driver rostering, no prices or invoicing. | As designed. |

## Added (not in the design)

| Addition | Why |
|---|---|
| **"Simulate no signal" switch** (driver Help) | A judge cannot switch a phone off during the walkthrough. It behaves like airplane mode inside the app: same offline path, same outbox. |
| **"Reset the demo day"** (dispatcher menu, `POST /demo/reset`) | Lets a reviewer run the walkthrough again from a clean start on a shared deployment. |
| **Second driver and second demo loaders** | The dock tablet is shared (four names on L1). A second driver (Mahesh, VEH045) carries Shanika's dry order so every delivery on Track can be completed. |
| **Photo and signature capture** | R4 lists proof photo and signature; the build captures both on the phone, shrinks the photo and stores it with the record. |
