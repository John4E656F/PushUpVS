// Camera → MoveNet → RepCounter pipeline.
//
// The frame processor runs on the VisionCamera worklet thread: it resizes
// each frame to MoveNet's 192×192 input, runs inference, and ships the raw
// 51-float keypoint tensor to the JS thread (~15 fps), where the pure
// RepCounter state machine tracks phases and counts reps.

import { useCallback, useMemo, useRef, useState } from 'react';
import { useTensorflowModel } from 'react-native-fast-tflite';
import { runAtTargetFps, useFrameProcessor } from 'react-native-vision-camera';
import { Worklets } from 'react-native-worklets-core';
import { useResizePlugin } from 'vision-camera-resize-plugin';

import { RepCounter, type RepUpdate } from './rep-counter';
import { parseMoveNetOutput } from './types';

// MoveNet SinglePose Lightning (int8): fast enough for phones at ~15fps.
// Bundle it locally with scripts/download-model.sh and point this env var at
// the asset server path if you want fully offline pose counting.
const MODEL_URL =
  process.env.EXPO_PUBLIC_MOVENET_MODEL_URL ??
  'https://storage.googleapis.com/tfhub-lite-models/google/lite-model/movenet/singlepose/lightning/tflite/int8/4.tflite';

const INPUT_SIZE = 192;
const TARGET_FPS = 15;

export type ModelState = 'loading' | 'ready' | 'error';

export type UsePushupCounterResult = {
  /** Pass to <Camera frameProcessor={...}> when modelState === 'ready'. */
  frameProcessor: ReturnType<typeof useFrameProcessor>;
  modelState: ModelState;
  modelError?: Error;
  reps: number;
  update: RepUpdate | null;
  reset: () => void;
};

export function usePushupCounter(onRep?: (reps: number) => void): UsePushupCounterResult {
  const model = useTensorflowModel({ url: MODEL_URL });
  const { resize } = useResizePlugin();

  const counterRef = useRef(new RepCounter());
  const [reps, setReps] = useState(0);
  const [update, setUpdate] = useState<RepUpdate | null>(null);
  const onRepRef = useRef(onRep);
  onRepRef.current = onRep;

  const onPose = useMemo(
    () =>
      Worklets.createRunOnJS((keypoints: number[]) => {
        const pose = parseMoveNetOutput(keypoints);
        // Timestamped on arrival: the counter only needs monotonic ms, and
        // Frame.timestamp units differ per platform.
        const result = counterRef.current.process(pose, Date.now());
        setUpdate(result);
        if (result.repCompleted) {
          setReps(result.reps);
          onRepRef.current?.(result.reps);
        }
      }),
    [],
  );

  const actualModel = model.state === 'loaded' ? model.model : undefined;

  const frameProcessor = useFrameProcessor(
    (frame) => {
      'worklet';
      if (actualModel == null) return;
      runAtTargetFps(TARGET_FPS, () => {
        'worklet';
        const input = resize(frame, {
          scale: { width: INPUT_SIZE, height: INPUT_SIZE },
          pixelFormat: 'rgb',
          dataType: 'uint8',
          rotation: '90deg', // sensor frames are landscape; the user is portrait
        });
        const outputs = actualModel.runSync([input]);
        // Output: [1,1,17,3] float32 flattened to 51 values.
        const keypoints = Array.from(outputs[0] as Float32Array);
        onPose(keypoints);
      });
    },
    [actualModel, resize, onPose],
  );

  const reset = useCallback(() => {
    counterRef.current.reset();
    setReps(0);
    setUpdate(null);
  }, []);

  const modelState: ModelState =
    model.state === 'loaded' ? 'ready' : model.state === 'error' ? 'error' : 'loading';

  return {
    frameProcessor,
    modelState,
    modelError: model.state === 'error' ? model.error : undefined,
    reps,
    update,
    reset,
  };
}
