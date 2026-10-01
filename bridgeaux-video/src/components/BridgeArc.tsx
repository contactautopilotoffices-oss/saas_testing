import React from 'react';
import { colors } from '../styles/tokens';

/**
 * The swoosh from the BridgeAux logo: a thin crescent that runs blue to green.
 * Used as a quiet signature under headings and on the final frame.
 * `draw` (0..1) wipes it in from the centre outwards.
 */
export const BridgeArc: React.FC<{ width: number; thickness?: number; draw?: number; style?: React.CSSProperties }> = ({
  width,
  thickness = 6,
  draw = 1,
  style,
}) => {
  const id = React.useId().replace(/:/g, '');
  const h = width * 0.09 + thickness;
  const rise = width * 0.09;
  // outer and inner curves meet at the tips, giving a tapered crescent
  const d = `M0 ${h} Q ${width / 2} ${h - rise * 2} ${width} ${h} Q ${width / 2} ${h - rise * 2 + thickness * 2} 0 ${h} Z`;
  const half = (width / 2) * Math.min(1, Math.max(0, draw));
  return (
    <svg width={width} height={h + 2} viewBox={`0 0 ${width} ${h + 2}`} style={{ display: 'block', overflow: 'visible', ...style }}>
      <defs>
        <linearGradient id={`${id}-g`} x1="0" x2="1">
          <stop offset="0" stopColor={colors.blue} />
          <stop offset="0.5" stopColor={colors.blue} />
          <stop offset="0.5" stopColor={colors.green} />
          <stop offset="1" stopColor={colors.green} />
        </linearGradient>
        <clipPath id={`${id}-c`}>
          <rect x={width / 2 - half} y={-10} width={half * 2} height={h + 20} />
        </clipPath>
      </defs>
      <path d={d} fill={`url(#${id}-g)`} clipPath={`url(#${id}-c)`} />
    </svg>
  );
};
