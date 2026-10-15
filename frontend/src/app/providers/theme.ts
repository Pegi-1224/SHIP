/**
 * Mantine theme.
 *
 * The palette mirrors `src/shared/styles/tokens.css` so Mantine components and
 * CSS Module styles stay in sync. Change a colour in both places, or the two
 * halves of the UI drift apart.
 */
import { createTheme, type MantineColorsTuple } from '@mantine/core';

const ship: MantineColorsTuple = [
  '#f2f6f0',
  '#dfe9db',
  '#bfd3b9',
  '#9cbb98',
  '#78a07c',
  '#4f7f62',
  '#315d48',
  '#2b513f',
  '#264536',
  '#22372e',
];

export const theme = createTheme({
  primaryColor: 'ship',
  // Shade 6 (#315d48) passes WCAG AA for white text at body size.
  primaryShade: { light: 6, dark: 5 },
  colors: { ship },
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
