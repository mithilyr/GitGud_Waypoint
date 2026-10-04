import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, Img, staticFile } from "remotion";
import { C, W, mono, sans, serif } from "../theme";
import { Fade, useAppear, useScaledFrame } from "./Fade";
import { Logo } from "./Logo";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const Eyebrow: React.FC<{ children: React.ReactNode; color?: string }> = ({ children, color = C.orange }) => (
  <div style={{ fontFamily: mono, fontSize: 24, letterSpacing: 2.4, textTransform: "uppercase", color }}>{children}</div>
);
const H1: React.FC<{ children: React.ReactNode; size?: number; color?: string }> = ({ children, size = 96, color = C.ink }) => (
  <div style={{ fontFamily: serif, fontSize: size, lineHeight: 1.04, letterSpacing: -2, color }}>{children}</div>
);
const Body: React.FC<{ children: React.ReactNode; size?: number; color?: string; style?: React.CSSProperties }> = ({ children, size = 34, color = C.ink, style }) => (
  <div style={{ fontFamily: sans, fontSize: size, lineHeight: 1.35, color, ...style }}>{children}</div>
);
const Page: React.FC<{ children: React.ReactNode; dark?: boolean }> = ({ children, dark }) => (
  <Fade><AbsoluteFill style={{ background: dark ? C.night : C.bg, padding: "70px 120px 110px", justifyContent: "center" }}>{children}</AbsoluteFill></Fade>
);

// ---------- 1. Title ----------
export const TitleScene: React.FC = () => {
  const f = useCurrentFrame();
  const t = interpolate(f, [6, 96], [0, 9], clamp);
  const a = useAppear(104), b = useAppear(124), c = useAppear(146);
  return (
    <Fade inF={6}>
      <AbsoluteFill style={{ background: C.bg, alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 26 }}>
        <Logo size={230} t={t} />
        <div style={{ ...a, fontFamily: serif, fontSize: 150, letterSpacing: -4, color: C.ink, lineHeight: 1 }}>Waypoint</div>
        <div style={{ ...b, fontFamily: serif, fontSize: 52, color: C.muted, fontStyle: "italic" }}>From the store's order to the signed receipt.</div>
        <div style={{ ...c, fontFamily: mono, fontSize: 26, letterSpacing: 2.2, textTransform: "uppercase", color: C.muted, marginTop: 30 }}>Team GitGud · Tech-Triathlon 2026 · Hackathon demo</div>
      </AbsoluteFill>
    </Fade>
  );
};

// ---------- 2. Problem ----------
const ROLES = [
  { n: "Dispatcher", d: "Plans every route", x: 0 },
  { n: "Loader", d: "Loads the dock", x: 1 },
  { n: "Driver", d: "Delivers, often offline", x: 2 },
  { n: "Store manager", d: "Orders and receives", x: 3 },
];
export const ProblemScene: React.FC = () => {
  const f = useCurrentFrame();
  const facts = [
    ["120", "outlets"],
    ["60", "vehicles"],
    ["4", "Kandy reefer trucks in the workshop"],
    ["58", "Kandy orders for one Monday"],
  ];
  return (
    <Page>
      <div style={useAppear(0)}><Eyebrow>The problem</Eyebrow></div>
      <div style={{ ...useAppear(8), marginTop: 22 }}><H1 size={92}>Four roles. One delivery day.<br />Every handoff is a place to lose the truth.</H1></div>
      <div style={{ display: "flex", gap: 24, marginTop: 70 }}>
        {ROLES.map((r, i) => (
          <div key={r.n} style={{ ...useAppear(40 + i * 14), flex: 1, background: C.surface, border: `1.5px solid ${C.line}`, borderRadius: 18, padding: "28px 30px" }}>
            <div style={{ fontFamily: serif, fontSize: 44, color: C.ink }}>{r.n}</div>
            <Body size={26} color={C.muted} style={{ marginTop: 8 }}>{r.d}</Body>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 56, marginTop: 70 }}>
        {facts.map(([n, l], i) => (
          <div key={l} style={{ ...useAppear(120 + i * 16), flex: 1 }}>
            <div style={{ fontFamily: serif, fontSize: 96, color: i >= 2 ? C.orange : C.ink, lineHeight: 1 }}>{n}</div>
            <Body size={26} color={C.muted}>{l}</Body>
          </div>
        ))}
      </div>
      <Body size={38} style={{ ...useAppear(250), marginTop: 56, maxWidth: 1500 }}>Demand exceeds capacity. Something must wait, and the store should hear why, before the truck leaves.</Body>
    </Page>
  );
};

// ---------- 3. One flow ----------
const FLOW = [
  ["Order", "Store manager"],
  ["Plan", "Dispatcher"],
  ["Load", "Loader"],
  ["Deliver", "Driver"],
  ["Receipt", "Store manager"],
];
export const FlowScene: React.FC = () => {
  const f = useScaledFrame();
  const prog = interpolate(f, [24, 120], [0, 4], clamp); // 0..4 along the line
  return (
    <Page>
      <div style={useAppear(0)}><Eyebrow>The answer</Eyebrow></div>
      <div style={{ ...useAppear(6), marginTop: 22 }}><H1 size={104}>One shared record.</H1></div>
      <Body size={38} color={C.muted} style={{ ...useAppear(14), marginTop: 18 }}>Four roles read and write the same order, from the first tap to the signed receipt.</Body>
      <div style={{ position: "relative", marginTop: 120, height: 260 }}>
        <div style={{ position: "absolute", left: 100, right: 100, top: 22, height: 6, borderRadius: 3, background: C.line }} />
        <div style={{ position: "absolute", left: 100, top: 22, height: 6, borderRadius: 3, background: C.mark, width: `calc((100% - 200px) * ${prog / 4})` }} />
        <div style={{ position: "absolute", left: 100, right: 100, top: 0, display: "flex", justifyContent: "space-between" }}>
          {FLOW.map(([n, who], i) => {
            const on = prog >= i - 0.01, last = i === 4;
            return (
              <div key={n} style={{ width: 0, display: "flex", flexDirection: "column", alignItems: "center", opacity: on ? 1 : 0.35 }}>
                <div style={{ width: 50, height: 50, borderRadius: 25, boxSizing: "border-box", background: last ? C.orange : C.bg, border: last ? "none" : `7px solid ${C.mark}` }} />
                <div style={{ marginTop: 30, fontFamily: serif, fontSize: 56, color: C.ink, whiteSpace: "nowrap" }}>{n}</div>
                <div style={{ marginTop: 8, fontFamily: mono, fontSize: 22, letterSpacing: 1.6, textTransform: "uppercase", color: C.muted, whiteSpace: "nowrap" }}>{who}</div>
              </div>
            );
          })}
        </div>
      </div>
      <Body size={30} color={C.muted} style={{ ...useAppear(130), marginTop: 40 }}>Next: the real app, run end to end.</Body>
    </Page>
  );
};

// ---------- 4. Architecture ----------
const Box: React.FC<{ title: string; sub: string[]; delay: number; accent?: boolean; w?: number }> = ({ title, sub, delay, accent, w }) => (
  <div style={{ ...useAppear(delay), width: w, flex: w ? undefined : 1, boxSizing: "border-box", background: accent ? C.mark : C.surface, color: accent ? "#fff" : C.ink, border: `1.5px solid ${accent ? C.mark : C.line}`, borderRadius: 20, padding: "26px 28px" }}>
    <div style={{ fontFamily: serif, fontSize: 44 }}>{title}</div>
    {sub.map((x) => <div key={x} style={{ fontFamily: sans, fontSize: 26, marginTop: 8, color: accent ? "#cfe0d9" : C.muted }}>{x}</div>)}
  </div>
);
const Arrow: React.FC<{ delay: number }> = ({ delay }) => {
  const f = useScaledFrame();
  const o = interpolate(f, [delay, delay + 12], [0, 1], clamp);
  return <svg width={70} height={30} style={{ flexShrink: 0, opacity: o }}><path d="M4 15 H56 M46 5 L58 15 L46 25" fill="none" stroke={C.mark} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" /></svg>;
};
export const ArchScene: React.FC = () => (
  <Page>
    <div style={useAppear(0)}><Eyebrow>Under the hood · architecture</Eyebrow></div>
    <div style={{ ...useAppear(6), marginTop: 18 }}><H1 size={84}>Everything runs from one command.</H1></div>
    <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 70 }}>
      <Box title="Browser" sub={["Next.js 15, TypeScript", "Four role areas", "Driver PWA with an", "offline outbox"]} delay={28} />
      <Arrow delay={46} />
      <Box title="Next.js server" sub={["Forwards /api/*", "to the API", "No CORS to set up"]} delay={44} />
      <Arrow delay={62} />
      <Box title="FastAPI" sub={["Orders, plans, loading", "Delivery, sync, receipts", "SQLAlchemy, Alembic"]} delay={60} accent />
      <Arrow delay={78} />
      <div style={{ display: "flex", flexDirection: "column", gap: 20, flex: 1 }}>
        <Box title="Plan engine" sub={["Pure Python rules"]} delay={76} />
        <Box title="PostgreSQL 16" sub={["Orders, plans, events"]} delay={90} />
      </div>
    </div>
    <Body size={30} color={C.muted} style={{ ...useAppear(130), marginTop: 56, maxWidth: 1600 }}>docker compose up starts the database, runs the migrations, loads 120 outlets and 60 vehicles, and queues a delivery day. Passwords and PINs are hashed, every route checks the role, and a store sees only its own outlet.</Body>
  </Page>
);

// ---------- 5. Allocation ----------
export const AllocScene: React.FC = () => {
  const steps = [
    ["Priority", "Skipped last run goes first, then days since served, chilled Fresh, tight windows, festival ramp."],
    ["Placement", "Largest first onto the smallest legal vehicle. Big trucks and reefers stay free."],
    ["Checked every time", "Weight and volume · chilled needs a reefer · van-only outlets · mall windows · home depot · two trips a day · Fresh ≤ 270 min, Style + Tech ≤ 480 · weekly fuel."],
    ["Leftovers", "Deferred with a reason code the store can read: no reefer, capacity, time budget, fuel quota."],
    ["Every edit", "The plan is re-validated. Red warnings block release; amber ones are cautions."],
  ];
  return (
    <Page>
      <div style={useAppear(0)}><Eyebrow>Under the hood · the plan engine</Eyebrow></div>
      <div style={{ ...useAppear(6), marginTop: 18 }}><H1 size={78}>It proposes. The dispatcher decides.</H1></div>
      <div style={{ marginTop: 52, display: "flex", flexDirection: "column", gap: 22 }}>
        {steps.map(([t, d], i) => (
          <div key={t} style={{ ...useAppear(30 + i * 28), display: "flex", gap: 30, alignItems: "baseline" }}>
            <div style={{ fontFamily: mono, fontSize: 26, color: C.orange, width: 56 }}>0{i + 1}</div>
            <div style={{ fontFamily: serif, fontSize: 44, width: 380, color: C.ink }}>{t}</div>
            <Body size={30} color={C.muted} style={{ flex: 1 }}>{d}</Body>
          </div>
        ))}
      </div>
      <Body size={26} color={C.muted} style={{ ...useAppear(200), position: "absolute", left: 120, bottom: 80, fontFamily: mono }}>trip time = depot→district + inter-stop × (stops − 1) + Σ service allowance · same formula as the organisers' check_allocation.py</Body>
    </Page>
  );
};

// ---------- 6. Offline ----------
export const OfflineScene: React.FC = () => {
  const f = useCurrentFrame();
  const items = [
    ["On the phone first", "Every action is applied to the phone's copy, then queued with a client UUID and the device time."],
    ["Safe to retry", "POST /sync sends the outbox oldest first. The server dedupes on the UUID, so a retry never applies twice."],
    ["Conflicts stay visible", "A store count that differs, or a stop moved while offline, is kept side by side. Nobody's number is overwritten."],
    ["Opens without signal", "PIN unlock needs only the device. A service worker caches the app shell."],
  ];
  return (
    <Page dark>
      <div style={useAppear(0)}><Eyebrow>Under the hood · offline driver</Eyebrow></div>
      <div style={{ ...useAppear(6), marginTop: 18 }}><H1 size={78} color={C.nightText}>The truck does not wait for signal.</H1></div>
      <div style={{ marginTop: 60, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28 }}>
        {items.map(([t, d], i) => (
          <div key={t} style={{ ...useAppear(30 + i * 22), background: C.nightSurface, border: "1.5px solid #2c2a27", borderRadius: 20, padding: "28px 34px" }}>
            <div style={{ fontFamily: serif, fontSize: 46, color: C.nightText }}>{t}</div>
            <Body size={28} color={C.nightMuted} style={{ marginTop: 10 }}>{d}</Body>
          </div>
        ))}
      </div>
    </Page>
  );
};

// ---------- 7. Fidelity ----------
export const FidelityScene: React.FC = () => (
  <Page>
    <div style={useAppear(0)}><Eyebrow>Built from the Designathon</Eyebrow></div>
    <div style={{ ...useAppear(6), marginTop: 18 }}><H1 size={78}>The screens we designed are the screens that run.</H1></div>
    <div style={{ display: "flex", gap: 70, marginTop: 56 }}>
      <div style={{ flex: 1 }}>
        <div style={useAppear(30)}><div style={{ fontFamily: serif, fontSize: 56 }}>Followed</div>
          <Body size={30} color={C.muted} style={{ marginTop: 10 }}>Dispatcher D1–D5, Loader L1–L7, Driver R0–R8, Store S1–S6, and the Daylight and Dark systems.</Body></div>
        <div style={{ ...useAppear(60), marginTop: 34 }}><div style={{ fontFamily: serif, fontSize: 56 }}>Departures, written down</div>
          <Body size={30} color={C.muted} style={{ marginTop: 10 }}>Every difference has a reason in docs/design-departures.md. Email sign-in instead of an SMS gateway. A 3-second poll instead of server push. The 4 PM cutoff is shown but not enforced, so a judge can run it at any hour.</Body></div>
      </div>
      <div style={{ flex: 1 }}>
        <div style={useAppear(45)}><div style={{ fontFamily: serif, fontSize: 56 }}>Deliberately left out</div>
          <Body size={30} color={C.muted} style={{ marginTop: 10 }}>Live GPS map · chat · drag-and-drop routes · driver rostering · prices and invoicing. As designed.</Body></div>
        <div style={{ ...useAppear(75), marginTop: 34 }}><div style={{ fontFamily: serif, fontSize: 56 }}>Honest about the gaps</div>
          <Body size={30} color={C.muted} style={{ marginTop: 10 }}>The vine motifs are simplified SVG. The store's Track screen has small − and + buttons so the count difference can be shown.</Body></div>
      </div>
    </div>
  </Page>
);

// ---------- 8. Proof + AI ----------
export const ProofScene: React.FC = () => {
  const stats = [["26", "allocation tests"], ["8", "API tests incl. a 9-step walkthrough"], ["9", "web tests"], ["✓", "ruff and tsc clean"]];
  return (
    <Page>
      <div style={useAppear(0)}><Eyebrow>How we know it works</Eyebrow></div>
      <div style={{ ...useAppear(6), marginTop: 18 }}><H1 size={78}>Tested, and open about the AI.</H1></div>
      <div style={{ display: "flex", gap: 50, marginTop: 56 }}>
        {stats.map(([n, l], i) => (
          <div key={l} style={{ ...useAppear(26 + i * 14), flex: 1 }}>
            <div style={{ fontFamily: serif, fontSize: 110, lineHeight: 1 }}>{n}</div>
            <Body size={26} color={C.muted}>{l}</Body>
          </div>
        ))}
      </div>
      <Body size={30} color={C.muted} style={{ ...useAppear(90), marginTop: 20, maxWidth: 1500 }}>One automated test walks order, plan, load, deliver and receipt through the API. GitHub Actions runs the allocation, API and web checks on every pull request.</Body>
      <div style={{ ...useAppear(130), marginTop: 56, background: C.surface, border: `1.5px solid ${C.line}`, borderRadius: 20, padding: "30px 38px", maxWidth: 1620 }}>
        <div style={{ fontFamily: serif, fontSize: 48 }}>AI tool disclosure</div>
        <Body size={30} color={C.muted} style={{ marginTop: 10 }}>Claude Code wrote much of the code under our direction. We chose the scope, the cut list and every departure from the design, and we review the code we present. Every use is logged in docs/ai-disclosure.md. The logo and design system are ours.</Body>
      </div>
    </Page>
  );
};

// ---------- 9. Outro ----------
export const OutroScene: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <Fade outF={20}>
      <AbsoluteFill style={{ background: C.bg, alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 20 }}>
        <Logo size={150} />
        <div style={{ ...useAppear(6), fontFamily: serif, fontSize: 120, letterSpacing: -3, color: C.ink }}>Waypoint</div>
        <div style={{ ...useAppear(20), fontFamily: serif, fontStyle: "italic", fontSize: 46, color: C.muted }}>Order → plan → load → deliver → receipt.</div>
        <div style={{ ...useAppear(40), marginTop: 36, fontFamily: mono, fontSize: 32, color: C.ink, textAlign: "center", lineHeight: 1.7 }}>
          waypoint-web-5ssl.onrender.com
        </div>
        <Body size={26} color={C.muted} style={{ ...useAppear(60), marginTop: 10 }}>Demo accounts are on the sign-in page. First load can take a minute on the free tier.</Body>
        <div style={{ ...useAppear(80), fontFamily: mono, fontSize: 24, letterSpacing: 2.2, textTransform: "uppercase", color: C.muted, marginTop: 20 }}>Team GitGud · Tech-Triathlon 2026 · The Intelligent Enterprise</div>
      </AbsoluteFill>
    </Fade>
  );
};
