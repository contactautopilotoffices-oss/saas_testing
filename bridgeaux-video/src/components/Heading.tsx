import React from 'react';
import { colors, fonts } from '../styles/tokens';
import { BridgeArc } from './BridgeArc';
import { mix } from '../lib/motion';

/** Scene heading with the logo swoosh underneath. `p` 0..1 entrance, `out` 0..1 exit. */
export const Heading: React.FC<{ text: string; p: number; out?: number; top?: number; size?: number; children?: React.ReactNode }> = ({
  text,
  p,
  out = 0,
  top = 86,
  size = 46,
  children,
}) => {
  if (p <= 0 || out >= 1) return null;
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        opacity: p * (1 - out),
        transform: `translateY(${mix(p, 16, 0) + mix(out, 0, -10)}px)`,
        filter: p < 1 ? `blur(${(1 - p) * 4}px)` : undefined,
      }}
    >
      <div style={{ fontFamily: fonts.display, fontWeight: 600, fontSize: size, letterSpacing: '-0.025em', color: colors.ink }}>{text}</div>
      <BridgeArc width={size * 3.4} thickness={size * 0.09} draw={p} style={{ marginTop: size * 0.12 }} />
      {children}
    </div>
  );
};
