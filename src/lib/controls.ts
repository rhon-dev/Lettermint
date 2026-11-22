import { WEIGHTS, availableWeights, nearestWeight, type Weight } from '../fonts/registry';
import { LIMITS, type LogoState } from '../store/logo';
import { contrastRatio } from './color';

export interface CraftControls {
  /** Two characters: per-letter rotation and shift apply. */
  pair: boolean;
  showRadius: boolean;
  showSeed: boolean;
  ringAvailable: boolean;
  showStroke: boolean;
  showLetterEnd: boolean;
  weights: { value: Weight; available: boolean }[];
  /** Weight actually drawn when the chosen one is not shipped by the family; null when it is. */
  weightFallback: Weight | null;
}

/** Which Phase 3 controls are visible or enabled for a state. */
export function craftControls(s: LogoState): CraftControls {
  const shipped = availableWeights(s.fontId);
  const drawn = nearestWeight(s.fontId, s.weight);
  return {
    pair: Array.from(s.text).length === 2,
    showRadius: s.shape === 'rounded',
    showSeed: s.shape === 'blob',
    ringAvailable: s.shape !== 'none',
    showStroke: s.letterStyle === 'outline',
    showLetterEnd: s.fgFill === 'gradient',
    weights: WEIGHTS.map((value) => ({ value, available: shipped.includes(value) })),
    weightFallback: drawn === s.weight ? null : drawn,
  };
}

/** Weakest letter/background contrast across all gradient stops; null without a background shape. */
export function worstContrast(s: LogoState): number | null {
  if (s.shape === 'none') return null;
  const bgs = s.fill === 'gradient' ? [s.bgColor, s.bgColor2] : [s.bgColor];
  const fgs = s.fgFill === 'gradient' ? [s.fgColor, s.fgColor2] : [s.fgColor];
  return Math.min(...bgs.flatMap((b) => fgs.map((f) => contrastRatio(b, f))));
}

/** A new blob seed in range that always differs from the current one. */
export function nextBlobSeed(current: number, rand: () => number = Math.random): number {
  const { min, max } = LIMITS.blobSeed;
  const span = max - min; // pick among the other `span` seeds
  const offset = 1 + Math.min(span - 1, Math.floor(rand() * span));
  return ((current - min + offset) % (span + 1)) + min;
}
