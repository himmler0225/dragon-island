// Dragon species that have a cut-out rig in public/dragons/<id>/ (built by tools/build_rig.py).
// To add one: build its rig and skills art, then add it here and to SKILLS in skills.ts.

export const SPECIES = ['black_dragon', 'bone_dragon', 'stag_dragon', 'sea_dragon', 'qilin', 'gold_dragon', 'silver_dragon', 'celestial_dragon', 'void_serpent', 'fire_phoenix', 'ice_phoenix', 'fire_dragon', 'earth_dragon', 'east_sea_dragon', 'west_sea_dragon', 'north_sea_dragon', 'south_sea_dragon', 'peacock'] as const;
export type SpeciesId = (typeof SPECIES)[number];

export const SPECIES_INFO: Record<SpeciesId, { name: string; element: string; rarity: string }> = {
  black_dragon: { name: 'Hắc Long', element: 'Băng', rarity: 'SR' },
  bone_dragon: { name: 'Rồng Xương', element: 'Ám', rarity: 'SSR' },
  stag_dragon: { name: 'Tuấn Long', element: 'Quang', rarity: 'SR' },
  sea_dragon: { name: 'Việt Hải Long Vương', element: 'Thủy', rarity: 'SSR' },
  qilin: { name: 'Kì Lân', element: 'Hỏa', rarity: 'SR' },
  gold_dragon: { name: 'Rồng Vàng', element: 'Kim', rarity: 'SSR' },
  silver_dragon: { name: 'Rồng Bạc', element: 'Nguyệt', rarity: 'SSR' },
  celestial_dragon: { name: 'Thần Long', element: 'Thiên', rarity: 'UR' },
  void_serpent: { name: 'Tử Xà Long', element: 'Hư Không', rarity: 'SSR' },
  fire_phoenix: { name: 'Phượng Hoàng Lửa', element: 'Hỏa', rarity: 'SSR' },
  ice_phoenix: { name: 'Phượng Hoàng Băng', element: 'Băng', rarity: 'SSR' },
  fire_dragon: { name: 'Rồng Lửa', element: 'Hỏa', rarity: 'R' },
  earth_dragon: { name: 'Rồng Đất', element: 'Thổ', rarity: 'R' },
  // the Long Vương family: Việt Hải (sea_dragon) and the four seas, same body and moves, own colours
  east_sea_dragon: { name: 'Đông Hải Long Vương', element: 'Hỏa', rarity: 'SSR' },
  west_sea_dragon: { name: 'Tây Hải Long Vương', element: 'Mộc', rarity: 'SSR' },
  north_sea_dragon: { name: 'Bắc Hải Long Vương', element: 'Băng', rarity: 'SSR' },
  south_sea_dragon: { name: 'Nam Hải Long Vương', element: 'Kim', rarity: 'SSR' },
  peacock: { name: 'Khổng Tước', element: 'Mộc', rarity: 'SSR' },
};

export const rigUrl = (id: SpeciesId) => `/dragons/${id}/rig.json`;
/** Riding cloud of species whose rig has motion.rideCloud (tools/slice_cloud.py). */
export const CLOUD_PUFFS = 3;
export const cloudKey = (id: SpeciesId, part: 'main' | number) => `cloud_${part}_${id}`;
export const cloudUrl = (id: SpeciesId, part: 'main' | number) => `/dragons/${id}/cloud_${part}.png`;
export const portraitUrl = (id: SpeciesId) => `/dragons/${id}/portrait.png`;
