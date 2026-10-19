// Dragon species that have a cut-out rig in public/dragons/<id>/ (built by tools/build_rig.py).
// To add one: build its rig and skills art, then add it here and to SKILLS in skills.ts.

export const SPECIES = ['hac_long', 'rong_xuong', 'tuan_long', 'hai_long', 'ki_lan', 'rong_vang', 'rong_bac', 'than_long', 'tu_xa_long', 'phuong_hoang_lua', 'phuong_hoang_bang', 'rong_lua_do', 'rong_dat_nau', 'rong_cay_xanh_la', 'rong_bang_xanh_bien'] as const;
export type SpeciesId = (typeof SPECIES)[number];

export const SPECIES_INFO: Record<SpeciesId, { name: string; element: string; rarity: string }> = {
  hac_long: { name: 'Hắc Long', element: 'Băng', rarity: 'SR' },
  rong_xuong: { name: 'Rồng Xương', element: 'Ám', rarity: 'SSR' },
  tuan_long: { name: 'Tuấn Long', element: 'Quang', rarity: 'SR' },
  hai_long: { name: 'Hải Long', element: 'Thủy', rarity: 'SSR' },
  ki_lan: { name: 'Kì Lân', element: 'Hỏa', rarity: 'SR' },
  rong_vang: { name: 'Rồng Vàng', element: 'Kim', rarity: 'SSR' },
  rong_bac: { name: 'Rồng Bạc', element: 'Nguyệt', rarity: 'SSR' },
  than_long: { name: 'Thần Long', element: 'Thiên', rarity: 'UR' },
  tu_xa_long: { name: 'Tử Xà Long', element: 'Hư Không', rarity: 'SSR' },
  phuong_hoang_lua: { name: 'Phượng Hoàng Lửa', element: 'Hỏa', rarity: 'SSR' },
  phuong_hoang_bang: { name: 'Phượng Hoàng Băng', element: 'Băng', rarity: 'SSR' },
  rong_lua_do: { name: 'Rồng Lửa', element: 'Hỏa', rarity: 'R' },
  rong_dat_nau: { name: 'Rồng Đất', element: 'Thổ', rarity: 'R' },
  rong_cay_xanh_la: { name: 'Rồng Rừng', element: 'Mộc', rarity: 'R' },
  rong_bang_xanh_bien: { name: 'Rồng Băng', element: 'Băng', rarity: 'R' },
};

export const rigUrl = (id: SpeciesId) => `/dragons/${id}/rig.json`;
/** Riding cloud of species whose rig has motion.rideCloud (tools/slice_cloud.py). */
export const CLOUD_PUFFS = 3;
export const cloudKey = (id: SpeciesId, part: 'main' | number) => `cloud_${part}_${id}`;
export const cloudUrl = (id: SpeciesId, part: 'main' | number) => `/dragons/${id}/cloud_${part}.png`;
export const portraitUrl = (id: SpeciesId) => `/dragons/${id}/portrait.png`;
