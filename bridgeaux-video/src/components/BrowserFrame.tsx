import React from 'react';
import { Lock } from 'lucide-react';
import { colors, fonts, radii, shadows } from '../styles/tokens';

type Props = {
  url: string;
  width: number;
  height: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
  /** Scales the chrome (bar height, text) for small frames */
  chromeScale?: number;
};

/** A restrained desktop browser window. */
export const BrowserFrame: React.FC<Props> = ({ url, width, height, children, style, chromeScale = 1 }) => {
  const bar = 44 * chromeScale;
  return (
    <div
      style={{
        width,
        height,
        borderRadius: radii.lg * chromeScale,
        background: colors.white,
        boxShadow: shadows.float,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        border: `1px solid rgba(21,34,40,0.08)`,
        ...style,
      }}
    >
      <div
        style={{
          height: bar,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          padding: `0 ${16 * chromeScale}px`,
          gap: 8 * chromeScale,
          background: '#F6F8FA',
          borderBottom: `1px solid ${colors.lineSoft}`,
          position: 'relative',
        }}
      >
        {['#E1E6EC', '#E1E6EC', '#E1E6EC'].map((c, i) => (
          <div key={i} style={{ width: 11 * chromeScale, height: 11 * chromeScale, borderRadius: 99, background: c }} />
        ))}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)',
            height: 28 * chromeScale,
            minWidth: 360 * chromeScale,
            padding: `0 ${14 * chromeScale}px`,
            borderRadius: 8 * chromeScale,
            background: colors.white,
            border: `1px solid ${colors.lineSoft}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 7 * chromeScale,
            fontFamily: fonts.ui,
            fontSize: 13.5 * chromeScale,
            color: colors.muted,
            letterSpacing: '0.005em',
          }}
        >
          <Lock size={12 * chromeScale} strokeWidth={2.2} color={colors.faint} />
          {url}
        </div>
      </div>
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>{children}</div>
    </div>
  );
};
