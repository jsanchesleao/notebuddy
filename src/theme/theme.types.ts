export type ThemeMode = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

export const THEME_STORAGE_KEY = 'notebuddy:theme-mode'
export const THEME_MODES: readonly ThemeMode[] = ['light', 'dark', 'system']
