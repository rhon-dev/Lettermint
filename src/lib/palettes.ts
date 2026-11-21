export interface Palette {
  name: string;
  bg: string;
  /** Second stop used when the gradient fill is on. */
  bg2: string;
  fg: string;
}

/** Curated pairs; every bg/fg and bg2/fg pair passes WCAG AA (asserted in tests). */
export const PALETTES: readonly Palette[] = [
  { name: 'Ink', bg: '#111111', bg2: '#3f3f46', fg: '#ffffff' },
  { name: 'Mint', bg: '#064e3b', bg2: '#047857', fg: '#ecfdf5' },
  { name: 'Violet', bg: '#4c1d95', bg2: '#7c3aed', fg: '#f5f3ff' },
  { name: 'Ocean', bg: '#0c4a6e', bg2: '#0369a1', fg: '#f0f9ff' },
  { name: 'Ember', bg: '#7c2d12', bg2: '#c2410c', fg: '#fff7ed' },
  { name: 'Rose', bg: '#881337', bg2: '#be123c', fg: '#fff1f2' },
  { name: 'Paper', bg: '#fafaf9', bg2: '#e7e5e4', fg: '#1c1917' },
  { name: 'Butter', bg: '#fde68a', bg2: '#fbbf24', fg: '#422006' },
  { name: 'Sage', bg: '#d9f99d', bg2: '#a3e635', fg: '#1a2e05' },
  { name: 'Lilac', bg: '#ede9fe', bg2: '#c4b5fd', fg: '#2e1065' },
  { name: 'Night', bg: '#020617', bg2: '#1e3a8a', fg: '#a5f3fc' },
  { name: 'Coral', bg: '#ffe4e6', bg2: '#fda4af', fg: '#4c0519' },
];
