export const colors = {
  // Primary brand colors - Deep Ocean Blue
  primary: {
    50: '#EEF6FF',
    100: '#DBEAFE',
    200: '#BFDBFE',
    300: '#93C5FD',
    400: '#60A5FA',
    500: '#3B82F6', // Main brand color
    600: '#2563EB',
    700: '#1D4ED8',
    800: '#1E40AF',
    900: '#1E3A8A',
  },
  
  // Success/Achievement colors - Emerald
  success: {
    50: '#ECFDF5',
    100: '#D1FAE5',
    200: '#A7F3D0',
    300: '#6EE7B7',
    400: '#34D399',
    500: '#10B981', // Main success
    600: '#059669',
    700: '#047857',
  },
  
  // Warning/Attention colors - Amber
  warning: {
    50: '#FFFBEB',
    100: '#FEF3C7',
    200: '#FDE68A',
    300: '#FCD34D',
    400: '#FBBF24',
    500: '#F59E0B', // Main warning
    600: '#D97706',
    700: '#B45309',
  },
  
  // Danger/Error colors - Rose
  danger: {
    50: '#FFF1F2',
    100: '#FFE4E6',
    200: '#FECDD3',
    300: '#FDA4AF',
    400: '#FB7185',
    500: '#F43F5E', // Main danger
    600: '#E11D48',
    700: '#BE123C',
  },
  
  // Accent - Violet
  accent: {
    50: '#F5F3FF',
    100: '#EDE9FE',
    200: '#DDD6FE',
    300: '#C4B5FD',
    400: '#A78BFA',
    500: '#8B5CF6', // Main accent
    600: '#7C3AED',
    700: '#6D28D9',
  },
  
  // Neutral colors - Slate
  gray: {
    50: '#F8FAFC',
    100: '#F1F5F9',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',
    600: '#475569',
    700: '#334155',
    800: '#1E293B',
    900: '#0F172A',
    950: '#020617',
  },
  
  // Pure colors
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
  
  // Semantic colors for light theme
  light: {
    background: '#FFFFFF',
    surface: '#F8FAFC',
    surfaceElevated: '#FFFFFF',
    text: '#0F172A',
    textSecondary: '#64748B',
    textMuted: '#94A3B8',
    border: '#E2E8F0',
    borderLight: '#F1F5F9',
  },
  
  // Semantic colors for dark theme
  dark: {
    background: '#0F172A',
    surface: '#1E293B',
    surfaceElevated: '#334155',
    text: '#F8FAFC',
    textSecondary: '#94A3B8',
    textMuted: '#64748B',
    border: '#334155',
    borderLight: '#1E293B',
  },
} as const;

// Category colors for goals
export const categoryColors: Record<string, string> = {
  health: '#10B981',
  career: '#3B82F6',
  relationships: '#F43F5E',
  finance: '#F59E0B',
  personal: '#8B5CF6',
  learning: '#06B6D4',
};

// Score grade colors
export const scoreColors = {
  excellent: '#10B981', // 90+
  good: '#34D399',      // 80-89
  fair: '#F59E0B',      // 70-79
  poor: '#F97316',      // 60-69
  critical: '#F43F5E',  // <60
};

export const getScoreColor = (score: number): string => {
  if (score >= 90) return scoreColors.excellent;
  if (score >= 80) return scoreColors.good;
  if (score >= 70) return scoreColors.fair;
  if (score >= 60) return scoreColors.poor;
  return scoreColors.critical;
};

