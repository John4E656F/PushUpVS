// Camera → MoveNet → RepCounter pipeline (VisionCamera 5, Nitro architecture).
//
// useFrameOutput streams RGB frames on VisionCamera's worklet thread
// (react-native-vision-camera-worklets + react-native-worklets). Each frame
// is center-cropped and resized to MoveNet's 192×192 input with nitro-image,
// run through TFLite (react-native-fast-tflite), and the 17 keypoints are
// scheduled back to the React runtime where the pure RepCounter state
// machine tracks phases and counts reps. `dropFramesWhileBusy` back-pressures
// the camera instead of queueing frames behind inference.

import { useCallback, useRef, useState } from 'react';
import { useTensorflowModel } from 'react-native-fast-tflite';
import { Images } from 'react-native-nitro-image';
import { useFrameOutput, type CameraFrameOutput } from 'react-native-vision-camera';
import { scheduleOnRN } from 'react-native-worklets';

import { RepCounter, type RepUpdate } from './rep-counter';
import { parseMoveNetOutput } from './types';

// MoveNet SinglePose Lightning (int8): fast enough for phones in real time.
// Bundle it locally with scripts/download-model.sh and point this env var at
// the asset server path if you want fully offline pose counting.
const MODEL_URL =
  process.env.EXPO_PUBLIC_MOVENET_MODEL_URL ??
  'https://storage.googleapis.com/tfhub-lite-models/google/lite-model/movenet/singlepose/lightning/tflite/int8/4.tflite';

const INPUT_SIZE = 192;

export type ModelState = 'loading' | 'ready' | 'error';

export type UsePushupCounterResult = {
  /** Pass inside <Camera outputs={[...]}> while pose counting is active. */
  frameOutput: CameraFrameOutput;
  modelState: ModelState;
  modelError?: Error;
  reps: number;
  update: RepUpdate | null;
  reset: () => void;
};

export function usePushupCounter(onRep?: (reps: number) => void): UsePushupCounterResult {
  const model = useTensorflowModel({ url: MODEL_URL }, []);

  const counterRef = useRef(new RepCounter());
  const [reps, setReps] = useState(0);
  const [update, setUpdate] = useState<RepUpdate | null>(null);
  const lastUpdateRef = useRef<{ at: number; result: RepUpdate | null }>({ at: 0, result: null });
  const onRepRef = useRef(onRep);
  onRepRef.current = onRep;

  const onPose = useCallback((keypoints: number[]) => {
    const pose = parseMoveNetOutput(keypoints);
    // Timestamped on arrival: the counter only needs monotonic milliseconds.
    const result = counterRef.current.process(pose, Date.now());
    // Poses arrive at camera rate — only re-render on meaningful change.
    const now = Date.now();
    const prev = lastUpdateRef.current;
    if (
      result.repCompleted ||
      result.phase !== prev.result?.phase ||
      result.tracking !== prev.result?.tracking ||
      now - prev.at > 250
    ) {
      lastUpdateRef.current = { at: now, result };
      setUpdate(result);
    }
    if (result.repCompleted) {
      setReps(result.reps);
      onRepRef.current?.(result.reps);
    }
  }, []);

  const actualModel = model.state === 'loaded' ? model.model : undefined;

  const frameOutput = useFrameOutput({
    targetResolution: { width: 640, height: 480 },
    pixelFormat: 'rgb',
    dropFramesWhileBusy: true,
    onFrame(frame) {
      'worklet';
      try {
        if (actualModel == null) return;
        const width = frame.width;
        const height = frame.height;
        // Row padding would skew the pixel grid — nitro-image expects a
        // tightly packed RGB buffer.
        if (frame.bytesPerRow !== width * 3) return;
        const image = Images.loadFromRawPixelData({
          buffer: frame.getPixelBuffer(),
          width,
          height,
          pixelFormat: 'RGB',
        });
        // Center-crop to a square, then scale to the model's input size.
        const size = Math.min(width, height);
        const sx = Math.floor((width - size) / 2);
        const sy = Math.floor((height - size) / 2);
        const input = image
          .crop(sx, sy, sx + size, sy + size)
          .resize(INPUT_SIZE, INPUT_SIZE)
          .toRawPixelData();
        const outputs = actualModel.runSync([input.buffer]);
        // Output: [1,1,17,3] float32 flattened to 51 values.
        const keypoints = Array.from(new Float32Array(outputs[0]));
        scheduleOnRN(onPose, keypoints);
      } finally {
        frame.dispose();
      }
    },
  });

  const reset = useCallback(() => {
    counterRef.current.reset();
    setReps(0);
    setUpdate(null);
  }, []);

  const modelState: ModelState =
    model.state === 'loaded' ? 'ready' : model.state === 'error' ? 'error' : 'loading';

  return {
    frameOutput,
    modelState,
    modelError: model.state === 'error' ? model.error : undefined,
    reps,
    update,
    reset,
  };
}
