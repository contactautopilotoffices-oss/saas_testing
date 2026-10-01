import React from 'react';
import { colors, fonts, shadows } from '../styles/tokens';

/** A customer activity notification, as it arrives at BridgeAux. */
export const CustomerAction: React.FC<{
  icon: React.ReactNode;
  title: string;
  detail: string;
  accent?: 'blue' | 'green';
  width?: number;
  style?: React.CSSProperties;
}> = ({ icon, title, detail, accent = 'blue', width = 470, style }) => {
  const c = accent === 'blue' ? colors.blue : colors.green;
  const soft = accent === 'blue' ? colors.blueSoft : colors.greenSoft;
  return (
    <div
      style={{
        width,
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '16px 20px 16px 16px',
        borderRadius: 20,
        background: '#FFFFFF',
        boxShadow: shadows.raised,
        fontFamily: fonts.ui,
        ...style,
      }}
    >
      <div style={{ width: 48, height: 48, borderRadius: 14, background: soft, color: c, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 19, color: colors.ink }}>{title}</div>
        <div style={{ fontSize: 16, color: colors.muted, marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{detail}</div>
      </div>
      <span style={{ fontSize: 13.5, color: colors.faint, fontWeight: 500 }}>now</span>
    </div>
  );
};
