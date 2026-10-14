# Điều chỉnh thường gặp

Hướng dẫn nhanh "số nào ở đâu" để thay đổi các thông số gameplay.

---

## Rồng di chuyển

| Thay đổi | File | Constant / dòng |
|----------|------|-----------------|
| Tốc độ khi đi bộ | `game/rig/tuning.ts` | `RIG.stride` (rig px / cycle) |
| Thời gian 1 walk cycle | `game/rig/tuning.ts` | `RIG.cycle` (giây) |
| Tốc độ tính toán walk: `RIG.stride / RIG.cycle` = px/s | — | — |
| Chân nhấc cao bao nhiêu | `game/rig/tuning.ts` | `RIG.lift.fore`, `RIG.lift.hind` (rig px) |
| Chân đặt xa bao nhiêu mỗi cycle | `game/rig/tuning.ts` | `RIG.stride` |
| Thời gian bay (takeoff → cruise) | `game/config/economy.ts` | `TAKEOFF_S = 0.8` |
| Thời gian hạ cánh | `game/config/economy.ts` | `LAND_S = 0.7` |
| Tốc độ bay (px/s) | `game/config/economy.ts` | `FLY_SPEED = 95` |
| Độ cao khi bay | `game/config/economy.ts` | `FLY_ALT = 90` (body px) |
| Scale rồng trên màn hình | `game/config/economy.ts` | `DRAGON_SCALE = 0.68` |
| Hover khi combat (đánh rồi đứng trên không) | `game/rig/types.ts` | `COMBAT_HOVER` |

**Ví dụ:** Muốn rồng đi nhanh hơn → tăng `RIG.stride` hoặc giảm `RIG.cycle`.

**Ví dụ:** Muốn Hắc Long bay cao hơn khi combat → thêm vào `COMBAT_HOVER`:
```typescript
// game/rig/types.ts
export const COMBAT_HOVER: Partial<Record<SpeciesId, number>> = {
  hac_long: 120,   // tăng từ 95
};
```

---

## Đuôi

| Thay đổi | File | Constant |
|----------|------|----------|
| Góc lắc đuôi khi ngủ | `game/rig/strikes.ts` | `STRIKES[<id>].attack.tail` (nếu có) |
| Độ sóng đuôi khi bơi (Hải Long) | `game/config/species.ts` | `SPECIES_INFO.hai_long.motion.tailWave` |
| Tail sway khi idle/walk | `game/rig/tuning.ts` | `RIG.sleepRate` (chỉ khi ngủ thôi) |

---

## Cánh

| Thay đổi | File | Constant |
|----------|------|----------|
| Tốc độ vỗ cánh (beat/s) | `game/rig/tuning.ts` | `RIG.flapRate = 1.7` |
| Wing spread khi đứng yên | `game/rig/types.ts` | `SPECIES_INFO.<id>.motion.wingSpread: [near, far]` |
| Độ nghiêng khi bay | `game/rig/types.ts` | `SPECIES_INFO.<id>.motion.flyPitch` |

---

## Skill effects

Trong `game/skills/registry.ts`:

| Thay đổi | Constant |
|-----------|----------|
| Kích thước hiệu ứng (mặc định) | `VFX_SIZE = 1.0` |
| Thời gian hiệu ứng (mặc định) | `VFX_DUR = 0.7` |
| Radius splash effect | `SPLASH_RADIUS = 120` |

Khi gọi effect trong skill definition:
```typescript
{ fx: 'gust', fxSize: 1.5 }   // scale riêng cho skill này
```

---

## Đảo

| Thay đổi | File | Constant |
|----------|------|----------|
| Kích thước ảnh đảo | `game/config/islands.ts` | `ISLANDS[i].w`, `ISLANDS[i].h` |
| Scale hiển thị đảo | `game/config/islands.ts` | `ISLANDS[i].scale` |
| Vùng đi được (polygon) | `game/config/islands.ts` | `ISLANDS[i].walk: Point[]` |
| Rồng chủ (đặt ở đâu) | `game/config/islands.ts` | `ISLANDS[i].dragon`, `ISLANDS[i].start` |
| Rồng khách (guest) | `game/config/islands.ts` | `ISLANDS[i].guests[]` |
| Tọa độ công trình | `game/config/islands.ts` | `ISLANDS[i].buildings[].at` |
| Cấp công trình | `game/config/islands.ts` | `ISLANDS[i].buildings[].level` |

**Thêm đảo mới:**
1. Thêm object vào `ISLANDS[]` trong `islands.ts`
2. Tạo `assets/island/<id>.png` (mặt đất nổi trên nền `#FF00FF`)
3. Chạy `.venv/bin/python tools/slice_world.py`
4. Cập nhật viewport count trong `world.ts` nếu cần

---

## Kinh tế / Sản xuất

| Thay đổi | File | Constant |
|----------|------|----------|
| Tên resource | `game/config/economy.ts` | `RESOURCE_NAME` |
| Tên building | `game/config/economy.ts` | `BUILDING_NAME` |
| Scale hiển thị building | `game/config/economy.ts` | `BUILDING_SCALE = 0.42` |
| Resource nào mỗi building sản xuất | `game/config/economy.ts` | `PRODUCES` |
| Thời gian fill / lượng thu mỗi cấp | `game/config/economy.ts` | `PRODUCTION[resource].every[lvl-1]`, `PRODUCTION[resource].amount[lvl-1]` |

**Ví dụ:** Giảm thời gian fill vàng cấp 3 từ 6s → 4s:
```typescript
// game/config/economy.ts
export const PRODUCTION: Record<Resource, { every: number[]; amount: number[] }> = {
  gold: { every: [8, 7, 4], amount: [50, 120, 260] },  // cấp 3: 4s
  // ...
};
```

---

## IslandScene / Camera

| Thay đổi | File | Dòng / Constant |
|----------|------|-----------------|
| Kích thước viewport | `game/config/world.ts` | `W = 1280`, `H = 860` |
| World width (số đảo × W) | `game/config/world.ts` | `WORLD_W = W * 3` |
| Camera drag sensitivity | `game/scene/IslandScene.ts` | `dragSpeed` |
| Wave animation speed | `game/scene/Island.ts` | `Wave` tốc độ trong fragment shader |

---

## Art pipeline (tools)

| Thay đổi | File | Constant |
|----------|------|----------|
| Tốc độ chân (stride) trong gait design | `tools/legacy/gait_design.py` | `STRIDE = 56` |
| Export height của rig (game dùng 0.5×) | `tools/build_rig.py` | `TARGET_HEIGHT = 416` |
| Scale ảnh legs → layout px | `tools/rig_configs/<id>.py` | `leg_scale` |
| Độ tối chân/cánh far | `tools/rig_configs/<id>.py` | `far_shade`, `wing_far_shade` |
