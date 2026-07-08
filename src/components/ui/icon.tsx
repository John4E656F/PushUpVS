// Line-icon set — ported from the prototype's hf/icons.jsx `_ic` path data.
// Rendered via SvgXml so the original path strings can be reused almost verbatim.

import { SvgXml } from 'react-native-svg';
import type { StyleProp, ViewStyle } from 'react-native';
import { T } from '@/lib/theme';

const _ic: Record<string, string> = {
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20h14V9.5"/><path d="M9.5 20v-5h5v5"/>',
  dumbbell: '<path d="M2 9v6M5 7v10M19 7v10M22 9v6"/><path d="M5 12h14"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M3 9h18M8 3v4M16 3v4"/>',
  spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4"/><path d="M12 8.5 13.4 11l2.6 1-2.6 1L12 15.5 10.6 13 8 12l2.6-1z" fill="currentColor" stroke="none"/>',
  chart: '<path d="M4 20V4M4 20h16"/><path d="M8 16v-3M12 16V8M16 16v-6M20 16v-2" stroke-linecap="round"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/>',
  flame: '<path d="M12 3c2 3 4.5 4.5 4.5 8a4.5 4.5 0 0 1-9 0c0-1.3.5-2.3 1.2-3.2.4 1 1 1.6 1.8 1.9C10.5 7.5 11 5 12 3Z" fill="currentColor" stroke="none"/>',
  check: '<path d="M5 12.5 10 17 19 7"/>',
  checkCircle: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5 11 15.5 16.5 9"/>',
  chevR: '<path d="M9 5l7 7-7 7"/>',
  chevL: '<path d="M15 5l-7 7 7 7"/>',
  chevD: '<path d="M5 9l7 7 7-7"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  location: '<path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Z"/><circle cx="12" cy="10" r="2.5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
  play: '<path d="M8 5.5v13l11-6.5z" fill="currentColor" stroke="none"/>',
  pause: '<rect x="6" y="5" width="4" height="14" rx="1.2" fill="currentColor" stroke="none"/><rect x="14" y="5" width="4" height="14" rx="1.2" fill="currentColor" stroke="none"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7z" fill="currentColor" stroke="none"/>',
  heart: '<path d="M12 20s-7-4.6-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.4-7 10-7 10Z"/>',
  bell: '<path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z"/><path d="M10 19a2 2 0 0 0 4 0"/>',
  scale: '<rect x="3" y="3" width="18" height="18" rx="4"/><path d="M12 7v3M9 7l.01 0M15 7l.01 0" stroke-linecap="round"/>',
  food: '<path d="M6 3v8a2 2 0 0 0 4 0V3M8 11v10M17 3c-1.5 0-2.5 2-2.5 5s1 4 2.5 4v9"/>',
  swap: '<path d="M7 4 4 7l3 3M4 7h13M17 20l3-3-3-3M20 17H7"/>',
  arrowUp: '<path d="M12 20V5M6 11l6-6 6 6"/>',
  arrowR: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01" stroke-linecap="round"/>',
  lock: '<rect x="5" y="11" width="14" height="9" rx="2.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m4 7 8 6 8-6"/>',
  trophy: '<path d="M7 4h10v4a5 5 0 0 1-10 0V4Z"/><path d="M7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3M10 14v3M14 14v3M8 20h8"/>',
  target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1.3l2-1.5-2-3.4-2.3 1a7 7 0 0 0-2.2-1.3L13.8 2h-3.6l-.4 2.5A7 7 0 0 0 7.6 5.8l-2.3-1-2 3.4 2 1.5A7 7 0 0 0 5.2 12c0 .4 0 .9.1 1.3l-2 1.5 2 3.4 2.3-1a7 7 0 0 0 2.2 1.3l.4 2.5h3.6l.4-2.5a7 7 0 0 0 2.2-1.3l2.3 1 2-3.4-2-1.5c.1-.4.1-.9.1-1.3Z"/>',
  ruler: '<rect x="2.5" y="7" width="19" height="10" rx="2"/><path d="M7 7v3M11 7v4M15 7v3M19 7v4"/>',
  send: '<path d="M4 12 20 4l-6 16-2.5-6.5L4 12Z"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
  sliders: '<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2.2" fill="currentColor" stroke="none"/><circle cx="8" cy="17" r="2.2" fill="currentColor" stroke="none"/>',
  swatch: '<rect x="4" y="4" width="16" height="16" rx="4"/>',
  bodyweight: '<circle cx="12" cy="5" r="2.2"/><path d="M12 8v6M7 10h10M9 20l3-6 3 6"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16v4Z"/><path d="M14 6l4 4"/>',
  rest: '<path d="M5 12a7 7 0 0 0 14 0 6 6 0 0 1-8.5-8A7 7 0 0 0 5 12Z"/>',
  shield: '<path d="M12 3 5 6v5c0 4.5 3 8 7 10 4-2 7-5.5 7-10V6l-7-3Z"/>',
  history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 4v4h4"/><path d="M12 8v4l3 2" stroke-linecap="round"/>',
  refresh: '<path d="M3 12a9 9 0 0 1 15.5-6.3L21 8M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15.5 6.3L3 16M3 21v-5h5"/>',
  wand: '<path d="M5 19 17 7M14 4l1.5 1.5M19 9l1.5 1.5M16 4l.5-2M20 8l2-.5M19.5 5.5 21 4"/>',
};

export type IconName = keyof typeof _ic;

type IconProps = {
  name: string;
  size?: number;
  color?: string;
  strokeWidth?: number;
  style?: StyleProp<ViewStyle>;
};

export function Icon({ name, size = 22, color = T.text, strokeWidth = 1.8, style }: IconProps) {
  const inner = (_ic[name] || '').split('currentColor').join(color);
  const xml = `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
  return <SvgXml xml={xml} width={size} height={size} style={style} />;
}
