import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, Img, staticFile } from "remotion";
import { C, W, mono, sans, serif } from "../theme";
import { Fade, useAppear } from "./Fade";
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
  const p = interpolate(f, [4, 60], [0, 1], clamp);
  const a = useAppear(40), b = useAppear(60), c = useAppear(85);
  return (
    <Fade inF={6}>
      <AbsoluteFill style={{ background: C.bg, alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 26 }}>
        <Logo size={230} progress={p} />
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
const NODES = ["Order", "Plan", "Load", "Deliver", "Receipt"];
export const FlowScene: React.FC = () => {
  const f = useCurrentFrame();
  const prog = interpolate(f, [10, 120], [0, 4], clamp);
  const ys = [0, 1, 0.45, 1, 0];
  const x0 = 220, step = (W - 440) / 4;
  const pts = NODES.map((_, i) => [x0 + i * step, 560 + (ys[i] - 0.5) * 220]);
  const d = pts.map((p, i) => `${i ? "L" : "M"}${p[0]} ${p[1]}`).join(" ");
  return (
    <Page>
      <div style={useAppear(0)}><Eyebrow>The answer</Eyebrow></div>
      <div style={{ ...useAppear(6), marginTop: 20 }}><H1 size={100}>One shared record,<br />four roles.</H1></div>
      <svg width={W} height={1080} style={{ position: "absolute", left: 0, top: 0 }}>
        <path d={d} fill="none" stroke={C.mark} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - prog / 4} />
        {pts.map((p, i) => (
          <g key={i} opacity={prog >= i ? 1 : 0.15}>
            <circle cx={p[0]} cy={p[1]} r={i === 4 ? 26 : 22} fill={i === 4 ? C.orange : C.bg} stroke={C.mark} strokeWidth={i === 4 ? 0 : 6} />
            <text x={p[0]} y={p[1] + (ys[i] > 0.5 ? 72 : -48)} textAnchor="middle" style={{ fontFamily: serif, fontSize: 48, fill: C.ink }}>{NODES[i]}</text>
          </g>
        ))}
      </svg>
      <Body size={30} color={C.muted} style={{ ...useAppear(130), position: "absolute", left: 120, right: 120, bottom: 90, textAlign: "center" }}>Next: the real app, run end to end. Order to receipt, all four roles.</Body>
    </Page>
  );
};

// ---------- 4. Architecture ----------
const Box: React.FC<{ x: number; y: number; w: number; h: number; title: string; sub: string[]; delay: number; accent?: boolean }> = ({ x, y, w, h, title, sub, delay, accent }) => (
  <div style={{ ...useAppear(delay), position: "absolute", left: x, top: y, width: w, height: h, background: accent ? C.mark : C.surface, color: accent ? "#fff" : C.ink, border: `1.5px solid ${accent ? C.mark : C.line}`, borderRadius: 20, padding: "22px 26px", boxSizing: "border-box" }}>
    <div style={{ fontFamily: serif, fontSize: 40 }}>{title}</div>
    {sub.map((s) => <div key={s} style={{ fontFamily: sans, fontSize: 24, marginTop: 6, color: accent ? "#cfe0d9" : C.muted }}>{s}</div>)}
  </div>
);
export const ArchScene: React.FC = () => {
  const f = useCurrentFrame();
  const line = (x1: number, y1: number, x2: number, y2: number, delay: number) => (
    <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={C.mark} strokeWidth={4} strokeLinecap="round" opacity={interpolate(f, [delay, delay + 12], [0, 1], clamp)} markerEnd="url(#ah)" />
  );
  return (
    <Page>
      <div style={useAppear(0)}><Eyebrow>Under the hood · architecture</Eyebrow></div>
      <div style={{ ...useAppear(6), marginTop: 18 }}><H1 size={78}>Everything runs from one command.</H1></div>
      <svg width={W} height={1080} style={{ position: "absolute", left: 0, top: 110 }}>
        <defs><marker id="ah" markerWidth="10" markerHeight="10" refX="7" refY="5" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill={C.mark} /></marker></defs>
        {line(560, 560, 660, 560, 60)}{line(1020, 560, 1120, 560, 80)}{line(1500, 470, 1560, 400, 100)}{line(1500, 640, 1560, 700, 110)}
      </svg>
      <Box x={120} y={490} w={440} h={360} title="Browser" sub={["Next.js 15 · TypeScript", "/dispatcher /loader", "/driver /store", "Driver PWA: IndexedDB", "outbox + service worker"]} delay={30} />
      <Box x={660} y={550} w={360} h={240} title="Next.js server" sub={["Rewrites /api/*", "No CORS, no API", "address in the bundle"]} delay={50} />
      <Box x={1120} y={490} w={380} h={360} title="FastAPI" sub={["Auth · orders · plans", "loading · delivery", "sync · receipts", "insights", "SQLAlchemy · Alembic"]} delay={70} accent />
      <Box x={1560} y={390} w={300} h={200} title="allocation" sub={["Pure Python", "rules · allocator"]} delay={90} />
      <Box x={1560} y={730} w={300} h={200} title="PostgreSQL 16" sub={["Orders, plans,", "loads, events"]} delay={100} />
      <Body size={30} color={C.muted} style={{ ...useAppear(140), position: "absolute", left: 120, bottom: 100, width: 1500 }}>docker compose up: database, migrations, seed data (120 outlets, 60 vehicles) and a queued delivery day. Passwords and PINs are hashed, every route checks the role, and a store sees only its own outlet.</Body>
    </Page>
  );
};

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
          waypoint-web-5ssl.onrender.com<br />github.com/mithilyr/gitgud_waypoint
        </div>
        <Body size={26} color={C.muted} style={{ ...useAppear(60), marginTop: 10 }}>Demo accounts are on the sign-in page. First load can take a minute on the free tier.</Body>
        <div style={{ ...useAppear(80), fontFamily: mono, fontSize: 24, letterSpacing: 2.2, textTransform: "uppercase", color: C.muted, marginTop: 20 }}>Team GitGud · Tech-Triathlon 2026 · The Intelligent Enterprise</div>
      </AbsoluteFill>
    </Fade>
  );
};
