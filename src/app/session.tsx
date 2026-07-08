// Live pushup session: front camera + MoveNet pose counting, with a manual
// tap-to-count fallback (used automatically when the model can't load).

import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  type VideoFile,
} from 'react-native-vision-camera';

import { Btn, Icon } from '@/components/ui';
import { usePushupCounter } from '@/lib/pose/use-pushup-counter';
import { T, wfont, wfontDisplay } from '@/lib/theme';

type Mode = 'pose' | 'manual';

function fmtTime(totalSec: number) {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function SessionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('front');
  const cameraRef = useRef<Camera>(null);

  const [mode, setMode] = useState<Mode>('pose');
  const [manualReps, setManualReps] = useState(0);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [finishing, setFinishing] = useState(false);
  const startedAtRef = useRef(new Date());

  const onRep = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  }, []);
  const { frameProcessor, modelState, reps: poseReps, update } = usePushupCounter(onRep);

  // No model → manual counting so the session still works offline.
  useEffect(() => {
    if (modelState === 'error') setMode('manual');
  }, [modelState]);

  useEffect(() => {
    if (!hasPermission) requestPermission();
  }, [hasPermission, requestPermission]);

  useEffect(() => {
    const id = setInterval(
      () => setElapsed(Math.floor((Date.now() - startedAtRef.current.getTime()) / 1000)),
      1000,
    );
    return () => clearInterval(id);
  }, []);

  const reps = mode === 'pose' ? poseReps : manualReps;
  const cameraActive = hasPermission && device != null && !finishing;

  const goComplete = useCallback(
    (videoUri?: string) => {
      router.replace({
        pathname: '/session-complete',
        params: {
          reps: String(mode === 'pose' ? poseReps : manualReps),
          durationSec: String(Math.max(1, Math.floor((Date.now() - startedAtRef.current.getTime()) / 1000))),
          method: mode,
          startedAt: startedAtRef.current.toISOString(),
          ...(videoUri ? { videoUri } : {}),
        },
      });
    },
    [router, mode, poseReps, manualReps],
  );

  const toggleRecording = useCallback(() => {
    const cam = cameraRef.current;
    if (!cam) return;
    if (recording) {
      cam.stopRecording().catch(() => {});
      setRecording(false);
      return;
    }
    setRecording(true);
    cam.startRecording({
      fileType: 'mp4',
      onRecordingFinished: (video: VideoFile) => {
        recordedVideoRef.current = video.path;
        if (pendingFinishRef.current) goComplete(video.path);
      },
      onRecordingError: () => {
        setRecording(false);
        if (pendingFinishRef.current) goComplete();
      },
    });
  }, [recording, goComplete]);

  const recordedVideoRef = useRef<string | undefined>(undefined);
  const pendingFinishRef = useRef(false);

  const finish = useCallback(() => {
    setFinishing(true);
    if (recording && cameraRef.current) {
      // Wait for onRecordingFinished so the file is fully written.
      pendingFinishRef.current = true;
      cameraRef.current.stopRecording().catch(() => goComplete(recordedVideoRef.current));
    } else {
      goComplete(recordedVideoRef.current);
    }
  }, [recording, goComplete]);

  const manualTap = () => {
    setManualReps((r) => r + 1);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  };

  const phaseLabel =
    mode === 'manual'
      ? 'Tap anywhere after each rep'
      : modelState === 'loading'
        ? 'Loading pose model…'
        : update == null || !update.tracking
          ? 'Get into a pushup position, arms extended'
          : update.phase === 'down'
            ? 'Push up!'
            : 'Go down';

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      {cameraActive && (
        <Camera
          ref={cameraRef}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          device={device}
          isActive
          video
          audio={false}
          frameProcessor={mode === 'pose' && modelState === 'ready' ? frameProcessor : undefined}
        />
      )}
      {/* dark scrim so the HUD stays readable over the preview */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(11,12,15,0.35)' }} />

      {!hasPermission && (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <Icon name="shield" size={40} color={T.text2} />
          <Text style={{ fontFamily: wfont(700), fontSize: 18, color: T.text, marginTop: 14, textAlign: 'center' }}>
            Camera access needed
          </Text>
          <Text style={{ fontSize: 14.5, color: T.text2, marginTop: 8, textAlign: 'center' }}>
            PushUp watches your form to count reps automatically. You can also count manually below.
          </Text>
          <Btn variant="secondary" style={{ marginTop: 16 }} onPress={requestPermission}>
            Grant camera access
          </Btn>
          <Btn variant="ghost" style={{ marginTop: 10 }} onPress={() => setMode('manual')}>
            Count manually instead
          </Btn>
        </View>
      )}

      {/* full-screen tap target in manual mode */}
      {mode === 'manual' && !finishing && (
        <Pressable onPress={manualTap} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
      )}

      {/* top bar */}
      <View
        style={{
          position: 'absolute', top: insets.top + 8, left: 16, right: 16,
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        }}
        pointerEvents="box-none"
      >
        <Pressable
          onPress={() => router.back()}
          style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.45)', borderWidth: 1, borderColor: T.line2, alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon name="close" size={19} color={T.text} />
        </Pressable>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: 'rgba(0,0,0,0.45)', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: T.line2 }}>
          <Icon name="clock" size={15} color={T.text2} />
          <Text style={{ fontFamily: wfont(700), fontSize: 15, color: T.text, fontVariant: ['tabular-nums'] }}>{fmtTime(elapsed)}</Text>
        </View>
        <Pressable
          onPress={toggleRecording}
          disabled={!cameraActive}
          style={{
            width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
            backgroundColor: recording ? 'rgba(255,68,68,0.9)' : 'rgba(0,0,0,0.45)',
            borderWidth: 1, borderColor: recording ? '#FF4444' : T.line2,
            opacity: cameraActive ? 1 : 0.4,
          }}
        >
          <View style={{ width: 12, height: 12, borderRadius: recording ? 3 : 6, backgroundColor: recording ? '#fff' : '#FF4444' }} />
        </Pressable>
      </View>

      {/* center count */}
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }} pointerEvents="none">
        <Text
          style={{
            fontFamily: wfontDisplay(700), fontSize: 150, lineHeight: 156, color: T.text,
            fontVariant: ['tabular-nums'],
            textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 24, textShadowOffset: { width: 0, height: 4 },
          }}
        >
          {reps}
        </Text>
        <Text style={{ fontSize: 15, color: T.text2, fontFamily: wfont(600), textTransform: 'uppercase', letterSpacing: 1.5 }}>
          reps
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 18, backgroundColor: 'rgba(0,0,0,0.45)', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999 }}>
          {mode === 'pose' && modelState === 'loading' && <ActivityIndicator size="small" color={T.accent} />}
          {mode === 'pose' && modelState === 'ready' && (
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: update?.tracking ? T.accent : T.gold }} />
          )}
          <Text style={{ fontSize: 14, color: T.text, fontFamily: wfont(600) }}>{phaseLabel}</Text>
        </View>
      </View>

      {/* bottom controls */}
      <View style={{ position: 'absolute', left: 16, right: 16, bottom: insets.bottom + 16, gap: 10 }} pointerEvents="box-none">
        <View style={{ flexDirection: 'row', justifyContent: 'center' }}>
          <Pressable
            onPress={() => setMode((m) => (m === 'pose' ? 'manual' : 'pose'))}
            disabled={modelState === 'error'}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 9, paddingHorizontal: 16, borderRadius: 999, backgroundColor: 'rgba(0,0,0,0.45)', borderWidth: 1, borderColor: T.line2 }}
          >
            <Icon name={mode === 'pose' ? 'target' : 'plus'} size={15} color={T.accent} strokeWidth={2.2} />
            <Text style={{ fontSize: 13.5, color: T.text, fontFamily: wfont(600) }}>
              {mode === 'pose' ? 'Auto-counting with camera — switch to manual' : 'Manual — tap to count'}
            </Text>
          </Pressable>
        </View>
        <Btn variant="primary" full size="lg" onPress={finish} disabled={finishing}>
          {finishing ? <ActivityIndicator color={T.accentInk} /> : reps > 0 ? `Finish — ${reps} reps` : 'Finish'}
        </Btn>
      </View>
    </View>
  );
}
