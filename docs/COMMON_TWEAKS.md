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
  black_dragon: 120,   // tăng từ 95
};
```

---

## Đuôi

| Thay đổi | File | Constant |
|----------|------|----------|
| Góc lắc đuôi khi ngủ | `game/rig/strikes_data.ts` | `STRIKES[<id>].attack.tail` (nếu có) |
| Độ sóng đuôi khi bơi (Hải Long) | `game/config/species.ts` | `SPECIES_INFO.sea_dragon.motion.tailWave` |
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

Kích thước và thời gian hiệu ứng truyền qua options của từng lời gọi trong skill definition:

```typescript
fx(3, t.chest(), { scale: 0.55, dur: 420 });   // scale, dur (ms), tint, spin, ground, anchor…
```

| Thay đổi | Constant / nơi |
|----------|----------------|
| Kích thước hiệu ứng (mặc định) | `FxOpts.scale` trong `game/skills/types.ts` |
| Thời gian hiệu ứng (mặc định) | `FxOpts.dur` trong `game/skills/types.ts` |
| Số vfx nạp cho từng loài | `VFX_COUNT`, `BASIC_FX` trong `game/skills/registry.ts` |
| Radius splash effect | `SPLASH_RADIUS` trong `game/scene/effects/combatFx.ts` |

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

> `assets/` và `tools/` trong tài liệu này nằm ở repo **`../dragon-island-tools`**; chạy lệnh `.venv/bin/python tools/...` từ thư mục gốc của repo đó.

| Thay đổi | File | Constant |
|----------|------|----------|
| Tốc độ chân (stride) trong gait design | `tools/legacy/gait_design.py` | `STRIDE = 56` |
| Export height của rig (game dùng 0.5×) | `tools/build_rig.py` | `TARGET_HEIGHT = 416` |
| Scale ảnh legs → layout px | `tools/rig_configs/<id>.py` | `leg_scale` |
| Độ tối chân/cánh far | `tools/rig_configs/<id>.py` | `far_shade`, `wing_far_shade` |

---

## Chỉnh dáng ghép một con rồng (layout rig)

File: `tools/rig_configs/<id>.py` (Gold Dragon + Silver Dragon share `gold_dragon.py`).
Toạ độ là pixel của layout (gần bằng pixel ảnh `parts/body.png`). **x tăng = sang phải (về phía đuôi), y tăng = xuống dưới.**

| Muốn | Sửa | Ví dụ |
|---|---|---|
| Dời một mảnh (đầu, thân, cánh, khúc đuôi) | `body["<mảnh>"]["at"]` **và** `joints["<mảnh>"]` cùng một lượng | đuôi thấp xuống 30: cộng 30 vào y của `at` + `joints` của `tail_base`, `tail_mid`, `tail_tip` |
| Xoay sẵn một mảnh | `body["<mảnh>"]["rot"]` (độ, + = xuôi chiều kim đồng hồ) | cánh xa `rot=-30` |
| To/nhỏ một mảnh | `body["<mảnh>"]["scale"]` | đầu Kì Lân `scale=0.85` |
| Chỗ nối lộ mép cắt | `body["<mảnh>"]["fade"]=(x0, x1)` (x trong ảnh gốc): mờ dần đầu mảnh | thân trước Hải Long |
| Mờ dần đáy một mảnh (theo chiều dọc) | `body["<mảnh>"]["fade_y"]=(y0, y1)` (toạ độ layout) | ít dùng: trên nền game phần mờ trông như trong suốt |
| Thay một mảnh bằng ảnh vẽ lại riêng | `body["<mảnh>"] = dict(src_img=<đường dẫn png>, img_scale=k, at=(x, y))` (at = góc trên-trái) | thân giữa Hải Long `body_mid.png` |
| Cắt bỏ một vùng trên mảnh | `body["<mảnh>"]["drop"]=[(x0,y0,x1,y1)]` (toạ độ ảnh gốc) | chốt ngực Rồng Vàng |
| Điểm xoay của mảnh | `joints["<mảnh>"]` | cổ, bản lề hàm |
| Cả con to/nhỏ trên đảo | `size=1.2` ở đầu config (mặc định mọi con cùng diện tích thân: `TARGET_BODY` trong `tools/build_rig.py`) | Hải Long 1.2, Rồng Xương 0.88 |
| Chân to/nhỏ | `leg_scale` + chỉnh `ground` (mặt đất) để hông không lệch | Rồng Vàng 0.6 / ground 1325 |
| Khớp chân hở | `leg_pull=(gối, cổ chân)`: số càng lớn các đoạn càng chồng sâu | `(70, 60)` |
| Dời chân trái/phải | `legs["<chân>"]["x"]` | |
| Tay (rồng đứng 2 chân) | `legs["fore_*"]`: `top` (độ cao vai), `scale` (cỡ riêng), `x` | |
| Tư thế tay khi nghỉ | `motion["armPose"] = [[x, y] tay gần, [x, y] tay xa]`, số âm = ra trước/lên trên | |
| Độ tối phía xa | `far_shade` (chân/tay), `wing_far_shade` (cánh) | 0.8 |

Sau khi sửa luôn build lại rồi reload trang:
```bash
.venv/bin/python tools/build_rig.py <id>        # Rồng Vàng/Bạc: chạy cho cả gold_dragon và silver_dragon
```
Mẹo: mở `frontend/public/dragons/<id>/portrait.png` để xem nhanh dáng đứng sau khi build.

## Chỉnh chuyển động (code game)

| Muốn | File | Chỗ |
|---|---|---|
| Bước dài/ngắn, nhấc chân cao/thấp, tốc độ | `frontend/src/game/rig/tuning.ts` | `RIG.stride` (sải bước chung cho mọi rồng, px rig), `RIG.lift` (tỉ lệ chiều dài chân); `RIG.cycle` = giây mỗi nhịp |
| Tay đung đưa mạnh/nhẹ | `frontend/src/game/rig/DragonRig.ts` | khối `if (arm)`: `(4 + 10 * W)` = biên độ ngang |
| Đuôi lắc nhiều/ít | `tools/rig_configs/<id>.py` | `motion["tailWave"]` (hệ số từng khúc; khúc đầu = 0 thì khúc đó đứng yên theo thân, như thân sau Hải Long) |
| Bay ngóc đầu | `tools/rig_configs/<id>.py` | `motion["flyPitch"]` |
| Tư thế đòn đánh | `frontend/src/game/rig/strikes_data.ts` | `STRIKES.<id>` (Vàng/Bạc: `TWIN_DRAGON`) |
| Tên/mô tả/hiệu ứng chiêu | `frontend/src/game/skills/<id>.ts` | Vàng/Bạc: `goldSilverTwins.ts` |
| Hệ, độ hiếm, tên hiển thị | `frontend/src/game/config/species.ts` | `SPECIES_INFO` |
| Rồng đứng ở đảo nào, chỗ nào | `frontend/src/game/config/islands.ts` | `dragon` / `guests` |
| Zoom mặc định | `frontend/src/game/scene/IslandScene.ts` | `ZOOM_IN` |
