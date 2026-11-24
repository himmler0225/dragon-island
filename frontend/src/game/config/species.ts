// Dragon species that have a cut-out rig in assets/dragons/<id>/ (built by tools/build_rig.py).
// To add one: build its rig and skills art, then add it here and to SKILLS in skills.ts.
import { assetUrl } from './assets';

export const SPECIES = ['black_dragon', 'bone_dragon', 'sea_dragon', 'qilin', 'gold_dragon', 'silver_dragon', 'celestial_dragon', 'fire_phoenix', 'ice_phoenix', 'fire_dragon', 'earth_dragon', 'peacock', 'jade_flame_dragon', 'moon_dragon', 'stone_ghost_dragon', 'turtle_dragon', 'leaf_dragon', 'immortal_bird', 'ruby_dragon', 'frost_dragon', 'snowflight_dragon', 'rosebud_dragon'] as const;
/** Bosses: enemies on the battlefield only, never in a player's collection, team or islands. */
export const BOSSES = ['fire_spirit_boss'] as const;
export type BossId = (typeof BOSSES)[number];
export const isBoss = (id: string): id is BossId => (BOSSES as readonly string[]).includes(id);
/** Everything with a rig: the battlefield loads all of these. */
export const ALL_SPECIES = [...SPECIES, ...BOSSES] as const;
export type SpeciesId = (typeof ALL_SPECIES)[number];

export const SPECIES_INFO: Record<SpeciesId, { name: string; element: string; rarity: string }> = {
  black_dragon: { name: 'Hắc Long', element: 'Băng', rarity: 'SR' },
  bone_dragon: { name: 'Rồng Xương', element: 'Ám', rarity: 'SSR' },
  sea_dragon: { name: 'Việt Hải Long Vương', element: 'Thủy', rarity: 'SSR' },
  qilin: { name: 'Kì Lân', element: 'Hỏa', rarity: 'SR' },
  gold_dragon: { name: 'Rồng Vàng', element: 'Kim', rarity: 'SSR' },
  silver_dragon: { name: 'Rồng Bạc', element: 'Nguyệt', rarity: 'SSR' },
  celestial_dragon: { name: 'Thần Long', element: 'Thiên', rarity: 'UR' },
  fire_phoenix: { name: 'Phượng Hoàng Lửa', element: 'Hỏa', rarity: 'SSR' },
  ice_phoenix: { name: 'Phượng Hoàng Băng', element: 'Băng', rarity: 'SSR' },
  fire_dragon: { name: 'Rồng Lửa', element: 'Hỏa', rarity: 'R' },
  earth_dragon: { name: 'Rồng Đất', element: 'Thổ', rarity: 'R' },
  // the Long Vương family: Việt Hải (sea_dragon) and the four seas, same body and moves, own colours
  peacock: { name: 'Khổng Tước', element: 'Mộc', rarity: 'SSR' },
  jade_flame_dragon: { name: 'Rồng Lửa Mắt Xanh', element: 'Hỏa', rarity: 'SR' },
  moon_dragon: { name: 'Nguyệt Long', element: 'Nguyệt', rarity: 'SR' },
  stone_ghost_dragon: { name: 'Rồng Ma Thạch', element: 'Ám', rarity: 'SSR' },
  turtle_dragon: { name: 'Rồng Rùa', element: 'Thổ', rarity: 'SR' },
  leaf_dragon: { name: 'Rồng Cây', element: 'Mộc', rarity: 'SR' },
  immortal_bird: { name: 'Bất Tử Điểu', element: 'Hỏa', rarity: 'UR' },
  ruby_dragon: { name: 'Hồng Ngọc Long', element: 'Kim', rarity: 'SR' },
  frost_dragon: { name: 'Băng Lộc Long', element: 'Băng', rarity: 'SR' },
  snowflight_dragon: { name: 'Rồng Phi Tuyết', element: 'Băng', rarity: 'SSR' },
  rosebud_dragon: { name: 'Rồng Nụ Tầm Xuân', element: 'Mộc', rarity: 'SR' },
  fire_spirit_boss: { name: 'Hỏa Linh', element: 'Hỏa', rarity: 'BOSS' },
};

export const rigUrl = (id: SpeciesId) => assetUrl(`dragons/${id}/rig.json`);
/** Cloud puffs a species whose rig has motion.rideCloud leaves behind it on the islands (tools/slice_cloud.py). */
export const CLOUD_PUFFS = 3;
export const cloudKey = (id: SpeciesId, part: number) => `cloud_${part}_${id}`;
export const cloudUrl = (id: SpeciesId, part: number) => assetUrl(`dragons/${id}/cloud_${part}.png`);
export const portraitUrl = (id: SpeciesId) => assetUrl(`dragons/${id}/portrait.png`);
/** Zoom of a portrait cropped onto the dragon's front in a thumbnail, for those whose tall wings / crest make it
 *  small there: thumbnails then show every dragon at about the same size. */
export const THUMB_ZOOM: Partial<Record<SpeciesId, number>> = { gold_dragon: 1.55, silver_dragon: 1.55, celestial_dragon: 1.4 };
