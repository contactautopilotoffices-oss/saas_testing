import React from 'react';
import { CornerUpRight, Globe, MapPin, Phone, Star } from 'lucide-react';
import { business } from '../data/business';
import { colors, fonts } from '../styles/tokens';
import { ProductArt } from './ProductArt';

const Stars: React.FC<{ rating: number; size: number }> = ({ rating, size }) => (
  <span style={{ display: 'inline-flex', gap: size * 0.12 }}>
    {[0, 1, 2, 3, 4].map((i) => (
      <Star key={i} size={size} strokeWidth={0} fill={i < Math.round(rating) ? '#F2A33A' : '#E3DED6'} />
    ))}
  </span>
);

const Action: React.FC<{ icon: React.ReactNode; label: string; active?: boolean; s: number }> = ({ icon, label, active, s }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 * s }}>
    <div
      style={{
        width: 40 * s,
        height: 40 * s,
        borderRadius: 999,
        background: active ? colors.blue : colors.blueSoft,
        color: active ? '#fff' : colors.blue,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: active ? `0 0 0 ${5 * s}px rgba(2,116,239,0.18)` : 'none',
      }}
    >
      {icon}
    </div>
    <span style={{ fontFamily: fonts.ui, fontSize: 12.5 * s, fontWeight: 600, color: colors.blue }}>{label}</span>
  </div>
);

type Props = {
  width: number;
  /** highlight one of the action buttons (e.g. when a customer taps it) */
  activeAction?: 'call' | 'directions' | 'website' | null;
  showPhotos?: boolean;
  style?: React.CSSProperties;
};

/**
 * Business listing card in the style of a search/maps result: name, rating,
 * category, opening hours and the Call / Directions / Website actions.
 * A neutral rendition, not a copy of any search engine's interface.
 */
export const GoogleListing: React.FC<Props> = ({ width, activeAction = null, showPhotos = true, style }) => {
  const s = width / 380;
  return (
    <div
      style={{
        width,
        background: '#FFFFFF',
        borderRadius: 20 * s,
        boxShadow: '0 1px 2px rgba(21,34,40,0.05), 0 18px 44px rgba(21,34,40,0.12)',
        overflow: 'hidden',
        fontFamily: fonts.ui,
        ...style,
      }}
    >
      {showPhotos ? (
        <div style={{ display: 'flex', gap: 3 * s, height: 112 * s }}>
          <div style={{ flex: 1.4, overflow: 'hidden' }}>
            <ProductArt kind="chocolate" size={170 * s} radius={0} />
          </div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <ProductArt kind="cheesecake" size={122 * s} radius={0} />
          </div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <ProductArt kind="croissant" size={122 * s} radius={0} />
          </div>
        </div>
      ) : null}
      <div style={{ padding: `${16 * s}px ${20 * s}px ${18 * s}px` }}>
        <div style={{ fontSize: 22 * s, fontWeight: 600, color: colors.ink, letterSpacing: '-0.01em' }}>{business.name}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 * s, marginTop: 6 * s, fontSize: 14 * s, color: colors.muted }}>
          <span style={{ color: colors.ink, fontWeight: 600 }}>{business.rating}</span>
          <Stars rating={business.rating} size={13 * s} />
          <span>({business.reviews})</span>
        </div>
        <div style={{ fontSize: 14 * s, color: colors.muted, marginTop: 5 * s }}>
          Bakery in {business.area}, {business.city}
        </div>
        <div style={{ fontSize: 14 * s, marginTop: 5 * s }}>
          <span style={{ color: colors.live, fontWeight: 600 }}>Open</span>
          <span style={{ color: colors.muted }}> · {business.closes}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: 16 * s, paddingTop: 14 * s, borderTop: `1px solid ${colors.lineSoft}` }}>
          <Action s={s} icon={<Phone size={17 * s} strokeWidth={2.2} />} label="Call" active={activeAction === 'call'} />
          <Action s={s} icon={<CornerUpRight size={18 * s} strokeWidth={2.2} />} label="Directions" active={activeAction === 'directions'} />
          <Action s={s} icon={<Globe size={17 * s} strokeWidth={2.2} />} label="Website" active={activeAction === 'website'} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 * s, marginTop: 14 * s, fontSize: 13 * s, color: colors.muted }}>
          <MapPin size={14 * s} color={colors.faint} /> {business.street}, {business.area}
        </div>
      </div>
    </div>
  );
};

export { Stars };
