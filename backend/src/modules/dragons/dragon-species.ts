// The species the game has (same ids as frontend/src/game/config/species.ts SPECIES and public/dragons/<id>).
export const DRAGON_SPECIES = [
  'black_dragon', 'bone_dragon', 'sea_dragon', 'qilin', 'gold_dragon', 'silver_dragon',
  'celestial_dragon', 'fire_phoenix', 'ice_phoenix', 'fire_dragon', 'earth_dragon', 
  'peacock', 'jade_flame_dragon', 'moon_dragon',
  'stone_ghost_dragon', 'turtle_dragon', 'leaf_dragon', 'immortal_bird', 'ruby_dragon', 'frost_dragon', 'snowflight_dragon', 'rosebud_dragon',
] as const;
export type DragonSpecies = (typeof DRAGON_SPECIES)[number];

/** Every new player gets one of these. */
export const STARTER_SPECIES: DragonSpecies = 'fire_dragon';
/** A guest (the prototype's player, POST /auth/guest) gets one of every species: the islands show them all. */
export const GUEST_ROSTER: readonly DragonSpecies[] = DRAGON_SPECIES;
