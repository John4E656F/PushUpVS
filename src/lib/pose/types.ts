// MoveNet single-pose output: 17 keypoints in a fixed order,
// each as [y, x, score] with y/x normalized to [0, 1].

export const KEYPOINT_NAMES = [
  'nose',
  'left_eye',
  'right_eye',
  'left_ear',
  'right_ear',
  'left_shoulder',
  'right_shoulder',
  'left_elbow',
  'right_elbow',
  'left_wrist',
  'right_wrist',
  'left_hip',
  'right_hip',
  'left_knee',
  'right_knee',
  'left_ankle',
  'right_ankle',
] as const;

export type KeypointName = (typeof KEYPOINT_NAMES)[number];

export type Keypoint = {
  x: number;
  y: number;
  score: number;
};

export type Pose = Record<KeypointName, Keypoint>;

/** Parses a raw MoveNet output tensor ([1,1,17,3] flattened to 51 floats). */
export function parseMoveNetOutput(data: ArrayLike<number>): Pose {
  const pose = {} as Pose;
  for (let i = 0; i < KEYPOINT_NAMES.length; i++) {
    pose[KEYPOINT_NAMES[i]] = {
      y: data[i * 3],
      x: data[i * 3 + 1],
      score: data[i * 3 + 2],
    };
  }
  return pose;
}
