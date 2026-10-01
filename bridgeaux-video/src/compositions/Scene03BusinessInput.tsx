import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { SceneShell, SceneProps } from '../components/SceneShell';
import { BrowserFrame } from '../components/BrowserFrame';
import { BridgeAuxLogo } from '../components/BridgeAuxLogo';
import {
  CONTINUE_BTN,
  INPUT_COL,
  ONBOARD_H,
  ONBOARD_W,
  OnboardingInput,
  inputColumnLeft,
  PROFILE_W,
  Pointer,
  ProfileCard,
  OnboardingState,
} from '../components/BusinessInput';
import { Sfx } from '../components/Audio';
import { EcosystemEnding, S2_END } from './Scene02BridgeAux';
import { business } from '../data/business';
import { ease, mix, progress, typed } from '../lib/motion';

// SCENE 03 (20-30s): TELL US ABOUT YOUR BUSINESS
// The BridgeAux node opens into the onboarding window. The owner writes one
// plain sentence; BridgeAux reads it and builds a structured profile.

const WIN = { w: ONBOARD_W, h: ONBOARD_H + 44, cx: 960, cy: 540 };
const TEXT = business.onboardingInput;
const TYPE_START = 56;
const CPS = 30;
const TYPE_END = TYPE_START + Math.ceil((TEXT.length / CPS) * 30);
const CLICK = TYPE_END + 16;

// where the profile card sits inside the window (window body coordinates)
const CARD_IN_WINDOW = { x: 830, y: 100 };

/** Profile card position on scene 04's first frame (centre + scale). */
export const S3_END = { card: { cx: 360, cy: 560, scale: 0.7 } };

const ROW_IN = [0, 1, 2, 3, 4].map((i) => CLICK + 24 + i * 6);
const PHRASES = ['bakery', 'Mumbai', 'cakes, pastries and custom orders', '', 'more customers online'];

export const Scene03BusinessInput: React.FC<SceneProps> = ({ withMusic }) => {
  const frame = useCurrentFrame();

  // --- open: the BridgeAux node grows into the onboarding window
  const open = progress(frame, 0, 28, ease.inOut);
  const ecoOut = progress(frame, 0, 16, ease.in);
  const chrome = progress(frame, 18, 14, ease.out);
  const node = S2_END.node;
  const startR = node.r * S2_END.camera;
  const w = mix(open, startR * 2, WIN.w);
  const h = mix(open, startR * 2, WIN.h);
  const cx = WIN.cx;
  const cy = mix(open, node.y, WIN.cy);
  const radius = mix(open, startR, 22);
  const logoOut = 1 - progress(frame, 6, 14);

  // --- typing and the click
  const text = typed(TEXT, frame, TYPE_START, CPS);
  const typing = frame >= TYPE_START && frame < TYPE_END + 4;
  const caret = (typing || (frame > 30 && frame < TYPE_START)) && Math.floor(frame / 8) % 2 === 0 ? true : typing;
  const pointerIn = progress(frame, TYPE_END - 6, 18, ease.inOut);
  const button: OnboardingState['button'] =
    frame < TYPE_END + 10 ? 'idle' : frame < CLICK ? 'hover' : frame < CLICK + 4 ? 'pressed' : frame < ROW_IN[4] + 14 ? 'working' : 'done';

  // --- understanding: column slides left, profile builds on the right
  const split = progress(frame, CLICK + 4, 26, ease.inOut);
  const cardIn = progress(frame, CLICK + 16, 18, ease.out);
  const rowsIn = ROW_IN.map((f) => progress(frame, f, 16, ease.out));
  const ready = progress(frame, ROW_IN[4] + 14, 12);
  const highlights = PHRASES.map((phrase, i) => ({ phrase, on: phrase ? progress(frame, ROW_IN[i] - 4, 12) : 0 }));

  // --- hand-off to scene 04: the card lifts out, the window falls away
  const handoff = progress(frame, 262, 38, ease.inOut);
  const windowOut = progress(frame, 252, 30, ease.inOut);

  const winLeft = WIN.cx - WIN.w / 2;
  const winTop = WIN.cy - WIN.h / 2;
  const cardStart = {
    cx: winLeft + CARD_IN_WINDOW.x + PROFILE_W / 2,
    cy: winTop + 44 + CARD_IN_WINDOW.y + 290,
    scale: 1,
  };
  const card = {
    cx: mix(handoff, cardStart.cx, S3_END.card.cx),
    cy: mix(handoff, cardStart.cy, S3_END.card.cy),
    scale: mix(handoff, cardStart.scale, S3_END.card.scale),
  };

  // pointer travels to the Continue button (window body coordinates -> screen)
  const btn = {
    x: winLeft + inputColumnLeft(0) + INPUT_COL.w - CONTINUE_BTN.w / 2,
    y: winTop + 44 + CONTINUE_BTN.top + CONTINUE_BTN.h / 2,
  };
  // the arrow's tip sits at (4, 3) inside the pointer graphic
  const px = mix(pointerIn, btn.x + 170, btn.x) - 4;
  const py = mix(pointerIn, btn.y + 150, btn.y) - 3;
  const pointerOut = progress(frame, CLICK + 12, 12);

  return (
    <SceneShell scene={3} withMusic={withMusic}>
      {ecoOut < 1 ? <EcosystemEnding frame={frame} opacity={1 - ecoOut} camera={mix(ecoOut, S2_END.camera, 1.3)} /> : null}

      {/* the node expanding into the window */}
      <div
        style={{
          position: 'absolute',
          left: cx - w / 2,
          top: cy - h / 2,
          width: w,
          height: h,
          borderRadius: radius,
          background: '#FFFFFF',
          boxShadow: `0 0 0 ${10 * (1 - open)}px rgba(2,116,239,${0.05 * (1 - open)}), 0 24px 70px rgba(2,116,239,${0.16 * (1 - open)}), 0 40px 90px rgba(21,34,40,${0.08 * open}), 0 8px 20px rgba(21,34,40,${0.08 * (1 - open) + 0.06 * open})`,
          overflow: 'hidden',
          opacity: 1 - windowOut,
        }}
      >
        {logoOut > 0 ? (
          <div style={{ position: 'absolute', left: '50%', top: '50%', transform: `translate(-50%, calc(-50% + ${node.r * 0.04 * S2_END.camera}px)) scale(${1 + open * 0.4})`, opacity: logoOut }}>
            <BridgeAuxLogo height={node.r * 0.66 * S2_END.camera} />
          </div>
        ) : null}
        {chrome > 0 ? (
          <div style={{ position: 'absolute', left: (w - WIN.w) / 2, top: (h - WIN.h) / 2, opacity: chrome }}>
            <BrowserFrame url="bridgeaux.com/onboard" width={WIN.w} height={WIN.h} style={{ boxShadow: 'none', border: 'none' }}>
              <OnboardingInput state={{ typedText: text, caret, split, button, highlights }} />
            </BrowserFrame>
          </div>
        ) : null}
      </div>

      {/* the profile BridgeAux builds */}
      {cardIn > 0 ? (
        <div
          style={{
            position: 'absolute',
            left: card.cx - PROFILE_W / 2,
            top: card.cy - 290,
            width: PROFILE_W,
            transform: `scale(${card.scale}) translateY(${mix(cardIn, 26, 0)}px)`,
            transformOrigin: '50% 290px',
            opacity: cardIn,
          }}
        >
          <ProfileCard rowsIn={rowsIn} ready={ready} />
        </div>
      ) : null}

      {/* owner's pointer */}
      {pointerIn > 0 && pointerOut < 1 ? <Pointer x={px} y={py} pressed={button === 'pressed'} opacity={pointerIn * (1 - pointerOut)} /> : null}

      <Sfx name="whoosh-soft" at={0} volume={0.22} />
      <Sfx name="typing" at={TYPE_START} volume={0.36} durationInFrames={TYPE_END - TYPE_START + 2} fadeOutFrames={5} />
      <Sfx name="click" at={CLICK} volume={0.5} />
      {ROW_IN.map((f) => (
        <Sfx key={f} name="pop" at={f} volume={0.13} />
      ))}
      <Sfx name="confirm" at={ROW_IN[4] + 14} volume={0.34} />
      <Sfx name="whoosh-soft" at={262} volume={0.2} />
    </SceneShell>
  );
};
