import { useEffect, useRef } from 'react';
import { Animated, View, type StyleProp, type ViewStyle } from 'react-native';
import { T } from '@/lib/theme';

type BarProps = {
  value?: number;
  color?: string;
  h?: number;
  track?: string;
  glow?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Bar({ value = 0.5, color = T.accent, h = 8, track = 'rgba(255,255,255,0.08)', glow = false, style }: BarProps) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const t = setTimeout(() => {
      Animated.timing(anim, { toValue: value, duration: 1000, useNativeDriver: false }).start();
    }, 80);
    return () => clearTimeout(t);
  }, [value, anim]);
  const width = anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  return (
    <View style={[{ height: h, borderRadius: h, backgroundColor: track, overflow: 'hidden' }, style]}>
      <Animated.View
        style={{
          width: width as unknown as number, height: '100%', borderRadius: h, backgroundColor: color,
          boxShadow: (glow ? `0px 0px 12px ${color}` : undefined) as unknown as string,
        }}
      />
    </View>
  );
}
