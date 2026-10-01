import React from 'react';
import { AtSign, CircleCheck, FileText, Globe, Inbox, Link2, MapPin, Smartphone } from 'lucide-react';
import { business } from '../data/business';
import { colors, fonts, radii, shadows } from '../styles/tokens';

// The digital foundation BridgeAux sets up, as a sequenced checklist.

export type FoundationItem = { key: string; icon: React.ReactNode; title: string; detail: string; done: string };

export const FOUNDATION: FoundationItem[] = [
  { key: 'website', icon: <Globe size={22} />, title: 'Website', detail: business.domain, done: 'Built' },
  { key: 'domain', icon: <Link2 size={22} />, title: 'Domain', detail: `${business.domain} · registered to you`, done: 'Yours' },
  { key: 'email', icon: <AtSign size={22} />, title: 'Business email', detail: business.email, done: 'Ready' },
  { key: 'google', icon: <MapPin size={22} />, title: 'Google Business Profile', detail: `Bakery in ${business.area}`, done: 'Listed' },
  { key: 'content', icon: <FileText size={22} />, title: 'Pages and content', detail: 'Home · Menu · Custom cakes · Contact', done: 'Written' },
  { key: 'mobile', icon: <Smartphone size={22} />, title: 'Mobile experience', detail: 'Fast on every phone', done: 'Optimised' },
];

export const ROW_H = 92;

/** One row. `appear` 0..1, `state` pending -> working -> done. */
export const FoundationRow: React.FC<{
  item: FoundationItem;
  appear: number;
  working: number;
  done: number;
  spin: number;
  width: number;
}> = ({ item, appear, working, done, spin, width }) => {
  if (appear <= 0) return null;
  return (
    <div
      style={{
        width,
        height: ROW_H,
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center',
        gap: 18,
        padding: '0 22px 0 18px',
        borderRadius: radii.lg,
        background: '#FFFFFF',
        boxShadow: done > 0 ? `${shadows.card}, 0 0 0 ${1.5 * done}px rgba(4,137,77,0.18)` : shadows.card,
        opacity: appear,
        transform: `translateX(${(1 - appear) * 30}px)`,
        fontFamily: fonts.ui,
      }}
    >
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: 15,
          background: done > 0.5 ? colors.greenSoft : colors.blueSoft,
          color: done > 0.5 ? colors.green : colors.blue,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {item.icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: fonts.display, fontWeight: 600, fontSize: 23, color: colors.ink, letterSpacing: '-0.015em' }}>{item.title}</div>
        <div style={{ fontSize: 17, color: colors.muted, marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.detail}</div>
      </div>
      <div style={{ width: 132, display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
        {done > 0 ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              padding: '8px 13px',
              borderRadius: 999,
              background: colors.greenSoft,
              color: colors.green,
              fontWeight: 700,
              fontSize: 15,
              opacity: done,
              transform: `scale(${0.8 + 0.2 * done})`,
            }}
          >
            <CircleCheck size={17} /> {item.done}
          </div>
        ) : (
          <svg width={30} height={30} viewBox="0 0 30 30" style={{ opacity: 0.4 + 0.6 * working }}>
            <circle cx="15" cy="15" r="11" fill="none" stroke={colors.line} strokeWidth="3" />
            {working > 0 ? (
              <circle
                cx="15"
                cy="15"
                r="11"
                fill="none"
                stroke={colors.blue}
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray="22 60"
                transform={`rotate(${spin} 15 15)`}
              />
            ) : null}
          </svg>
        )}
      </div>
    </div>
  );
};

/** The new business inbox. */
export const EmailCard: React.FC<{ width: number; rowsIn?: number[] }> = ({ width, rowsIn = [1, 1] }) => {
  const mails = [
    { from: 'BridgeAux', subject: `${business.domain} is live`, time: '9:02' },
    { from: 'Meera Iyer', subject: 'Office order, 40 pastries for Friday', time: '9:14' },
  ];
  return (
    <div style={{ width, background: '#fff', borderRadius: 20, boxShadow: shadows.raised, overflow: 'hidden', fontFamily: fonts.ui }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 18px', borderBottom: `1px solid ${colors.lineSoft}` }}>
        <div style={{ width: 36, height: 36, borderRadius: 11, background: colors.blueSoft, color: colors.blue, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Inbox size={19} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, color: colors.faint, fontWeight: 600, letterSpacing: '0.06em' }}>BUSINESS EMAIL</div>
          <div style={{ fontSize: 17, fontWeight: 600, color: colors.ink, marginTop: 2 }}>{business.email}</div>
        </div>
      </div>
      {mails.map((m, i) => (
        <div
          key={m.subject}
          style={{
            display: 'flex',
            gap: 12,
            alignItems: 'center',
            padding: '13px 18px',
            borderBottom: i === 0 ? `1px solid ${colors.lineSoft}` : 'none',
            opacity: rowsIn[i] ?? 1,
          }}
        >
          <div style={{ width: 8, height: 8, borderRadius: 9, background: colors.blue, flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14.5, fontWeight: 600, color: colors.ink }}>{m.from}</div>
            <div style={{ fontSize: 14, color: colors.muted, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.subject}</div>
          </div>
          <span style={{ fontSize: 12.5, color: colors.faint }}>{m.time}</span>
        </div>
      ))}
    </div>
  );
};
