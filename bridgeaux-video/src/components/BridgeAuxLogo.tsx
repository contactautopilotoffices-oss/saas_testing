import React from 'react';
import { LOGO_BOUNDS, LOGO_PATHS } from './brand/logoPaths';
import { colors, fonts } from '../styles/tokens';
import { mix } from '../lib/motion';

type Props = {
  /** Height of the mark in px. The wordmark scales with it. */
  height: number;
  showWordmark?: boolean;
  /** 0..1 reveal: B slides in, A slides in, then the bridge spans across. */
  reveal?: number;
  /** 0..1 wordmark reveal (fade + slide). Defaults to `reveal`. */
  wordmarkReveal?: number;
  wordmarkColor?: string;
  style?: React.CSSProperties;
};

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const seg = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * The official BridgeAux mark (blue B, green A, grey bridge) with the
 * "BridgeAux" wordmark set in Sora semibold, as on bridgeaux.com.
 */
export const BridgeAuxLogo: React.FC<Props> = ({
  height,
  showWordmark = false,
  reveal = 1,
  wordmarkReveal,
  wordmarkColor = colors.ink,
  style,
}) => {
  const { x, y, width: bw, height: bh } = LOGO_BOUNDS;
  const width = (bw / bh) * height;

  const pB = easeOut(seg(reveal, 0, 0.55));
  const pA = easeOut(seg(reveal, 0.15, 0.7));
  const pBridge = easeOut(seg(reveal, 0.45, 1));
  const wm = easeOut(clamp01(wordmarkReveal ?? reveal));

  const clipId = React.useId().replace(/:/g, '');

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: height * 0.34, ...style }}>
      <svg
        width={width}
        height={height}
        viewBox={`${x} ${y} ${bw} ${bh}`}
        style={{ overflow: 'visible', display: 'block' }}
      >
        <defs>
          {/* the bridge spans outward from its centre as it reveals */}
          <clipPath id={`bridge-${clipId}`}>
            <rect
              x={671 - mix(pBridge, 0, 620)}
              y={y - 10}
              width={mix(pBridge, 0, 1240)}
              height={bh + 20}
            />
          </clipPath>
        </defs>
        <g opacity={pB} transform={`translate(${mix(pB, -70, 0)} 0)`}>
          <path d={LOGO_PATHS.b.d} fill={LOGO_PATHS.b.fill} fillRule="evenodd" stroke={LOGO_PATHS.b.fill} strokeWidth={0.25} strokeLinejoin="round" />
        </g>
        <g opacity={pA} transform={`translate(${mix(pA, 70, 0)} 0)`}>
          <path d={LOGO_PATHS.a.d} fill={LOGO_PATHS.a.fill} fillRule="evenodd" stroke={LOGO_PATHS.a.fill} strokeWidth={0.25} strokeLinejoin="round" />
        </g>
        <g clipPath={`url(#bridge-${clipId})`} opacity={pBridge > 0 ? 1 : 0}>
          <path d={LOGO_PATHS.bridge.d} fill={LOGO_PATHS.bridge.fill} fillRule="evenodd" stroke={LOGO_PATHS.bridge.fill} strokeWidth={0.25} strokeLinejoin="round" />
        </g>
      </svg>
      {showWordmark ? (
        <div
          style={{
            fontFamily: fonts.display,
            fontWeight: 600,
            fontSize: height * 0.62,
            letterSpacing: '-0.025em',
            color: wordmarkColor,
            lineHeight: 1,
            opacity: wm,
            transform: `translateX(${mix(wm, -height * 0.25, 0)}px)`,
            whiteSpace: 'nowrap',
          }}
        >
          BridgeAux
        </div>
      ) : null}
    </div>
  );
};
