import { Text, View } from 'react-native';
import { useUser } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';

import { Btn, Card, Icon, Ring } from '@/components/ui';
import { Scroll } from '@/components/scroll';
import { useStore } from '@/lib/store';
import { T, wfont, wfontDisplay } from '@/lib/theme';

function StatCard({ icon, value, label, tint }: { icon: string; value: string; label: string; tint?: string }) {
  return (
    <Card style={{ flex: 1, alignItems: 'center', paddingVertical: 16 }}>
      <Icon name={icon} size={20} color={tint ?? T.accent} strokeWidth={2} />
      <Text style={{ fontFamily: wfontDisplay(700), fontSize: 26, color: T.text, marginTop: 6, fontVariant: ['tabular-nums'] }}>{value}</Text>
      <Text style={{ fontSize: 11.5, color: T.text3, textTransform: 'uppercase', letterSpacing: 0.5, fontFamily: wfont(600), marginTop: 1 }}>{label}</Text>
    </Card>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useUser();
  const stats = useStore((s) => s.stats);
  const dailyGoal = useStore((s) => s.dailyGoal);
  const sessions = useStore((s) => s.sessions);

  const todayReps = stats?.todayReps ?? 0;
  const progress = Math.min(1, dailyGoal > 0 ? todayReps / dailyGoal : 0);
  const firstName = user?.firstName ?? 'there';
  const last = sessions[0];

  return (
    <Scroll bottomNav>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
        <View>
          <Text style={{ fontSize: 14.5, color: T.text2 }}>Hey {firstName} 👋</Text>
          <Text style={{ fontFamily: wfontDisplay(600), fontSize: 30, lineHeight: 32, textTransform: 'uppercase', color: T.text, marginTop: 2 }}>
            Today's pushups
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,122,69,0.14)', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999 }}>
          <Icon name="flame" size={16} color={T.heat} />
          <Text style={{ fontFamily: wfont(700), fontSize: 14, color: T.heat, fontVariant: ['tabular-nums'] }}>
            {stats?.streakDays ?? 0}
          </Text>
        </View>
      </View>

      <Card style={{ alignItems: 'center', paddingVertical: 26, marginTop: 18 }}>
        <Ring size={170} stroke={13} value={progress} anim>
          <Text style={{ fontFamily: wfontDisplay(700), fontSize: 52, color: T.text, fontVariant: ['tabular-nums'], lineHeight: 54 }}>
            {todayReps}
          </Text>
          <Text style={{ fontSize: 13, color: T.text3 }}>of {dailyGoal} goal</Text>
        </Ring>
        <Text style={{ fontSize: 14.5, color: T.text2, marginTop: 18, textAlign: 'center' }}>
          {todayReps >= dailyGoal
            ? 'Goal crushed. Extra reps are pure profit. 💪'
            : todayReps > 0
              ? `${dailyGoal - todayReps} to go — keep pushing.`
              : 'Prop your phone against the wall and drop down.'}
        </Text>
        <Btn variant="primary" size="lg" full iconRight="arrowR" style={{ marginTop: 18 }} onPress={() => router.push('/session')}>
          Start pushups
        </Btn>
      </Card>

      <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
        <StatCard icon="trophy" value={String(stats?.bestSession ?? 0)} label="Best set" tint={T.gold} />
        <StatCard icon="calendar" value={String(stats?.weekReps ?? 0)} label="This week" />
        <StatCard icon="chart" value={String(stats?.allTimeReps ?? 0)} label="All time" />
      </View>

      {last && (
        <Card style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 13 }}>
          <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: 'rgba(60,228,155,0.12)', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="history" size={20} color={T.accent} strokeWidth={2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: wfont(700), fontSize: 15, color: T.text }}>
              Last set: {last.reps} reps
            </Text>
            <Text style={{ fontSize: 12.5, color: T.text2, marginTop: 1 }}>
              {new Date(last.startedAt).toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' })}
              {' · '}
              {last.method === 'pose' ? 'camera counted' : 'manual count'}
            </Text>
          </View>
          <Icon name="chevR" size={18} color={T.text3} />
        </Card>
      )}
    </Scroll>
  );
}
