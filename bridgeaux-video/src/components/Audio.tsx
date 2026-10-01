import React from 'react';
import { Audio, Sequence, staticFile, useVideoConfig } from 'remotion';
import { line, LineId } from '../data/timeline';

export type SfxName =
  | 'click'
  | 'tap'
  | 'typing'
  | 'confirm'
  | 'pop'
  | 'connect'
  | 'whoosh'
  | 'whoosh-soft'
  | 'notify'
  | 'swell'
  | 'bloom'
  | 'shop-bell'
  | 'street';

/** A sound effect that starts at `at` (frame, relative to the scene). */
export const Sfx: React.FC<{
  name: SfxName;
  at: number;
  volume?: number;
  /** Cut the sound after this many frames (used to trim typing). */
  durationInFrames?: number;
  fadeOutFrames?: number;
}> = ({ name, at, volume = 0.5, durationInFrames, fadeOutFrames = 0 }) => {
  const { fps } = useVideoConfig();
  const len = durationInFrames ?? fps * 12;
  return (
    <Sequence from={at} durationInFrames={len} layout="none" name={`sfx:${name}`}>
      <Audio
        src={staticFile(`audio/sfx/${name}.wav`)}
        volume={(f) => {
          if (!fadeOutFrames || !durationInFrames) return volume;
          const remaining = durationInFrames - f;
          return remaining < fadeOutFrames ? volume * Math.max(0, remaining / fadeOutFrames) : volume;
        }}
      />
    </Sequence>
  );
};

/** One narration line, placed at its cue from src/data/timeline.ts. */
export const VoiceLine: React.FC<{ id: LineId; volume?: number }> = ({ id, volume = 1 }) => {
  const l = line(id);
  return (
    <Sequence from={l.start} durationInFrames={l.duration + 6} layout="none" name={`vo:${id}`}>
      <Audio src={staticFile(l.file)} volume={volume} />
    </Sequence>
  );
};
