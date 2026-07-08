// Design tokens — dark, premium, athletic. Mirrors the BeFit hi-fi prototype.

export const T = {
  bg: '#0B0C0F',
  surface: '#15181C',
  surface2: '#1C2025',
  surface3: '#252A31',
  line: 'rgba(255,255,255,0.07)',
  line2: 'rgba(255,255,255,0.13)',

  text: '#F4F6F8',
  text2: '#9BA3AE',
  text3: '#646C77',

  accent: '#3CE49B',
  accentDim: '#2BC384',
  accentInk: '#04130C',
  accentGlow: 'rgba(60,228,155,0.30)',
  heat: '#FF7A45',
  heatGlow: 'rgba(255,122,69,0.32)',
  gold: '#FFC24B',

  fontDisplay: 'BarlowCondensed_600SemiBold',
  fontDisplayBold: 'BarlowCondensed_700Bold',
  font: 'Barlow_400Regular',
  fontMedium: 'Barlow_500Medium',
  fontSemi: 'Barlow_600SemiBold',
  fontBold: 'Barlow_700Bold',

  safeBottom: 30,
  navH: 76,
  radius: 22,
} as const;

export const heroGrad = ['#14181C', '#0B0C0F'] as const;

// RN maps custom font families by exact PostScript name, not CSS `font-weight` —
// pick the matching Barlow weight family for a given numeric weight instead.
export function wfont(weight: number): string {
  if (weight >= 700) return T.fontBold;
  if (weight >= 600) return T.fontSemi;
  if (weight >= 500) return T.fontMedium;
  return T.font;
}

export function wfontDisplay(weight: number): string {
  return weight >= 700 ? T.fontDisplayBold : T.fontDisplay;
}
