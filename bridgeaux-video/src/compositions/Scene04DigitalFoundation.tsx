import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { SceneShell, SceneProps } from '../components/SceneShell';
import { BridgeAuxLogo } from '../components/BridgeAuxLogo';
import { BrowserFrame } from '../components/BrowserFrame';
import { PhoneFrame } from '../components/PhoneFrame';
import { ConnectionLine } from '../components/ConnectionLine';
import { ProfileCard, PROFILE_W } from '../components/BusinessInput';
import { EmailCard, FOUNDATION, FoundationRow, ROW_H } from '../components/Checklist';
import { GoogleListing } from '../components/GoogleListing';
import { Heading } from '../components/Heading';
import { MobileSite, SITE_WIDTH, WebsiteMockup } from '../components/WebsiteMockup';
import { Sfx } from '../components/Audio';
import { S3_END } from './Scene03BusinessInput';
import { business } from '../data/business';
import { colors, fonts, shadows } from '../styles/tokens';
import { ease, mix, progress } from '../lib/motion';

// SCENE 04 (30-40s): GET YOUR DIGITAL FOUNDATION
// The business profile feeds BridgeAux, which sets up each piece of the
// foundation in turn. Then the result, live: the website, the mobile site,
// the Google listing and the business email.

const NODE = { x: 800, y: 560, r: 76 };
const ROWS = { x: 1060, w: 700, top: 236, step: ROW_H + 14 };
const ROW_IN = FOUNDATION.map((_, i) => 26 + i * 10);
const ROW_DONE = FOUNDATION.map((_, i) => 42 + i * 10);

const LAYOUT_B = {
  browser: { x: 100, y: 196, w: 1080, h: 704 },
  phone: { x: 1150, y: 352, w: 296 },
  listing: { x: 1500, y: 196, w: 340 },
  email: { x: 1500, y: 640, w: 340 },
};

/** Where the Google listing card lands on the last frame (scene 05 starts here). */
export const S4_END = { listing: { cx: 960, cy: 572, w: 322 } };

export const Scene04DigitalFoundation: React.FC<SceneProps> = ({ withMusic }) => {
  const frame = useCurrentFrame();
  const card = S3_END.card;
  const cardRight = card.cx + (PROFILE_W * card.scale) / 2;

  // --- phase A: building
  const heading = progress(frame, 4, 22, ease.out);
  const headingOut = progress(frame, 106, 18, ease.in);
  const nodeIn = progress(frame, 8, 22, ease.out);
  const feed = progress(frame, 14, 18, ease.out);
  const doneCount = ROW_DONE.filter((f) => frame >= f).length;
  const buildOut = progress(frame, 106, 26, ease.inOut);

  // --- phase B: the foundation, live
  const browserIn = progress(frame, 128, 32, ease.out);
  const siteReveal = progress(frame, 124, 36, ease.out);
  const siteScroll = mix(progress(frame, 190, 76, ease.inOut), 0, 330);
  const phoneIn = progress(frame, 170, 28, ease.out);
  const listingIn = progress(frame, 196, 26, ease.out);
  const emailIn = progress(frame, 216, 26, ease.out);
  const online = progress(frame, 226, 18, ease.out);
  const onlineOut = progress(frame, 284, 14, ease.inOut);
  const handoff = progress(frame, 268, 32, ease.inOut);
  const fadeRest = progress(frame, 266, 22, ease.in);

  const B = LAYOUT_B;
  const siteScale = B.browser.w / SITE_WIDTH;
  const listingTo = S4_END.listing;
  const listing = {
    cx: mix(handoff, B.listing.x + B.listing.w / 2, listingTo.cx),
    cy: mix(handoff, B.listing.y + 195, listingTo.cy),
    scale: mix(handoff, 1, listingTo.w / B.listing.w),
  };
  const spin = (frame * 14) % 360;

  return (
    <SceneShell scene={4} withMusic={withMusic}>
      {/* ---------------- phase A ---------------- */}
      {buildOut < 1 ? (
        <AbsoluteFill style={{ opacity: 1 - buildOut, transform: `scale(${mix(buildOut, 1, 0.96)})`, transformOrigin: '960px 560px' }}>
          <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
            <ConnectionLine
              from={{ x: cardRight - 2, y: card.cy }}
              to={{ x: NODE.x - NODE.r, y: NODE.y }}
              draw={feed}
              pulse={frame > 14 ? ((frame - 14) % 40) / 40 : undefined}
              color={colors.blue}
              width={3}
              curve={0}
              strength={0.6}
            />
            {FOUNDATION.map((item, i) => {
              const y = ROWS.top + i * ROWS.step + ROW_H / 2;
              const a = progress(frame, ROW_IN[i] - 4, 14, ease.out);
              const done = frame >= ROW_DONE[i];
              const since = frame - ROW_IN[i];
              return (
                <ConnectionLine
                  key={item.key}
                  from={{ x: NODE.x + NODE.r, y: NODE.y }}
                  to={{ x: ROWS.x - 2, y }}
                  draw={a}
                  pulse={!done && since > 0 ? (since % 16) / 16 : undefined}
                  color={done ? colors.green : colors.blue}
                  width={2.4}
                  curve={(i - 2.5) * -0.02}
                  strength={done ? 0.45 : 0.35}
                />
              );
            })}
          </svg>

          {/* source: the profile from scene 03 */}
          <div
            style={{
              position: 'absolute',
              left: card.cx - PROFILE_W / 2,
              top: card.cy - 290,
              width: PROFILE_W,
              transform: `scale(${card.scale})`,
              transformOrigin: '50% 290px',
            }}
          >
            <ProfileCard rowsIn={[1, 1, 1, 1, 1]} ready={1} />
          </div>

          {/* BridgeAux */}
          <div
            style={{
              position: 'absolute',
              left: NODE.x - NODE.r,
              top: NODE.y - NODE.r,
              width: NODE.r * 2,
              height: NODE.r * 2,
              borderRadius: 999,
              background: '#fff',
              boxShadow: `0 0 0 10px rgba(2,116,239,0.05), ${shadows.glowBlue}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: nodeIn,
              transform: `scale(${mix(nodeIn, 0.7, 1)})`,
            }}
          >
            <BridgeAuxLogo height={NODE.r * 0.62} />
          </div>

          {/* the foundation, piece by piece */}
          {FOUNDATION.map((item, i) => (
            <div key={item.key} style={{ position: 'absolute', left: ROWS.x, top: ROWS.top + i * ROWS.step }}>
              <FoundationRow
                item={item}
                width={ROWS.w}
                appear={progress(frame, ROW_IN[i], 14, ease.out)}
                working={progress(frame, ROW_IN[i] + 4, 6)}
                done={progress(frame, ROW_DONE[i], 8, ease.out)}
                spin={spin}
              />
            </div>
          ))}
        </AbsoluteFill>
      ) : null}

      <Heading text="Building your digital foundation" p={heading} out={headingOut} top={64}>
        <div
          style={{
            marginTop: 14,
            fontFamily: fonts.ui,
            fontWeight: 600,
            fontSize: 17,
            color: doneCount === 6 ? colors.green : colors.muted,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {doneCount} of 6 ready
        </div>
      </Heading>

      {/* ---------------- phase B ---------------- */}
      {browserIn > 0 ? (
        <div
          style={{
            position: 'absolute',
            left: B.browser.x,
            top: B.browser.y,
            opacity: browserIn * (1 - fadeRest),
            transform: `translateY(${mix(browserIn, 60, 0)}px) scale(${mix(browserIn, 0.96, 1)})`,
          }}
        >
          <BrowserFrame url={business.domain} width={B.browser.w} height={B.browser.h}>
            <div style={{ transform: `scale(${siteScale})`, transformOrigin: 'top left' }}>
              <WebsiteMockup reveal={siteReveal} scroll={siteScroll} />
            </div>
          </BrowserFrame>
        </div>
      ) : null}

      {phoneIn > 0 ? (
        <div
          style={{
            position: 'absolute',
            left: B.phone.x,
            top: B.phone.y,
            opacity: phoneIn * (1 - fadeRest),
            transform: `translateY(${mix(phoneIn, 80, 0)}px)`,
          }}
        >
          <PhoneFrame width={B.phone.w}>
            <div style={{ transform: `scale(${(B.phone.w * 0.93) / 360})`, transformOrigin: 'top left' }}>
              <MobileSite scroll={mix(progress(frame, 210, 60, ease.inOut), 0, 120)} />
            </div>
          </PhoneFrame>
        </div>
      ) : null}

      {emailIn > 0 ? (
        <div
          style={{
            position: 'absolute',
            left: B.email.x,
            top: B.email.y,
            opacity: emailIn * (1 - fadeRest),
            transform: `translateX(${mix(emailIn, 40, 0)}px)`,
          }}
        >
          <EmailCard width={B.email.w} rowsIn={[progress(frame, 230, 12), progress(frame, 240, 12)]} />
        </div>
      ) : null}

      {listingIn > 0 ? (
        <div
          style={{
            position: 'absolute',
            left: listing.cx - B.listing.w / 2,
            top: listing.cy - 195,
            width: B.listing.w,
            opacity: listingIn,
            transform: `translateX(${mix(listingIn, 40, 0)}px) scale(${listing.scale})`,
            transformOrigin: '50% 195px',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: -34,
              left: 4,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontFamily: fonts.ui,
              fontWeight: 700,
              fontSize: 13,
              letterSpacing: '0.08em',
              color: colors.muted,
              opacity: 1 - handoff,
            }}
          >
            <span style={{ width: 7, height: 7, borderRadius: 9, background: colors.live }} /> GOOGLE BUSINESS PROFILE
          </div>
          <GoogleListing width={B.listing.w} />
        </div>
      ) : null}

      {/* status */}
      {online > 0 ? (
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: 100,
            transform: `translate(-50%, ${mix(online, 12, 0)}px)`,
            opacity: online * (1 - onlineOut),
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '14px 26px',
            borderRadius: 999,
            background: '#fff',
            boxShadow: shadows.raised,
            fontFamily: fonts.display,
            fontWeight: 600,
            fontSize: 26,
            color: colors.ink,
            letterSpacing: '-0.01em',
          }}
        >
          <span style={{ position: 'relative', width: 12, height: 12 }}>
            <span style={{ position: 'absolute', inset: 0, borderRadius: 99, background: colors.live }} />
            <span
              style={{
                position: 'absolute',
                inset: -6,
                borderRadius: 99,
                border: `2px solid ${colors.live}`,
                opacity: 0.5 * (1 - ((frame - 226) % 30) / 30),
                transform: `scale(${0.6 + ((frame - 226) % 30) / 30})`,
              }}
            />
          </span>
          Your business is online
        </div>
      ) : null}

      <Sfx name="connect" at={16} volume={0.24} />
      {ROW_IN.map((f) => (
        <Sfx key={`in${f}`} name="pop" at={f} volume={0.1} />
      ))}
      {ROW_DONE.slice(0, 5).map((f) => (
        <Sfx key={`d${f}`} name="tap" at={f} volume={0.18} />
      ))}
      <Sfx name="confirm" at={ROW_DONE[5]} volume={0.32} />
      <Sfx name="whoosh" at={118} volume={0.24} />
      <Sfx name="pop" at={170} volume={0.16} />
      <Sfx name="pop" at={196} volume={0.16} />
      <Sfx name="notify" at={232} volume={0.18} />
      <Sfx name="confirm" at={228} volume={0.3} />
      <Sfx name="whoosh-soft" at={268} volume={0.2} />
    </SceneShell>
  );
};
