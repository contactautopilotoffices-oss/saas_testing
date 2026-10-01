import React from 'react';
import { AbsoluteFill, Audio, staticFile } from 'remotion';
import { Backdrop, Grain } from './Backdrop';
import { VoiceLine } from './Audio';
import { linesForScene } from '../data/timeline';
import { musicVolume } from '../lib/music';
import { SCENE_FRAMES } from '../styles/tokens';
import { loadFonts } from '../styles/fonts';

loadFonts();

export type SceneProps = {
  /** Standalone scene renders include their slice of the score. The full
   *  film plays one continuous music track instead. */
  withMusic?: boolean;
};

type Props = SceneProps & {
  scene: number;
  tone?: 'paper' | 'sand';
  children: React.ReactNode;
};

/** Shared wrapper: stage, narration for this scene, music slice and grain. */
export const SceneShell: React.FC<Props> = ({ scene, withMusic = true, tone = 'paper', children }) => {
  const offset = (scene - 1) * SCENE_FRAMES;
  return (
    <AbsoluteFill>
      <Backdrop tone={tone} />
      <AbsoluteFill>{children}</AbsoluteFill>
      <Grain />
      {linesForScene(scene).map((l) => (
        <VoiceLine key={l.id} id={l.id} />
      ))}
      {withMusic ? (
        <Audio
          src={staticFile('audio/music/bed.wav')}
          trimBefore={offset}
          volume={(f) => musicVolume(f + offset)}
        />
      ) : null}
    </AbsoluteFill>
  );
};
