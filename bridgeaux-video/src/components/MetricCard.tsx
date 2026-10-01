import React from 'react';
import { colors, fonts, radii } from '../styles/tokens';

type Props = {
  label: string;
  value: string;
  delta?: string;
  icon: React.ReactNode;
  accent?: 'blue' | 'green';
  /** sparkline points (0..1), drawn left to right */
  spark?: number[];
  /** 0..1 how much of the sparkline is drawn */
  sparkDraw?: number;
  style?: React.CSSProperties;
};

/** A dashboard KPI tile with an optional sparkline. */
export const MetricCard: React.FC<Props> = ({ label, value, delta, icon, accent = 'blue', spark, sparkDraw = 1, style }) => {
  const c = accent === 'blue' ? colors.blue : colors.green;
  const soft = accent === 'blue' ? colors.blueSoft : colors.greenSoft;
  const w = 120;
  const h = 40;
  const pts = spark?.map((v, i) => [(i / (spark.length - 1)) * w, h - v * h] as const) ?? [];
  const d = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const len = w * 1.6;
  return (
    <div
      style={{
        background: '#FFFFFF',
        borderRadius: radii.lg,
        border: `1px solid ${colors.lineSoft}`,
        padding: '20px 22px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        boxShadow: '0 1px 2px rgba(21,34,40,0.04)',
        ...style,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: 10, background: soft, color: c, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {icon}
        </div>
        <span style={{ fontFamily: fonts.ui, fontWeight: 500, fontSize: 15, color: colors.muted }}>{label}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontFamily: fonts.ui, fontWeight: 700, fontSize: 34, color: colors.ink, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
            {value}
          </div>
          {delta ? (
            <div style={{ fontFamily: fonts.ui, fontWeight: 600, fontSize: 13, color: colors.green, marginTop: 4 }}>{delta}</div>
          ) : null}
        </div>
        {spark ? (
          <svg width={w} height={h + 4} style={{ overflow: 'visible' }}>
            <path d={d} fill="none" stroke={c} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={`${len} ${len}`} strokeDashoffset={len * (1 - sparkDraw)} />
          </svg>
        ) : null}
      </div>
    </div>
  );
};
