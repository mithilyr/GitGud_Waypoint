import React from "react";
import { C } from "../theme";

// The Route-W mark from apps/web/public/logo, redrawn inline so it can animate.
export const Logo: React.FC<{ size?: number; ink?: string; progress?: number }> = ({ size = 120, ink = C.mark, progress = 1 }) => {
  const pts: [number, number][] = [[7.38, 13.84], [18.45, 46.13], [29.52, 24.91], [40.59, 46.13], [51.66, 13.84]];
  const d = pts.map((p, i) => `${i ? "L" : "M"}${p[0]} ${p[1]}`).join(" ");
  const len = 160;
  return (
    <svg width={size} height={size} viewBox="0 0 59.04 59.04">
      <defs>
        <mask id="cutmask" maskUnits="userSpaceOnUse" x="0" y="0" width="59.04" height="59.04">
          <rect width="59.04" height="59.04" fill="#fff" />
          {pts.slice(0, 4).map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r={5.9} fill="#000" />)}
          <circle cx={51.66} cy={13.84} r={7.4} fill="#000" />
        </mask>
      </defs>
      <path mask="url(#cutmask)" d={d} fill="none" stroke={ink} strokeWidth={4.8} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={len} strokeDashoffset={len * (1 - progress)} />
      {pts.slice(0, 4).map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r={4.61} fill="none" stroke={ink} strokeWidth={2.58} opacity={progress > i / 4 ? 1 : 0} />
      ))}
      <circle cx={51.66} cy={13.84} r={6.01} fill={C.orange} opacity={progress > 0.95 ? 1 : 0} />
    </svg>
  );
};
