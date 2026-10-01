import React from 'react';
import { AbsoluteFill, Audio, Series, staticFile } from 'remotion';
import { SCENE_FRAMES } from '../styles/tokens';
import { musicVolume } from '../lib/music';
import { Scene01Problem } from './Scene01Problem';
import { Scene02BridgeAux } from './Scene02BridgeAux';
import { Scene03BusinessInput } from './Scene03BusinessInput';
import { Scene04DigitalFoundation } from './Scene04DigitalFoundation';
import { Scene05OperateGrow } from './Scene05OperateGrow';
import { Scene06Finale } from './Scene06Finale';

export const SCENES = [
  { id: 'Scene01-Problem', component: Scene01Problem },
  { id: 'Scene02-MeetBridgeAux', component: Scene02BridgeAux },
  { id: 'Scene03-TellUs', component: Scene03BusinessInput },
  { id: 'Scene04-DigitalFoundation', component: Scene04DigitalFoundation },
  { id: 'Scene05-OperateGrow', component: Scene05OperateGrow },
  { id: 'Scene06-Finale', component: Scene06Finale },
] as const;

/** The full 60 second film: six 10 second scenes and one continuous score. */
export const MainVideo: React.FC = () => (
  <AbsoluteFill>
    <Series>
      {SCENES.map(({ id, component: Scene }) => (
        <Series.Sequence key={id} durationInFrames={SCENE_FRAMES} name={id}>
          <Scene withMusic={false} />
        </Series.Sequence>
      ))}
    </Series>
    <Audio src={staticFile('audio/music/bed.wav')} volume={(f) => musicVolume(f)} />
  </AbsoluteFill>
);
