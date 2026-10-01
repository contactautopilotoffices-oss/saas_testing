import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { CircleHelp, Clock, Globe, MapPin, PhoneOff, SearchX } from 'lucide-react';
import { SceneShell, SceneProps } from '../components/SceneShell';
import { BakeryStorefront } from '../components/BakeryStorefront';
import { PhoneFrame } from '../components/PhoneFrame';
import { SearchScreen } from '../components/SearchScreen';
import { Sfx } from '../components/Audio';
import { business } from '../data/business';
import { line } from '../data/timeline';
import { colors, fonts, shadows } from '../styles/tokens';
import { ease, enter, mix, progress, typed } from '../lib/motion';

// SCENE 01 (0-10s): THE PROBLEM
// A real, busy neighbourhood bakery. Then the customer's view: searching
// online, the bakery is barely there. The gap between the shop and its
// customers is left open as a dashed ring, which scene 02 fills.

// Layout shared with scene 02 so the cut between them is seamless.
export const S1_LAYOUT = {
  card: { x: 120, y: 540 - 197, w: 700, h: 394 },
  phone: { x: 1100, y: 540 - 395, w: 380 },
  ring: { x: 960, y: 540, r: 84 },
  /** camera scale on the last frame (scene 02 starts from it) */
  endCamera: 1.05,
};

const QUERY = 'bakery near me';

const problems = [
  { icon: <Globe size={18} />, label: 'No website' },
  { icon: <Clock size={18} />, label: 'Hours not listed' },
  { icon: <PhoneOff size={18} />, label: 'No contact details' },
  { icon: <SearchX size={18} />, label: 'Hard to find' },
];

/** The storefront shrunk into a rounded "real world" card. */
export const StorefrontCard: React.FC<{ frame: number; t: number; dim?: number; push?: number }> = ({ frame, t, dim = 0, push = 1 }) => {
  // t: 0 = full frame, 1 = card in its final slot. push: slow push-in while full frame.
  const { card } = S1_LAYOUT;
  const scale = mix(t, 1 + 0.045 * push, card.w / 1920);
  const cx = mix(t, 960, card.x + card.w / 2);
  const cy = mix(t, 540, card.y + card.h / 2);
  const radius = mix(t, 0, 28) / scale;
  return (
    <div
      style={{
        position: 'absolute',
        width: 1920,
        height: 1080,
        left: cx - 960,
        top: cy - 540,
        transform: `scale(${scale})`,
        borderRadius: radius,
        overflow: 'hidden',
        boxShadow: t > 0 ? `0 ${30 / scale}px ${80 / scale}px rgba(21,34,40,${0.16 * t})` : 'none',
        filter: dim > 0 ? `saturate(${1 - dim * 0.25}) brightness(${1 - dim * 0.04})` : undefined,
      }}
    >
      <BakeryStorefront frame={frame} lights={1} />
    </div>
  );
};

export const Scene01Problem: React.FC<SceneProps> = ({ withMusic }) => {
  const frame = useCurrentFrame();
  const { phone, ring } = S1_LAYOUT;

  // --- shot A: the shop in the real world (0-96)
  const lights = progress(frame, 4, 34, ease.inOut);
  const push = progress(frame, 0, 100, ease.drift);
  const toCard = progress(frame, 84, 36, ease.inOut);
  const tagIn = enter(frame, 30, { distance: 14 });
  const tagOut = 1 - progress(frame, 72, 12, ease.inOut);

  // --- shot B: the customer's search (100-215)
  const phoneIn = progress(frame, 100, 28, ease.out);
  const typeStart = 112;
  const query = typed(QUERY, frame, typeStart, 18);
  const typingDone = typeStart + Math.ceil((QUERY.length / 18) * 30);
  const mapIn = progress(frame, typingDone + 4, 16);
  const rowsIn = [0, 1, 2].map((i) => progress(frame, typingDone + 8 + i * 7, 16));
  const focus = progress(frame, typingDone + 34, 18);

  // --- shot C: "That's the problem." (222-300)
  const problemLine = line('s1c');
  const settle = progress(frame, problemLine.start - 4, 30, ease.inOut);
  const chipsOut = progress(frame, 258, 22, ease.in);
  const ringIn = progress(frame, problemLine.start + 10, 26, ease.out);
  const dashDraw = progress(frame, problemLine.start + 2, 24, ease.out);
  const breathe = 1 + Math.sin((frame - problemLine.start) / 9) * 0.02 * ringIn;

  const cardX = mix(settle, 0, -18);
  const phoneX = mix(settle, 0, 18);
  const camera = mix(progress(frame, problemLine.start - 6, 300 - problemLine.start + 6, ease.inOut), 1, S1_LAYOUT.endCamera);

  return (
    <SceneShell scene={1} withMusic={withMusic}>
      <AbsoluteFill style={{ transform: `scale(${camera})`, transformOrigin: '960px 540px' }}>
      {/* push-in on the shop while it is full frame */}
      <AbsoluteFill style={{ transform: `translateX(${cardX}px)` }}>
        <StorefrontCard frame={frame} t={toCard} dim={settle * 0.6} push={push} />
        {/* light warming up as the shop opens */}
        <AbsoluteFill style={{ background: '#2B2016', opacity: (1 - lights) * 0.18 * (1 - toCard), pointerEvents: 'none' }} />
      </AbsoluteFill>

      {/* location tag */}
      {tagOut > 0 ? (
        <div
          style={{
            position: 'absolute',
            left: 80,
            bottom: 70,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '14px 22px 14px 16px',
            borderRadius: 999,
            background: 'rgba(255,255,255,0.94)',
            boxShadow: shadows.raised,
            fontFamily: fonts.ui,
            fontSize: 21,
            color: colors.ink,
            ...tagIn,
            opacity: tagIn.opacity * tagOut,
          }}
        >
          <div style={{ width: 34, height: 34, borderRadius: 99, background: colors.blueSoft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <MapPin size={18} color={colors.blue} />
          </div>
          <span style={{ fontWeight: 600 }}>{business.name}</span>
          <span style={{ color: colors.muted }}>Hill Road, Bandra West, Mumbai</span>
        </div>
      ) : null}

      {/* the broken connection between shop and customer */}
      <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
        {dashDraw > 0 ? (
          <g opacity={dashDraw}>
            <line
              x1={S1_LAYOUT.card.x + S1_LAYOUT.card.w + cardX + 14}
              x2={ring.x - ring.r - 18}
              y1={540}
              y2={540}
              stroke={colors.faint}
              strokeWidth={2.5}
              strokeDasharray="2 10"
              strokeLinecap="round"
            />
            <line
              x1={ring.x + ring.r + 18}
              x2={phone.x + phoneX - 14}
              y1={540}
              y2={540}
              stroke={colors.faint}
              strokeWidth={2.5}
              strokeDasharray="2 10"
              strokeLinecap="round"
            />
          </g>
        ) : null}
        {ringIn > 0 ? (
          <g transform={`translate(${ring.x} ${ring.y}) scale(${breathe * mix(ringIn, 0.85, 1)})`} opacity={ringIn}>
            <circle r={ring.r} fill="rgba(255,255,255,0.55)" stroke={colors.faint} strokeWidth={2} strokeDasharray="6 8" />
          </g>
        ) : null}
      </svg>
      {ringIn > 0 ? (
        <div
          style={{
            position: 'absolute',
            left: ring.x,
            top: ring.y,
            transform: 'translate(-50%, -50%)',
            opacity: ringIn * 0.9,
            color: colors.faint,
          }}
        >
          <CircleHelp size={34} strokeWidth={1.6} />
        </div>
      ) : null}

      {/* the customer's phone */}
      {phoneIn > 0 ? (
        <div
          style={{
            position: 'absolute',
            left: phone.x + phoneX,
            top: phone.y,
            transform: `translateX(${mix(phoneIn, 760, 0)}px) rotate(${mix(phoneIn, 4, 0)}deg)`,
          }}
        >
          <PhoneFrame width={phone.w}>
            <SearchScreen
              variant="missing"
              query={query}
              caret={frame < typingDone + 6 && Math.floor(frame / 8) % 2 === 0}
              mapIn={mapIn}
              rowsIn={rowsIn}
              focus={focus * (1 - settle * 0.3)}
            />
          </PhoneFrame>
        </div>
      ) : null}

      {/* what the customer runs into */}
      {problems.map((p, i) => {
        const start = typingDone + 40 + i * 8;
        const e = enter(frame, start, { distance: 0, blur: 4 });
        const x = progress(frame, start, 18);
        if (frame < start) return null;
        return (
          <div
            key={p.label}
            style={{
              position: 'absolute',
              left: 1530 + phoneX + mix(x, -20, 0),
              top: 360 + i * 84,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '14px 20px 14px 14px',
              borderRadius: 16,
              background: '#FFFFFF',
              boxShadow: shadows.card,
              fontFamily: fonts.ui,
              fontWeight: 600,
              fontSize: 19,
              color: colors.ink,
              opacity: e.opacity * (1 - chipsOut),
              filter: e.filter,
            }}
          >
            <div style={{ width: 34, height: 34, borderRadius: 10, background: colors.warnSoft, color: colors.warn, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {p.icon}
            </div>
            {p.label}
          </div>
        );
      })}

      </AbsoluteFill>

      {/* sound */}
      <Sfx name="street" at={0} volume={0.55} durationInFrames={130} fadeOutFrames={40} />
      <Sfx name="shop-bell" at={12} volume={0.32} />
      <Sfx name="whoosh-soft" at={82} volume={0.35} />
      <Sfx name="typing" at={typeStart} volume={0.32} durationInFrames={typingDone - typeStart + 2} fadeOutFrames={4} />
      <Sfx name="tap" at={typingDone + 2} volume={0.4} />
      {problems.map((p, i) => (
        <Sfx key={p.label} name="pop" at={typingDone + 40 + i * 8} volume={0.18} />
      ))}
      <Sfx name="swell" at={problemLine.start + 20} volume={0.16} />
    </SceneShell>
  );
};
