import React from 'react';
import { Cake, CircleCheck, Loader, MapPin, Store, TrendingUp, Users } from 'lucide-react';
import { business } from '../data/business';
import { colors, fonts, radii, shadows } from '../styles/tokens';
import { BridgeAuxLogo } from './BridgeAuxLogo';
import { KesarMark } from './KesarLogo';

// BridgeAux onboarding: one plain-language description in, a structured
// business profile out. Internal canvas for the window body: 1400 x 776.

export const ONBOARD_W = 1400;
export const ONBOARD_H = 776;

export type Highlight = { phrase: string; on: number };

/** Render text with soft highlights on phrases (0..1 each). */
const HighlightedText: React.FC<{ text: string; highlights: Highlight[] }> = ({ text, highlights }) => {
  type Span = { start: number; end: number; on: number };
  const spans: Span[] = [];
  for (const h of highlights) {
    const i = text.indexOf(h.phrase);
    if (i >= 0 && h.on > 0) spans.push({ start: i, end: i + h.phrase.length, on: h.on });
  }
  spans.sort((a, b) => a.start - b.start);
  const out: React.ReactNode[] = [];
  let pos = 0;
  spans.forEach((s, k) => {
    if (s.start > pos) out.push(<span key={`t${k}`}>{text.slice(pos, s.start)}</span>);
    out.push(
      <span
        key={`h${k}`}
        style={{
          background: `rgba(2,116,239,${0.12 * s.on})`,
          boxShadow: `0 2px 0 rgba(2,116,239,${0.55 * s.on})`,
          borderRadius: 4,
          color: s.on > 0.5 ? colors.blueDeep : colors.ink,
        }}
      >
        {text.slice(s.start, Math.min(s.end, text.length))}
      </span>,
    );
    pos = s.end;
  });
  if (pos < text.length) out.push(<span key="rest">{text.slice(pos)}</span>);
  return <>{out}</>;
};

const Rail: React.FC = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontFamily: fonts.ui, fontSize: 14.5, fontWeight: 600 }}>
    {['Your business', 'Your setup', 'Go live'].map((label, i) => (
      <React.Fragment key={label}>
        {i > 0 ? <div style={{ width: 44, height: 2, borderRadius: 2, background: colors.line }} /> : null}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: i === 0 ? colors.ink : colors.faint }}>
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: 99,
              background: i === 0 ? colors.blue : '#fff',
              border: i === 0 ? 'none' : `1.5px solid ${colors.line}`,
              color: i === 0 ? '#fff' : colors.faint,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12.5,
            }}
          >
            {i + 1}
          </div>
          {label}
        </div>
      </React.Fragment>
    ))}
  </div>
);

export type OnboardingState = {
  typedText: string;
  caret: boolean;
  /** 0..1 slide of the input column from centred to the left */
  split: number;
  button: 'idle' | 'hover' | 'pressed' | 'working' | 'done';
  highlights: Highlight[];
};

// Fixed layout of the input column (window body coordinates), so the scene
// can aim the owner's pointer at the Continue button precisely.
export const INPUT_COL = { w: 740, top: 128, splitLeft: 56 };
export const CONTINUE_BTN = { w: 186, h: 60, top: 128 + 476 };
export const inputColumnLeft = (split: number) => (ONBOARD_W - INPUT_COL.w) / 2 + (INPUT_COL.splitLeft - (ONBOARD_W - INPUT_COL.w) / 2) * split;

/** Window body: header + the input column. The profile card is positioned by the scene. */
export const OnboardingInput: React.FC<{ state: OnboardingState }> = ({ state }) => {
  const { typedText, caret, split, button, highlights } = state;
  const colW = INPUT_COL.w;
  const left = inputColumnLeft(split);
  const placeholder = typedText.length === 0;
  const settled = button === 'done' || split > 0;
  const abs = (top: number, extra: React.CSSProperties = {}): React.CSSProperties => ({ position: 'absolute', left: 0, top, width: colW, ...extra });
  return (
    <div style={{ width: ONBOARD_W, height: ONBOARD_H, background: '#FFFFFF', position: 'relative', fontFamily: fonts.ui }}>
      {/* header */}
      <div
        style={{
          height: 76,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 36px',
          borderBottom: `1px solid ${colors.lineSoft}`,
        }}
      >
        <BridgeAuxLogo height={32} showWordmark />
        <Rail />
        <span style={{ fontSize: 15, color: colors.muted, fontWeight: 500 }}>Need help?</span>
      </div>

      {/* input column */}
      <div style={{ position: 'absolute', left, top: INPUT_COL.top, width: colW, height: 560 }}>
        <div style={abs(0, { fontSize: 14, fontWeight: 700, letterSpacing: '0.14em', color: colors.blue })}>STEP 1 OF 3</div>
        <div style={abs(28, { fontFamily: fonts.display, fontWeight: 600, fontSize: 54, letterSpacing: '-0.03em', color: colors.ink, lineHeight: 1.1 })}>
          Tell us about your business
        </div>
        <div style={abs(104, { fontSize: 21, color: colors.muted, lineHeight: 1.4 })}>A sentence or two is enough. What you do, where you are, what you want.</div>

        <div
          style={abs(164, {
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            padding: '0 20px',
            height: 66,
            boxSizing: 'border-box',
            borderRadius: radii.md,
            border: `1px solid ${colors.line}`,
            background: colors.paper,
          })}
        >
          <span style={{ fontSize: 15.5, color: colors.muted, width: 140 }}>Business name</span>
          <span style={{ fontSize: 21, fontWeight: 600, color: colors.ink, flex: 1 }}>{business.name}</span>
          <CircleCheck size={22} color={colors.green} />
        </div>

        <div
          style={abs(248, {
            height: 204,
            boxSizing: 'border-box',
            borderRadius: radii.md,
            border: `1.5px solid ${settled ? colors.line : colors.blue}`,
            boxShadow: settled ? 'none' : '0 0 0 5px rgba(2,116,239,0.10)',
            padding: '20px 22px',
            fontSize: 27,
            lineHeight: 1.48,
            color: placeholder ? colors.faint : colors.ink,
            background: '#fff',
          })}
        >
          {placeholder ? <span>What do you sell? Who is it for? Where are you?</span> : <HighlightedText text={typedText} highlights={highlights} />}
          {caret ? <span style={{ display: 'inline-block', width: 2.5, height: 30, background: colors.blue, marginLeft: 2, verticalAlign: 'text-bottom' }} /> : null}
        </div>

        <div style={abs(CONTINUE_BTN.top - INPUT_COL.top, { display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: CONTINUE_BTN.h })}>
          <span style={{ fontSize: 17, color: colors.faint }}>No forms. No jargon.</span>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              height: CONTINUE_BTN.h,
              minWidth: CONTINUE_BTN.w,
              padding: '0 30px',
              boxSizing: 'border-box',
              borderRadius: 999,
              background: button === 'done' ? colors.green : colors.blue,
              color: '#fff',
              fontWeight: 600,
              fontSize: 21,
              transform: button === 'pressed' ? 'scale(0.96)' : 'scale(1)',
              boxShadow:
                button === 'hover' || button === 'pressed'
                  ? '0 0 0 6px rgba(2,116,239,0.16), 0 10px 24px rgba(2,116,239,0.28)'
                  : '0 8px 20px rgba(2,116,239,0.22)',
              whiteSpace: 'nowrap',
            }}
          >
            {button === 'working' ? <Loader size={20} /> : button === 'done' ? <CircleCheck size={20} /> : null}
            {button === 'working' ? 'Understanding your business' : button === 'done' ? 'Profile ready' : 'Continue'}
          </div>
        </div>
      </div>
    </div>
  );
};

export const PROFILE_W = 548;

const rows = [
  { icon: <Store size={20} />, label: 'Business type', value: business.type },
  { icon: <MapPin size={20} />, label: 'Location', value: `${business.area}, ${business.city}` },
  { icon: <Cake size={20} />, label: 'Services', value: business.services.join(' · ') },
  { icon: <Users size={20} />, label: 'Customers', value: business.customers, suggested: true },
  { icon: <TrendingUp size={20} />, label: 'Goals', value: business.goal },
];

/** The structured profile BridgeAux builds from the description. */
export const ProfileCard: React.FC<{ rowsIn: number[]; ready: number; header?: number }> = ({ rowsIn, ready, header = 1 }) => (
  <div
    style={{
      width: PROFILE_W,
      background: '#FFFFFF',
      borderRadius: radii.xl,
      boxShadow: shadows.raised,
      border: `1px solid ${colors.lineSoft}`,
      padding: '26px 28px 22px',
      fontFamily: fonts.ui,
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, opacity: header }}>
      <KesarMark size={46} />
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: fonts.display, fontWeight: 600, fontSize: 22, color: colors.ink, letterSpacing: '-0.015em' }}>{business.name}</div>
        <div style={{ fontSize: 14.5, color: colors.muted, marginTop: 3 }}>Business profile</div>
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '7px 12px',
          borderRadius: 999,
          background: ready > 0 ? colors.greenSoft : colors.blueSoft,
          color: ready > 0 ? colors.green : colors.blue,
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: '0.02em',
        }}
      >
        {ready > 0 ? <CircleCheck size={15} /> : <Loader size={15} />}
        {ready > 0 ? 'Ready' : 'Building profile'}
      </div>
    </div>
    <div style={{ marginTop: 18 }}>
      {rows.map((r, i) => {
        const p = rowsIn[i] ?? 0;
        return (
          <div
            key={r.label}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              padding: '14px 0',
              borderTop: `1px solid ${colors.lineSoft}`,
              opacity: p,
              transform: `translateX(${(1 - p) * 18}px)`,
            }}
          >
            <div style={{ width: 42, height: 42, borderRadius: 12, background: colors.blueSoft, color: colors.blue, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {r.icon}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: colors.faint, letterSpacing: '0.04em' }}>{r.label.toUpperCase()}</div>
              <div style={{ fontSize: 19, fontWeight: 600, color: colors.ink, marginTop: 3 }}>{r.value}</div>
            </div>
            {r.suggested ? (
              <span style={{ fontSize: 12, fontWeight: 700, color: colors.muted, background: colors.sand, padding: '5px 9px', borderRadius: 99 }}>Suggested</span>
            ) : (
              <CircleCheck size={20} color={colors.green} style={{ opacity: p }} />
            )}
          </div>
        );
      })}
    </div>
    <div style={{ borderTop: `1px solid ${colors.lineSoft}`, paddingTop: 14, fontSize: 14.5, color: colors.muted, opacity: ready }}>
      You only tell us once. Edit anything later.
    </div>
  </div>
);

/** Arrow pointer used for the owner's clicks. */
export const Pointer: React.FC<{ x: number; y: number; pressed?: boolean; opacity?: number }> = ({ x, y, pressed, opacity = 1 }) => (
  <svg
    width={30}
    height={36}
    viewBox="0 0 30 36"
    style={{ position: 'absolute', left: x, top: y, opacity, transform: `scale(${pressed ? 0.9 : 1})`, transformOrigin: '4px 4px', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.25))' }}
  >
    <path d="M4 3 L4 28 L10.5 22 L15 32 L19.5 30 L15 20.5 L24 20.5 Z" fill="#FFFFFF" stroke={colors.ink} strokeWidth="2" strokeLinejoin="round" />
  </svg>
);
