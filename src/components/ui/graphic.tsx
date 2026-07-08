import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { T } from '@/lib/theme';

type GraphicKind = 'rings' | 'grid' | 'bars' | 'wave';

function Motif({ kind, accent }: { kind: GraphicKind; accent: string }) {
  const common = { width: '100%' as const, height: '100%' as const, viewBox: '0 0 200 120', preserveAspectRatio: 'xMidYMid slice' };
  switch (kind) {
    case 'rings':
      return (
        <Svg {...common}>
          <Circle cx={150} cy={30} r={70} fill="none" stroke={accent} strokeOpacity={0.5} strokeWidth={1.5} />
          <Circle cx={150} cy={30} r={48} fill="none" stroke={accent} strokeOpacity={0.3} strokeWidth={1.5} />
          <Circle cx={150} cy={30} r={26} fill={accent} fillOpacity={0.18} />
        </Svg>
      );
    case 'grid':
      return (
        <Svg width="100%" height="100%" viewBox="0 0 200 120" preserveAspectRatio="none">
          {Array.from({ length: 7 }).map((_, i) => <Line key={`h${i}`} x1={0} y1={i * 20} x2={200} y2={i * 20} stroke={accent} strokeOpacity={0.12} />)}
          {Array.from({ length: 11 }).map((_, i) => <Line key={`v${i}`} x1={i * 20} y1={0} x2={i * 20} y2={120} stroke={accent} strokeOpacity={0.12} />)}
        </Svg>
      );
    case 'bars':
      return (
        <Svg width="100%" height="100%" viewBox="0 0 200 120" preserveAspectRatio="none">
          {[30, 60, 45, 80, 65, 95, 75].map((v, i) => (
            <Rect key={i} x={12 + i * 27} y={120 - v} width={16} height={v} rx={4} fill={accent} fillOpacity={0.15 + i * 0.04} />
          ))}
        </Svg>
      );
    case 'wave':
      return (
        <Svg width="100%" height="100%" viewBox="0 0 200 120" preserveAspectRatio="none">
          <Path d="M0 80 Q50 40 100 70 T200 60" fill="none" stroke={accent} strokeWidth={2} strokeOpacity={0.7} />
          <Path d="M0 95 Q50 60 100 88 T200 78" fill="none" stroke={accent} strokeWidth={2} strokeOpacity={0.3} />
        </Svg>
      );
  }
}

type GraphicProps = {
  kind?: GraphicKind;
  h?: number;
  accent?: string;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
};

export function Graphic({ kind = 'rings', h = 130, accent = T.accent, style, children }: GraphicProps) {
  return (
    <View style={[{ height: h, position: 'relative', overflow: 'hidden', borderRadius: 16, backgroundColor: T.surface2 }, style]}>
      <LinearGradient
        colors={['rgba(60,228,155,0.10)', 'rgba(60,228,155,0)']}
        start={{ x: 1, y: 0 }}
        end={{ x: 0.25, y: 1 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
        <Motif kind={kind} accent={accent} />
      </View>
      <View style={{ position: 'relative', height: '100%' }}>{children}</View>
    </View>
  );
}
