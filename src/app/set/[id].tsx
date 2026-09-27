// One past set: meta, rep splits, and — when a video was uploaded — the
// rep-synced replay, streamed via a short-lived presigned URL.

import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Btn, Card, Icon } from '@/components/ui';
import { RepReplay } from '@/components/rep-replay';
import { api, SubscriptionRequiredError } from '@/lib/api';
import { useStore } from '@/lib/store';
import { T, wfont, wfontDisplay } from '@/lib/theme';

type VideoState = 'none' | 'loading' | 'ready' | 'pro' | 'error';

function fmtDuration(totalSec: number) {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export default function SetDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getToken } = useAuth();
  const session = useStore((s) => s.sessions.find((x) => x.id === id));

  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoState, setVideoState] = useState<VideoState>(session?.videoKey ? 'loading' : 'none');

  useEffect(() => {
    if (!session?.videoKey) return;
    let cancelled = false;
    setVideoState('loading');
    api
      .fileUrl(getToken, session.videoKey)
      .then((r) => {
        if (cancelled) return;
        setVideoUrl(r.url);
        setVideoState('ready');
      })
      .catch((e) => {
        if (cancelled) return;
        setVideoState(e instanceof SubscriptionRequiredError ? 'pro' : 'error');
      });
    return () => {
      cancelled = true;
    };
  }, [session?.videoKey, getToken]);

  if (!session) {
    return (
      <View style={{ flex: 1, backgroundColor: T.bg, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <Text style={{ color: T.text2, fontSize: 15 }}>This set is no longer in your history.</Text>
        <Btn variant="secondary" style={{ marginTop: 16 }} onPress={() => router.back()}>
          Go back
        </Btn>
      </View>
    );
  }

  const date = new Date(session.startedAt);
  const repTimes = session.repTimesMs ?? [];
  const splits = repTimes.slice(1).map((t, i) => (t - repTimes[i]) / 1000);
  const pace = session.durationSec > 0 ? (session.reps / session.durationSec) * 60 : 0;

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 22, paddingTop: insets.top + 10, paddingBottom: insets.bottom + 30 }}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: T.surface2, borderWidth: 1, borderColor: T.line, alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon name="chevL" size={19} color={T.text} />
        </Pressable>

        <Text style={{ fontFamily: wfontDisplay(700), fontSize: 64, lineHeight: 66, color: T.accent, fontVariant: ['tabular-nums'], marginTop: 18 }}>
          {session.reps}
        </Text>
        <Text style={{ fontFamily: wfontDisplay(600), fontSize: 20, textTransform: 'uppercase', color: T.text, marginTop: -2 }}>
          pushups
        </Text>
        <Text style={{ fontSize: 14, color: T.text2, marginTop: 6 }}>
          {date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })} ·{' '}
          {date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
        </Text>

        <View style={{ flexDirection: 'row', gap: 9, marginTop: 18 }}>
          {[
            ['clock', fmtDuration(session.durationSec), 'duration'],
            ['bolt', pace > 0 ? `${pace.toFixed(0)}/min` : '—', 'pace'],
            ['target', session.method === 'pose' ? 'camera' : 'manual', 'counted'],
          ].map(([icon, value, label]) => (
            <Card key={label} style={{ flex: 1, alignItems: 'center', paddingVertical: 14 }}>
              <Icon name={icon} size={17} color={T.accent} strokeWidth={2.2} />
              <Text style={{ fontFamily: wfont(700), fontSize: 15.5, color: T.text, marginTop: 6, fontVariant: ['tabular-nums'] }}>
                {value}
              </Text>
              <Text style={{ fontSize: 11.5, color: T.text3, marginTop: 1 }}>{label}</Text>
            </Card>
          ))}
        </View>

        {videoState !== 'none' && (
          <Card style={{ marginTop: 12, padding: 0, overflow: 'hidden' }}>
            {videoState === 'loading' && (
              <View style={{ height: 120, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator color={T.accent} />
              </View>
            )}
            {videoState === 'ready' && videoUrl && (
              <RepReplay source={videoUrl} repTimesMs={repTimes} videoStartMs={session.videoStartMs ?? 0} height={300} />
            )}
            {videoState === 'pro' && (
              <View style={{ padding: 16, alignItems: 'center' }}>
                <Icon name="play" size={24} color={T.gold} />
                <Text style={{ fontFamily: wfont(700), fontSize: 15, color: T.text, marginTop: 8 }}>
                  Your video is safe in the cloud
                </Text>
                <Text style={{ fontSize: 13, color: T.text2, marginTop: 4, textAlign: 'center' }}>
                  PushUp Pro unlocks watching your recorded sets rep by rep.
                </Text>
                <Btn variant="heat" size="sm" style={{ marginTop: 12 }} onPress={() => router.push('/paywall')}>
                  See Pro
                </Btn>
              </View>
            )}
            {videoState === 'error' && (
              <View style={{ padding: 16, alignItems: 'center' }}>
                <Text style={{ fontSize: 13.5, color: T.text2, textAlign: 'center' }}>
                  Couldn't load this video right now — try again later.
                </Text>
              </View>
            )}
          </Card>
        )}

        {splits.length > 0 && (
          <Card style={{ marginTop: 12 }}>
            <Text style={{ fontFamily: wfont(700), fontSize: 14.5, color: T.text }}>Rep splits</Text>
            <Text style={{ fontSize: 12.5, color: T.text3, marginTop: 1 }}>seconds between reps — watch for the slowdown</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7, paddingTop: 10 }}>
              {splits.map((s, i) => {
                const slow = s > 1.5 * (session.durationSec / Math.max(1, session.reps));
                return (
                  <View
                    key={i}
                    style={{
                      minWidth: 44, paddingVertical: 7, paddingHorizontal: 8, borderRadius: 12, alignItems: 'center',
                      backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: slow ? T.gold : T.line2,
                    }}
                  >
                    <Text style={{ fontFamily: wfont(700), fontSize: 13, color: slow ? T.gold : T.text, fontVariant: ['tabular-nums'] }}>
                      {s.toFixed(1)}s
                    </Text>
                    <Text style={{ fontSize: 10, color: T.text3 }}>
                      {i + 1}→{i + 2}
                    </Text>
                  </View>
                );
              })}
            </ScrollView>
          </Card>
        )}

        {videoState === 'none' && (
          <Card style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Icon name="play" size={18} color={T.text3} />
            <Text style={{ flex: 1, fontSize: 13, color: T.text2 }}>
              No video for this set. Tap the record button during your next session to review your form here.
            </Text>
          </Card>
        )}
      </ScrollView>
    </View>
  );
}
