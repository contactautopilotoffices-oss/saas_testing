import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { AtSign, BarChart3, Globe, IndianRupee, MapPin, Megaphone, Search, ShoppingBag, Star, Users } from 'lucide-react';
import { SceneShell, SceneProps } from '../components/SceneShell';
import { BridgeAuxLogo } from '../components/BridgeAuxLogo';
import { BrowserFrame } from '../components/BrowserFrame';
import { ConnectionLine } from '../components/ConnectionLine';
import { CTA } from '../components/CTA';
import { Dashboard, DASH_H, DASH_W } from '../components/Dashboard';
import { EcoCard, EcoGroup, ecoSlots, groupColor } from '../components/Ecosystem';
import { Heading } from '../components/Heading';
import { Sfx } from '../components/Audio';
import { S5_END } from './Scene05OperateGrow';
import { business, formatINR, metrics } from '../data/business';
import { colors, fonts } from '../styles/tokens';
import { ease, mix, progress } from '../lib/motion';

// SCENE 06 (50-60s): EVERYTHING CONNECTED + CTA
// Pull back from the dashboard to reveal the whole connected business, then
// resolve to BridgeAux: the promise, and the invitation to join the waitlist.

const CENTER = { x: 960, y: 548 };
const SMALL = 0.36; // dashboard scale once zoomed out

type Item = { key: string; label: string; group: EcoGroup; icon: React.ReactNode; value: React.ReactNode; at: number };

// appearance frames follow the narration: "Your website, customers, sales and marketing, all connected in one place"
const ITEMS: Item[] = [
  { key: 'website', label: 'Website', group: 'exist', icon: <Globe size={22} />, value: business.domain, at: 16 },
  {
    key: 'google',
    label: 'Google',
    group: 'exist',
    icon: <MapPin size={22} />,
    value: (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
        {business.rating} <Star size={13} strokeWidth={0} fill="#F2A33A" /> · {business.reviews} reviews
      </span>
    ),
    at: 22,
  },
  { key: 'email', label: 'Business Email', group: 'exist', icon: <AtSign size={22} />, value: business.email, at: 28 },
  { key: 'customers', label: 'Customers', group: 'grow', icon: <Users size={22} />, value: `${metrics.customers} customers`, at: 36 },
  { key: 'orders', label: 'Orders', group: 'grow', icon: <ShoppingBag size={22} />, value: `${metrics.orders} this month`, at: 50 },
  { key: 'sales', label: 'Sales', group: 'grow', icon: <IndianRupee size={22} />, value: `${formatINR(metrics.revenue)} this month`, at: 56 },
  { key: 'marketing', label: 'Marketing', group: 'grow', icon: <Megaphone size={22} />, value: `${metrics.postsScheduled} posts scheduled`, at: 76 },
  { key: 'seo', label: 'SEO', group: 'grow', icon: <Search size={22} />, value: 'Found for "bakery in Bandra"', at: 84 },
  { key: 'analytics', label: 'Analytics', group: 'grow', icon: <BarChart3 size={22} />, value: `${metrics.visits.toLocaleString('en-IN')} visits · +18%`, at: 92 },
];

export const Scene06Finale: React.FC<SceneProps> = ({ withMusic }) => {
  const frame = useCurrentFrame();
  const slots = ecoSlots({ cx: CENTER.x, cy: CENTER.y, rx: 700, ry: 360 });

  // --- pull back from the dashboard
  const zoom = progress(frame, 0, 54, ease.inOut);
  const start = S5_END.dash;
  const scale = mix(zoom, start.scale, SMALL);
  const dcx = mix(zoom, start.cx, CENTER.x);
  const dcy = mix(zoom, start.cy, CENTER.y);
  const dW = DASH_W * scale;
  const dH = (DASH_H + 44) * scale;
  const heading = progress(frame, 24, 22, ease.out);

  // "all connected in one place": every line lights up together
  const together = progress(frame, 104, 16) * (1 - progress(frame, 132, 14));

  // --- resolve into BridgeAux
  const gather = progress(frame, 136, 26, ease.inOut);
  const dashOut = progress(frame, 134, 16, ease.in);
  const logoIn = progress(frame, 149, 30, ease.out);
  const logoRise = progress(frame, 178, 30, ease.inOut);
  const tagline = progress(frame, 186, 26, ease.out);
  const cta = progress(frame, 214, 22, ease.out);
  const url = progress(frame, 226, 18, ease.out);
  const sweep = progress(frame, 244, 30, ease.inOut);
  const settle = progress(frame, 176, 124, ease.drift);

  return (
    <SceneShell scene={6} withMusic={withMusic}>
      <AbsoluteFill style={{ opacity: 1 - gather, transform: `scale(${mix(gather, 1, 0.9)})`, transformOrigin: `${CENTER.x}px ${CENTER.y}px` }}>
        <Heading text="Everything connected" p={heading} top={46} size={42} />

        <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
          {ITEMS.map((it, i) => {
            const a = progress(frame, it.at + 4, 18, ease.out);
            const s = slots[i];
            // aim at the nearest edge of the dashboard card
            const toX = s.x < CENTER.x ? CENTER.x - (DASH_W * SMALL) / 2 : CENTER.x + (DASH_W * SMALL) / 2;
            const toY = Math.min(Math.max(s.y, CENTER.y - 120), CENTER.y + 120);
            const since = frame - 104 - i * 2;
            return (
              <ConnectionLine
                key={it.key}
                from={{ x: s.x + (s.x < CENTER.x ? 170 : -170), y: s.y }}
                to={{ x: toX, y: toY }}
                draw={a}
                pulse={since > 0 && since < 26 ? since / 26 : undefined}
                color={groupColor(it.group)}
                width={2.4}
                curve={s.x < CENTER.x ? 0.06 : -0.06}
                strength={0.32 + 0.4 * together}
              />
            );
          })}
        </svg>

        {ITEMS.map((it, i) => (
          <EcoCard
            key={it.key}
            label={it.label}
            value={it.value}
            group={it.group}
            icon={it.icon}
            x={slots[i].x}
            y={slots[i].y}
            appear={progress(frame, it.at, 18, ease.out)}
            glow={together}
            width={340}
          />
        ))}
      </AbsoluteFill>

      {/* the dashboard, from full screen to the hub of everything */}
      {dashOut < 1 ? (
        <div
          style={{
            position: 'absolute',
            left: dcx - dW / 2,
            top: dcy - dH / 2,
            width: dW,
            height: dH,
            opacity: 1 - dashOut,
            transform: `scale(${mix(progress(frame, 132, 20, ease.in), 1, 0.55)})`,
          }}
        >
          <BrowserFrame
            url="bridgeaux.com/dashboard"
            width={DASH_W}
            height={DASH_H + 44}
            style={{
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
              boxShadow: `0 ${40 / scale}px ${90 / scale}px rgba(21,34,40,0.16), 0 0 0 ${(together * 6) / scale}px rgba(2,116,239,0.12)`,
            }}
          >
            <Dashboard
              state={{
                visits: metrics.visits,
                enquiries: metrics.enquiries,
                orders: metrics.orders,
                revenue: metrics.revenue,
                reply: 'replied',
                activeNav: 'Home',
              }}
            />
          </BrowserFrame>
        </div>
      ) : null}

      {/* BridgeAux */}
      {logoIn > 0 ? (
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              transform: `translateY(${mix(logoRise, 0, -136)}px) scale(${mix(settle, 1, 1.02)})`,
            }}
          >
            <BridgeAuxLogo height={176} reveal={logoIn} />
            <div
              style={{
                fontFamily: fonts.display,
                fontWeight: 600,
                fontSize: 92,
                letterSpacing: '-0.035em',
                color: colors.ink,
                marginTop: 22,
                opacity: progress(frame, 160, 22, ease.out),
                transform: `translateY(${mix(progress(frame, 160, 22, ease.out), 14, 0)}px)`,
              }}
            >
              BridgeAux
            </div>
          </div>
          <div
            style={{
              position: 'absolute',
              top: 600,
              left: 0,
              right: 0,
              textAlign: 'center',
              fontFamily: fonts.display,
              fontWeight: 500,
              fontSize: 40,
              letterSpacing: '-0.02em',
              color: colors.inkSoft,
              opacity: tagline,
              transform: `translateY(${mix(tagline, 18, 0)}px)`,
              filter: tagline < 1 ? `blur(${(1 - tagline) * 4}px)` : undefined,
            }}
          >
            Everything your business needs to <span style={{ color: colors.blue }}>exist</span> and <span style={{ color: colors.green }}>grow</span> online.
          </div>
          <div
            style={{
              position: 'absolute',
              top: 694,
              left: 0,
              right: 0,
              display: 'flex',
              justifyContent: 'center',
              opacity: cta,
              transform: `translateY(${mix(cta, 16, 0)}px) scale(${mix(cta, 0.96, 1)})`,
            }}
          >
            <CTA sweep={sweep} />
          </div>
          <div
            style={{
              position: 'absolute',
              top: 820,
              left: 0,
              right: 0,
              textAlign: 'center',
              fontFamily: fonts.ui,
              fontWeight: 500,
              fontSize: 22,
              letterSpacing: '0.02em',
              color: colors.muted,
              opacity: url,
            }}
          >
            bridgeaux.com
          </div>
        </AbsoluteFill>
      ) : null}

      <Sfx name="whoosh-soft" at={2} volume={0.2} />
      {ITEMS.map((it, i) => (
        <Sfx key={it.key} name="pop" at={it.at} volume={0.08 + (i % 3) * 0.02} />
      ))}
      <Sfx name="connect" at={104} volume={0.3} />
      <Sfx name="swell" at={128} volume={0.18} />
      <Sfx name="bloom" at={149} volume={0.5} />
      <Sfx name="pop" at={214} volume={0.16} />
    </SceneShell>
  );
};
