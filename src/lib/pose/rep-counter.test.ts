// Unit tests for the rep-counting state machine.
// Run with: pnpm test:counter  (node --test, no camera required)

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { angleDeg, elbowAngle, RepCounter } from './rep-counter.ts';
import { KEYPOINT_NAMES, parseMoveNetOutput, type Pose } from './types.ts';

/** Builds a pose where one arm has the given elbow angle, everything else confident. */
function poseWithElbowAngle(deg: number, score = 0.9): Pose {
  const rad = (deg * Math.PI) / 180;
  const pose = {} as Pose;
  for (const name of KEYPOINT_NAMES) {
    pose[name] = { x: 0.5, y: 0.5, score };
  }
  // Left arm: shoulder at origin-ish, elbow below it, wrist rotated by `deg`
  // around the elbow relative to the shoulder direction.
  pose.left_shoulder = { x: 0.5, y: 0.3, score };
  pose.left_elbow = { x: 0.5, y: 0.5, score };
  // Rotate the elbow→shoulder direction (0,-1) by `deg` to place the wrist.
  pose.left_wrist = {
    x: 0.5 + 0.2 * Math.sin(rad),
    y: 0.5 - 0.2 * Math.cos(rad),
    score,
  };
  // Break the right arm so only the left is used.
  pose.right_shoulder = { x: 0, y: 0, score: 0 };
  return pose;
}

test('angleDeg computes a right angle', () => {
  const a = { x: 0, y: 1, score: 1 };
  const b = { x: 0, y: 0, score: 1 };
  const c = { x: 1, y: 0, score: 1 };
  assert.ok(Math.abs(angleDeg(a, b, c) - 90) < 1e-9);
});

test('elbowAngle returns null when no side is confident', () => {
  const pose = poseWithElbowAngle(90, 0.1);
  assert.equal(elbowAngle(pose, 0.3), null);
});

test('elbowAngle matches the constructed angle', () => {
  for (const deg of [60, 90, 120, 170]) {
    const angle = elbowAngle(poseWithElbowAngle(deg), 0.3);
    assert.ok(angle !== null && Math.abs(angle - deg) < 1, `expected ~${deg}, got ${angle}`);
  }
});

test('counts a full pushup cycle', () => {
  const counter = new RepCounter();
  let t = 0;
  const feed = (deg: number, dt = 100) => counter.process(poseWithElbowAngle(deg), (t += dt));

  feed(170); // discover top
  feed(160);
  feed(120); // descending — between thresholds, no state change
  feed(90); // bottom
  feed(85);
  feed(120); // ascending
  const done = feed(165);
  assert.equal(done.repCompleted, true);
  assert.equal(counter.count, 1);
});

test('does not count without reaching the bottom threshold', () => {
  const counter = new RepCounter();
  let t = 0;
  const feed = (deg: number) => counter.process(poseWithElbowAngle(deg), (t += 100));
  feed(170);
  feed(120); // shallow dip only
  feed(110);
  feed(170);
  assert.equal(counter.count, 0);
});

test('debounces jitter faster than minRepMs', () => {
  const counter = new RepCounter({ minRepMs: 500 });
  let t = 0;
  const feed = (deg: number, dt: number) => counter.process(poseWithElbowAngle(deg), (t += dt));
  feed(170, 100);
  // Vibration-speed oscillation: 20ms per frame.
  feed(90, 20);
  feed(170, 20);
  feed(90, 20);
  feed(170, 20);
  assert.equal(counter.count, 0);
});

test('counts consecutive reps', () => {
  const counter = new RepCounter();
  let t = 0;
  const feed = (deg: number) => counter.process(poseWithElbowAngle(deg), (t += 300));
  feed(170);
  for (let i = 0; i < 5; i++) {
    feed(90);
    feed(170);
  }
  assert.equal(counter.count, 5);
});

test('requires starting from the top position', () => {
  const counter = new RepCounter();
  let t = 0;
  const feed = (deg: number) => counter.process(poseWithElbowAngle(deg), (t += 300));
  const first = feed(90); // discovered mid-rep at the bottom
  assert.equal(first.tracking, false);
  feed(170); // rising to top only arms the counter
  assert.equal(counter.count, 0);
  feed(90);
  feed(170);
  assert.equal(counter.count, 1);
});

test('loses tracking after enough unconfident frames, then re-arms', () => {
  const counter = new RepCounter({ lostAfterFrames: 3 });
  let t = 0;
  const feed = (deg: number, score?: number) =>
    counter.process(poseWithElbowAngle(deg, score), (t += 100));
  feed(170);
  feed(90);
  let last = feed(90, 0.05);
  last = feed(90, 0.05);
  last = feed(90, 0.05);
  assert.equal(last.tracking, false);
  // Coming back up after losing tracking must not count a rep.
  const back = feed(170);
  assert.equal(back.repCompleted, false);
  assert.equal(counter.count, 0);
});

test('parseMoveNetOutput maps the 17 keypoints', () => {
  const raw = new Float32Array(51);
  for (let i = 0; i < 17; i++) {
    raw[i * 3] = i / 17; // y
    raw[i * 3 + 1] = 1 - i / 17; // x
    raw[i * 3 + 2] = 0.5; // score
  }
  const pose = parseMoveNetOutput(raw);
  assert.ok(Math.abs(pose.nose.y - 0) < 1e-6);
  assert.ok(Math.abs(pose.left_shoulder.y - 5 / 17) < 1e-6);
  assert.equal(pose.right_ankle.score, 0.5);
});
