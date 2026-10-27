// STRIKES: per-species attack poses (attack / cast / ultimate).
import type { SpeciesId } from '../config/species';
import type { StrikeSet } from './types';
import { track, smoothstep } from './strikes_math';
import { STRIKES_DATA } from './strikes_data';

export { track, smoothstep };

/** STRIKES[SpeciesId]: per-species strike sets (a factory entry is resolved here, once). */
export const STRIKES: Record<SpeciesId, StrikeSet> = Object.fromEntries(
  Object.entries(STRIKES_DATA).map(([k, v]) => [k, typeof v === 'function' ? v() : v])
) as Record<SpeciesId, StrikeSet>;
