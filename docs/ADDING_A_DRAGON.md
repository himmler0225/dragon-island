# Thêm rồng mới

Hướng dẫn từng bước để thêm một loài rồng mới vào game.

> `assets/` và `tools/` trong tài liệu này nằm ở repo **`../dragon-island-tools`**; chạy lệnh `.venv/bin/python tools/...` từ thư mục gốc của repo đó.

---

## 1. Vẽ art (art team / ChatGPT)

Tạo thư mục `assets/dragons/<id>/` với:

| File | Mô tả | Yêu cầu |
|------|--------|---------|
| `reference.png` | Thiết kế tổng thể | Tham khảo |
| `parts/body.png` | Các bộ phận trên nền `#FF00FF` | head, torso, 2 cánh, 3 đuôi (+ jaw nếu có) |
| `parts/legs.png` | 4 chân (hoặc 2 nếu wyvern), mỗi chân 3 phần: upper, lower, paw | Nền `#FF00FF` |
| `skills/icons.png` | 2×2 grid: passive, basic, skill, ultimate | Tùy chọn |
| `skills/vfx.png` | 4×2 grid: 8 hiệu ứng skill | Tùy chọn, nền đen |
| `skills/jaws.png` | 2×1: upper + lower jaw cho bite attack | Tùy chọn |
| `cloud.png` | Mây cưỡi (wyvern/đông tứ đảo…) | Tùy chọn |

**Quy tắc vẽ parts:**
- Mỗi mảnh là một island riêng trên nền `#FF00FF`
- Legs: mỗi chân = 3 phần (upper, lower, paw), xếp theo cột trong legs.png
- Cánh far (phải, xa camera) vẽ tối hơn near ~20%

---

## 2. Định nghĩa layout (`tools/rig_configs/`)

### Bước 2a. Tạo file layout

```bash
# Tạo tools/rig_configs/<id>.py
```

```python
"""<Tên tiếng Việt>: mô tả ngắn."""
from lib.paths import DRAGONS

CONFIG = dict(
    name="<Tên>",
    body_src=DRAGONS / "<id>" / "parts" / "body.png",
    legs_src=DRAGONS / "<id>" / "parts" / "legs.png",
    far_shade=0.80,   # độ tối của chân/cánh far (0.6–0.85)
    wing_far_shade=0.65,
    leg_scale=0.5,    # scale ảnh legs → layout px (coi GROUND là 1.0)
    leg_pull=30,       # px chân bị kéo ra (0 nếu đã tách sẵn)
    ground=1000,       # tọa độ y của mặt đất trong layout px
    body={...},        # xem bên dưới
    joints={...},      # tọa độ joint trong layout px
    legs={...},        # cột trong legs.png + vị trí x trong layout
)
```

### Bước 2b. Body layout (`body: { piece_name: spec }`)

Mỗi piece có `spec`:

```python
"piece_name": dict(
    src=(x_centre, y_centre),   # tâm bounding box trong ảnh gốc
    at=(x_layout, y_layout),      # top-left của bbox trong layout px
    rot=degrees,                  # tùy chọn: quay rest pose (độ, + = CW)
    scale=k,                      # tùy chọn: scale quanh joint
    fade=(x0, x1),               # tùy chọn: fade out từ x0→x1 (sheet px)
    keep=[(x0,y0,x1,y1), ...],  # tùy chọn: chỉ giữ vùng này (carve)
    drop=[(x0,y0,x1,y1), ...],  # tùy chọn: bỏ vùng này (carve)
)
```

### Bước 2c. Joints (`joints: { piece_name: (x, y) }`)

Tọa độ joint trong layout px. Joint là điểm xương xoay quanh:

| Piece | Joint thường |
|-------|-------------|
| torso | Giữa thân (body root) |
| head | Đáy cổ, trong thân |
| wing_near / wing_far | Gốc cánh, dưới thân |
| tail_base | Chỗ đuôi gắn vào thân |
| jaw | Bản lề dưới hàm |
| `{leg}_{seg}` | IK tự tính từ `solid_centre()` |

### Bước 2d. Legs (`legs: { leg_name: spec }`)

```python
"leg_name": dict(
    col=N,        # cột trong legs.png (0=fore_near, 1=hind_near, 2=fore_far, 3=hind_far)
    x=layout_x,  # left edge trong layout px
    parent="tail_base",  # tùy: chân sau gắn vào đuôi thay vì torso
    scale=0.85,  # tùy: tỷ lệ riêng của chi này (nhân với leg_scale), vd tay ngắn hơn chân
    top=700,     # tùy: y đỉnh chi trong layout -> chi treo từ đó thay vì đứng trên mặt đất (tay)
)
```

### Bước 2e. Motion options (tùy chọn)

```python
motion={
    "sleepTail": [a0, a1, a2],     # góc lắc đuôi khi ngủ (3 joint)
    "wingSpread": [near, far],       # góc cánh khi đứng yên
    "rideCloud": True,               # bay = cưỡi mây (thay vì vỗ cánh)
    "flyLegs": "tuck" | "dangle",  # tư thế chân khi bay
    "flyPitch": 0.2,                # độ nghiêng khi bay (hướng mũi lên)
    "tailWave": [a0, a1, a2, a3],  # độ sóng đuôi khi bơi (hải long)
    "hindKnee": "back",              # đầu gối chân sau quay về sau (kì lân)
    "foreArms": True,                # rồng đứng 2 chân: chi trước là tay, treo ở ngực và đung đưa (rồng vàng/bạc)
}
```

### Bước 2f. Đăng ký species

Trong `tools/rig_configs/__init__.py`, thêm vào:

```python
from . import <id>
CONFIGS["<id>"] = <id>.CONFIG
```

---

## 3. Build art pipeline

```bash
# Chạy riêng từng bước, kiểm tra output sau mỗi bước
.venv/bin/python tools/build_rig.py <id>
# → frontend/public/dragons/<id>/: *.png (từng bone), rig.json, portrait.png

.venv/bin/python tools/slice_skills.py <id>
# → frontend/public/dragons/<id>/skills/: icon_*.png, vfx_*.png, jaw_*.png

.venv/bin/python tools/slice_cloud.py <id>   # nếu có cloud.png
# → frontend/public/dragons/<id>/cloud*.png
```

Sau khi build, mở `frontend/public/dragons/<id>/rig.json` kiểm tra:
- Tất cả bone có `joint` và `origin` hợp lệ
- `motion` đúng species
- Không có bone trùng tên

---

## 4. Thêm vào game

### 4a. Config species (`game/config/species.ts`)

```typescript
// Thêm vào SPECIES và SPECIES_INFO
export const SPECIES = [..., '<id>'] as const;
export type SpeciesId = (typeof SPECIES)[number];

export const SPECIES_INFO: Record<SpeciesId, ...> = {
  // ...
  <id>: { name: '<Tên>', element: '<Nguyên Tố>', rarity: 'R|SR|SSR' },
};
```

### 4b. Skills (`game/skills/<id>.ts`)

```typescript
import type { SkillDef } from './types';

export const <ID>_SKILLS: SkillDef[] = [
  { slot: 'passive', name: '...', desc: '...', ... },
  { slot: 'basic',   name: '...', desc: '...', fx: '...', ... },
  { slot: 'skill',   name: '...', desc: '...', fx: '...', ... },
  { slot: 'ultimate',name: '...', desc: '...', fx: '...', ... },
];
```

Đăng ký trong `game/skills/registry.ts`:

```typescript
// Thêm vào SKILLS
const SKILLS: Record<SpeciesId, SkillDef[]> = {
  // ...
  <id>: <ID>_SKILLS,
};
```

### 4c. Strike poses (`game/rig/strikes_data.ts`)

Thêm `STRIKES_DATA.<id>` với 3 `StrikeKind`:
```typescript
STRIKES = {
  // ...
  <id>: {
    attack:  { dur: 1.0, hit: 0.5, t: [...], lunge: [...], claw: [...], ... },
    cast:    { dur: 0.9, hit: 0.7, t: [...], head: [...], ... },
    ultimate: { dur: 1.6, hit: 0.55, t: [...], air: [...], ... },
  },
};
```

### 4d. Đặt rồng lên đảo (`game/config/islands.ts`)

```typescript
// Trong ISLANDS, thêm vào dragon hoặc guests của đảo
{ id: 'meadow', ..., dragon: '<id>', ... }
// hoặc:
{ ..., guests: [{ dragon: '<id>', start: [x, y] }, ...] }
```

### 4e. Trang chủ (`src/app/page.tsx`)

Thêm blurb vào `DRAGON_BLURB`:
```typescript
<id>: { name: '...', element: '...', rarity: '...', blurb: '...' },
```

---

## 5. Kiểm tra

```bash
# Build và kiểm tra TypeScript
cd frontend && npx tsc --noEmit

# Mở trình duyệt
# http://localhost:3000/dev/island   ← test nhanh tất cả 5 rồng
# http://localhost:3000/play           ← test đầy đủ

# Kiểm tra:
# - Rồng đứng yên (idle): breathing animation đúng
# - Rồng đi (walk): chân nhấc khỏi đất, IK không gap
# - Rồng bay (fly): cánh vỗ, chân đúng tư thế
# - Rồng ngủ (sleep): nằm xuống, đuôi lắc
# - Skills: click skill → effect đúng, damage float
# - Switch island: camera pan đúng
```
