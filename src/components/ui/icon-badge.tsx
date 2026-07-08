import { View, type StyleProp, type ViewStyle } from 'react-native';
import { Icon } from './icon';
import { T } from '@/lib/theme';

type IconBadgeProps = {
  name: string;
  size?: number;
  color?: string;
  bg?: string;
  r?: number;
  iconSize?: number;
  style?: StyleProp<ViewStyle>;
};

export function IconBadge({ name, size = 40, color = T.accent, bg, r = 13, iconSize, style }: IconBadgeProps) {
  return (
    <View style={[{ width: size, height: size, borderRadius: r, backgroundColor: bg || 'rgba(60,228,155,0.12)', alignItems: 'center', justifyContent: 'center' }, style]}>
      <Icon name={name} size={iconSize || size * 0.5} color={color} strokeWidth={2} />
    </View>
  );
}
