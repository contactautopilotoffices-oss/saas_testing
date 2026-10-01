import React from 'react';
import { AbsoluteFill, Img, staticFile } from 'remotion';
import { colors } from '../styles/tokens';

/**
 * The shared stage: clean white with a soft key light from above, a faint
 * blue glow on the left and green on the right (the B and the A of the logo)
 * and a light film grain. Every scene sits on this so cuts are seamless.
 */
export const Backdrop: React.FC<{ tone?: 'paper' | 'sand'; light?: number; children?: React.ReactNode }> = ({
  tone = 'paper',
  light = 1,
  children,
}) => {
  const base = tone === 'paper' ? colors.paper : colors.sand;
  return (
    <AbsoluteFill style={{ backgroundColor: base }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(1400px 900px at 50% 18%, rgba(255,255,255,${0.85 * light}) 0%, rgba(255,255,255,0) 70%)`,
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(900px 700px at 8% 30%, rgba(2,116,239,${0.045 * light}) 0%, rgba(2,116,239,0) 70%), radial-gradient(900px 700px at 92% 72%, rgba(4,137,77,${0.04 * light}) 0%, rgba(4,137,77,0) 70%)`,
        }}
      />
      <AbsoluteFill
        style={{
          background:
            'radial-gradient(1600px 1000px at 50% 50%, rgba(0,0,0,0) 58%, rgba(40,60,80,0.06) 100%)',
        }}
      />
      {children}
    </AbsoluteFill>
  );
};

/** Film grain overlay. Place last inside a scene. */
export const Grain: React.FC<{ opacity?: number }> = ({ opacity = 0.035 }) => (
  <AbsoluteFill style={{ pointerEvents: 'none', mixBlendMode: 'multiply', opacity }}>
    <Img
      src={staticFile('textures/grain.png')}
      style={{ width: '100%', height: '100%', objectFit: 'cover', imageRendering: 'auto' }}
    />
  </AbsoluteFill>
);
