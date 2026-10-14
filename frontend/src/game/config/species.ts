// Dragon species that have a cut-out rig in public/dragons/<id>/ (built by tools/build_rig.py).
// To add one: build its rig and skills art, then add it here and to SKILLS in skills.ts.

export const SPECIES = ['hac_long', 'rong_xuong', 'tuan_long', 'hai_long', 'ki_lan'] as const;
export type SpeciesId = (typeof SPECIES)[number];

export const SPECIES_INFO: Record<SpeciesId, { name: string; element: string; rarity: string }> = {
  hac_long: { name: 'Hắc Long', element: 'Băng', rarity: 'SR' },
  rong_xuong: { name: 'Rồng Xương', element: 'Ám', rarity: 'SSR' },
  tuan_long: { name: 'Tuấn Long', element: 'Quang', rarity: 'SR' },
  hai_long: { name: 'Hải Long', element: 'Thủy', rarity: 'SSR' },
  ki_lan: { name: 'Kì Lân', element: 'Hỏa', rarity: 'SR' },
};

export const rigUrl = (id: SpeciesId) => `/dragons/${id}/rig.json`;
/** Riding cloud of species whose rig has motion.rideCloud (tools/slice_cloud.py). */
export const CLOUD_PUFFS = 3;
export const cloudKey = (id: SpeciesId, part: 'main' | number) => `cloud_${part}_${id}`;
export const cloudUrl = (id: SpeciesId, part: 'main' | number) => `/dragons/${id}/cloud_${part}.png`;
export const portraitUrl = (id: SpeciesId) => `/dragons/${id}/portrait.png`;
