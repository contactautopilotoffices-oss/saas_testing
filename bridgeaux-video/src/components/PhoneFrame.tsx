import React from 'react';
import { colors, fonts, shadows } from '../styles/tokens';

type Props = {
  width?: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
  screenBackground?: string;
  time?: string;
};

/** A modern phone: thin bezel, rounded screen, status bar. Aspect ~ 19.5:9. */
export const PhoneFrame: React.FC<Props> = ({
  width = 360,
  children,
  style,
  screenBackground = colors.white,
  time = '9:41',
}) => {
  const height = width * 2.08;
  const bezel = width * 0.035;
  const radius = width * 0.16;
  const s = width / 360;
  return (
    <div
      style={{
        width,
        height,
        borderRadius: radius,
        background: '#1C2226',
        padding: bezel,
        boxShadow: `${shadows.float}, inset 0 0 0 ${1.5 * s}px #3A4248`,
        position: 'relative',
        ...style,
      }}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          borderRadius: radius - bezel,
          background: screenBackground,
          overflow: 'hidden',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* status bar */}
        <div
          style={{
            height: 44 * s,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: `0 ${26 * s}px`,
            fontFamily: fonts.ui,
            fontWeight: 600,
            fontSize: 14 * s,
            color: colors.ink,
            position: 'relative',
            zIndex: 5,
          }}
        >
          <span>{time}</span>
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: 11 * s,
              transform: 'translateX(-50%)',
              width: 96 * s,
              height: 26 * s,
              borderRadius: 99,
              background: '#11161A',
            }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 * s }}>
            {/* signal */}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 1.5 * s, height: 10 * s }}>
              {[4, 6, 8, 10].map((h, i) => (
                <div key={i} style={{ width: 3 * s, height: h * s, borderRadius: 1, background: colors.ink }} />
              ))}
            </div>
            {/* battery */}
            <div
              style={{
                width: 22 * s,
                height: 11 * s,
                borderRadius: 3 * s,
                border: `${1.2 * s}px solid ${colors.ink}`,
                padding: 1.2 * s,
                marginLeft: 3 * s,
              }}
            >
              <div style={{ width: '78%', height: '100%', borderRadius: 1.5 * s, background: colors.ink }} />
            </div>
          </div>
        </div>
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>{children}</div>
        {/* home indicator */}
        <div
          style={{
            position: 'absolute',
            bottom: 8 * s,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 120 * s,
            height: 4.5 * s,
            borderRadius: 99,
            background: 'rgba(21,34,40,0.35)',
            zIndex: 6,
          }}
        />
      </div>
    </div>
  );
};
