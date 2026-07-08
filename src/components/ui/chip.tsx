import { Pressable, Text, type StyleProp, type ViewStyle } from 'react-native';
import type { ReactNode } from 'react';
import { Icon } from './icon';
import { T, wfont } from '@/lib/theme';

type ChipProps = {
  children?: ReactNode;
  active?: boolean;
  onPress?: () => void;
  icon?: string;
  sm?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Chip({ children, active = false, onPress, icon, sm = false, style }: ChipProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          flexDirection: 'row', alignItems: 'center', gap: 6,
          paddingVertical: sm ? 6 : 8, paddingHorizontal: sm ? 11 : 14,
          borderRadius: 999, alignSelf: 'flex-start',
          backgroundColor: active ? T.accent : T.surface2,
          borderWidth: 1, borderColor: active ? 'transparent' : T.line,
          opacity: pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      {icon && <Icon name={icon} size={sm ? 14 : 16} color={active ? T.accentInk : T.text2} strokeWidth={2} />}
      {typeof children === 'string'
        ? <Text style={{ fontFamily: wfont(600), fontSize: sm ? 13 : 14, color: active ? T.accentInk : T.text2 }}>{children}</Text>
        : children}
    </Pressable>
  );
}
