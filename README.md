# Dragon Island

| Thư mục | Nội dung | Chạy |
|---|---|---|
| `frontend/` | Next.js 16 + React 19 + Phaser 3.90 (game client) | `cd frontend && npm run dev` → http://localhost:3000 |
| `backend/`  | NestJS 12 API, mọi route dưới `/api` | `cd backend && npm run start:dev` → http://localhost:4000/api/health |
| `assets/`   | Ảnh gốc: `dragons/<id>/`, `island/`, `ui/` | — |
| `tools/`    | Pipeline ảnh (Python) → ghi vào `frontend/public/` | `.venv/bin/python tools/build_rig.py` |
| `legacy/`   | Bản demo HTML cũ (tham khảo khi port sang React/Phaser) | — |

## Cài đặt lần đầu
```bash
cd frontend && npm install && cp .env.example .env.local
cd ../backend && npm install && cp .env.example .env     # npm 10 lỗi "edgesOut" -> dùng: npx npm@11 install
python3 -m venv .venv && .venv/bin/pip install -r tools/requirements.txt   # ở thư mục gốc
```

## Frontend (`frontend/src`)
- `/` — trang giới thiệu Dragon Island (`app/page.tsx` + `app/home.module.css`), dữ liệu rồng/đảo/công trình lấy từ `src/game/*`.
- `/play` — game thật: `components/game/GameScreen.tsx` = đảo Phaser + `LoadingScreen` (thanh loading theo tiến độ tải) + `GameHud` (tài nguyên, đổi đảo, chọn rồng, kỹ năng, menu túi/cửa hàng/… mở bảng tạm "đang phát triển").
- `/dev/island` — trang thử: 3 đảo cạnh nhau (mỗi đảo 1 rồng + 3 công trình), bảng thử lệnh/kỹ năng/tài nguyên (`components/IslandLoader.tsx`, `Island.tsx`, `DevPanel.tsx`).
  Muốn đưa game vào `/play`: thay `<GameCanvas />` bằng `<IslandLoader />` (bỏ `DevPanel` trong `Island.tsx` khi có HUD thật).
- `game/` — Phaser (chỉ chạy trên trình duyệt):
  - `IslandScene.ts` — biển, camera kéo/chuyển đảo, chọn rồng, chạy kỹ năng, hiệu ứng
  - `Island.ts` — một đảo: ảnh, sóng, vùng đi được, công trình + sản xuất tài nguyên
  - `constants.ts` — `ISLANDS` (vùng đi được, rồng, vị trí/cấp công trình theo toạ độ ảnh đảo), `PRODUCTION`
  - `Dragon.ts` — một con rồng: đi / bay / ngủ / tự đi dạo / ra đòn
  - `rig.ts` — khung xương (IK, thở, vỗ cánh, ngủ) + tư thế đánh `STRIKES` (attack / cast / ultimate)
  - `skills.ts` — kỹ năng từng loài: tên, mô tả, hiệu ứng khi trúng đòn (số sát thương chỉ để hiển thị)
  - `bridge.ts` — React ↔ Phaser: `island()` trả về IslandApi, `gameEvents` (ready / select / action)
  - `species.ts`, `ocean.ts`, `createGame.ts`
- React không import Phaser; chỉ dùng `bridge.ts`, `skills.ts`, `species.ts`.

## Asset pipeline
- `tools/build_rig.py [id]` — cắt `assets/dragons/<id>/parts/{body,legs}.png` thành khung xương → `frontend/public/dragons/<id>/` (layout trong `tools/rig_configs.py`).
- `tools/slice_skills.py [id]` — `assets/dragons/<id>/skills/{icons,vfx}.png` → `frontend/public/dragons/<id>/skills/` (icon_*.png, vfx_1..8.png; + jaw_upper/jaw_lower.png nếu có skills/jaws.png).
- `tools/slice_cloud.py [id]` — `assets/dragons/<id>/cloud.png` (mây cưỡi: 1 mây lớn + cụm nhỏ) → `frontend/public/dragons/<id>/cloud_main.png, cloud_1..3.png`; bật bằng `motion.rideCloud` trong `rig_configs.py`.
- `tools/slice_ui.py` — `assets/ui/logo.png` (tách nền trắng), `assets/ui/loading/{background,bar}.png` → `frontend/public/ui/{logo.png,loading_bg.jpg,loading_frame.png,loading_fill.png,loading_bar.json}`.
- `tools/slice_world.py` — `assets/island/*.png`, `assets/buildings/*.png` (3 cấp/ảnh), `assets/ui/resources.png` → `frontend/public/{islands,buildings,ui}`.
- `tools/slice_sheet.py` — icon HUD (`assets/ui/hud_icons.png`), sprite cũ → `frontend/public/{sprites,ui}`.

Mỗi rồng trong `assets/dragons/<id>/`: `reference.png` (thiết kế), `parts/body.png` + `parts/legs.png` (ráp khung xương), `skills/icons.png` (2×2) + `skills/vfx.png` (4×2, nền đen).
