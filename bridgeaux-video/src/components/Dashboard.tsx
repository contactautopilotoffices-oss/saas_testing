import React from 'react';
import {
  BarChart3,
  Box,
  CircleCheck,
  Eye,
  Globe,
  HeartPulse,
  Home,
  IndianRupee,
  Inbox,
  LayoutGrid,
  Mail,
  MapPin,
  Megaphone,
  MessageSquare,
  Search,
  Settings,
  ShoppingBag,
  Store,
  Target,
  Users,
} from 'lucide-react';
import { business, customerActivity, formatINR } from '../data/business';
import { colors, fonts, radii } from '../styles/tokens';
import { BridgeAuxLogo } from './BridgeAuxLogo';
import { KesarMark } from './KesarLogo';
import { MetricCard } from './MetricCard';

// The BridgeAux owner dashboard for Kesar Bakehouse. Navigation labels mirror
// the real BridgeAux dashboard. Internal canvas: 1600 x 900.

export const DASH_W = 1600;
export const DASH_H = 900;

export type DashboardState = {
  visits: number;
  enquiries: number;
  orders: number;
  revenue: number;
  /** 0..1 sparkline draw */
  spark?: number;
  /** 0..1: the new enquiry from scene 05 slides into the list */
  newEnquiry?: number;
  /** owner reply interaction for the new enquiry */
  reply?: 'new' | 'pressed' | 'replied';
  /** 0..1 highlight pulse on the enquiries panel */
  enquiriesGlow?: number;
  activeNav?: string;
};

const NAV: { label: string; icon: React.ReactNode; group?: string }[] = [
  { label: 'Home', icon: <Home size={18} /> },
  { label: 'My Business', icon: <Store size={18} /> },
  { label: 'Products', icon: <Box size={18} /> },
  { label: 'Customers', icon: <Users size={18} /> },
  { label: 'Enquiries', icon: <Inbox size={18} /> },
  { label: 'Website leads', icon: <LayoutGrid size={18} /> },
  { label: 'Orders', icon: <ShoppingBag size={18} /> },
  { label: 'Marketing', icon: <Megaphone size={18} />, group: 'GROW' },
  { label: 'Analytics', icon: <BarChart3 size={18} /> },
  { label: 'Business Health', icon: <HeartPulse size={18} /> },
  { label: 'Settings', icon: <Settings size={18} />, group: 'ACCOUNT' },
];

const Panel: React.FC<{ title: string; right?: React.ReactNode; children: React.ReactNode; style?: React.CSSProperties }> = ({
  title,
  right,
  children,
  style,
}) => (
  <div
    style={{
      background: '#FFFFFF',
      borderRadius: radii.lg,
      border: `1px solid ${colors.lineSoft}`,
      padding: '20px 22px',
      boxShadow: '0 1px 2px rgba(21,34,40,0.04)',
      ...style,
    }}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
      <span style={{ fontFamily: fonts.display, fontWeight: 600, fontSize: 18, color: colors.ink, letterSpacing: '-0.01em' }}>{title}</span>
      {right}
    </div>
    {children}
  </div>
);

const Chip: React.FC<{ tone: 'new' | 'replied' | 'resolved' | 'live'; children: React.ReactNode }> = ({ tone, children }) => {
  const map = {
    new: { bg: colors.blueSoft, fg: colors.blue },
    replied: { bg: colors.greenSoft, fg: colors.green },
    resolved: { bg: '#EEF1F4', fg: colors.muted },
    live: { bg: colors.greenSoft, fg: colors.green },
  }[tone];
  return (
    <span
      style={{
        fontFamily: fonts.ui,
        fontWeight: 700,
        fontSize: 11.5,
        letterSpacing: '0.06em',
        padding: '5px 9px',
        borderRadius: 999,
        background: map.bg,
        color: map.fg,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
      }}
    >
      {tone === 'live' ? <span style={{ width: 6, height: 6, borderRadius: 9, background: colors.live }} /> : null}
      {children}
    </span>
  );
};

const enquiries = [
  { who: 'Rahul Desai', text: customerActivity.message.text, via: 'WhatsApp', tone: 'replied' as const, label: 'REPLIED' },
  { who: 'Meera Iyer', text: 'Office order, 40 pastries for Friday', via: 'Google listing', tone: 'replied' as const, label: 'REPLIED' },
  { who: 'Kabir Rao', text: 'Is the mango cheesecake available today?', via: 'Website', tone: 'resolved' as const, label: 'RESOLVED' },
  { who: 'Sana Khan', text: 'Do you deliver to Khar West?', via: 'Google listing', tone: 'replied' as const, label: 'REPLIED' },
  { who: 'Dev Malhotra', text: 'Can I pre-order 12 croissants for Sunday?', via: 'Website', tone: 'resolved' as const, label: 'RESOLVED' },
];

const Avatar: React.FC<{ name: string; tint: string }> = ({ name, tint }) => (
  <div
    style={{
      width: 36,
      height: 36,
      borderRadius: 99,
      background: tint,
      color: colors.ink,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: fonts.ui,
      fontWeight: 600,
      fontSize: 13,
      flexShrink: 0,
    }}
  >
    {name
      .split(' ')
      .map((p) => p[0])
      .join('')}
  </div>
);

const EnquiryRow: React.FC<{
  who: string;
  text: string;
  via: string;
  chip: React.ReactNode;
  action?: React.ReactNode;
  tint: string;
  style?: React.CSSProperties;
}> = ({ who, text, via, chip, action, tint, style }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      padding: '13px 4px',
      borderTop: `1px solid ${colors.lineSoft}`,
      ...style,
    }}
  >
    <Avatar name={who} tint={tint} />
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontFamily: fonts.ui, fontWeight: 600, fontSize: 15, color: colors.ink }}>{who}</span>
        <span style={{ fontFamily: fonts.ui, fontSize: 13, color: colors.faint }}>via {via}</span>
      </div>
      <div style={{ fontFamily: fonts.ui, fontSize: 14, color: colors.muted, marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {text}
      </div>
    </div>
    {chip}
    {action}
  </div>
);

export const Dashboard: React.FC<{ state: DashboardState }> = ({ state }) => {
  const { visits, enquiries: enq, orders, revenue, spark = 1, newEnquiry = 1, reply = 'replied', enquiriesGlow = 0, activeNav = 'Home' } = state;
  const ne = Math.min(1, Math.max(0, newEnquiry));
  return (
    <div style={{ width: DASH_W, height: DASH_H, display: 'flex', background: '#F8FAFC', fontFamily: fonts.ui }}>
      {/* sidebar */}
      <div style={{ width: 252, borderRight: `1px solid ${colors.lineSoft}`, background: '#FFFFFF', padding: '22px 16px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '0 8px' }}>
          <BridgeAuxLogo height={30} showWordmark />
        </div>
        <div
          style={{
            marginTop: 22,
            padding: '12px 12px',
            borderRadius: 14,
            background: colors.paper,
            border: `1px solid ${colors.lineSoft}`,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <KesarMark size={34} />
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, color: colors.ink }}>{business.name}</div>
            <div style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>Bakery · {business.area}</div>
          </div>
        </div>
        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {NAV.map((n) => {
            const active = n.label === activeNav;
            return (
              <React.Fragment key={n.label}>
                {n.group ? (
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: colors.faint, padding: '14px 12px 6px' }}>{n.group}</div>
                ) : null}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '9px 12px',
                    borderRadius: 10,
                    background: active ? colors.blueSoft : 'transparent',
                    color: active ? colors.blue : colors.inkSoft,
                    fontWeight: active ? 600 : 500,
                    fontSize: 14.5,
                  }}
                >
                  {n.icon}
                  <span style={{ flex: 1 }}>{n.label}</span>
                  {n.label === 'Enquiries' ? (
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: '#fff', background: colors.blue, borderRadius: 99, padding: '2px 7px', opacity: reply === 'replied' ? 0 : ne }}>
                      1
                    </span>
                  ) : null}
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* main */}
      <div style={{ flex: 1, padding: '28px 34px', display: 'flex', flexDirection: 'column', gap: 22 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontFamily: fonts.display, fontWeight: 600, fontSize: 30, color: colors.ink, letterSpacing: '-0.02em' }}>Good morning</div>
            <div style={{ fontSize: 15.5, color: colors.muted, marginTop: 6 }}>Here is how {business.name} is doing this month.</div>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 16px',
                borderRadius: 999,
                border: `1px solid ${colors.line}`,
                background: '#fff',
                fontWeight: 600,
                fontSize: 14,
                color: colors.ink,
              }}
            >
              <Eye size={16} /> View website
            </div>
            <Chip tone="live">LIVE</Chip>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 18 }}>
          <MetricCard label="Website visits" value={visits.toLocaleString('en-IN')} delta="+18% vs last month" icon={<Globe size={17} />} spark={[0.2, 0.32, 0.28, 0.45, 0.42, 0.6, 0.72, 0.9]} sparkDraw={spark} />
          <MetricCard label="Enquiries" value={enq.toLocaleString('en-IN')} delta="+12 this week" icon={<MessageSquare size={17} />} spark={[0.3, 0.25, 0.4, 0.38, 0.55, 0.5, 0.7, 0.8]} sparkDraw={spark} />
          <MetricCard label="Orders" value={orders.toLocaleString('en-IN')} delta="+9 this week" icon={<ShoppingBag size={17} />} accent="green" spark={[0.15, 0.3, 0.35, 0.3, 0.5, 0.62, 0.6, 0.85]} sparkDraw={spark} />
          <MetricCard label="Revenue" value={formatINR(revenue)} delta="+22% vs last month" icon={<IndianRupee size={17} />} accent="green" spark={[0.2, 0.28, 0.4, 0.36, 0.52, 0.58, 0.75, 0.88]} sparkDraw={spark} />
        </div>

        <div style={{ display: 'flex', gap: 18, flex: 1 }}>
          <Panel
            title="Enquiries"
            right={<span style={{ fontSize: 14, color: colors.blue, fontWeight: 600 }}>View all</span>}
            style={{
              flex: 1.55,
              boxShadow: enquiriesGlow > 0 ? `0 0 0 ${3 * enquiriesGlow}px rgba(2,116,239,0.18), 0 12px 32px rgba(2,116,239,${0.12 * enquiriesGlow})` : '0 1px 2px rgba(21,34,40,0.04)',
            }}
          >
            <div style={{ height: 76 * ne, overflow: 'hidden', opacity: ne }}>
              <EnquiryRow
                who={customerActivity.enquiry.who}
                text={customerActivity.enquiry.text}
                via="Website"
                tint="#FCE3C8"
                style={{ borderTop: 'none', background: reply === 'replied' ? 'transparent' : 'rgba(2,116,239,0.035)', borderRadius: 12, padding: '13px 10px' }}
                chip={reply === 'replied' ? <Chip tone="replied">REPLIED</Chip> : <Chip tone="new">NEW</Chip>}
                action={
                  reply === 'replied' ? (
                    <CircleCheck size={22} color={colors.green} />
                  ) : (
                    <div
                      style={{
                        padding: '8px 16px',
                        borderRadius: 999,
                        background: colors.blue,
                        color: '#fff',
                        fontWeight: 600,
                        fontSize: 14,
                        transform: reply === 'pressed' ? 'scale(0.94)' : 'scale(1)',
                        boxShadow: reply === 'pressed' ? '0 0 0 5px rgba(2,116,239,0.2)' : '0 6px 14px rgba(2,116,239,0.25)',
                      }}
                    >
                      Reply
                    </div>
                  )
                }
              />
            </div>
            {enquiries.map((e, i) => (
              <EnquiryRow
                key={e.who}
                who={e.who}
                text={e.text}
                via={e.via}
                tint={['#DCEBFD', '#E3F1E8', '#EFE7DE', '#F3E3EC', '#E6ECF6'][i]}
                chip={<Chip tone={e.tone}>{e.label}</Chip>}
              />
            ))}
          </Panel>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 18 }}>
            <Panel title="Your business online">
              {[
                { icon: <Globe size={16} />, label: 'Website', detail: business.domain },
                { icon: <Mail size={16} />, label: 'Business email', detail: business.email },
                { icon: <MapPin size={16} />, label: 'Google listing', detail: `${business.rating} ★ · ${business.reviews} reviews` },
              ].map((r) => (
                <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 0', borderTop: `1px solid ${colors.lineSoft}` }}>
                  <div style={{ color: colors.blue }}>{r.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14.5, color: colors.ink }}>{r.label}</div>
                    <div style={{ fontSize: 13, color: colors.muted, marginTop: 1 }}>{r.detail}</div>
                  </div>
                  <Chip tone="live">LIVE</Chip>
                </div>
              ))}
            </Panel>
            <Panel title="Grow" style={{ flex: 1 }}>
              {[
                { icon: <Search size={16} />, label: 'SEO', detail: 'Found for "bakery in Bandra"' },
                { icon: <Megaphone size={16} />, label: 'Marketing', detail: '12 posts scheduled this month' },
                { icon: <Target size={16} />, label: 'Ads', detail: 'Local campaign · 3 km radius' },
                { icon: <BarChart3 size={16} />, label: 'Analytics', detail: '38% of visits come from Google' },
              ].map((r) => (
                <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 0', borderTop: `1px solid ${colors.lineSoft}` }}>
                  <div style={{ width: 30, height: 30, borderRadius: 9, background: colors.greenSoft, color: colors.green, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {r.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14.5, color: colors.ink }}>{r.label}</div>
                    <div style={{ fontSize: 13, color: colors.muted, marginTop: 1 }}>{r.detail}</div>
                  </div>
                </div>
              ))}
            </Panel>
          </div>
        </div>
      </div>
    </div>
  );
};
