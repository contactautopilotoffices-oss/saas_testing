import React from 'react';
import { Clock, MapPin, MessageCircle, Phone, Star } from 'lucide-react';
import { business, products } from '../data/business';
import { colors, fonts } from '../styles/tokens';
import { KesarLogo, KesarMark } from './KesarLogo';
import { ProductArt } from './ProductArt';

// The Kesar Bakehouse website that BridgeAux sets up. Designed at a fixed
// 1280px wide canvas and scaled by its container.

export const SITE_WIDTH = 1280;

const NavLink: React.FC<{ children: React.ReactNode; active?: boolean }> = ({ children, active }) => (
  <span
    style={{
      fontFamily: fonts.ui,
      fontSize: 15,
      fontWeight: 500,
      color: active ? colors.cocoa : colors.cocoaSoft,
      borderBottom: active ? `2px solid ${colors.saffron}` : '2px solid transparent',
      paddingBottom: 4,
    }}
  >
    {children}
  </span>
);

const Button: React.FC<{ children: React.ReactNode; primary?: boolean; icon?: React.ReactNode; size?: number }> = ({
  children,
  primary,
  icon,
  size = 1,
}) => (
  <div
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8 * size,
      padding: `${13 * size}px ${22 * size}px`,
      borderRadius: 999,
      background: primary ? colors.saffron : 'transparent',
      color: primary ? '#FFFFFF' : colors.cocoa,
      border: primary ? 'none' : `1.5px solid rgba(58,42,34,0.25)`,
      fontFamily: fonts.ui,
      fontWeight: 600,
      fontSize: 15 * size,
      boxShadow: primary ? '0 8px 20px rgba(217,130,43,0.28)' : 'none',
      whiteSpace: 'nowrap',
    }}
  >
    {icon}
    {children}
  </div>
);

/** Desktop website. `scroll` moves the page up (px in site space). */
export const WebsiteMockup: React.FC<{ scroll?: number; reveal?: number }> = ({ scroll = 0, reveal = 1 }) => {
  const section = (i: number) => {
    const p = Math.min(1, Math.max(0, reveal * 4 - i));
    return { opacity: p, transform: `translateY(${(1 - p) * 16}px)` };
  };
  return (
    <div style={{ width: SITE_WIDTH, background: colors.cream, transform: `translateY(${-scroll}px)` }}>
      {/* header */}
      <div
        style={{
          height: 84,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 56px',
          borderBottom: '1px solid rgba(58,42,34,0.08)',
          background: 'rgba(255,248,238,0.96)',
          ...section(0),
        }}
      >
        <KesarLogo height={46} />
        <div style={{ display: 'flex', gap: 34, alignItems: 'center' }}>
          <NavLink active>Home</NavLink>
          <NavLink>Menu</NavLink>
          <NavLink>Custom Cakes</NavLink>
          <NavLink>About</NavLink>
          <NavLink>Contact</NavLink>
          <Button primary size={0.9}>Order now</Button>
        </div>
      </div>

      {/* hero */}
      <div style={{ display: 'flex', padding: '56px 56px 40px', gap: 48, alignItems: 'center', ...section(1) }}>
        <div style={{ flex: 1.15 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '7px 14px',
              borderRadius: 999,
              background: colors.saffronSoft,
              color: colors.saffronDeep,
              fontFamily: fonts.ui,
              fontWeight: 600,
              fontSize: 13,
              letterSpacing: '0.04em',
            }}
          >
            <Star size={13} fill={colors.saffronDeep} strokeWidth={0} /> {business.rating} · LOVED IN BANDRA SINCE {business.since}
          </div>
          <div
            style={{
              fontFamily: fonts.serif,
              fontWeight: 600,
              fontSize: 54,
              lineHeight: 1.06,
              color: colors.cocoa,
              letterSpacing: '-0.02em',
              marginTop: 20,
            }}
          >
            Baked fresh in Bandra,
            <br />
            <span style={{ fontStyle: 'italic', fontWeight: 500, color: colors.saffronDeep }}>every morning.</span>
          </div>
          <div style={{ fontFamily: fonts.ui, fontSize: 19, lineHeight: 1.5, color: colors.cocoaSoft, marginTop: 18, maxWidth: 520 }}>
            Cakes, pastries and custom celebration cakes. Order ahead or visit us on Hill Road.
          </div>
          <div style={{ display: 'flex', gap: 14, marginTop: 30 }}>
            <Button primary icon={<MessageCircle size={17} strokeWidth={2.2} />}>Order on WhatsApp</Button>
            <Button icon={<Phone size={16} strokeWidth={2.2} />}>Call now</Button>
          </div>
        </div>
        <div style={{ flex: 0.95, position: 'relative', height: 380 }}>
          <div style={{ position: 'absolute', right: 0, top: 0, borderRadius: 28, overflow: 'hidden', boxShadow: '0 30px 60px rgba(58,42,34,0.18)' }}>
            <ProductArt kind="chocolate" size={380} radius={28} />
          </div>
          <div
            style={{
              position: 'absolute',
              left: 6,
              bottom: 18,
              background: '#FFFFFF',
              borderRadius: 18,
              padding: '14px 18px',
              boxShadow: '0 16px 36px rgba(58,42,34,0.14)',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <KesarMark size={38} />
            <div>
              <div style={{ fontFamily: fonts.ui, fontWeight: 600, fontSize: 15, color: colors.cocoa }}>Custom cakes</div>
              <div style={{ fontFamily: fonts.ui, fontSize: 13, color: colors.cocoaSoft, marginTop: 2 }}>Order 2 days ahead</div>
            </div>
          </div>
        </div>
      </div>

      {/* favourites */}
      <div style={{ padding: '18px 56px 36px', ...section(2) }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div style={{ fontFamily: fonts.serif, fontWeight: 600, fontSize: 32, color: colors.cocoa }}>Our favourites</div>
          <div style={{ fontFamily: fonts.ui, fontWeight: 600, fontSize: 15, color: colors.saffronDeep }}>See full menu</div>
        </div>
        <div style={{ display: 'flex', gap: 22, marginTop: 20 }}>
          {products.map((p) => (
            <div key={p.name} style={{ flex: 1, background: '#FFFFFF', borderRadius: 20, padding: 12, boxShadow: '0 10px 24px rgba(58,42,34,0.07)' }}>
              <ProductArt kind={p.kind} size={254} radius={14} />
              <div style={{ padding: '14px 6px 6px' }}>
                <div style={{ fontFamily: fonts.ui, fontWeight: 600, fontSize: 16, color: colors.cocoa }}>{p.name}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                  <span style={{ fontFamily: fonts.ui, fontSize: 14, color: colors.cocoaSoft }}>{p.note}</span>
                  <span style={{ fontFamily: fonts.ui, fontWeight: 700, fontSize: 15, color: colors.saffronDeep }}>{p.price}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* visit strip */}
      <div
        style={{
          margin: '0 56px 48px',
          borderRadius: 22,
          background: colors.cocoa,
          color: colors.cream,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '26px 34px',
          fontFamily: fonts.ui,
          fontSize: 16,
          ...section(3),
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <MapPin size={18} color={colors.saffron} /> {business.address}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Clock size={18} color={colors.saffron} /> {business.hours}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Phone size={18} color={colors.saffron} /> {business.phone}
        </span>
      </div>
    </div>
  );
};

/** Mobile version of the same site, designed at 360px wide. */
export const MobileSite: React.FC<{ scroll?: number; highlight?: 'whatsapp' | 'enquire' | null; children?: React.ReactNode }> = ({
  scroll = 0,
  highlight = null,
}) => (
  <div style={{ width: 360, background: colors.cream, transform: `translateY(${-scroll}px)` }}>
    <div style={{ height: 58, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 18px', borderBottom: '1px solid rgba(58,42,34,0.08)' }}>
      <KesarLogo height={32} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ width: 18, height: 2, borderRadius: 2, background: colors.cocoa }} />
        ))}
      </div>
    </div>
    <div style={{ padding: '18px 18px 0' }}>
      <div style={{ borderRadius: 18, overflow: 'hidden' }}>
        <ProductArt kind="chocolate" size={324} radius={18} />
      </div>
      <div style={{ fontFamily: fonts.serif, fontWeight: 600, fontSize: 30, lineHeight: 1.08, color: colors.cocoa, marginTop: 18, letterSpacing: '-0.015em' }}>
        Baked fresh in Bandra, <span style={{ fontStyle: 'italic', fontWeight: 500, color: colors.saffronDeep }}>every morning.</span>
      </div>
      <div style={{ fontFamily: fonts.ui, fontSize: 14, lineHeight: 1.5, color: colors.cocoaSoft, marginTop: 10 }}>
        Cakes, pastries and custom celebration cakes.
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
        <div
          style={{
            height: 48,
            borderRadius: 999,
            background: colors.saffron,
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            fontFamily: fonts.ui,
            fontWeight: 600,
            fontSize: 15,
            boxShadow: highlight === 'whatsapp' ? `0 0 0 5px rgba(217,130,43,0.25)` : 'none',
          }}
        >
          <MessageCircle size={17} /> Order on WhatsApp
        </div>
        <div
          style={{
            height: 48,
            borderRadius: 999,
            border: '1.5px solid rgba(58,42,34,0.22)',
            color: colors.cocoa,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: fonts.ui,
            fontWeight: 600,
            fontSize: 15,
            background: highlight === 'enquire' ? colors.saffronSoft : 'transparent',
            boxShadow: highlight === 'enquire' ? `0 0 0 5px rgba(217,130,43,0.18)` : 'none',
          }}
        >
          Enquire about a custom cake
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
        {products.slice(1, 3).map((p) => (
          <div key={p.name} style={{ flex: 1, background: '#fff', borderRadius: 14, padding: 8 }}>
            <ProductArt kind={p.kind} size={146} radius={10} />
            <div style={{ fontFamily: fonts.ui, fontWeight: 600, fontSize: 12.5, color: colors.cocoa, marginTop: 8 }}>{p.name}</div>
            <div style={{ fontFamily: fonts.ui, fontWeight: 700, fontSize: 12.5, color: colors.saffronDeep, marginTop: 2 }}>{p.price}</div>
          </div>
        ))}
      </div>
    </div>
  </div>
);
