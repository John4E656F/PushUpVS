import { useEffect, useRef } from 'react';
import { Animated, Pressable } from 'react-native';
import { T } from '@/lib/theme';

type SwitchProps = { on: boolean; onPress?: () => void };

export function Switch({ on, onPress }: SwitchProps) {
  const anim = useRef(new Animated.Value(on ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: on ? 1 : 0, duration: 200, useNativeDriver: true }).start();
  }, [on, anim]);
  const translateX = anim.interpolate({ inputRange: [0, 1], outputRange: [0, 18] });
  return (
    <Pressable
      onPress={onPress}
      style={{
        width: 44, height: 26, borderRadius: 999, padding: 3,
        backgroundColor: on ? T.accent : T.surface3,
        borderWidth: 1, borderColor: on ? 'transparent' : T.line2,
      }}
    >
      <Animated.View
        style={{
          width: 20, height: 20, borderRadius: 10,
          backgroundColor: on ? T.accentInk : T.text2,
          transform: [{ translateX }],
        }}
      />
    </Pressable>
  );
}
