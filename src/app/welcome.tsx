import { Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Btn, Icon } from '@/components/ui';
import { useStore } from '@/lib/store';
import { T, wfont, wfontDisplay } from '@/lib/theme';

export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const markEntered = useStore((s) => s.markEntered);

  const startTraining = () => {
    markEntered();
    router.replace('/(tabs)');
  };

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      <LinearGradient
        colors={['#0E2A1D', T.bg]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.6 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: insets.top + 80 }}>
        <View
          style={{
            width: 64, height: 64, borderRadius: 20, backgroundColor: T.accent,
            alignItems: 'center', justifyContent: 'center',
            boxShadow: `0px 12px 40px ${T.accentGlow}` as unknown as string,
          }}
        >
          <Icon name="bodyweight" size={34} color={T.accentInk} strokeWidth={2.2} />
        </View>
        <Text style={{ fontFamily: wfontDisplay(700), fontSize: 56, lineHeight: 54, textTransform: 'uppercase', color: T.text, marginTop: 28 }}>
          Every rep{'\n'}counted.
        </Text>
        <Text style={{ fontSize: 16.5, lineHeight: 24, color: T.text2, marginTop: 14, maxWidth: 320 }}>
          Prop up your phone, drop down, and push. The camera tracks your body and counts every pushup — automatically.
        </Text>

        <View style={{ marginTop: 28, gap: 12 }}>
          {[
            ['target', 'AI rep counting with your camera'],
            ['flame', 'Streaks, goals & personal bests'],
            ['play', 'Record and review your sets'],
          ].map(([icon, label]) => (
            <View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(60,228,155,0.14)', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={icon} size={16} color={T.accent} strokeWidth={2.2} />
              </View>
              <Text style={{ fontSize: 15, color: T.text, fontFamily: wfont(500) }}>{label}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 24, gap: 12 }}>
        <Btn variant="primary" full size="lg" iconRight="arrowR" onPress={startTraining}>
          Start training — no account needed
        </Btn>
        <Btn variant="ghost" full size="lg" onPress={() => router.push('/(auth)')}>
          Sign in or create an account
        </Btn>
      </View>
    </View>
  );
}
