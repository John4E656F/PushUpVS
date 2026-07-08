import { Pressable, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { T, wfont } from '@/lib/theme';

type SegmentedProps = {
  options: string[];
  value: string;
  onChange?: (val: string) => void;
  style?: StyleProp<ViewStyle>;
};

export function Segmented({ options, value, onChange, style }: SegmentedProps) {
  return (
    <View style={[{ flexDirection: 'row', padding: 4, gap: 4, backgroundColor: T.surface2, borderRadius: 14, borderWidth: 1, borderColor: T.line }, style]}>
      {options.map((o) => {
        const on = o === value;
        return (
          <Pressable
            key={o}
            onPress={() => onChange?.(o)}
            style={{ flex: 1, alignItems: 'center', paddingVertical: 8, paddingHorizontal: 6, borderRadius: 10, backgroundColor: on ? T.accent : 'transparent' }}
          >
            <Text style={{ fontFamily: wfont(700), fontSize: 14, color: on ? T.accentInk : T.text2 }}>{o}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
