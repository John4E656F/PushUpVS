import type { ReactNode } from 'react';
import { Pressable, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { Icon } from '@/components/ui';
import { T, wfontDisplay } from '@/lib/theme';

type TopRowProps = {
  title?: string;
  onBack?: (() => void) | null;
  trailing?: ReactNode;
  sub?: string;
  style?: StyleProp<ViewStyle>;
};

// compact top row (back chevron / title / trailing) for pushed screens
export function TopRow({ title, onBack, trailing, sub, style }: TopRowProps) {
  const router = useRouter();
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 38, marginBottom: 14 }, style]}>
      {onBack !== null && (
        <Pressable
          onPress={onBack || (() => router.back())}
          style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: T.surface2, borderWidth: 1, borderColor: T.line, alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon name="chevL" size={20} color={T.text} />
        </Pressable>
      )}
      <View style={{ flex: 1, minWidth: 0 }}>
        {title && <Text style={{ fontFamily: wfontDisplay(600), fontSize: 21, lineHeight: 22, textTransform: 'uppercase', letterSpacing: 0.4, color: T.text }}>{title}</Text>}
        {sub && <Text style={{ fontSize: 13, color: T.text2, marginTop: 3 }}>{sub}</Text>}
      </View>
      {trailing}
    </View>
  );
}
