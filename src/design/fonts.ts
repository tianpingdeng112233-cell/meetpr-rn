/** These names are also the keys registered by useFonts in the root layout. */
export const fontNames = {
  display: { extraBold: 'Archivo_800ExtraBold', black: 'Archivo_900Black' },
  body: {
    regular: 'IBMPlexSans_400Regular', medium: 'IBMPlexSans_500Medium',
    semibold: 'IBMPlexSans_600SemiBold', bold: 'IBMPlexSans_700Bold',
  },
  mono: {
    regular: 'IBMPlexMono_400Regular', medium: 'IBMPlexMono_500Medium',
    semibold: 'IBMPlexMono_600SemiBold', bold: 'IBMPlexMono_700Bold',
  },
} as const;
