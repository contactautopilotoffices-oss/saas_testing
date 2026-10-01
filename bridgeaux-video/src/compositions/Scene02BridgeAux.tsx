import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { CircleHelp } from 'lucide-react';
import { SceneShell, SceneProps } from '../components/SceneShell';
import { BridgeAuxLogo } from '../components/BridgeAuxLogo';
import { ConnectionLine } from '../components/ConnectionLine';
import { ECO_CENTER, ECO_ITEMS, EcoNode, ecoSlots, groupColor } from '../components/Ecosystem';
import { PhoneFrame } from '../components/PhoneFrame';
import { SearchScreen } from '../components/SearchScreen';
import { Sfx } from '../components/Audio';
import { S1_LAYOUT, StorefrontCard } from './Scene01Problem';
import { line } from '../data/timeline';
import { colors, fonts } from '../styles/tokens';
import { ease, mix, progress } from '../lib/motion';

// SCENE 02 (10-20s): MEET BRIDGEAUX
// The BridgeAux mark fills the gap between the shop and its customers, then
// the full picture forms around it: everything a business needs to exist
// online (blue) and to grow online (green), connected to one platform.

export const S2_END = { camera: 1.1, node: { x: ECO_CENTER.x, y: ECO_CENTER.y, r: 112 } };

// when each ecosystem node appears (frame), in ECO_ITEMS order
const NODE_IN = [82, 150, 158, 166, 194, 200, 206, 212, 218];

/** The finished ecosystem, as it looks on scene 02's last frame. */
export const EcosystemEnding: React.FC<{ frame: number; opacity: number; camera: number }> = ({ frame, opacity, camera }) => {
  const slots = ecoSlots();
  const { node } = S2_END;
  return (
    <AbsoluteFill style={{ opacity, transform: `scale(${camera})`, transformOrigin: `${node.x}px ${node.y}px` }}>
      <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
        {ECO_ITEMS.map((item, i) => (
          <ConnectionLine
            key={item.key}
            from={slots[i]}
            to={{ x: node.x, y: node.y }}
            draw={1}
            pulse={((frame + 300 - NODE_IN[i] - 14 + i * 11) % 66) / 66}
            color={groupColor(item.group)}
            width={2.2}
            curve={i < 4 ? -0.08 : 0.08}
          />
        ))}
      </svg>
      {ECO_ITEMS.map((item, i) => (
        <EcoNode key={item.key} item={item} x={slots[i].x} y={slots[i].y} appear={1} />
      ))}
    </AbsoluteFill>
  );
};

export const Scene02BridgeAux: React.FC<SceneProps> = ({ withMusic }) => {
  const frame = useCurrentFrame();
  const { card, phone, ring } = S1_LAYOUT;
  const slots = ecoSlots();

  // camera: continue from scene 01's push, settle, then lean into the centre
  const settleCam = progress(frame, 34, 60, ease.inOut);
  const endPush = progress(frame, 266, 34, ease.in);
  const camera = mix(settleCam, S1_LAYOUT.endCamera, 1) * mix(endPush, 1, S2_END.camera);

  // the gap becomes BridgeAux
  const questionOut = 1 - progress(frame, 0, 10);
  const solid = progress(frame, 2, 18);
  const reveal = progress(frame, 6, 40, ease.out);
  const bridgeLines = progress(frame, 22, 20, ease.out);
  const sidesOut = progress(frame, 52, 34, ease.inOut);
  const toNode = progress(frame, 50, 40, ease.inOut);
  const nodeX = ring.x;
  const nodeY = mix(toNode, ring.y, S2_END.node.y);
  const nodeR = mix(toNode, ring.r, S2_END.node.r);
  const wordmark = progress(frame, 24, 26, ease.out);

  const website = line('s2b');
  const emphasis = progress(frame, website.start, 10) * (1 - progress(frame, 140, 30, ease.inOut));
  // "Not just a website": the website sits alone beside BridgeAux, then takes its place in the ring
  const websiteMove = progress(frame, 136, 32, ease.inOut);
  const websiteFocus = { x: 650, y: S2_END.node.y };
  const nodePos = (i: number) =>
    i === 0
      ? { x: mix(websiteMove, websiteFocus.x, slots[0].x), y: mix(websiteMove, websiteFocus.y, slots[0].y) }
      : slots[i];
  const caption = progress(frame, 210, 24, ease.out);

  return (
    <SceneShell scene={2} withMusic={withMusic}>
      <AbsoluteFill style={{ transform: `scale(${camera})`, transformOrigin: `${nodeX}px ${nodeY}px` }}>
        {/* the shop and the customer, carried over from scene 01 */}
        {sidesOut < 1 ? (
          <>
            <div style={{ position: 'absolute', inset: 0, opacity: 1 - sidesOut, transform: `translateX(${mix(sidesOut, -18, -160)}px)` }}>
              <StorefrontCard frame={300 + frame} t={1} dim={0.6 * (1 - solid)} />
            </div>
            <div
              style={{
                position: 'absolute',
                left: phone.x + mix(sidesOut, 18, 160),
                top: phone.y,
                opacity: 1 - sidesOut,
              }}
            >
              <PhoneFrame width={phone.w}>
                <SearchScreen variant="missing" query="bakery near me" focus={0.7} />
              </PhoneFrame>
            </div>
          </>
        ) : null}

        <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
          {/* scene 01's broken line, now bridged */}
          {sidesOut < 1 ? (
            <g opacity={1 - sidesOut}>
              <line x1={card.x + card.w} x2={nodeX - nodeR - 18} y1={540} y2={540} stroke={colors.faint} strokeWidth={2.5} strokeDasharray="2 10" strokeLinecap="round" opacity={1 - bridgeLines} />
              <line x1={nodeX + nodeR + 18} x2={phone.x + 4} y1={540} y2={540} stroke={colors.faint} strokeWidth={2.5} strokeDasharray="2 10" strokeLinecap="round" opacity={1 - bridgeLines} />
              <ConnectionLine from={{ x: card.x + card.w - 4, y: 540 }} to={{ x: nodeX - nodeR, y: nodeY }} draw={bridgeLines} pulse={progress(frame, 30, 22)} color={colors.blue} width={4} curve={0} strength={0.85} />
              <ConnectionLine from={{ x: nodeX + nodeR, y: nodeY }} to={{ x: phone.x + 22, y: 540 }} draw={bridgeLines} pulse={progress(frame, 40, 22)} color={colors.green} width={4} curve={0} strength={0.85} />
            </g>
          ) : null}

          {/* ecosystem connections */}
          {ECO_ITEMS.map((item, i) => {
            const a = progress(frame, NODE_IN[i], 20, ease.out);
            if (a <= 0) return null;
            const since = frame - NODE_IN[i] - 14;
            const pulse = since > 0 ? ((since + i * 11) % 66) / 66 : undefined;
            return (
              <ConnectionLine
                key={item.key}
                from={nodePos(i)}
                to={{ x: nodeX, y: nodeY }}
                draw={a}
                pulse={pulse}
                color={groupColor(item.group)}
                width={2.2}
                curve={i < 4 ? -0.08 : 0.08}
              />
            );
          })}
        </svg>

        {/* the centre: from dashed gap to BridgeAux */}
        <div
          style={{
            position: 'absolute',
            left: nodeX - nodeR,
            top: nodeY - nodeR,
            width: nodeR * 2,
            height: nodeR * 2,
            borderRadius: 999,
            background: `rgba(255,255,255,${mix(solid, 0.55, 1)})`,
            border: `2px dashed rgba(154,164,170,${1 - solid})`,
            boxShadow: solid > 0 ? `0 0 0 ${10 * solid}px rgba(2,116,239,0.05), 0 24px 70px rgba(2,116,239,${0.16 * solid}), 0 8px 24px rgba(21,34,40,${0.08 * solid})` : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {questionOut > 0 ? (
            <div style={{ position: 'absolute', color: colors.faint, opacity: questionOut * 0.9 }}>
              <CircleHelp size={34} strokeWidth={1.6} />
            </div>
          ) : null}
          <div style={{ transform: `translateY(${nodeR * 0.04}px)` }}>
            <BridgeAuxLogo height={nodeR * 0.66} reveal={reveal} />
          </div>
        </div>

        {/* wordmark under the node */}
        <div
          style={{
            position: 'absolute',
            left: nodeX,
            top: nodeY + nodeR + 34,
            transform: `translate(-50%, ${mix(wordmark, 12, 0)}px)`,
            opacity: wordmark * (1 - endPush),
            fontFamily: fonts.display,
            fontWeight: 600,
            fontSize: 50,
            letterSpacing: '-0.025em',
            color: colors.ink,
          }}
        >
          BridgeAux
        </div>

        {/* ecosystem nodes */}
        {ECO_ITEMS.map((item, i) => (
          <EcoNode
            key={item.key}
            item={item}
            x={nodePos(i).x}
            y={nodePos(i).y}
            appear={progress(frame, NODE_IN[i], 18, ease.out)}
            emphasis={i === 0 ? emphasis * 1.4 : 0}
          />
        ))}

        {/* caption */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 920,
            textAlign: 'center',
            fontFamily: fonts.display,
            fontWeight: 600,
            fontSize: 34,
            letterSpacing: '-0.015em',
            color: colors.ink,
            opacity: caption * (1 - progress(frame, 272, 22)),
            transform: `translateY(${mix(caption, 14, 0)}px)`,
          }}
        >
          One platform. <span style={{ color: colors.muted, fontWeight: 500 }}>Connected business presence.</span>
        </div>
      </AbsoluteFill>

      <Sfx name="bloom" at={6} volume={0.42} />
      <Sfx name="connect" at={30} volume={0.26} />
      <Sfx name="whoosh-soft" at={54} volume={0.22} />
      <Sfx name="pop" at={NODE_IN[0]} volume={0.22} />
      {NODE_IN.slice(1).map((f, i) => (
        <Sfx key={f} name="pop" at={f} volume={0.1 + (i % 2) * 0.03} />
      ))}
      <Sfx name="connect" at={NODE_IN[1]} volume={0.18} />
      <Sfx name="connect" at={NODE_IN[4]} volume={0.18} />
      <Sfx name="swell" at={268} volume={0.18} />
    </SceneShell>
  );
};
