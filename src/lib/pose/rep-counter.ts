// Pushup rep counting as a pure state machine over pose frames.
//
// A rep is a full elbow-extension cycle: arms extended (top) → elbows bent
// past the down threshold (bottom) → extended again. Hysteresis between the
// two angle thresholds plus a minimum cycle duration filters out jitter.
// Pure TypeScript so it can be unit-tested without a camera.

import type { Keypoint, Pose } from './types';

export type RepCounterConfig = {
  /** Elbow angle (degrees) below which we consider the user "down". */
  downAngle: number;
  /** Elbow angle (degrees) above which we consider the user "up". */
  upAngle: number;
  /** Minimum keypoint confidence for a side (shoulder/elbow/wrist) to be used. */
  minScore: number;
  /** Minimum milliseconds for a full rep — anything faster is jitter. */
  minRepMs: number;
  /** Frames without a confident pose before we report tracking lost. */
  lostAfterFrames: number;
};

export const DEFAULT_CONFIG: RepCounterConfig = {
  downAngle: 100,
  upAngle: 150,
  minScore: 0.3,
  minRepMs: 500,
  lostAfterFrames: 15,
};

export type Phase = 'searching' | 'up' | 'down';

export type RepUpdate = {
  phase: Phase;
  reps: number;
  /** Set on the exact frame a rep completes. */
  repCompleted: boolean;
  /** Current elbow angle in degrees, or null when the pose isn't confident. */
  elbowAngle: number | null;
  tracking: boolean;
};

/** Angle at vertex `b` formed by points a-b-c, in degrees. */
export function angleDeg(a: Keypoint, b: Keypoint, c: Keypoint): number {
  const abx = a.x - b.x;
  const aby = a.y - b.y;
  const cbx = c.x - b.x;
  const cby = c.y - b.y;
  const dot = abx * cbx + aby * cby;
  const magAB = Math.hypot(abx, aby);
  const magCB = Math.hypot(cbx, cby);
  if (magAB === 0 || magCB === 0) return 180;
  const cos = Math.min(1, Math.max(-1, dot / (magAB * magCB)));
  return (Math.acos(cos) * 180) / Math.PI;
}

/**
 * Elbow angle from whichever arm is tracked with more confidence.
 * Returns null when neither arm's shoulder/elbow/wrist are all confident.
 */
export function elbowAngle(pose: Pose, minScore: number): number | null {
  const sides = [
    [pose.left_shoulder, pose.left_elbow, pose.left_wrist],
    [pose.right_shoulder, pose.right_elbow, pose.right_wrist],
  ] as const;

  let bestScore = 0;
  let best: number | null = null;
  for (const [shoulder, elbow, wrist] of sides) {
    const score = Math.min(shoulder.score, elbow.score, wrist.score);
    if (score >= minScore && score > bestScore) {
      bestScore = score;
      best = angleDeg(shoulder, elbow, wrist);
    }
  }
  return best;
}

export class RepCounter {
  private config: RepCounterConfig;
  private phase: Phase = 'searching';
  private reps = 0;
  private lostFrames = 0;
  private downAtMs = 0;
  private lastRepAtMs = 0;

  constructor(config: Partial<RepCounterConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  get count(): number {
    return this.reps;
  }

  reset(): void {
    this.phase = 'searching';
    this.reps = 0;
    this.lostFrames = 0;
    this.downAtMs = 0;
    this.lastRepAtMs = 0;
  }

  /** Feed one pose frame; timestampMs must be monotonic. */
  process(pose: Pose, timestampMs: number): RepUpdate {
    const angle = elbowAngle(pose, this.config.minScore);

    if (angle === null) {
      this.lostFrames++;
      if (this.lostFrames >= this.config.lostAfterFrames) {
        this.phase = 'searching';
      }
      return this.update(false, null);
    }
    this.lostFrames = 0;

    let repCompleted = false;
    switch (this.phase) {
      case 'searching':
        // Only start tracking from the top position so partial reps
        // mid-discovery don't count.
        if (angle >= this.config.upAngle) this.phase = 'up';
        break;
      case 'up':
        if (angle <= this.config.downAngle) {
          this.phase = 'down';
          this.downAtMs = timestampMs;
        }
        break;
      case 'down':
        if (angle >= this.config.upAngle) {
          this.phase = 'up';
          const bottomMs = timestampMs - this.downAtMs;
          const sinceLastRep = this.lastRepAtMs === 0 ? Infinity : timestampMs - this.lastRepAtMs;
          if (bottomMs >= this.config.minRepMs / 2 && sinceLastRep >= this.config.minRepMs) {
            this.reps++;
            this.lastRepAtMs = timestampMs;
            repCompleted = true;
          }
        }
        break;
    }
    return this.update(repCompleted, angle);
  }

  private update(repCompleted: boolean, elbow: number | null): RepUpdate {
    return {
      phase: this.phase,
      reps: this.reps,
      repCompleted,
      elbowAngle: elbow,
      tracking: this.phase !== 'searching',
    };
  }
}
