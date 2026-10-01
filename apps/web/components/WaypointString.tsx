type Stop = { x: number; y: number; r: number; depot?: boolean; last?: boolean };
type Scene = { viewBox: string; stops: readonly Stop[]; hills: readonly string[] };

/**
 * Home-page scene: a string of waypoints. Each stop is a ring (the same stops as the logo's Route-W),
 * hung on one slack string; the last stop is filled, meaning delivered. Colours come from the theme tokens,
 * so it reads in Daylight and Dark. The string draws itself in and the stops pop in order (see globals.css);
 * with reduced motion it simply appears.
 *
 * Two compositions, each scaled to the full width (never cropped): a wide one from `sm` up and a narrow one
 * for phones, so every stop, including the orange "delivered" one, is always in view. `compact` shows only the
 * narrow one, in a column at most 520 px wide (the end of every phone screen); `still` turns the animation off for
 * screens you revisit all the time.
 */
const WIDE: Scene = {
  viewBox: "0 -10 1200 240",
  stops: [
    { x: 70, y: 138, r: 13, depot: true },
    { x: 215, y: 92, r: 8 },
    { x: 372, y: 150, r: 9 },
    { x: 540, y: 104, r: 8 },
    { x: 716, y: 158, r: 10 },
    { x: 884, y: 96, r: 8 },
    { x: 1030, y: 132, r: 9 },
    { x: 1135, y: 84, r: 14, last: true },
  ],
  hills: [
    "M0 230V196C150 170 260 184 400 196S650 204 800 186 1050 168 1200 190V230Z",
    "M0 230V212C180 198 330 210 520 214S860 206 1010 200 1130 204 1200 208V230Z",
  ],
};

const NARROW: Scene = {
  viewBox: "0 0 480 190",
  stops: [
    { x: 40, y: 136, r: 12, depot: true },
    { x: 132, y: 88, r: 7 },
    { x: 228, y: 142, r: 8 },
    { x: 326, y: 96, r: 7 },
    { x: 428, y: 72, r: 12, last: true },
  ],
  hills: [
    "M0 190V160C60 146 120 156 190 164S310 170 380 154 450 148 480 158V190Z",
    "M0 190V174C90 164 170 172 260 176S400 170 480 172V190Z",
  ],
};

/** A slack string between two stops: a quadratic curve whose control point hangs below the chord. */
function slack(a: { x: number; y: number }, b: { x: number; y: number }, k: number) {
  const sag = (26 + Math.abs(b.x - a.x) * 0.06) * k;
  return `Q${(a.x + b.x) / 2} ${Math.max(a.y, b.y) + sag} ${b.x} ${b.y}`;
}

function SceneSvg({ scene, className, k }: { scene: Scene; className: string; k: number }) {
  const { stops } = scene;
  const string = `M${stops[0].x} ${stops[0].y} ` + stops.slice(1).map((s, i) => slack(stops[i], s, k)).join(" ");
  return (
    <svg viewBox={scene.viewBox} preserveAspectRatio="xMidYMax meet" className={`h-auto w-full overflow-visible ${className}`}>
      {/* soft ground, two low hills */}
      <path d={scene.hills[0]} fill="var(--muted)" opacity="0.07" />
      <path d={scene.hills[1]} fill="var(--muted)" opacity="0.06" />

      {/* the string: a faint shadow under it, then the string itself */}
      <path d={string} transform="translate(0 6)" fill="none" stroke="var(--muted)" strokeOpacity="0.12" strokeWidth="3" strokeLinecap="round" />
      <path className="wp-string" pathLength={1} d={string} fill="none" stroke="var(--text)" strokeOpacity="0.72" strokeWidth="1.8" strokeLinecap="round" />

      {/* the stops */}
      {stops.map((s, i) => (
        <g key={i} className="wp-stop" style={{ ["--i" as string]: i }} transform={`translate(${s.x} ${s.y})`}>
          {s.last ? <circle className="wp-halo" r={s.r + 10} fill="var(--logo-dot)" opacity="0.18" /> : null}
          {s.last ? (
            <circle r={s.r} fill="var(--logo-dot)" />
          ) : (
            <>
              <circle r={s.r} fill="var(--bg)" stroke="var(--text)" strokeOpacity="0.85" strokeWidth={s.depot ? 3 : 2.4} />
              {s.depot ? <circle r="4" fill="var(--text)" fillOpacity="0.85" /> : null}
            </>
          )}
          {/* a short stem to the ground, so each stop reads as a pin rather than a bead */}
          <path d={`M0 ${s.r + 2}V${s.r + 14}`} stroke="var(--text)" strokeOpacity="0.22" strokeWidth="1.4" strokeLinecap="round" strokeDasharray="1 4" />
        </g>
      ))}
    </svg>
  );
}

export function WaypointString({ className = "", compact = false, still = false }: { className?: string; compact?: boolean; still?: boolean }) {
  return (
    // Clips sideways overflow (so the page never scrolls sideways) but not upwards (so the last stop's halo is never cut).
    <div className={`pointer-events-none w-full shrink-0 overflow-x-clip ${still ? "wp-still" : ""} ${compact ? "mx-auto max-w-[520px]" : ""} ${className}`} aria-hidden>
      <SceneSvg scene={NARROW} k={0.9} className={compact ? "block" : "block sm:hidden"} />
      {compact ? null : <SceneSvg scene={WIDE} k={1} className="hidden sm:block" />}
    </div>
  );
}
