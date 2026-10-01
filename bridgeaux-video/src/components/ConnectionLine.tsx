import React from 'react';
import { colors } from '../styles/tokens';

type Point = { x: number; y: number };

type Props = {
  from: Point;
  to: Point;
  /** 0..1 how much of the line is drawn (from -> to) */
  draw: number;
  /** 0..1 position of a travelling pulse; omit for none */
  pulse?: number;
  color?: string;
  width?: number;
  /** bend of the curve, perpendicular offset as a fraction of length */
  curve?: number;
  dashed?: boolean;
  opacity?: number;
  /** stroke alpha of the line itself */
  strength?: number;
};

/**
 * A soft curved connector between two points, drawn in an absolutely
 * positioned SVG (coordinates are in the parent's pixel space).
 */
export const ConnectionLine: React.FC<Props> = ({
  from,
  to,
  draw,
  pulse,
  color = colors.blue,
  width = 2,
  curve = 0.12,
  dashed = false,
  opacity = 1,
  strength = 0.32,
}) => {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy);
  const mx = (from.x + to.x) / 2 - dy * curve;
  const my = (from.y + to.y) / 2 + dx * curve;
  const d = `M ${from.x} ${from.y} Q ${mx} ${my} ${to.x} ${to.y}`;
  // approximate quadratic length for dash maths
  const approx = len * (1 + Math.abs(curve) * 0.6);

  const at = (t: number) => ({
    x: (1 - t) * (1 - t) * from.x + 2 * (1 - t) * t * mx + t * t * to.x,
    y: (1 - t) * (1 - t) * from.y + 2 * (1 - t) * t * my + t * t * to.y,
  });
  const p = pulse !== undefined ? at(Math.min(1, Math.max(0, pulse))) : null;

  if (draw <= 0) return null;
  return (
    <g opacity={opacity}>
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeOpacity={strength}
        strokeWidth={width}
        strokeLinecap="round"
        strokeDasharray={dashed ? `${width * 3} ${width * 4}` : `${approx} ${approx}`}
        strokeDashoffset={dashed ? 0 : approx * (1 - draw)}
        style={dashed ? { clipPath: undefined } : undefined}
      />
      {p && pulse! > 0 && pulse! < 1 ? (
        <>
          <circle cx={p.x} cy={p.y} r={width * 4.5} fill={color} opacity={0.12} />
          <circle cx={p.x} cy={p.y} r={width * 1.8} fill={color} />
        </>
      ) : null}
    </g>
  );
};
