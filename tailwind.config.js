/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
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
        heat: '#FF7A45',
        gold: '#FFC24B',
      },
      fontFamily: {
        display: ['BarlowCondensed_600SemiBold'],
        displayBold: ['BarlowCondensed_700Bold'],
        body: ['Barlow_400Regular'],
        bodyMedium: ['Barlow_500Medium'],
        bodySemi: ['Barlow_600SemiBold'],
        bodyBold: ['Barlow_700Bold'],
      },
    },
  },
  plugins: [],
};
