/**
 * Home-page scene: a string of waypoints. Each stop is a ring (the same stops as the logo's Route-W),
 * hung on one slack string; the last stop is filled, meaning delivered. Colours come from the theme tokens,
 * so it reads in Daylight and Dark. The string draws itself in and the stops pop in order (see globals.css);
 * with reduced motion it simply appears.
 */
const STOPS = [
  { x: 70, y: 138, r: 13, depot: true },
  { x: 215, y: 92, r: 8 },
  { x: 372, y: 150, r: 9 },
  { x: 540, y: 104, r: 8 },
  { x: 716, y: 158, r: 10 },
  { x: 884, y: 96, r: 8 },
  { x: 1030, y: 132, r: 9 },
  { x: 1135, y: 84, r: 14, last: true },
] as const;

/** A slack string between two stops: a quadratic curve whose control point hangs below the chord. */
function slack(a: { x: number; y: number }, b: { x: number; y: number }) {
  const sag = 26 + Math.abs(b.x - a.x) * 0.06;
  return `Q${(a.x + b.x) / 2} ${Math.max(a.y, b.y) + sag} ${b.x} ${b.y}`;
}

const STRING = `M${STOPS[0].x} ${STOPS[0].y} ` + STOPS.slice(1).map((s, i) => slack(STOPS[i], s)).join(" ");

export function WaypointString({ className = "" }: { className?: string }) {
  return (
    // The wrapper clips sideways overflow (so the page never scrolls sideways) but not upwards (so the last stop's halo is never cut).
    <div className={`pointer-events-none h-[200px] w-full overflow-x-clip sm:h-[250px] ${className}`} aria-hidden>
    <svg viewBox="0 -60 1200 290" preserveAspectRatio="xMidYMax slice" className="block h-full w-full overflow-visible">
      {/* soft ground, two low hills */}
      <path d="M0 230V196C150 170 260 184 400 196S650 204 800 186 1050 168 1200 190V230Z" fill="var(--muted)" opacity="0.07" />
      <path d="M0 230V212C180 198 330 210 520 214S860 206 1010 200 1130 204 1200 208V230Z" fill="var(--muted)" opacity="0.06" />

      {/* the string: a faint shadow under it, then the string itself */}
      <path d={STRING} transform="translate(0 7)" fill="none" stroke="var(--muted)" strokeOpacity="0.12" strokeWidth="3" strokeLinecap="round" />
      <path
        className="wp-string"
        pathLength={1}
        d={STRING}
        fill="none"
        stroke="var(--text)"
        strokeOpacity="0.72"
        strokeWidth="1.8"
        strokeLinecap="round"
      />

      {/* the stops */}
      {STOPS.map((s, i) => {
        const last = "last" in s;
        const depot = "depot" in s;
        return (
          <g key={i} className="wp-stop" style={{ ["--i" as string]: i }} transform={`translate(${s.x} ${s.y})`}>
            {last ? <circle className="wp-halo" r={s.r + 10} fill="var(--logo-dot)" opacity="0.18" /> : null}
            {last ? (
              <circle r={s.r} fill="var(--logo-dot)" />
            ) : (
              <>
                <circle r={s.r} fill="var(--bg)" stroke="var(--text)" strokeOpacity="0.85" strokeWidth={depot ? 3 : 2.4} />
                {depot ? <circle r="4" fill="var(--text)" fillOpacity="0.85" /> : null}
              </>
            )}
            {/* a short stem to the ground, so each stop reads as a pin rather than a bead */}
            <path d={`M0 ${s.r + 2}V${s.r + 14}`} stroke="var(--text)" strokeOpacity="0.22" strokeWidth="1.4" strokeLinecap="round" strokeDasharray="1 4" />
          </g>
        );
      })}
    </svg>
    </div>
  );
}

const STRIP = [
  { x: 28, y: 20, r: 3.4 },
  { x: 108, y: 11, r: 2.8 },
  { x: 192, y: 21, r: 3.2 },
  { x: 278, y: 11, r: 2.8 },
  { x: 360, y: 18, r: 4 },
] as const;

/** The same idea as the home scene, small: a slim string of stops for the strip above the phone tab bars. */
export function WaypointStrip({ className = "" }: { className?: string }) {
  const d = `M${STRIP[0].x} ${STRIP[0].y} ` + STRIP.slice(1).map((s, i) => `Q${(STRIP[i].x + s.x) / 2} ${Math.max(STRIP[i].y, s.y) + 9} ${s.x} ${s.y}`).join(" ");
  return (
    <svg viewBox="0 0 390 34" preserveAspectRatio="xMidYMax slice" className={`pointer-events-none block h-[34px] w-full ${className}`} aria-hidden>
      <path d={d} fill="none" stroke="var(--text)" strokeOpacity="0.3" strokeWidth="1.2" strokeLinecap="round" />
      {STRIP.map((s, i) =>
        i === STRIP.length - 1 ? (
          <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="var(--logo-dot)" />
        ) : (
          <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="var(--bg)" stroke="var(--text)" strokeOpacity="0.45" strokeWidth="1.4" />
        ),
      )}
    </svg>
  );
}
