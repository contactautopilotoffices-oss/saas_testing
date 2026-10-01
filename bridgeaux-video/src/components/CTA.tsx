import React from 'react';
import { ArrowRight } from 'lucide-react';
import { colors, fonts } from '../styles/tokens';

/** "Join the Waitlist" button with an optional one-off light sweep (0..1). */
export const CTA: React.FC<{ label?: string; sweep?: number; style?: React.CSSProperties }> = ({ label = 'Join the Waitlist', sweep = 0, style }) => (
  <div
    style={{
      position: 'relative',
      overflow: 'hidden',
      display: 'inline-flex',
      alignItems: 'center',
      gap: 14,
      padding: '22px 38px',
      borderRadius: 999,
      background: `linear-gradient(135deg, ${colors.blue} 0%, ${colors.blueDeep} 100%)`,
      color: '#fff',
      fontFamily: fonts.display,
      fontWeight: 600,
      fontSize: 30,
      letterSpacing: '-0.01em',
      boxShadow: '0 18px 40px rgba(2,116,239,0.30), 0 4px 10px rgba(2,116,239,0.18)',
      ...style,
    }}
  >
    {label}
    <ArrowRight size={30} strokeWidth={2.4} />
    {sweep > 0 && sweep < 1 ? (
      <div
        style={{
          position: 'absolute',
          top: -20,
          bottom: -20,
          width: 90,
          left: `${-30 + sweep * 140}%`,
          background: 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.35) 50%, rgba(255,255,255,0) 100%)',
          transform: 'skewX(-20deg)',
        }}
      />
    ) : null}
  </div>
);
