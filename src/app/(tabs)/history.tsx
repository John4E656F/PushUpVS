import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { useAuth } from '@clerk/clerk-expo';

import { Card, Icon } from '@/components/ui';
import { Scroll } from '@/components/scroll';
import { useStore } from '@/lib/store';
import { T, wfont, wfontDisplay } from '@/lib/theme';
import type { WorkoutSession } from '@/lib/types';

function WeekChart() {
  const stats = useStore((s) => s.stats);
  const days = stats?.last7Days ?? [];
  const max = Math.max(1, ...days.map((d) => d.reps));
  return (
    <Card style={{ paddingVertical: 18 }}>
      <Text style={{ fontFamily: wfontDisplay(600), fontSize: 17, textTransform: 'uppercase', color: T.text, marginBottom: 14 }}>
        Last 7 days
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 110 }}>
        {days.map((d, i) => {
          const isToday = i === days.length - 1;
          const h = Math.max(4, (d.reps / max) * 96);
          return (
            <View key={d.date} style={{ alignItems: 'center', gap: 6, flex: 1 }}>
              {d.reps > 0 && (
                <Text style={{ fontSize: 10.5, color: isToday ? T.accent : T.text3, fontFamily: wfont(600), fontVariant: ['tabular-nums'] }}>
                  {d.reps}
                </Text>
              )}
              <View
                style={{
                  width: 22, height: h, borderRadius: 7,
                  backgroundColor: isToday ? T.accent : d.reps > 0 ? 'rgba(60,228,155,0.35)' : T.surface3,
                  boxShadow: (isToday ? `0px 0px 14px ${T.accentGlow}` : undefined) as unknown as string,
                }}
              />
              <Text style={{ fontSize: 10, color: isToday ? T.text : T.text3, fontFamily: wfont(600) }}>
                {new Date(`${d.date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'narrow' })}
              </Text>
            </View>
          );
        })}
      </View>
    </Card>
  );
}

function SessionRow({ session, onDelete }: { session: WorkoutSession; onDelete: () => void }) {
  const date = new Date(session.startedAt);
  const mins = Math.floor(session.durationSec / 60);
  const secs = session.durationSec % 60;
  return (
    <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 13 }}>
      <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: 'rgba(60,228,155,0.12)', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontFamily: wfontDisplay(700), fontSize: 17, color: T.accent, fontVariant: ['tabular-nums'] }}>{session.reps}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: wfont(700), fontSize: 15, color: T.text }}>
          {session.reps} pushups
          {session.videoKey ? '  🎥' : ''}
        </Text>
        <Text style={{ fontSize: 12.5, color: T.text2, marginTop: 1 }}>
          {date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} ·{' '}
          {date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })} · {mins > 0 ? `${mins}m ` : ''}
          {secs}s · {session.method === 'pose' ? 'camera' : 'manual'}
          {session.synced ? '' : ' · not synced'}
        </Text>
      </View>
      <Pressable
        onPress={onDelete}
        hitSlop={10}
        style={{ width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }}
      >
        <Icon name="close" size={16} color={T.text3} />
      </Pressable>
    </Card>
  );
}

export default function HistoryScreen() {
  const { getToken } = useAuth();
  const sessions = useStore((s) => s.sessions);
  const stats = useStore((s) => s.stats);
  const deleteSession = useStore((s) => s.deleteSession);
  const [error, setError] = useState('');

  const confirmDelete = (session: WorkoutSession) => {
    Alert.alert('Delete this set?', `${session.reps} reps will be removed from your history.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          deleteSession(getToken, session.id).catch((e) => setError(e.message ?? 'Could not delete')),
      },
    ]);
  };

  return (
    <Scroll bottomNav>
      <Text style={{ fontFamily: wfontDisplay(600), fontSize: 30, lineHeight: 32, textTransform: 'uppercase', color: T.text, marginTop: 6 }}>
        Your progress
      </Text>
      <Text style={{ fontSize: 14.5, color: T.text2, marginTop: 4, marginBottom: 16 }}>
        {stats ? `${stats.allTimeReps} pushups across ${stats.sessionCount} sets. Keep stacking.` : 'Your training log lives here.'}
      </Text>

      <WeekChart />

      <Text style={{ fontFamily: wfontDisplay(600), fontSize: 17, textTransform: 'uppercase', color: T.text, marginTop: 22, marginBottom: 10 }}>
        All sets
      </Text>
      {!!error && <Text style={{ color: T.heat, fontSize: 13.5, marginBottom: 8 }}>{error}</Text>}
      {sessions.length === 0 ? (
        <Card style={{ alignItems: 'center', paddingVertical: 30 }}>
          <Icon name="bodyweight" size={30} color={T.text3} />
          <Text style={{ fontSize: 14.5, color: T.text2, marginTop: 10, textAlign: 'center' }}>
            No sets yet. Hit the green button{'\n'}and let the camera do the counting.
          </Text>
        </Card>
      ) : (
        <View style={{ gap: 9 }}>
          {sessions.map((s) => (
            <SessionRow key={s.id} session={s} onDelete={() => confirmDelete(s)} />
          ))}
        </View>
      )}
    </Scroll>
  );
}
