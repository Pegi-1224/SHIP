/**
 * Mantine theme.
 *
 * The palette mirrors `src/shared/styles/tokens.css` so Mantine components and
 * CSS Module styles stay in sync. Change a colour in both places, or the two
 * halves of the UI drift apart.
 */
import { createTheme, type MantineColorsTuple } from '@mantine/core';

const ship: MantineColorsTuple = [
  '#f6f2fd',
  '#efe9fc',
  '#e4dbfa',
  '#c9b6f4',
  '#9f7de6',
  '#7a4fdb',
  '#5b2acf',
  '#4b20b0',
  '#402093',
  '#2a1566',
];

export const theme = createTheme({
  primaryColor: 'ship',
  // Shade 6 (#5b2acf) passes WCAG AA for white text at body size.
  primaryShade: { light: 6, dark: 5 },
  colors: { ship },
  // Default text colour: the design's ink, not Mantine's pure black.
  black: '#1c1538',
  fontFamily: 'var(--ship-font-body)',
  fontFamilyMonospace: 'var(--ship-font-mono)',
  defaultRadius: 'md',
  radius: {
    sm: '6px',
    md: '10px',
    lg: '16px',
  },
  headings: {
    fontFamily: 'var(--ship-font-body)',
    sizes: {
      h1: { fontSize: 'var(--ship-text-3xl)', lineHeight: '1.2' },
      h2: { fontSize: 'var(--ship-text-2xl)', lineHeight: '1.25' },
      h3: { fontSize: 'var(--ship-text-xl)', lineHeight: '1.3' },
    },
  },
  components: {
    Button: {
      defaultProps: { radius: 'md' },
    },
    Paper: {
      defaultProps: { radius: 'md' },
    },
  },
});
