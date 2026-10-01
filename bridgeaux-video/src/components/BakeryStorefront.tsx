import React from 'react';
import { colors } from '../styles/tokens';

// Street-level view of Kesar Bakehouse on Hill Road, Bandra. Drawn on a
// 1920 x 1080 grid. `frame` drives the small signs of life: lights warming
// up, the OPEN sign swinging, steam from fresh bakes, leaves moving.

type Props = {
  frame: number;
  /** 0..1 interior lights */
  lights?: number;
  width?: number;
  height?: number;
};

const W = 1920;
const H = 1080;

const awningStripes = (x0: number, x1: number, n: number) => {
  const w = (x1 - x0) / n;
  return Array.from({ length: n }, (_, i) => ({ x: x0 + i * w, w, saffron: i % 2 === 0 }));
};

const Leaf: React.FC<{ x: number; y: number; r: number; s: number; c: string }> = ({ x, y, r, s, c }) => (
  <path
    d={`M0 0 C ${6 * s} ${-8 * s} ${18 * s} ${-8 * s} ${24 * s} 0 C ${18 * s} ${8 * s} ${6 * s} ${8 * s} 0 0 Z`}
    fill={c}
    transform={`translate(${x} ${y}) rotate(${r})`}
  />
);

const Bicycle: React.FC<{ x: number; y: number }> = ({ x, y }) => {
  const wheel = (cx: number) => (
    <g>
      <circle cx={cx} cy={0} r={52} fill="none" stroke="#2C3135" strokeWidth={7} />
      <circle cx={cx} cy={0} r={46} fill="none" stroke="#5A6268" strokeWidth={1.5} />
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2;
        return <line key={i} x1={cx} y1={0} x2={cx + Math.cos(a) * 46} y2={Math.sin(a) * 46} stroke="#8A9298" strokeWidth={1} />;
      })}
      <circle cx={cx} cy={0} r={5} fill="#2C3135" />
    </g>
  );
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cx={95} cy={56} rx={150} ry={9} fill="rgba(60,40,20,0.16)" />
      {wheel(0)}
      {wheel(190)}
      {/* frame */}
      <path d="M0 0 L62 -78 L150 -78 L190 0 M62 -78 L95 0 L150 -78 M95 0 L0 0" stroke="#1F5C4B" strokeWidth={7} fill="none" strokeLinejoin="round" strokeLinecap="round" />
      <path d="M62 -78 L52 -98" stroke="#1F5C4B" strokeWidth={7} strokeLinecap="round" />
      <path d="M36 -102 L70 -100" stroke="#2C3135" strokeWidth={9} strokeLinecap="round" />
      <path d="M150 -78 L160 -112 M146 -114 L176 -112" stroke="#2C3135" strokeWidth={6} strokeLinecap="round" />
      {/* front basket with bread */}
      <path d="M168 -104 L232 -104 L224 -66 L176 -66 Z" fill="#B88A55" stroke="#8C6437" strokeWidth={2} />
      {[180, 192, 204, 216].map((bx) => (
        <line key={bx} x1={bx} y1={-102} x2={bx - 2} y2={-68} stroke="#8C6437" strokeWidth={1.4} />
      ))}
      <ellipse cx={196} cy={-110} rx={24} ry={10} fill="#D9963F" />
      <ellipse cx={212} cy={-114} rx={16} ry={8} fill="#E6A956" />
      <path d="M182 -112 l8 -4 M194 -114 l8 -4 M206 -113 l7 -4" stroke="#B5701F" strokeWidth={2} strokeLinecap="round" />
      <circle cx={95} cy={0} r={11} fill="none" stroke="#2C3135" strokeWidth={4} />
    </g>
  );
};

export const BakeryStorefront: React.FC<Props> = ({ frame, lights = 1, width = W, height = H }) => {
  const id = React.useId().replace(/:/g, '');
  const L = Math.min(1, Math.max(0, lights));
  const swing = Math.sin(frame / 14) * 3.2 * Math.exp(-frame / 220) + Math.sin(frame / 23) * 0.8;
  const sway = Math.sin(frame / 40) * 1.2;
  const stripes = awningStripes(470, 1450, 20);

  return (
    <svg width={width} height={height} viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
      <defs>
        <linearGradient id={`${id}-plaster`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#F1E7D7" />
          <stop offset="1" stopColor="#E6D8C2" />
        </linearGradient>
        <linearGradient id={`${id}-left`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#D5E1E1" />
          <stop offset="1" stopColor="#C2D1D1" />
        </linearGradient>
        <linearGradient id={`${id}-right`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#EBCFBE" />
          <stop offset="1" stopColor="#DDBBA6" />
        </linearGradient>
        <linearGradient id={`${id}-interior`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#FFEFD3" />
          <stop offset="0.6" stopColor="#F7D6A2" />
          <stop offset="1" stopColor="#E8B676" />
        </linearGradient>
        <linearGradient id={`${id}-interiorOff`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#8E8A82" />
          <stop offset="1" stopColor="#6F6A62" />
        </linearGradient>
        <linearGradient id={`${id}-frame`} x1="0" x2="1">
          <stop offset="0" stopColor="#2A4539" />
          <stop offset="0.5" stopColor="#35574A" />
          <stop offset="1" stopColor="#284236" />
        </linearGradient>
        <linearGradient id={`${id}-awningShade`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#000" stopOpacity="0.18" />
          <stop offset="0.35" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.08" />
        </linearGradient>
        <linearGradient id={`${id}-underAwning`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#3B2A1F" stopOpacity="0.32" />
          <stop offset="1" stopColor="#3B2A1F" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${id}-glass`} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.0" />
          <stop offset="0.45" stopColor="#FFFFFF" stopOpacity="0.0" />
          <stop offset="0.5" stopColor="#FFFFFF" stopOpacity="0.16" />
          <stop offset="0.6" stopColor="#FFFFFF" stopOpacity="0.0" />
          <stop offset="0.7" stopColor="#FFFFFF" stopOpacity="0.08" />
          <stop offset="0.75" stopColor="#FFFFFF" stopOpacity="0.0" />
        </linearGradient>
        <linearGradient id={`${id}-pavement`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#D8CEBF" />
          <stop offset="1" stopColor="#CBBFAE" />
        </linearGradient>
        <radialGradient id={`${id}-bloom`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#FFD9A0" stopOpacity="0.55" />
          <stop offset="1" stopColor="#FFD9A0" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${id}-bulb`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#FFF6DD" stopOpacity="1" />
          <stop offset="0.35" stopColor="#FFE2A8" stopOpacity="0.8" />
          <stop offset="1" stopColor="#FFD08A" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-sign`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#45332A" />
          <stop offset="1" stopColor="#30231C" />
        </linearGradient>
        <filter id={`${id}-soft`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
        <filter id={`${id}-blurFg`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3.2" />
        </filter>
        <clipPath id={`${id}-window`}>
          <rect x="590" y="500" width="480" height="300" rx="4" />
        </clipPath>
        <clipPath id={`${id}-doorGlass`}>
          <rect x="1138" y="520" width="174" height="270" rx="4" />
        </clipPath>
      </defs>

      {/* ---------------- facades ---------------- */}
      <rect x="0" y="0" width={W} height={H} fill={`url(#${id}-plaster)`} />
      {/* left neighbour */}
      <rect x="0" y="0" width="430" height="880" fill={`url(#${id}-left)`} />
      <rect x="40" y="70" width="140" height="150" rx="4" fill="#9FB6B8" />
      <rect x="50" y="80" width="56" height="130" fill="#B9CDCE" />
      <rect x="114" y="80" width="56" height="130" fill="#B9CDCE" />
      <rect x="250" y="70" width="140" height="150" rx="4" fill="#9FB6B8" />
      <rect x="260" y="80" width="120" height="130" fill="#B9CDCE" />
      {/* rolled shutter shop */}
      <rect x="40" y="420" width="350" height="330" fill="#A9B4B6" />
      {Array.from({ length: 16 }, (_, i) => (
        <line key={i} x1="40" x2="390" y1={430 + i * 20} y2={430 + i * 20} stroke="#97A3A6" strokeWidth="3" />
      ))}
      <rect x="30" y="380" width="370" height="44" rx="4" fill="#5E7F86" />
      <rect x="30" y="748" width="370" height="20" fill="#B9AE9E" />
      {/* right neighbour */}
      <rect x="1490" y="0" width="430" height="880" fill={`url(#${id}-right)`} />
      <rect x="1560" y="60" width="300" height="170" rx="4" fill="#CFA48C" />
      <rect x="1572" y="72" width="134" height="146" fill="#F2E3D6" />
      <rect x="1714" y="72" width="134" height="146" fill="#F2E3D6" />
      <path d="M1556 236 H1864" stroke="#B88E77" strokeWidth="8" />
      <rect x="1540" y="420" width="330" height="320" rx="6" fill="#C79A80" />
      <rect x="1556" y="436" width="298" height="230" rx="4" fill="#E9D6C8" />
      <rect x="1556" y="436" width="298" height="230" rx="4" fill={`url(#${id}-glass)`} />
      <rect x="1540" y="738" width="330" height="22" fill="#B9AE9E" />

      {/* overhead cables */}
      <path d={`M0 30 Q 700 ${110 + sway} 1920 40`} stroke="#3A3530" strokeWidth="2.5" fill="none" opacity="0.55" />
      <path d={`M0 62 Q 900 ${140 + sway * 0.7} 1920 76`} stroke="#3A3530" strokeWidth="2" fill="none" opacity="0.45" />

      {/* upper floor of the bakery building */}
      {[520, 1160].map((wx) => (
        <g key={wx}>
          <rect x={wx} y="38" width="240" height="170" rx="6" fill="#D3C3AA" />
          <rect x={wx + 10} y="48" width="105" height="150" fill="#86A9A3" />
          <rect x={wx + 125} y="48" width="105" height="150" fill="#86A9A3" />
          {[0, 1, 2, 3, 4, 5].map((k) => (
            <g key={k}>
              <line x1={wx + 10} x2={wx + 115} y1={60 + k * 24} y2={60 + k * 24} stroke="#6F938D" strokeWidth="3" />
              <line x1={wx + 125} x2={wx + 230} y1={60 + k * 24} y2={60 + k * 24} stroke="#6F938D" strokeWidth="3" />
            </g>
          ))}
        </g>
      ))}
      {/* balcony */}
      <rect x="470" y="210" width="980" height="16" fill="#D8CAB4" />
      <rect x="470" y="226" width="980" height="10" fill="#C2B39B" />
      {Array.from({ length: 50 }, (_, i) => (
        <line key={i} x1={480 + i * 19.6} x2={480 + i * 19.6} y1="150" y2="210" stroke="#3E3934" strokeWidth="2.4" />
      ))}
      <line x1="470" x2="1450" y1="150" y2="150" stroke="#3E3934" strokeWidth="5" />
      {/* balcony plants */}
      {[600, 860, 1300].map((px, i) => (
        <g key={px} transform={`rotate(${sway * (i % 2 ? 1 : -1)} ${px} 150)`}>
          <rect x={px - 24} y="168" width="48" height="42" rx="6" fill="#B5643A" />
          {[-30, -12, 8, 26, -20, 18].map((a, k) => (
            <Leaf key={k} x={px} y={170} r={-90 + a * 2.2} s={1.5 + (k % 3) * 0.3} c={k % 2 ? '#4F7B4A' : '#5E8C55'} />
          ))}
        </g>
      ))}
      {/* cornice */}
      <rect x="440" y="262" width="1040" height="22" fill="#F5ECDF" />
      <rect x="440" y="284" width="1040" height="8" fill="#CDBDA5" />

      {/* ---------------- signboard ---------------- */}
      <rect x="520" y="300" width="880" height="92" rx="6" fill={`url(#${id}-sign)`} />
      <rect x="530" y="310" width="860" height="72" rx="4" fill="none" stroke="#D9A45E" strokeOpacity="0.45" strokeWidth="1.5" />
      {/* sign lamps */}
      {[680, 1240].map((lx) => (
        <g key={lx}>
          <path d={`M${lx} 300 q 0 -26 26 -26`} stroke="#2E2A26" strokeWidth="4" fill="none" />
          <path d={`M${lx + 14} 272 h 28 l -4 10 h -20 Z`} fill="#2E2A26" />
          <ellipse cx={lx + 28} cy={318} rx={70} ry={22} fill="#FFE2A8" opacity={0.1 * L} filter={`url(#${id}-soft)`} />
        </g>
      ))}
      <g transform="translate(616 316)">
        <circle cx="30" cy="30" r="28" fill={colors.cream} />
        <path d="M30 46 V24" stroke={colors.saffronDeep} strokeWidth="2.6" strokeLinecap="round" />
        <path d="M30 26 C25 22 24 15 28 11 C32 15 33 21 30 26 Z" fill={colors.saffron} />
        <path d="M30 33 C24 32 19.5 27.5 20 22.5 C25 22.8 29 26.5 30 33 Z" fill={colors.saffron} />
        <path d="M30 33 C36 32 40.5 27.5 40 22.5 C35 22.8 31 26.5 30 33 Z" fill={colors.saffron} />
      </g>
      <text x="990" y="356" textAnchor="middle" fontFamily="Fraunces" fontWeight="600" fontSize="54" fill="#FFF3DF" letterSpacing="0.5">
        Kesar Bakehouse
      </text>
      <text x="1290" y="351" textAnchor="middle" fontFamily="Inter" fontWeight="600" fontSize="13" fill="#E3AE68" letterSpacing="3">
        SINCE 2009
      </text>

      {/* ---------------- awning ---------------- */}
      <g>
        {stripes.map((s, i) => (
          <rect key={i} x={s.x} y="392" width={s.w + 0.5} height="70" fill={s.saffron ? colors.saffron : '#FFF1DC'} />
        ))}
        {stripes.map((s, i) => (
          <path
            key={`sc${i}`}
            d={`M${s.x} 462 a ${s.w / 2} ${s.w / 2.2} 0 0 0 ${s.w} 0 Z`}
            fill={s.saffron ? colors.saffron : '#FFF1DC'}
          />
        ))}
        <rect x="470" y="392" width="980" height="94" fill={`url(#${id}-awningShade)`} />
        <rect x="462" y="388" width="996" height="8" rx="3" fill="#7A4A1F" />
      </g>

      {/* ---------------- shopfront ---------------- */}
      <rect x="520" y="486" width="880" height="380" fill={`url(#${id}-frame)`} />
      {/* display window interior */}
      <g clipPath={`url(#${id}-window)`}>
        <rect x="590" y="500" width="480" height="300" fill={`url(#${id}-interiorOff)`} />
        <rect x="590" y="500" width="480" height="300" fill={`url(#${id}-interior)`} opacity={0.35 + 0.65 * L} />
        {/* back shelves with bread */}
        {[575, 640].map((sy) => (
          <g key={sy}>
            <rect x="600" y={sy} width="460" height="8" fill="#B07F4C" />
            {Array.from({ length: 9 }, (_, i) => (
              <ellipse key={i} cx={630 + i * 50} cy={sy - 12} rx="20" ry="12" fill={i % 3 === 0 ? '#D9963F' : i % 3 === 1 ? '#C9822E' : '#E2AA5C'} />
            ))}
          </g>
        ))}
        {/* baker behind the counter */}
        <g opacity={0.5} transform={`translate(${Math.sin(frame / 30) * 10} 0)`}>
          <circle cx="930" cy="672" r="22" fill="#8C6448" />
          <path d="M896 740 q 34 -50 68 0 Z" fill="#F4EDE3" />
          <rect x="902" y="690" width="56" height="60" rx="18" fill="#F4EDE3" />
          <path d="M910 652 q 20 -18 40 0" fill="#FFFFFF" />
        </g>
        {/* pendant lamps */}
        {[700, 960].map((px) => (
          <g key={px}>
            <line x1={px} x2={px} y1="500" y2="528" stroke="#3A3028" strokeWidth="2" />
            <path d={`M${px - 20} 544 q 20 -22 40 0 Z`} fill="#3A3028" />
            <circle cx={px} cy="548" r={40} fill={`url(#${id}-bulb)`} opacity={L} />
            <circle cx={px} cy="546" r="5" fill="#FFF6DD" opacity={0.4 + 0.6 * L} />
          </g>
        ))}
        {/* glass display counter with cakes */}
        <rect x="600" y="716" width="460" height="84" fill="#F6E5CC" />
        <rect x="600" y="712" width="460" height="6" fill="#C9965D" />
        {/* tiered stands and cakes */}
        <g>
          <rect x="650" y="676" width="84" height="36" rx="8" fill="#5A3426" />
          <ellipse cx="692" cy="676" rx="42" ry="9" fill="#6B3F2C" />
          {[672, 690, 708].map((cx) => (
            <circle key={cx} cx={cx} cy="671" r="5" fill="#B7283E" />
          ))}
          <rect x="770" y="682" width="80" height="30" rx="6" fill="#FFF4DE" />
          <rect x="770" y="676" width="80" height="10" rx="5" fill="#F2A93B" />
          <rect x="880" y="684" width="70" height="28" rx="6" fill="#F6E9D6" />
          <rect x="880" y="678" width="70" height="9" rx="4.5" fill="#B9CB8E" />
          <rect x="975" y="680" width="68" height="32" rx="8" fill="#F7DDE3" />
          <ellipse cx="1009" cy="680" rx="34" ry="7" fill="#FBE9EC" />
        </g>
        {/* steam from fresh bakes */}
        {[660, 720, 1010].map((sx, i) => {
          const t = (frame + i * 23) % 90;
          const o = Math.sin((t / 90) * Math.PI) * 0.35 * L;
          return (
            <path
              key={sx}
              d={`M${sx} ${640 - t * 0.6} q 10 -14 0 -28 q -10 -14 0 -28`}
              stroke="#FFFFFF"
              strokeWidth="5"
              strokeLinecap="round"
              fill="none"
              opacity={o}
              filter={`url(#${id}-soft)`}
            />
          );
        })}
        {/* counter glass front */}
        <rect x="600" y="718" width="460" height="82" fill="#FFFFFF" opacity="0.18" />
        {/* window lettering */}
        <text x="830" y="772" textAnchor="middle" fontFamily="Fraunces" fontStyle="italic" fontWeight="500" fontSize="30" fill="#B97A33" opacity="0.85">
          fresh every morning
        </text>
        {/* reflections */}
        <rect x="590" y="500" width="480" height="300" fill={`url(#${id}-glass)`} />
      </g>
      <rect x="586" y="496" width="488" height="308" rx="6" fill="none" stroke="#223A30" strokeWidth="8" />
      <line x1="830" x2="830" y1="500" y2="800" stroke="#223A30" strokeWidth="5" />

      {/* door */}
      <rect x="1120" y="500" width="210" height="366" rx="4" fill="#2C4A3D" />
      <g clipPath={`url(#${id}-doorGlass)`}>
        <rect x="1138" y="520" width="174" height="270" fill={`url(#${id}-interiorOff)`} />
        <rect x="1138" y="520" width="174" height="270" fill={`url(#${id}-interior)`} opacity={0.35 + 0.65 * L} />
        <rect x="1150" y="640" width="150" height="8" fill="#B07F4C" />
        {[1170, 1210, 1250, 1290].map((jx) => (
          <rect key={jx} x={jx - 12} y="612" width="24" height="28" rx="4" fill="#E2B57A" opacity="0.8" />
        ))}
        <g opacity={0.55} transform={`translate(${Math.sin(frame / 45) * 4} 0)`}>
          <circle cx="1214" cy="690" r="20" fill="#3E2C24" />
          <path d="M1178 800 q 0 -78 36 -86 q 36 8 36 86 Z" fill="#2F6F8F" />
          <path d="M1196 716 q 18 10 36 0" stroke="#264F66" strokeWidth="3" fill="none" />
        </g>
        <rect x="1138" y="520" width="174" height="270" fill={`url(#${id}-glass)`} />
      </g>
      <rect x="1134" y="516" width="182" height="278" rx="5" fill="none" stroke="#223A30" strokeWidth="6" />
      <rect x="1290" y="660" width="10" height="70" rx="5" fill="#C9A25E" />
      <rect x="1124" y="806" width="202" height="54" fill="#22392F" />
      {/* OPEN sign */}
      <g transform={`rotate(${swing} 1225 540)`}>
        <line x1="1196" y1="540" x2="1206" y2="566" stroke="#5B4A3A" strokeWidth="1.6" />
        <line x1="1254" y1="540" x2="1244" y2="566" stroke="#5B4A3A" strokeWidth="1.6" />
        <circle cx="1225" cy="540" r="3" fill="#5B4A3A" />
        <rect x="1180" y="566" width="90" height="38" rx="8" fill={colors.saffron} />
        <text x="1225" y="592" textAnchor="middle" fontFamily="Inter" fontWeight="700" fontSize="18" fill="#FFF6E8" letterSpacing="3">
          OPEN
        </text>
      </g>

      {/* window bloom */}
      <ellipse cx="830" cy="650" rx="360" ry="220" fill={`url(#${id}-bloom)`} opacity={0.55 * L} />
      {/* shade under awning */}
      <rect x="520" y="486" width="880" height="70" fill={`url(#${id}-underAwning)`} />

      {/* plinth */}
      <rect x="520" y="804" width="600" height="62" fill="#CDBFAA" />
      <rect x="520" y="804" width="600" height="6" fill="#BBAA92" />
      <rect x="500" y="862" width="920" height="14" fill="#C6B8A3" />

      {/* ---------------- street level ---------------- */}
      <rect x="0" y="876" width={W} height={H - 876} fill={`url(#${id}-pavement)`} />
      {[910, 960, 1030].map((y) => (
        <line key={y} x1="0" x2={W} y1={y} y2={y} stroke="#BDB09D" strokeWidth="2" opacity="0.7" />
      ))}
      {Array.from({ length: 21 }, (_, i) => {
        const xb = -400 + i * 136;
        const xt = 960 + (xb - 960) * 0.45;
        return <line key={i} x1={xt} y1="876" x2={xb} y2={H} stroke="#BDB09D" strokeWidth="2" opacity="0.55" />;
      })}
      <rect x="0" y="872" width={W} height="10" fill="#B8AA95" />
      {/* soft shadow of the awning on the pavement */}
      <ellipse cx="960" cy="905" rx="560" ry="26" fill="rgba(60,40,20,0.12)" filter={`url(#${id}-soft)`} />

      {/* potted palm by the window */}
      <g transform={`rotate(${sway * 0.8} 470 880)`}>
        {Array.from({ length: 9 }, (_, i) => {
          const a = -150 + i * 15;
          return (
            <path
              key={i}
              d={`M470 790 q ${Math.cos((a * Math.PI) / 180) * 60} ${Math.sin((a * Math.PI) / 180) * 120 - 30} ${Math.cos((a * Math.PI) / 180) * 120} ${Math.sin((a * Math.PI) / 180) * 150}`}
              stroke={i % 2 ? '#4E7B48' : '#5F8F57'}
              strokeWidth="9"
              strokeLinecap="round"
              fill="none"
            />
          );
        })}
      </g>
      <path d="M430 790 L510 790 L500 880 L440 880 Z" fill="#B5643A" />
      <rect x="424" y="782" width="92" height="14" rx="4" fill="#C8754A" />

      {/* chalkboard */}
      <g transform="translate(1438 700)">
        <path d="M10 196 L40 0 L150 0 L180 196" stroke="#8C6437" strokeWidth="9" fill="none" strokeLinecap="round" />
        <rect x="34" y="12" width="122" height="150" rx="6" fill="#2F3532" stroke="#8C6437" strokeWidth="6" />
        <text x="95" y="48" textAnchor="middle" fontFamily="Fraunces" fontStyle="italic" fontWeight="500" fontSize="17" fill="#F4EFE6">
          Today
        </text>
        <line x1="62" x2="128" y1="58" y2="58" stroke="#F4EFE6" strokeOpacity="0.5" strokeWidth="1.5" />
        <text x="95" y="86" textAnchor="middle" fontFamily="Fraunces" fontWeight="500" fontSize="14" fill="#F4EFE6">
          Mango
        </text>
        <text x="95" y="104" textAnchor="middle" fontFamily="Fraunces" fontWeight="500" fontSize="14" fill="#F4EFE6">
          cheesecake
        </text>
        <text x="95" y="134" textAnchor="middle" fontFamily="Fraunces" fontStyle="italic" fontWeight="500" fontSize="13" fill="#F2B865">
          fresh at 8
        </text>
      </g>

      <Bicycle x={150} y={846} />

      {/* foreground gulmohar branch, slightly out of focus */}
      <g filter={`url(#${id}-blurFg)`} transform={`rotate(${sway * 1.4} 1920 0)`}>
        <path d="M1940 -20 C 1820 40 1720 70 1600 160" stroke="#4A3A2E" strokeWidth="14" fill="none" strokeLinecap="round" />
        <path d="M1760 70 C 1720 120 1700 160 1690 220" stroke="#4A3A2E" strokeWidth="8" fill="none" strokeLinecap="round" />
        {Array.from({ length: 26 }, (_, i) => {
          const t = i / 25;
          const x = 1930 - t * 330 + (i % 3) * 16;
          const y = -10 + t * 170 + ((i * 37) % 40) - 10;
          return <Leaf key={i} x={x} y={y} r={110 + ((i * 47) % 70)} s={1.6} c={i % 2 ? '#3F6E3A' : '#517F47'} />;
        })}
        {[
          [1700, 120],
          [1660, 175],
          [1790, 60],
          [1840, 95],
          [1620, 150],
        ].map(([fx, fy], i) => (
          <g key={i}>
            {[0, 72, 144, 216, 288].map((a) => (
              <ellipse key={a} cx={fx} cy={fy - 9} rx="6" ry="10" fill={i % 2 ? '#E5532D' : '#F06A35'} transform={`rotate(${a} ${fx} ${fy})`} />
            ))}
          </g>
        ))}
      </g>
    </svg>
  );
};
