import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { CircleCheck, MessageCircle, MessageSquare, Search, ShoppingBag } from 'lucide-react';
import { SceneShell, SceneProps } from '../components/SceneShell';
import { BridgeAuxLogo } from '../components/BridgeAuxLogo';
import { BrowserFrame } from '../components/BrowserFrame';
import { ConnectionLine } from '../components/ConnectionLine';
import { CustomerAction } from '../components/CustomerAction';
import { Dashboard, DASH_H, DASH_W } from '../components/Dashboard';
import { GoogleListing } from '../components/GoogleListing';
import { Heading } from '../components/Heading';
import { PhoneFrame } from '../components/PhoneFrame';
import { Pointer } from '../components/BusinessInput';
import { SearchScreen } from '../components/SearchScreen';
import { MobileSite } from '../components/WebsiteMockup';
import { Sfx } from '../components/Audio';
import { S4_END } from './Scene04DigitalFoundation';
import { customerActivity, metrics } from '../data/business';
import { colors, fonts, shadows } from '../styles/tokens';
import { ease, mix, progress } from '../lib/motion';

// SCENE 05 (40-50s): OPERATE AND GROW ONLINE
// Customers find the bakery, contact it, enquire and buy. Each action flows
// into BridgeAux, which opens into the owner's dashboard. The owner replies:
// BridgeAux brings the work together, the owner stays in charge.

const PHONE = { x: 250, y: 145, w: 380 };
// the phone opens as the hero, centred, then makes room for the activity flow
const PHONE_START_X = 960 - PHONE.w / 2;
const NODE = { x: 1560, y: 560, r: 82 };
const TOASTS_X = 700;

/** Dashboard placement on the last frame (scene 06 starts from it). */
export const S5_END = { dash: { scale: 0.95, cx: 960, cy: 560 } };

// customer actions, keyed to the narration "find you, contact you, enquire, and buy"
const ACT = { find: 104, contact: 136, enquire: 158, buy: 180 };

const actions = [
  {
    at: ACT.find,
    icon: <Search size={22} />,
    title: 'Found on Google',
    detail: `Shown for "${customerActivity.search.query}"`,
    accent: 'blue' as const,
  },
  {
    at: ACT.contact,
    icon: <MessageCircle size={22} />,
    title: 'New message',
    detail: `${customerActivity.message.who.split(' ')[0]}: ${customerActivity.message.text}`,
    accent: 'blue' as const,
  },
  {
    at: ACT.enquire,
    icon: <MessageSquare size={22} />,
    title: 'New enquiry',
    detail: `${customerActivity.enquiry.who.split(' ')[0]}: ${customerActivity.enquiry.text}`,
    accent: 'blue' as const,
  },
  {
    at: ACT.buy,
    icon: <ShoppingBag size={22} />,
    title: `New order ${customerActivity.order.id}`,
    detail: `${customerActivity.order.amount} · paid by UPI`,
    accent: 'green' as const,
  },
];

export const Scene05OperateGrow: React.FC<SceneProps> = ({ withMusic }) => {
  const frame = useCurrentFrame();

  // --- opening: the listing card from scene 04 becomes the top search result
  const phoneIn = progress(frame, 0, 22, ease.out);
  const listingOut = progress(frame, 0, 12, ease.out);
  const heading = progress(frame, 10, 22, ease.out);
  const headingOut = progress(frame, 210, 16, ease.in);
  const nodeIn = progress(frame, 100, 22, ease.out);
  const slide = progress(frame, 80, 26, ease.inOut);
  const phoneX = mix(slide, PHONE_START_X, PHONE.x);

  // --- phone screens
  const toSite = progress(frame, ACT.find + 16, 14, ease.inOut);
  const tapWebsite = frame >= ACT.find + 8 && frame < ACT.find + 18;
  const highlight = frame >= ACT.contact - 4 && frame < ACT.enquire - 6 ? 'whatsapp' : frame >= ACT.enquire - 4 && frame < ACT.buy ? 'enquire' : null;
  const orderSheet = progress(frame, ACT.buy - 6, 16, ease.out);

  // --- phase C: everything comes together in the owner's dashboard
  const gather = progress(frame, 208, 26, ease.inOut);
  const expand = progress(frame, 216, 30, ease.inOut);
  const dashContent = progress(frame, 224, 14, ease.out);
  const counts = progress(frame, 236, 26, ease.out);
  const dash = S5_END.dash;
  const dW = DASH_W * dash.scale;
  const dH = (DASH_H + 44) * dash.scale;
  const w = mix(expand, NODE.r * 2, dW);
  const h = mix(expand, NODE.r * 2, dH);
  const cx = mix(expand, NODE.x, dash.cx);
  const cy = mix(expand, NODE.y, dash.cy);
  const radius = mix(expand, NODE.r, 20 * dash.scale);

  const REPLY_CLICK = 272;
  const reply = frame < REPLY_CLICK ? 'new' : frame < REPLY_CLICK + 5 ? 'pressed' : 'replied';
  // Reply button centre in dashboard coordinates (see Dashboard layout)
  const replyBtn = { x: 984, y: 44 + 376 };
  const toScreen = (p: { x: number; y: number }) => ({
    x: dash.cx - dW / 2 + p.x * dash.scale,
    y: dash.cy - dH / 2 + p.y * dash.scale,
  });
  const target = toScreen(replyBtn);
  const pointerIn = progress(frame, 248, 22, ease.inOut);
  const pointerOut = progress(frame, REPLY_CLICK + 10, 12);

  const L = S4_END.listing;

  return (
    <SceneShell scene={5} withMusic={withMusic}>
      <Heading text="Operate and grow" p={heading} out={headingOut} top={52} size={42} />

      {/* the customer's phone */}
      <AbsoluteFill style={{ opacity: 1 - gather, transform: `translateX(${mix(gather, 0, -80)}px)` }}>
        <div style={{ position: 'absolute', left: phoneX, top: PHONE.y, opacity: phoneIn, transform: `scale(${mix(phoneIn, 0.94, 1)})` }}>
          <PhoneFrame width={PHONE.w}>
            <div style={{ position: 'absolute', inset: 0, opacity: 1 - toSite }}>
              <SearchScreen
                variant="found"
                query={customerActivity.search.query}
                focus={progress(frame, 20, 20) * (frame > ACT.find - 6 ? 1 : 0.6)}
                tap={tapWebsite ? 'website' : null}
              />
            </div>
            {toSite > 0 ? (
              <div style={{ position: 'absolute', inset: 0, opacity: toSite, transform: `translateX(${mix(toSite, 40, 0)}px)` }}>
                <div style={{ transform: `scale(${(PHONE.w * 0.93) / 360})`, transformOrigin: 'top left' }}>
                  <MobileSite highlight={highlight} scroll={mix(progress(frame, ACT.find + 30, 30, ease.inOut), 0, 210)} />
                </div>
              </div>
            ) : null}
            {orderSheet > 0 ? (
              <div
                style={{
                  position: 'absolute',
                  left: 10,
                  right: 10,
                  bottom: 22,
                  transform: `translateY(${mix(orderSheet, 220, 0)}px)`,
                  background: '#fff',
                  borderRadius: 22,
                  boxShadow: '0 -10px 40px rgba(21,34,40,0.18)',
                  padding: '18px 18px 20px',
                  fontFamily: fonts.ui,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <CircleCheck size={24} color={colors.green} />
                  <span style={{ fontWeight: 700, fontSize: 18, color: colors.ink }}>Order placed</span>
                  <span style={{ marginLeft: 'auto', fontSize: 14, color: colors.muted }}>{customerActivity.order.id}</span>
                </div>
                <div style={{ fontSize: 14.5, color: colors.muted, marginTop: 8, lineHeight: 1.45 }}>
                  {customerActivity.order.text.split(', ').map((l) => (
                    <div key={l}>{l}</div>
                  ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 15 }}>
                  <span style={{ color: colors.muted }}>Paid by UPI</span>
                  <span style={{ fontWeight: 700, color: colors.ink }}>{customerActivity.order.amount}</span>
                </div>
              </div>
            ) : null}
          </PhoneFrame>
        </div>

        {/* scene 04's listing card dissolving into the search result */}
        {listingOut < 1 ? (
          <div
            style={{
              position: 'absolute',
              left: L.cx - 170,
              top: L.cy - 195,
              width: 340,
              opacity: 1 - listingOut,
              transform: `scale(${(L.w / 340) * mix(listingOut, 1, 0.96)})`,
              transformOrigin: '50% 195px',
            }}
          >
            <GoogleListing width={340} />
          </div>
        ) : null}

        {/* activity flowing to BridgeAux */}
        <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
          {actions.map((a, i) => {
            const y = 300 + i * 132;
            const p = progress(frame, a.at + 6, 16, ease.out);
            const since = frame - a.at - 10;
            return (
              <ConnectionLine
                key={a.title}
                from={{ x: TOASTS_X + 470, y }}
                to={{ x: NODE.x - NODE.r, y: NODE.y }}
                draw={p}
                pulse={since > 0 && since < 24 ? since / 24 : undefined}
                color={a.accent === 'green' ? colors.green : colors.blue}
                width={2.4}
                curve={(i - 1.5) * 0.04}
                strength={0.4}
              />
            );
          })}
        </svg>
        {actions.map((a, i) => {
          const p = progress(frame, a.at, 16, ease.out);
          if (p <= 0) return null;
          return (
            <div
              key={a.title}
              style={{
                position: 'absolute',
                left: TOASTS_X + mix(p, -90, 0),
                top: 300 + i * 132 - 40,
                opacity: p,
                transform: `scale(${mix(p, 0.92, 1)})`,
                filter: p < 1 ? `blur(${(1 - p) * 4}px)` : undefined,
              }}
            >
              <CustomerAction icon={a.icon} title={a.title} detail={a.detail} accent={a.accent} />
            </div>
          );
        })}
      </AbsoluteFill>

      {/* BridgeAux: node, then the owner's dashboard */}
      <div
        style={{
          position: 'absolute',
          left: cx - w / 2,
          top: cy - h / 2,
          width: w,
          height: h,
          borderRadius: radius,
          background: '#fff',
          boxShadow: expand > 0 ? shadows.float : `0 0 0 10px rgba(2,116,239,0.05), ${shadows.glowBlue}`,
          overflow: 'hidden',
          opacity: nodeIn,
          transform: `scale(${mix(nodeIn, 0.7, 1) * (1 + 0.05 * Math.max(0, ...actions.map((a) => 1 - Math.abs(frame - a.at - 30) / 8)))})`,
        }}
      >
        <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', opacity: 1 - dashContent }}>
          <BridgeAuxLogo height={NODE.r * 0.64} />
        </div>
        {dashContent > 0 ? (
          <div style={{ position: 'absolute', left: (w - dW) / 2, top: (h - dH) / 2, opacity: dashContent }}>
            <BrowserFrame url="bridgeaux.com/dashboard" width={DASH_W} height={DASH_H + 44} style={{ transform: `scale(${dash.scale})`, transformOrigin: 'top left', boxShadow: 'none', border: 'none' }}>
              <Dashboard
                state={{
                  // the customers just seen land here: +1 order of ₹1,170, +2 enquiries
                  visits: Math.round(mix(counts, metrics.visits - 12, metrics.visits)),
                  enquiries: Math.round(mix(counts, metrics.enquiries - 2, metrics.enquiries)),
                  orders: Math.round(mix(counts, metrics.orders - 1, metrics.orders)),
                  revenue: Math.round(mix(counts, metrics.revenue - 1170, metrics.revenue)),
                  spark: progress(frame, 238, 30),
                  newEnquiry: progress(frame, 242, 16, ease.out),
                  reply,
                  enquiriesGlow: progress(frame, 246, 10) * (1 - progress(frame, REPLY_CLICK + 10, 20)),
                  activeNav: 'Home',
                }}
              />
            </BrowserFrame>
          </div>
        ) : null}
      </div>
      {nodeIn > 0 && expand <= 0 ? (
        <div
          style={{
            position: 'absolute',
            left: NODE.x,
            top: NODE.y + NODE.r + 26,
            transform: 'translateX(-50%)',
            fontFamily: fonts.display,
            fontWeight: 600,
            fontSize: 28,
            color: colors.ink,
            letterSpacing: '-0.02em',
            opacity: nodeIn * (1 - gather),
          }}
        >
          BridgeAux
        </div>
      ) : null}

      {/* the owner replies */}
      {pointerIn > 0 && pointerOut < 1 ? (
        <Pointer
          x={mix(pointerIn, target.x + 220, target.x) - 4}
          y={mix(pointerIn, target.y + 200, target.y) - 3}
          pressed={reply === 'pressed'}
          opacity={pointerIn * (1 - pointerOut)}
        />
      ) : null}

      <Sfx name="whoosh-soft" at={0} volume={0.18} />
      <Sfx name="tap" at={ACT.find + 8} volume={0.4} />
      <Sfx name="tap" at={ACT.contact - 4} volume={0.35} />
      <Sfx name="tap" at={ACT.enquire - 4} volume={0.35} />
      {actions.map((a) => (
        <Sfx key={a.title} name="notify" at={a.at} volume={0.2} />
      ))}
      <Sfx name="whoosh" at={214} volume={0.22} />
      <Sfx name="click" at={REPLY_CLICK} volume={0.5} />
      <Sfx name="confirm" at={REPLY_CLICK + 5} volume={0.26} />
    </SceneShell>
  );
};
