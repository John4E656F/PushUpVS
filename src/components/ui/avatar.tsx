import { Text, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { T, wfontDisplay } from '@/lib/theme';

type AvatarProps = { label?: string; size?: number; style?: StyleProp<ViewStyle> };

export function Avatar({ label = 'A', size = 40, style }: AvatarProps) {
  return (
    <LinearGradient
      colors={[T.accent, '#1aa873']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center' }, style]}
    >
      <Text style={{ fontFamily: wfontDisplay(700), fontSize: size * 0.42, color: T.accentInk }}>{label}</Text>
    </LinearGradient>
  );
}
