// Post-set summary: saves the session (local-first, then API), and offers
// to upload the recorded video to Backblaze via a presigned URL.

import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Bar, Btn, Card, Icon } from '@/components/ui';
import { SubscriptionRequiredError } from '@/lib/api';
import { useStore } from '@/lib/store';
import { T, wfont, wfontDisplay } from '@/lib/theme';
import type { CountMethod, WorkoutSession } from '@/lib/types';
import { uploadFile } from '@/lib/uploads';

type UploadState = 'idle' | 'uploading' | 'done' | 'failed';

export default function SessionCompleteScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { getToken } = useAuth();
  const params = useLocalSearchParams<{
    reps: string;
    durationSec: string;
    method: string;
    startedAt: string;
    videoUri?: string;
  }>();

  const reps = Number(params.reps ?? 0);
  const durationSec = Number(params.durationSec ?? 0);
  const method: CountMethod = params.method === 'manual' ? 'manual' : 'pose';

  const completeSession = useStore((s) => s.completeSession);
  const attachVideo = useStore((s) => s.attachVideo);
  const stats = useStore((s) => s.stats);
  const dailyGoal = useStore((s) => s.dailyGoal);

  const [saved, setSaved] = useState<WorkoutSession | null>(null);
  const [upload, setUpload] = useState<UploadState>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [needsSubscription, setNeedsSubscription] = useState(false);
  const savedOnce = useRef(false);

  useEffect(() => {
    if (savedOnce.current) return;
    savedOnce.current = true;
    if (reps < 1) return;
    completeSession(getToken, {
      reps,
      durationSec,
      method,
      startedAt: params.startedAt ?? new Date().toISOString(),
    })
      .then(setSaved)
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const doUpload = async () => {
    if (!params.videoUri || !saved) return;
    setUpload('uploading');
    setUploadProgress(0);
    try {
      const key = await uploadFile(getToken, 'video', params.videoUri, setUploadProgress);
      await attachVideo(getToken, saved, key);
      setUpload('done');
    } catch (e) {
      if (e instanceof SubscriptionRequiredError) setNeedsSubscription(true);
      setUpload('failed');
    }
  };

  const todayReps = stats?.todayReps ?? reps;
  const goalHit = todayReps >= dailyGoal;
  const isPB = stats != null && reps >= stats.bestSession && reps > 0;

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      <LinearGradient
        colors={[goalHit ? '#123324' : '#14181C', T.bg]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.55 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      <View style={{ flex: 1, paddingHorizontal: 22, paddingTop: insets.top + 40 }}>
        <View style={{ alignItems: 'center' }}>
          <View
            style={{
              width: 62, height: 62, borderRadius: 20, backgroundColor: isPB ? T.gold : T.accent,
              alignItems: 'center', justifyContent: 'center',
              boxShadow: `0px 10px 34px ${isPB ? `${T.gold}55` : T.accentGlow}` as unknown as string,
            }}
          >
            <Icon name={isPB ? 'trophy' : 'check'} size={30} color={isPB ? '#1a1304' : T.accentInk} strokeWidth={2.6} />
          </View>
          <Text style={{ fontFamily: wfontDisplay(600), fontSize: 34, lineHeight: 36, textTransform: 'uppercase', color: T.text, marginTop: 18, textAlign: 'center' }}>
            {isPB ? 'New personal best!' : reps > 0 ? 'Set complete' : 'No reps counted'}
          </Text>
          <Text style={{ fontFamily: wfontDisplay(700), fontSize: 88, lineHeight: 92, color: isPB ? T.gold : T.accent, fontVariant: ['tabular-nums'], marginTop: 6 }}>
            {reps}
          </Text>
          <Text style={{ fontSize: 14, color: T.text2, marginTop: -4 }}>
            pushups · {Math.floor(durationSec / 60) > 0 ? `${Math.floor(durationSec / 60)}m ` : ''}
            {durationSec % 60}s · {method === 'pose' ? 'camera counted' : 'manual count'}
          </Text>
        </View>

        <Card style={{ marginTop: 26 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text style={{ fontSize: 13.5, color: T.text2, fontFamily: wfont(600) }}>Today's goal</Text>
            <Text style={{ fontSize: 13.5, color: goalHit ? T.accent : T.text, fontFamily: wfont(700), fontVariant: ['tabular-nums'] }}>
              {todayReps} / {dailyGoal}
            </Text>
          </View>
          <Bar value={Math.min(1, dailyGoal > 0 ? todayReps / dailyGoal : 0)} h={10} glow={goalHit} />
          {saved && !saved.synced && (
            <Text style={{ fontSize: 12.5, color: T.text3, marginTop: 10 }}>
              Saved on this phone — will sync when the server is reachable.
            </Text>
          )}
        </Card>

        {params.videoUri && reps > 0 && (
          <Card style={{ marginTop: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(60,228,155,0.12)', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="play" size={18} color={T.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: wfont(700), fontSize: 14.5, color: T.text }}>Workout video recorded</Text>
                <Text style={{ fontSize: 12.5, color: T.text2 }}>
                  {upload === 'done'
                    ? 'Uploaded to your cloud library ✓'
                    : upload === 'failed'
                      ? needsSubscription
                        ? 'Subscription needed to upload videos'
                        : 'Upload failed — try again'
                      : 'Save it to your cloud library'}
                </Text>
              </View>
              {upload === 'uploading' ? (
                <ActivityIndicator color={T.accent} />
              ) : upload !== 'done' ? (
                <Btn variant="secondary" size="sm" onPress={doUpload} disabled={!saved || !saved.synced}>
                  {upload === 'failed' ? 'Retry' : 'Upload'}
                </Btn>
              ) : null}
            </View>
            {upload === 'uploading' && <Bar value={uploadProgress} h={6} style={{ marginTop: 12 }} />}
          </Card>
        )}
      </View>

      <View style={{ paddingHorizontal: 22, paddingBottom: insets.bottom + 20, gap: 10 }}>
        {needsSubscription && (
          <Btn variant="heat" full size="lg" onPress={() => router.replace('/paywall')}>
            Unlock everything — start free trial
          </Btn>
        )}
        <Btn variant="primary" full size="lg" onPress={() => router.replace('/(tabs)')} disabled={upload === 'uploading'}>
          Done
        </Btn>
        <Btn variant="ghost" full onPress={() => router.replace('/session')} disabled={upload === 'uploading'}>
          Go again
        </Btn>
      </View>
    </View>
  );
}
