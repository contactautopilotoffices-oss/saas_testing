import React from 'react';
import {
  AtSign,
  BarChart3,
  Globe,
  IndianRupee,
  Link2,
  MapPin,
  Megaphone,
  Search,
  ShoppingBag,
  Users,
} from 'lucide-react';
import { colors, fonts, shadows } from '../styles/tokens';

// The BridgeAux ecosystem: what a business needs to EXIST online (blue, like
// the B in the logo) and to GROW online (green, like the A). Scenes 02 and 06
// use the same arrangement so the idea visibly comes back at the end.

export type EcoGroup = 'exist' | 'grow';

export type EcoItem = {
  key: string;
  label: string;
  group: EcoGroup;
  icon: (size: number) => React.ReactNode;
};

export const ECO_CENTER = { x: 960, y: 520 };

export const ECO_ITEMS: EcoItem[] = [
  { key: 'website', label: 'Website', group: 'exist', icon: (s) => <Globe size={s} /> },
  { key: 'domain', label: 'Domain', group: 'exist', icon: (s) => <Link2 size={s} /> },
  { key: 'email', label: 'Business Email', group: 'exist', icon: (s) => <AtSign size={s} /> },
  { key: 'google', label: 'Google Presence', group: 'exist', icon: (s) => <MapPin size={s} /> },
  { key: 'customers', label: 'Customers', group: 'grow', icon: (s) => <Users size={s} /> },
  { key: 'sales', label: 'Sales', group: 'grow', icon: (s) => <IndianRupee size={s} /> },
  { key: 'marketing', label: 'Marketing', group: 'grow', icon: (s) => <Megaphone size={s} /> },
  { key: 'seo', label: 'SEO', group: 'grow', icon: (s) => <Search size={s} /> },
  { key: 'analytics', label: 'Analytics', group: 'grow', icon: (s) => <BarChart3 size={s} /> },
];

/** Slot positions on an ellipse: "exist" on the left, "grow" on the right. */
export const ecoSlots = (opts: { cx?: number; cy?: number; rx?: number; ry?: number } = {}) => {
  const { cx = ECO_CENTER.x, cy = ECO_CENTER.y, rx = 640, ry = 330 } = opts;
  const left = [220, 193, 167, 140];
  const right = [-40, -20, 0, 20, 40];
  const at = (deg: number) => {
    const r = (deg * Math.PI) / 180;
    return { x: cx + rx * Math.cos(r), y: cy + ry * Math.sin(r) };
  };
  return [...left.map(at), ...right.map(at)];
};

export const groupColor = (g: EcoGroup) => (g === 'exist' ? colors.blue : colors.green);
export const groupSoft = (g: EcoGroup) => (g === 'exist' ? colors.blueSoft : colors.greenSoft);

/** A pill node: tinted icon + label. Centred on (x, y). */
export const EcoNode: React.FC<{
  item: EcoItem;
  x: number;
  y: number;
  appear: number;
  emphasis?: number;
  scale?: number;
}> = ({ item, x, y, appear, emphasis = 0, scale = 1 }) => {
  if (appear <= 0) return null;
  const c = groupColor(item.group);
  const s = scale * (0.9 + 0.1 * appear) * (1 + 0.12 * emphasis);
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        transform: `translate(-50%, -50%) scale(${s})`,
        opacity: appear,
        filter: appear < 1 ? `blur(${(1 - appear) * 5}px)` : undefined,
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '13px 24px 13px 13px',
        borderRadius: 20,
        background: '#FFFFFF',
        boxShadow: emphasis > 0 ? `${shadows.card}, 0 0 0 ${2 * emphasis}px ${c}33` : shadows.card,
        whiteSpace: 'nowrap',
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 13,
          background: groupSoft(item.group),
          color: c,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {item.icon(22)}
      </div>
      <span style={{ fontFamily: fonts.display, fontWeight: 600, fontSize: 22, color: colors.ink, letterSpacing: '-0.01em' }}>
        {item.label}
      </span>
    </div>
  );
};

/** A live ecosystem card for the finale: same icon and colour as the node in scene 02, now with the bakery's data. */
export const EcoCard: React.FC<{
  label: string;
  value: React.ReactNode;
  group: EcoGroup;
  icon: React.ReactNode;
  x: number;
  y: number;
  appear: number;
  glow?: number;
  width?: number;
}> = ({ label, value, group, icon, x, y, appear, glow = 0, width = 300 }) => {
  if (appear <= 0) return null;
  const c = groupColor(group);
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width,
        boxSizing: 'border-box',
        transform: `translate(-50%, -50%) scale(${0.9 + 0.1 * appear})`,
        opacity: appear,
        filter: appear < 1 ? `blur(${(1 - appear) * 5}px)` : undefined,
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '14px 16px',
        borderRadius: 20,
        background: '#FFFFFF',
        boxShadow: glow > 0 ? `${shadows.card}, 0 0 0 ${2 * glow}px ${c}30` : shadows.card,
        fontFamily: fonts.ui,
      }}
    >
      <div style={{ width: 46, height: 46, borderRadius: 14, background: groupSoft(group), color: c, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {icon}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: fonts.display, fontWeight: 600, fontSize: 19, color: colors.ink, letterSpacing: '-0.01em' }}>{label}</div>
        <div style={{ fontSize: 15.5, color: colors.muted, marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</div>
      </div>
    </div>
  );
};
