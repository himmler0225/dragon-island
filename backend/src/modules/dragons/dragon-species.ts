// The species the game has (same ids as frontend/src/game/config/species.ts and public/dragons/<id>).
export const DRAGON_SPECIES = [
  'black_dragon', 'bone_dragon', 'stag_dragon', 'sea_dragon', 'qilin', 'gold_dragon', 'silver_dragon',
  'celestial_dragon', 'void_serpent', 'fire_phoenix', 'ice_phoenix', 'fire_dragon', 'earth_dragon',
] as const;
export type DragonSpecies = (typeof DRAGON_SPECIES)[number];

/** Every new player gets one of these. */
export const STARTER_SPECIES: DragonSpecies = 'fire_dragon';
