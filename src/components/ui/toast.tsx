import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { Animated, Text, View } from 'react-native';
import { Icon } from './icon';
import { T, wfont } from '@/lib/theme';

type ToastProps = { show: boolean; children?: ReactNode; bottom?: number };

export function Toast({ show, children, bottom = T.navH + T.safeBottom + 6 }: ToastProps) {
  const translateY = useRef(new Animated.Value(20)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (show) {
      translateY.setValue(20);
      opacity.setValue(0);
      Animated.parallel([
        Animated.timing(translateY, { toValue: 0, duration: 250, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [show, translateY, opacity]);
  if (!show) return null;
  return (
    <Animated.View
      style={{
        position: 'absolute', left: 16, right: 16, bottom, zIndex: 70,
        flexDirection: 'row', alignItems: 'center', gap: 10,
        paddingVertical: 12, paddingHorizontal: 16, borderRadius: 14,
        backgroundColor: T.accent,
        boxShadow: `0px 10px 30px ${T.accentGlow}` as unknown as string,
        opacity, transform: [{ translateY }],
      }}
    >
      <Icon name="checkCircle" size={19} color={T.accentInk} strokeWidth={2.2} />
      <Text style={{ fontFamily: wfont(700), fontSize: 14, color: T.accentInk }}>{children}</Text>
    </Animated.View>
  );
}
