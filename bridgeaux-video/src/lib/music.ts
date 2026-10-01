import { interpolate } from 'remotion';
import { ACTIVE_LINES, line } from '../data/timeline';
import { TOTAL_FRAMES } from '../styles/tokens';

// Music sits under the voice: it ducks smoothly around every narration line
// and opens up slightly in the gaps. Values are linear gain.
const BASE = 0.36;
const DUCKED = 0.16;
const ATTACK = 8; // frames to duck before a line starts
const RELEASE = 16; // frames to recover after it ends

const windows = ACTIVE_LINES.map((id) => {
  const l = line(id);
  return { start: l.globalStart, end: l.globalStart + l.duration };
});

/** Music gain at a global frame (0..1799). */
export const musicVolume = (globalFrame: number) => {
  let duck = 0;
  for (const w of windows) {
    const d = interpolate(
      globalFrame,
      [w.start - ATTACK, w.start, w.end, w.end + RELEASE],
      [0, 1, 1, 0],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
    );
    duck = Math.max(duck, d);
  }
  const level = BASE + (DUCKED - BASE) * duck;
  const fadeIn = interpolate(globalFrame, [0, 24], [0, 1], { extrapolateRight: 'clamp' });
  const fadeOut = interpolate(globalFrame, [TOTAL_FRAMES - 45, TOTAL_FRAMES], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return level * fadeIn * fadeOut;
};
