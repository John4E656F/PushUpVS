import { useEffect, useRef } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { Icon } from '@/components/ui';
import { T, wfontDisplay } from '@/lib/theme';

type TabBarProps = {
  state: { index: number; routes: { key: string; name: string }[] };
  navigation: { navigate: (name: string) => void };
};

const ITEMS = [
  { key: 'index', icon: 'home', label: 'Today' },
  { key: 'start', icon: 'bodyweight', label: 'Push', center: true },
  { key: 'history', icon: 'chart', label: 'Stats' },
  { key: 'profile', icon: 'user', label: 'You' },
] as const;

function PulsingDot() {
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.1, duration: 1200, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [scale]);
  return (
    <Animated.View
      style={{
        width: 56, height: 56, borderRadius: 28, backgroundColor: T.accent,
        alignItems: 'center', justifyContent: 'center',
        boxShadow: `0px 8px 24px ${T.accentGlow}, 0px 0px 0px 6px ${T.bg}` as unknown as string,
        transform: [{ scale }],
      }}
    >
      <Icon name="bodyweight" size={28} color={T.accentInk} strokeWidth={2.2} />
    </Animated.View>
  );
}

// floating glass tab bar — the raised center button starts a pushup session
export function TabBar({ state, navigation }: TabBarProps) {
  const router = useRouter();
  const active = state.routes[state.index]?.name;
  return (
    <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 40 }} pointerEvents="box-none">
      <LinearGradient
        colors={[T.bg, 'transparent']}
        locations={[0.3, 1]}
        start={{ x: 0, y: 1 }}
        end={{ x: 0, y: 0 }}
        style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: T.navH + T.safeBottom + 14 }}
        pointerEvents="none"
      />
      <View
        style={{
          marginHorizontal: 16, marginBottom: T.safeBottom - 4, height: T.navH - 8,
          borderRadius: 24, borderWidth: 1, borderColor: T.line2, overflow: 'hidden',
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingHorizontal: 6,
          boxShadow: '0px 12px 34px rgba(0,0,0,0.5)' as unknown as string,
        }}
      >
        <BlurView intensity={40} tint="dark" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(22,25,29,0.7)' }} />
        {ITEMS.map((it) => {
          if ('center' in it && it.center) {
            return (
              <Pressable key={it.key} onPress={() => router.push('/session')} style={{ marginTop: -26 }}>
                <PulsingDot />
              </Pressable>
            );
          }
          const on = active === it.key;
          return (
            <Pressable
              key={it.key}
              onPress={() => navigation.navigate(it.key)}
              style={{ alignItems: 'center', gap: 3, width: 56, paddingVertical: 8 }}
            >
              <Icon name={it.icon} size={23} color={on ? T.accent : T.text3} strokeWidth={on ? 2.3 : 1.9} />
              <Text style={{ fontSize: 10.5, fontFamily: wfontDisplay(700), letterSpacing: 0.3, textTransform: 'uppercase', color: on ? T.accent : T.text3 }}>{it.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
