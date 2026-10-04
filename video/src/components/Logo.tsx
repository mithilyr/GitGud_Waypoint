import React from "react";
import { C } from "../theme";

const PTS: [number, number][] = [[7.38, 13.84], [18.45, 46.13], [29.52, 24.91], [40.59, 46.13], [51.66, 13.84]];
const seglen = (i: number) => Math.hypot(PTS[i + 1][0] - PTS[i][0], PTS[i + 1][1] - PTS[i][1]);

// The Route-W mark from apps/web/public/logo, redrawn inline so it can be built in order.
// `t` runs 0..9: dot, line, dot, line, dot, line, dot, line, orange dot (each step is one unit).
export const Logo: React.FC<{ size?: number; ink?: string; t?: number }> = ({ size = 120, ink = C.mark, t = 9 }) => {
  const k = (a: number) => Math.min(1, Math.max(0, t - a));
  const ease = (x: number) => 1 - Math.pow(1 - x, 3);
  return (
    <svg width={size} height={size} viewBox="0 0 59.04 59.04" overflow="visible">
      <defs>
        <mask id="cutmask" maskUnits="userSpaceOnUse" x="-5" y="-5" width="70" height="70">
          <rect x="-5" y="-5" width="70" height="70" fill="#fff" />
          {PTS.slice(0, 4).map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r={5.9} fill="#000" />)}
          <circle cx={PTS[4][0]} cy={PTS[4][1]} r={7.4} fill="#000" />
        </mask>
      </defs>
      <g mask="url(#cutmask)">
        {[0, 1, 2, 3].map((i) => {
          const L = seglen(i), p = ease(k(2 * i + 1));
          return <line key={i} x1={PTS[i][0]} y1={PTS[i][1]} x2={PTS[i + 1][0]} y2={PTS[i + 1][1]} stroke={ink} strokeWidth={4.8} strokeLinecap="round" strokeDasharray={L} strokeDashoffset={L * (1 - p)} opacity={p > 0 ? 1 : 0} />;
        })}
      </g>
      {PTS.slice(0, 4).map((p, i) => {
        const s = ease(k(2 * i));
        return <circle key={i} cx={p[0]} cy={p[1]} r={4.61 * s} fill="none" stroke={ink} strokeWidth={2.58} opacity={s > 0 ? 1 : 0} />;
      })}
      <circle cx={PTS[4][0]} cy={PTS[4][1]} r={6.01 * ease(k(8))} fill={C.orange} />
    </svg>
  );
};
