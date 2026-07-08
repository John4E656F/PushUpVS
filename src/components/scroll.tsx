import type { ReactNode } from 'react';
import { ScrollView, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { T } from '@/lib/theme';

type ScrollProps = {
  children?: ReactNode;
  pad?: number;
  bottomNav?: boolean;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
};

// scrollable screen body with safe-area aware padding
export function Scroll({ children, pad = 18, bottomNav = false, style, contentStyle }: ScrollProps) {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={[{ flex: 1, backgroundColor: T.bg }, style]}
      contentContainerStyle={[
        {
          paddingTop: insets.top + 14,
          paddingLeft: pad,
          paddingRight: pad,
          paddingBottom: bottomNav ? T.navH + T.safeBottom + 16 : insets.bottom + 24,
        },
        contentStyle,
      ]}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  );
}
