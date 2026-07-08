import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import type { ReactNode } from 'react';
import { T } from '@/lib/theme';

type CardProps = {
  children?: ReactNode;
  pad?: number;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  glow?: boolean;
};

export function Card({ children, pad = 16, style, onPress, glow = false }: CardProps) {
  const base: ViewStyle = {
    backgroundColor: T.surface, borderWidth: 1, borderColor: T.line, borderRadius: T.radius, padding: pad,
    boxShadow: (glow ? '0px 10px 30px rgba(0,0,0,0.4)' : undefined) as unknown as string,
  };
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [base, { opacity: pressed ? 0.85 : 1 }, style]}>
        {children}
      </Pressable>
    );
  }
  return <View style={[base, style]}>{children}</View>;
}
