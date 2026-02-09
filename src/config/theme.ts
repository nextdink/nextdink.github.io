/**
 * Centralized Theme Configuration
 * 
 * This file defines all brand colors and theme values in one place.
 * To change the app's color scheme, simply update the values here.
 * 
 * The colors are designed to work with Tailwind CSS and are exported
 * both as a theme object and as CSS custom property names.
 */

// Primary brand color - currently using cyan
// To change: swap these hex values with your desired color palette
export const colors = {
  primary: {
    50: '#ecfeff',
    100: '#cffafe',
    200: '#a5f3fc',
    300: '#67e8f9',
    400: '#22d3ee',
    500: '#06b6d4',
    600: '#0891b2',  // Main brand color (light mode)
    700: '#0e7490',  // Hover state (light mode)
    800: '#155e75',
    900: '#164e63',
    950: '#083344',
  },
} as const;

// Background colors for light/dark modes
export const backgrounds = {
  light: '#ffffff',      // slate-50 alternative: #f8fafc
  dark: '#020617',       // slate-950
} as const;

// Theme color for iOS Safari (status bar)
export const themeColors = {
  light: backgrounds.light,
  dark: backgrounds.dark,
} as const;

// Avatar gradient pairs - vibrant colors that complement the primary brand
// These are used for generated user avatars
export const avatarGradients = [
  [colors.primary[600], colors.primary[500]], // Primary brand colors
  ['#0ea5e9', '#38bdf8'], // sky-500 to sky-400
  ['#059669', '#10b981'], // emerald-600 to emerald-500
  ['#7c3aed', '#8b5cf6'], // violet-600 to violet-500
  ['#db2777', '#ec4899'], // pink-600 to pink-500
  ['#ea580c', '#f97316'], // orange-600 to orange-500
  ['#4f46e5', '#6366f1'], // indigo-600 to indigo-500
  ['#0284c7', '#0ea5e9'], // sky-600 to sky-500
  ['#16a34a', '#22c55e'], // green-600 to green-500
  ['#9333ea', '#a855f7'], // purple-600 to purple-500
  ['#dc2626', '#ef4444'], // red-600 to red-500
  ['#ca8a04', '#eab308'], // yellow-600 to yellow-500
] as const;

// Export a type for the color scale
export type ColorScale = typeof colors.primary;
export type ColorShade = keyof ColorScale;