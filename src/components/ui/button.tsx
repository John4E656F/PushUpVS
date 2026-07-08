import { Pressable, Text, type StyleProp, type ViewStyle } from 'react-native';
import type { ReactNode } from 'react';
import { Icon } from './icon';
import { T, wfont } from '@/lib/theme';

type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'dark' | 'heat';
type BtnSize = 'sm' | 'md' | 'lg';

type BtnProps = {
  children?: ReactNode;
  onPress?: () => void;
  variant?: BtnVariant;
  size?: BtnSize;
  full?: boolean;
  icon?: string;
  iconRight?: string;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
};

const PADS: Record<BtnSize, [number, number]> = { sm: [8, 14], md: [13, 18], lg: [16, 20] };
const FS: Record<BtnSize, number> = { sm: 14, md: 16, lg: 17 };

const VARIANTS: Record<BtnVariant, { bg: string; color: string; borderColor: string; shadow?: string }> = {
  primary: { bg: T.accent, color: T.accentInk, borderColor: 'transparent', shadow: `0px 8px 26px ${T.accentGlow}` },
  secondary: { bg: T.surface3, color: T.text, borderColor: T.line2 },
  ghost: { bg: 'transparent', color: T.text, borderColor: T.line2 },
  dark: { bg: 'rgba(0,0,0,0.4)', color: T.text, borderColor: T.line2 },
  heat: { bg: T.heat, color: '#1a0a03', borderColor: 'transparent', shadow: `0px 8px 26px ${T.heatGlow}` },
};

export function Btn({ children, onPress, variant = 'primary', size = 'md', full = false, icon, iconRight, style, disabled = false }: BtnProps) {
  const v = VARIANTS[variant];
  const [py, px] = PADS[size];
  const fs = FS[size];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        {
          flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
          paddingVertical: py, paddingHorizontal: px, borderRadius: 999,
          width: full ? '100%' : undefined, borderWidth: 1, borderColor: v.borderColor,
          backgroundColor: v.bg,
          boxShadow: v.shadow as unknown as string,
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      {icon && <Icon name={icon} size={fs + 3} color={v.color} strokeWidth={2.1} />}
      {typeof children === 'string'
        ? <Text style={{ fontFamily: wfont(700), fontSize: fs, color: v.color, letterSpacing: 0.2 }}>{children}</Text>
        : children}
      {iconRight && <Icon name={iconRight} size={fs + 3} color={v.color} strokeWidth={2.1} />}
    </Pressable>
  );
}
