export * from './colors';
export * from './typography';
export * from './spacing';

import { colors } from './colors';
import { fontSize, fontWeight, textStyles } from './typography';
import { spacing, borderRadius, shadows } from './spacing';

export const theme = {
  colors,
  fontSize,
  fontWeight,
  textStyles,
  spacing,
  borderRadius,
  shadows,
} as const;

export type Theme = typeof theme;

