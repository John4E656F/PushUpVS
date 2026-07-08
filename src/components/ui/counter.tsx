import { useEffect, useState } from 'react';
import { Text, type StyleProp, type TextStyle } from 'react-native';
import { T, wfont } from '@/lib/theme';

type CounterProps = {
  to?: number;
  dur?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  style?: StyleProp<TextStyle>;
  start?: boolean;
};

export function Counter({ to = 0, dur = 900, decimals = 0, prefix = '', suffix = '', style, start = true }: CounterProps) {
  const [v, setV] = useState(start ? 0 : to);
  useEffect(() => {
    if (!start) { setV(to); return; }
    let raf = 0;
    let t0 = 0;
    const step = (t: number) => {
      if (!t0) t0 = t;
      const p = Math.min(1, (t - t0) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      setV(to * e);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [to, start, dur]);
  return (
    <Text style={[{ fontFamily: wfont(700), color: T.text, fontVariant: ['tabular-nums'] }, style]}>
      {prefix}{v.toFixed(decimals)}{suffix}
    </Text>
  );
}
