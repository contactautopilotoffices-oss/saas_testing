import narration from './narration.json';
import { SCENE_FRAMES, VIDEO } from '../styles/tokens';

export type LineId = keyof typeof narration.lines;

// When each narration line starts, in seconds from the start of its scene.
// Visual beats in every scene are keyed off these cues, so changing a start
// time here moves the voice and the matching animation together.
export const VO_START: Record<LineId, number> = {
  s1a: 0.5,
  s1b: 3.2,
  s1c: 7.4,
  s2a: 0.4,
  s2b: 2.6,
  s2c: 4.3,
  s3a: 0.35,
  s3b: 2.0,
  s4a: 0.4,
  s5a: 0.3,
  s5b: 3.45,
  s5c: 7.2,
  s6a: 0.25,
  s6b: 4.9,
  s6c: 6.05,
  s6d: 9.0, // optional line, not placed by default
};

// Lines that play in the final film (s6d is kept as an optional asset)
export const ACTIVE_LINES: LineId[] = [
  's1a', 's1b', 's1c',
  's2a', 's2b', 's2c',
  's3a', 's3b',
  's4a',
  's5a', 's5b', 's5c',
  's6a', 's6b', 's6c',
];

const fps = VIDEO.fps;

export const line = (id: LineId) => {
  const meta = narration.lines[id];
  const start = Math.round(VO_START[id] * fps);
  const duration = Math.ceil(meta.durationSec * fps);
  return {
    id,
    scene: meta.scene,
    text: meta.text,
    file: meta.file,
    start, // frame, relative to the scene
    end: start + duration,
    duration,
    globalStart: (meta.scene - 1) * SCENE_FRAMES + start,
  };
};

export const linesForScene = (scene: number) =>
  ACTIVE_LINES.map(line).filter((l) => l.scene === scene);

export const sec = (s: number) => Math.round(s * fps);
