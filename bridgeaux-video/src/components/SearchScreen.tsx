import React from 'react';
import { CircleHelp, Clock, CornerUpRight, Globe, MapPin, Mic, Phone, Search, Star } from 'lucide-react';
import { business, competitors } from '../data/business';
import { colors, fonts } from '../styles/tokens';
import { ProductArt } from './ProductArt';

// A local search results screen on a customer's phone. Neutral styling
// (not a copy of any search engine). Two states tell the story:
//   'missing' - scene 01: the bakery barely shows up, with gaps everywhere
//   'found'   - scene 05: the bakery is complete and comes up first

type Props = {
  variant: 'missing' | 'found';
  /** text currently in the search box */
  query: string;
  caret?: boolean;
  /** 0..1 reveal progress for the map and each result row */
  mapIn?: number;
  rowsIn?: number[];
  /** highlight on the bakery result (0..1) */
  focus?: number;
  /** which action the customer is tapping on the bakery result */
  tap?: 'website' | 'call' | null;
};

const appear = (p = 1) => ({
  opacity: p,
  transform: `translateY(${(1 - p) * 14}px)`,
});

const Pin: React.FC<{ x: number; y: number; color: string; label?: string; ghost?: boolean; pulse?: number }> = ({
  x,
  y,
  color,
  label,
  ghost,
  pulse = 0,
}) => (
  <div style={{ position: 'absolute', left: x, top: y, transform: 'translate(-50%, -100%)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
    {label ? (
      <div
        style={{
          fontFamily: fonts.ui,
          fontSize: 10.5,
          fontWeight: 600,
          color: ghost ? colors.faint : colors.ink,
          background: 'rgba(255,255,255,0.92)',
          padding: '2px 6px',
          borderRadius: 6,
          marginBottom: 3,
          whiteSpace: 'nowrap',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        }}
      >
        {label}
      </div>
    ) : null}
    <svg width="26" height="34" viewBox="0 0 26 34" style={{ overflow: 'visible' }}>
      {pulse > 0 ? <circle cx="13" cy="31" r={6 + pulse * 18} fill={color} opacity={0.25 * (1 - pulse)} /> : null}
      <path
        d="M13 33 C 13 33 2 20 2 12.5 A 11 11 0 0 1 24 12.5 C 24 20 13 33 13 33 Z"
        fill={ghost ? 'rgba(255,255,255,0.6)' : color}
        stroke={ghost ? colors.faint : 'rgba(0,0,0,0.12)'}
        strokeWidth={ghost ? 1.6 : 1}
        strokeDasharray={ghost ? '3 3' : undefined}
      />
      {ghost ? (
        <text x="13" y="17" textAnchor="middle" fontFamily="Inter" fontWeight="700" fontSize="11" fill={colors.faint}>
          ?
        </text>
      ) : (
        <circle cx="13" cy="12.5" r="4.2" fill="#fff" />
      )}
    </svg>
  </div>
);

const MapStrip: React.FC<{ variant: Props['variant']; p: number }> = ({ variant, p }) => (
  <div style={{ position: 'relative', height: 156, margin: '0 14px', borderRadius: 16, overflow: 'hidden', background: '#EEE9DF', ...appear(p) }}>
    <svg width="100%" height="100%" viewBox="0 0 320 156" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0 }}>
      <rect width="320" height="156" fill="#EEE9DF" />
      <path d="M-10 118 C 80 100 160 128 330 92" stroke="#FFFFFF" strokeWidth="14" fill="none" />
      <path d="M96 -10 C 104 60 92 110 120 170" stroke="#FFFFFF" strokeWidth="10" fill="none" />
      <path d="M210 -10 L 236 170" stroke="#FFFFFF" strokeWidth="8" fill="none" />
      <path d="M-10 40 L 330 56" stroke="#FFFFFF" strokeWidth="6" fill="none" />
      <rect x="128" y="64" width="70" height="30" rx="8" fill="#D7E6CB" />
      <rect x="250" y="8" width="60" height="38" rx="8" fill="#D7E6CB" />
      <path d="M-10 150 C 60 140 120 160 200 150 L 200 170 L -10 170 Z" fill="#CFE0EA" />
    </svg>
    <Pin x={60} y={86} color="#5F6B73" label={competitors[0].name} />
    <Pin x={262} y={112} color="#5F6B73" label={competitors[1].name} />
    {variant === 'missing' ? (
      <Pin x={168} y={60} color={colors.saffron} ghost />
    ) : (
      <Pin x={168} y={60} color={colors.saffron} label={business.name} pulse={(p * 1.6) % 1} />
    )}
    {/* you are here */}
    <div style={{ position: 'absolute', left: 150, top: 124, width: 14, height: 14, borderRadius: 99, background: colors.blue, border: '3px solid #fff', boxShadow: '0 0 0 6px rgba(2,116,239,0.18)' }} />
  </div>
);

const Pill: React.FC<{ icon: React.ReactNode; label: string; active?: boolean }> = ({ icon, label, active }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 5,
      padding: '6px 11px',
      borderRadius: 999,
      border: `1px solid ${active ? colors.blue : colors.line}`,
      background: active ? colors.blue : '#fff',
      color: active ? '#fff' : colors.blue,
      fontFamily: fonts.ui,
      fontSize: 12,
      fontWeight: 600,
      boxShadow: active ? '0 0 0 4px rgba(2,116,239,0.18)' : 'none',
      transform: active ? 'scale(0.96)' : 'none',
    }}
  >
    {icon}
    {label}
  </div>
);

const Rating: React.FC<{ value: number; count: number }> = ({ value, count }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontFamily: fonts.ui, fontSize: 12.5, color: colors.muted, marginTop: 3 }}>
    <span style={{ color: colors.ink, fontWeight: 600 }}>{value}</span>
    <span style={{ display: 'inline-flex', gap: 1 }}>
      {[0, 1, 2, 3, 4].map((i) => (
        <Star key={i} size={11} strokeWidth={0} fill={i < Math.round(value) ? '#F2A33A' : '#E3DED6'} />
      ))}
    </span>
    <span>({count})</span>
  </div>
);

const Result: React.FC<{ name: string; meta: string; rating: number; reviews: number; p: number }> = ({ name, meta, rating, reviews, p }) => (
  <div style={{ padding: '12px 4px', borderBottom: `1px solid ${colors.lineSoft}`, ...appear(p) }}>
    <div style={{ fontFamily: fonts.ui, fontWeight: 600, fontSize: 15.5, color: colors.ink }}>{name}</div>
    <Rating value={rating} count={reviews} />
    <div style={{ fontFamily: fonts.ui, fontSize: 12.5, color: colors.muted, marginTop: 3 }}>
      {meta} · <span style={{ color: colors.live, fontWeight: 600 }}>Open</span>
    </div>
    <div style={{ display: 'flex', gap: 6, marginTop: 9 }}>
      <Pill icon={<Globe size={12} />} label="Website" />
      <Pill icon={<CornerUpRight size={12} />} label="Directions" />
      <Pill icon={<Phone size={12} />} label="Call" />
    </div>
  </div>
);

const MissingKesar: React.FC<{ p: number; focus: number }> = ({ p, focus }) => (
  <div
    style={{
      padding: '12px 10px',
      marginTop: 8,
      borderRadius: 14,
      border: `1.5px dashed rgba(69,79,87,${0.25 + 0.4 * focus})`,
      background: `rgba(238,241,244,${0.7 * focus})`,
      ...appear(p),
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ fontFamily: fonts.ui, fontWeight: 600, fontSize: 15.5, color: colors.inkSoft }}>{business.name}</div>
      <CircleHelp size={16} color={colors.warn} />
    </div>
    <div style={{ fontFamily: fonts.ui, fontSize: 12.5, color: colors.faint, marginTop: 4 }}>Bakery · Listing incomplete</div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontFamily: fonts.ui, fontSize: 12.5, color: colors.faint, marginTop: 3 }}>
      <Clock size={12} /> Hours not listed
    </div>
    <div style={{ display: 'flex', gap: 6, marginTop: 9 }}>
      {['No website', 'No phone'].map((t) => (
        <div
          key={t}
          style={{
            padding: '5px 10px',
            borderRadius: 999,
            border: `1px dashed ${colors.line}`,
            color: colors.faint,
            fontFamily: fonts.ui,
            fontSize: 11.5,
            fontWeight: 600,
          }}
        >
          {t}
        </div>
      ))}
    </div>
  </div>
);

const FoundKesar: React.FC<{ p: number; focus: number; tap: Props['tap'] }> = ({ p, focus, tap }) => (
  <div
    style={{
      padding: 10,
      marginTop: 4,
      borderRadius: 16,
      background: '#fff',
      boxShadow: `0 0 0 ${1 + focus * 1.5}px rgba(2,116,239,${0.12 + 0.3 * focus}), 0 10px 26px rgba(21,34,40,${0.08 + 0.06 * focus})`,
      ...appear(p),
    }}
  >
    <div style={{ display: 'flex', gap: 4, height: 74, borderRadius: 10, overflow: 'hidden' }}>
      <div style={{ flex: 1.3, overflow: 'hidden' }}>
        <ProductArt kind="chocolate" size={112} radius={0} />
      </div>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <ProductArt kind="cheesecake" size={86} radius={0} />
      </div>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <ProductArt kind="pastry" size={86} radius={0} />
      </div>
    </div>
    <div style={{ padding: '10px 2px 2px' }}>
      <div style={{ fontFamily: fonts.ui, fontWeight: 600, fontSize: 16, color: colors.ink }}>{business.name}</div>
      <Rating value={business.rating} count={business.reviews} />
      <div style={{ fontFamily: fonts.ui, fontSize: 12.5, color: colors.muted, marginTop: 3 }}>
        Bakery · {business.area} · <span style={{ color: colors.live, fontWeight: 600 }}>Open</span> · {business.closes}
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 9 }}>
        <Pill icon={<Globe size={12} />} label="Website" active={tap === 'website'} />
        <Pill icon={<CornerUpRight size={12} />} label="Directions" />
        <Pill icon={<Phone size={12} />} label="Call" active={tap === 'call'} />
      </div>
    </div>
  </div>
);

export const SearchScreen: React.FC<Props> = ({ variant, query, caret = false, mapIn = 1, rowsIn = [1, 1, 1], focus = 0, tap = null }) => (
  <div style={{ width: '100%', height: '100%', background: '#FFFFFF', display: 'flex', flexDirection: 'column' }}>
    <div style={{ padding: '8px 14px 10px' }}>
      <div
        style={{
          height: 46,
          borderRadius: 999,
          background: '#fff',
          boxShadow: '0 1px 2px rgba(21,34,40,0.08), 0 4px 14px rgba(21,34,40,0.08)',
          border: `1px solid ${colors.lineSoft}`,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '0 16px',
          fontFamily: fonts.ui,
          fontSize: 15.5,
          color: colors.ink,
        }}
      >
        <Search size={17} color={colors.muted} />
        <span style={{ flex: 1, whiteSpace: 'nowrap' }}>
          {query}
          {caret ? <span style={{ display: 'inline-block', width: 1.5, height: 18, background: colors.blue, marginLeft: 1, verticalAlign: 'middle' }} /> : null}
        </span>
        <Mic size={17} color={colors.muted} />
      </div>
      <div style={{ display: 'flex', gap: 18, marginTop: 12, fontFamily: fonts.ui, fontSize: 12.5, fontWeight: 600, color: colors.faint, paddingLeft: 6 }}>
        <span style={{ color: colors.blue, borderBottom: `2px solid ${colors.blue}`, paddingBottom: 4 }}>All</span>
        <span>Maps</span>
        <span>Images</span>
        <span>Reviews</span>
      </div>
    </div>
    <MapStrip variant={variant} p={mapIn} />
    <div style={{ padding: '6px 14px 0' }}>
      {variant === 'missing' ? (
        <>
          <Result name={competitors[0].name} meta={competitors[0].meta} rating={competitors[0].rating} reviews={competitors[0].reviews} p={rowsIn[0] ?? 1} />
          <Result name={competitors[1].name} meta={competitors[1].meta} rating={competitors[1].rating} reviews={competitors[1].reviews} p={rowsIn[1] ?? 1} />
          <MissingKesar p={rowsIn[2] ?? 1} focus={focus} />
        </>
      ) : (
        <>
          <FoundKesar p={rowsIn[0] ?? 1} focus={focus} tap={tap} />
          <Result name={competitors[0].name} meta={competitors[0].meta} rating={competitors[0].rating} reviews={competitors[0].reviews} p={rowsIn[1] ?? 1} />
        </>
      )}
    </div>
    <div style={{ flex: 1 }} />
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, paddingBottom: 26, fontFamily: fonts.ui, fontSize: 11.5, color: colors.faint }}>
      <MapPin size={12} /> Bandra West, Mumbai
    </div>
  </div>
);
