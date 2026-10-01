# AI tool disclosure (Hackathon)

> Required deliverable. Every one of us can explain every line; the semi-final is an interview.

| Date | Tool | What it was used for | What we did ourselves / how it was reviewed |
|---|---|---|---|
| 25 Sep | Claude Code | Generated the initial monorepo scaffold: Docker Compose, FastAPI skeleton, allocation rules module and tests. | Reviewed the rules against the booklet's Task 2B rules; tests use the booklet's worked examples (101 and 112 minute trips). |
| 30 Sep – 3 Oct | Claude Code (Claude Sonnet 5.5) | Wrote most of the application code under our direction: the allocator, the operational data model and role APIs, the seeded demo day, the web app for all four roles (design system, dispatcher, loader, driver PWA with the IndexedDB outbox, store manager), tests and docs. It read the submitted Penpot file to build from it. | We chose the architecture and scope, provided the design and the dataset, decided every departure listed in `design-departures.md`, and reviewed and ran the result: the walkthrough test, the official `check_allocation.py` on the allocator, and manual runs on a phone-sized screen. Each of us reads the code for the role we present. |
| 30 Sep | Claude Code | Drafted the Sinhala and Tamil driver strings from the Designathon exemplars. | **Need native-speaker review before submission.** The Designathon strings were corrected by native speakers; these extra ones have not been yet. |
| 30 Sep | Claude Code | Drafted the Sinhala and Tamil strings for the dispatcher, loader, store, sign-in and home screens and for the new driver strings, copying the exemplar boards (D1-SI, L2-TA, R1-SI, S1-TA) verbatim where they show the same text. | **Need native-speaker review.** Sentences with counts and plurals are the most likely to read awkwardly. |
| 30 Sep | Claude Code | Matched the web app to the Penpot file (tokens, phone header and tab bar, Settings screens) using values read from the shared Penpot view link. | Checked by side-by-side screenshots on the screens listed in `design-departures.md`; not every board was compared pixel for pixel. |

## What the AI did not decide

- The problem framing, the four roles and what each one needs (Designathon).
- The trade-off: the system proposes, the dispatcher decides.
- The cut list and every departure from the design.
- The demo story and the demo video.
- Whether the allocator's output is acceptable: it must pass the organisers' `check_allocation.py`, and does on the peak-day scenario.

## How we used AI

Claude Code ran in the repository with our instructions. It wrote code, ran the tests and linters, and drove a real browser to look at screens. Its output is committed like anyone else's: in small commits, reviewed before merge, with tests. No AI-generated images are used; the logo (Route-W) and the design system are ours from the Designathon.
