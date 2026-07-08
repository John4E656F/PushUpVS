import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { Animated, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { T } from '@/lib/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type RingProps = {
  size?: number;
  stroke?: number;
  value?: number;
  color?: string;
  track?: string;
  children?: ReactNode;
  glow?: boolean;
  anim?: boolean;
};

export function Ring({ size = 92, stroke = 9, value = 0.6, color = T.accent, track = 'rgba(255,255,255,0.08)', children, glow = true, anim = true }: RingProps) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = useRef(new Animated.Value(anim ? 0 : value)).current;
  useEffect(() => {
    const t = setTimeout(() => {
      Animated.timing(p, { toValue: value, duration: 1000, useNativeDriver: false }).start();
    }, 60);
    return () => clearTimeout(t);
  }, [value, p]);
  const strokeDashoffset = p.interpolate({ inputRange: [0, 1], outputRange: [c, 0] });
  return (
    <View
      style={{
        width: size, height: size, alignItems: 'center', justifyContent: 'center',
        boxShadow: (glow ? `0px 0px 16px ${T.accentGlow}` : undefined) as unknown as string,
      }}
    >
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <AnimatedCircle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={`${c}, ${c}`} strokeDashoffset={strokeDashoffset}
        />
      </Svg>
      <View style={{ alignItems: 'center', justifyContent: 'center' }}>{children}</View>
    </View>
  );
}
