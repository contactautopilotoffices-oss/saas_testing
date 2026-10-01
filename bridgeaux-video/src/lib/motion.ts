import { Easing, interpolate, spring } from 'remotion';

// Easing presets used everywhere, so motion feels like one system.
export const ease = {
  // Calm deceleration for entrances (similar to "expo out" but softer)
  out: Easing.bezier(0.16, 1, 0.3, 1),
  // Balanced move between two states
  inOut: Easing.bezier(0.65, 0, 0.35, 1),
  // Gentle start for exits
  in: Easing.bezier(0.55, 0, 1, 0.45),
  // Very soft, for long camera drifts
  drift: Easing.bezier(0.33, 0, 0.67, 1),
};

/** 0..1 progress between two frames with easing, clamped. */
export const progress = (
  frame: number,
  start: number,
  duration: number,
  easing: (t: number) => number = ease.out,
) =>
  interpolate(frame, [start, start + Math.max(1, duration)], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing,
  });

/** Map a 0..1 progress onto a range. */
export const mix = (p: number, from: number, to: number) => from + (to - from) * p;

/** Standard entrance: fade + rise + slight de-blur. */
export const enter = (
  frame: number,
  start: number,
  opts: { duration?: number; distance?: number; blur?: number; scaleFrom?: number } = {},
) => {
  const { duration = 18, distance = 24, blur = 6, scaleFrom = 1 } = opts;
  const p = progress(frame, start, duration);
  return {
    opacity: p,
    transform: `translateY(${mix(p, distance, 0)}px) scale(${mix(p, scaleFrom, 1)})`,
    filter: blur > 0 && p < 1 ? `blur(${mix(p, blur, 0)}px)` : undefined,
  } as const;
};

/** Standard exit: fade out, optional drift. */
export const exit = (
  frame: number,
  start: number,
  opts: { duration?: number; distance?: number; blur?: number } = {},
) => {
  const { duration = 14, distance = -12, blur = 4 } = opts;
  const p = progress(frame, start, duration, ease.in);
  return {
    opacity: 1 - p,
    transform: `translateY(${mix(p, 0, distance)}px)`,
    filter: blur > 0 && p > 0 ? `blur(${mix(p, 0, blur)}px)` : undefined,
  } as const;
};

/** Soft spring (no visible overshoot) for UI state changes. */
export const softSpring = (frame: number, fps: number, delay = 0, durationInFrames?: number) =>
  spring({
    frame: frame - delay,
    fps,
    config: { damping: 200, stiffness: 120, mass: 1 },
    durationInFrames,
  });

/** Spring with a touch of life, for small elements like checks and dots. */
export const popSpring = (frame: number, fps: number, delay = 0) =>
  spring({ frame: frame - delay, fps, config: { damping: 14, stiffness: 170, mass: 0.7 } });

/** Characters of `text` visible after typing from `start` at `cps` chars/sec. */
export const typed = (text: string, frame: number, start: number, cps: number, fps = 30) => {
  const n = Math.floor(Math.max(0, frame - start) * (cps / fps));
  return text.slice(0, Math.min(text.length, n));
};

/** Frame at which typing of `text` finishes. */
export const typingEnd = (text: string, start: number, cps: number, fps = 30) =>
  start + Math.ceil((text.length / cps) * fps);

/** Count up a number with easing. */
export const countUp = (frame: number, start: number, duration: number, to: number) =>
  Math.round(to * progress(frame, start, duration, ease.out));

/** Blink for text cursors (0 or 1), 2 blinks per second. */
export const caretOn = (frame: number, fps = 30) => Math.floor(frame / (fps / 2)) % 2 === 0;

/** Deterministic pseudo random in [0,1) from an integer seed. */
export const seeded = (seed: number) => {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};
