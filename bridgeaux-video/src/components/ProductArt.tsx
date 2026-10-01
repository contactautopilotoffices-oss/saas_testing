import React from 'react';
import { ProductKind } from '../data/business';

// Refined product illustrations for Kesar Bakehouse, used on the website,
// the Google listing and the storefront window. Drawn on a 200x200 grid.

const backgrounds: Record<ProductKind, [string, string]> = {
  chocolate: ['#F6E2D3', '#EFD2BE'],
  cheesecake: ['#FCEFD2', '#F6E0B0'],
  pastry: ['#E9F0DF', '#DCE7CC'],
  croissant: ['#FBEEDD', '#F3DDC0'],
};

const Plate: React.FC<{ y?: number; rx?: number }> = ({ y = 158, rx = 70 }) => (
  <g>
    <ellipse cx="100" cy={y + 4} rx={rx + 4} ry="13" fill="rgba(80,50,30,0.12)" />
    <ellipse cx="100" cy={y} rx={rx} ry="12" fill="#FFFFFF" />
    <ellipse cx="100" cy={y - 1.5} rx={rx - 10} ry="8" fill="#F4F1EC" />
  </g>
);

const Chocolate: React.FC<{ id: string }> = ({ id }) => (
  <g>
    <defs>
      <linearGradient id={`${id}-cake`} x1="0" x2="1">
        <stop offset="0" stopColor="#4A2C20" />
        <stop offset="0.55" stopColor="#6B3F2C" />
        <stop offset="1" stopColor="#3D241A" />
      </linearGradient>
      <linearGradient id={`${id}-top`} x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" stopColor="#7A4A35" />
        <stop offset="1" stopColor="#5A3426" />
      </linearGradient>
    </defs>
    <Plate y={150} rx={72} />
    <path d="M42 92 V140 Q100 160 158 140 V92 Z" fill={`url(#${id}-cake)`} />
    {/* cream layers */}
    <path d="M42 108 Q100 126 158 108" stroke="#E9CDB7" strokeWidth="3.5" fill="none" opacity="0.9" />
    <path d="M42 124 Q100 142 158 124" stroke="#E9CDB7" strokeWidth="3.5" fill="none" opacity="0.9" />
    <ellipse cx="100" cy="92" rx="58" ry="16" fill={`url(#${id}-top)`} />
    {/* ganache drips */}
    <path d="M44 94 Q48 108 52 98 Q56 112 62 100 Q68 116 74 103 Q80 112 86 105 Q94 118 100 106 Q108 116 114 104 Q120 113 126 102 Q132 114 138 100 Q144 109 150 97 Q154 104 156 94 Q120 112 44 94 Z" fill="#5A3426" />
    {/* berries */}
    {[
      [78, 86],
      [96, 82],
      [114, 86],
      [104, 92],
      [88, 93],
    ].map(([cx, cy], i) => (
      <g key={i}>
        <circle cx={cx} cy={cy} r="6.5" fill="#B7283E" />
        <circle cx={cx - 2} cy={cy - 2} r="1.8" fill="#FFFFFF" opacity="0.6" />
      </g>
    ))}
    <path d="M100 76 q4 -8 10 -9" stroke="#6E8F4E" strokeWidth="2.2" fill="none" strokeLinecap="round" />
    <ellipse cx="72" cy="88" rx="16" ry="3" fill="#FFFFFF" opacity="0.12" />
  </g>
);

const Cheesecake: React.FC<{ id: string }> = ({ id }) => (
  <g>
    <defs>
      <linearGradient id={`${id}-body`} x1="0" x2="1">
        <stop offset="0" stopColor="#FFF4DE" />
        <stop offset="1" stopColor="#F3DFB8" />
      </linearGradient>
      <linearGradient id={`${id}-mango`} x1="0" x2="1">
        <stop offset="0" stopColor="#F7B23B" />
        <stop offset="1" stopColor="#E8901E" />
      </linearGradient>
    </defs>
    <Plate y={152} rx={74} />
    {/* side face */}
    <path d="M40 118 L132 146 L162 108 L70 86 Z" fill="#F0D9AF" />
    <path d="M40 118 L132 146 L132 120 L40 96 Z" fill={`url(#${id}-body)`} />
    <path d="M40 118 L132 146 L132 136 L40 109 Z" fill="#C88D55" />
    <path d="M132 146 L162 108 L162 98 L132 136 Z" fill="#B97C46" />
    <path d="M132 136 L162 98 L162 84 L132 120 Z" fill="#EAD2A6" />
    {/* mango glaze top */}
    <path d="M40 96 L132 120 L162 84 L70 64 Z" fill={`url(#${id}-mango)`} />
    <path d="M40 96 Q44 104 50 99 Q56 106 62 101 Q70 108 78 104 Q88 112 96 108 Q106 116 114 112 Q124 120 132 120 Z" fill="#E8901E" />
    {/* mango cubes + mint */}
    <rect x="92" y="78" width="13" height="11" rx="2.5" fill="#FFC24D" transform="rotate(-12 98 83)" />
    <rect x="108" y="84" width="11" height="10" rx="2.5" fill="#F9B03A" transform="rotate(8 113 89)" />
    <path d="M118 74 q8 -6 14 -2 q-6 6 -14 2 Z" fill="#6E9A4E" />
    <ellipse cx="80" cy="80" rx="18" ry="3" fill="#FFFFFF" opacity="0.25" transform="rotate(14 80 80)" />
  </g>
);

const Pastry: React.FC<{ id: string }> = ({ id }) => (
  <g>
    <defs>
      <linearGradient id={`${id}-pista`} x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" stopColor="#B9CB8E" />
        <stop offset="1" stopColor="#9DB474" />
      </linearGradient>
    </defs>
    <Plate y={150} rx={70} />
    <path d="M50 102 L150 102 L150 140 Q100 150 50 140 Z" fill="#F6E9D6" />
    <path d="M50 114 L150 114" stroke="#E5C9A5" strokeWidth="5" />
    <path d="M50 127 L150 127" stroke="#B9CB8E" strokeWidth="5" />
    <path d="M50 102 L150 102 L150 140 L50 140 Z" fill="none" />
    <path d="M46 96 Q100 86 154 96 L154 104 Q100 112 46 104 Z" fill={`url(#${id}-pista)`} />
    <ellipse cx="100" cy="96" rx="54" ry="9" fill="#C3D49A" />
    {/* rose petals and pistachio slivers */}
    {[
      [78, 92, -20],
      [100, 89, 10],
      [120, 93, 30],
    ].map(([x, y, r], i) => (
      <path key={i} d={`M${x} ${y} q6 -8 12 0 q-6 6 -12 0 Z`} fill="#D9667E" transform={`rotate(${r} ${x} ${y})`} />
    ))}
    {[
      [88, 96],
      [110, 95],
      [130, 97],
      [70, 97],
    ].map(([x, y], i) => (
      <rect key={i} x={x} y={y} width="6" height="2.6" rx="1.3" fill="#6F8D45" transform={`rotate(${i * 35} ${x} ${y})`} />
    ))}
  </g>
);

const Croissant: React.FC<{ id: string }> = ({ id }) => {
  // segments laid along an arch, largest in the middle, drawn tips first
  const segs = [
    { a: -84, w: 15, h: 24 },
    { a: 84, w: 15, h: 24 },
    { a: -58, w: 25, h: 36 },
    { a: 58, w: 25, h: 36 },
    { a: -29, w: 33, h: 46 },
    { a: 29, w: 33, h: 46 },
    { a: 0, w: 40, h: 54 },
  ];
  const cx = 100;
  const cy = 152;
  const r = 50;
  return (
    <g>
      <defs>
        <radialGradient id={`${id}-bake`} cx="0.45" cy="0.3" r="0.75">
          <stop offset="0" stopColor="#F5C277" />
          <stop offset="0.6" stopColor="#DE933D" />
          <stop offset="1" stopColor="#B96C24" />
        </radialGradient>
      </defs>
      <Plate y={152} rx={72} />
      <ellipse cx="100" cy="146" rx="62" ry="7" fill="rgba(120,70,20,0.18)" />
      {segs.map((sg, i) => {
        const rad = (sg.a * Math.PI) / 180;
        const x = cx + r * Math.sin(rad);
        const y = cy - r * Math.cos(rad) + Math.abs(sg.a) * 0.12;
        return (
          <g key={i} transform={`rotate(${sg.a} ${x} ${y})`}>
            <rect x={x - sg.w / 2} y={y - sg.h / 2} width={sg.w} height={sg.h} rx={sg.w / 2} fill={`url(#${id}-bake)`} stroke="#A55E1C" strokeOpacity="0.35" strokeWidth="1.4" />
            <path d={`M${x - sg.w * 0.18} ${y - sg.h * 0.32} Q${x + sg.w * 0.12} ${y} ${x - sg.w * 0.18} ${y + sg.h * 0.32}`} stroke="#FFFFFF" strokeOpacity="0.28" strokeWidth="2" fill="none" strokeLinecap="round" />
          </g>
        );
      })}
    </g>
  );
};

export const ProductArt: React.FC<{ kind: ProductKind; size: number; radius?: number; framed?: boolean }> = ({
  kind,
  size,
  radius = 14,
  framed = true,
}) => {
  const id = React.useId().replace(/:/g, '');
  const [a, b] = backgrounds[kind];
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" style={{ display: 'block', borderRadius: radius }}>
      {framed ? (
        <>
          <defs>
            <linearGradient id={`${id}-bg`} x1="0" x2="0.4" y1="0" y2="1">
              <stop offset="0" stopColor={a} />
              <stop offset="1" stopColor={b} />
            </linearGradient>
          </defs>
          <rect width="200" height="200" fill={`url(#${id}-bg)`} />
          <circle cx="160" cy="40" r="60" fill="#FFFFFF" opacity="0.25" />
        </>
      ) : null}
      {kind === 'chocolate' && <Chocolate id={id} />}
      {kind === 'cheesecake' && <Cheesecake id={id} />}
      {kind === 'pastry' && <Pastry id={id} />}
      {kind === 'croissant' && <Croissant id={id} />}
    </svg>
  );
};
