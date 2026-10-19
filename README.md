# Dragon Island

| Thư mục | Nội dung | Chạy |
|---|---|---|
| `frontend/src/` | Next.js 16 + React 19 + Phaser 3.90 (game client) | `cd frontend && npm run dev` → http://localhost:3000 |
| `backend/` | NestJS 12 API, mọi route dưới `/api` | `cd backend && npm run start:dev` → http://localhost:4000/api/health |
| `assets/` | Ảnh gốc: `dragons/<id>/`, `island/`, `ui/` | — |
| `tools/` | Pipeline ảnh (Python) → ghi vào `frontend/public/` | `.venv/bin/python tools/build_rig.py` |
| `legacy/` | Bản demo HTML cũ (tham khảo khi port sang React/Phaser) | — |

## Cài đặt lần đầu
```bash
cd frontend && npm install && cp .env.example .env.local
cd ../backend && npm install && cp .env.example .env     # npm 10 lỗi "edgesOut" -> dùng: npx npm@11 install
python3 -m venv .venv && .venv/bin/pip install -r tools/requirements.txt   # ở thư mục gốc
```

## Frontend (`frontend/src`)

```
src/
  app/               Next.js routes
    page.tsx         trang chủ Dragon Island
    play/page.tsx    game thật: đảo Phaser + HUD + loading
    dev/island/      trang thử nghiệm: 3 đảo cạnh nhau
    games/           danh sách game
    news/            tin tức
  components/
    portal/          TopBar, Footer, GameCard, GameFrame, GameCanvas,
                      Breadcrumb, HeroBanner, NewsList, AntdProvider
    game/            GameScreen, GameScreenLoader, GameHud, LoadingScreen
    dev/             DevPanel, Island, IslandLoader
    index.ts         re-export portal components
  game/              Phaser (chỉ chạy trên trình duyệt)
    bridge.ts        React ↔ Phaser: island(), gameEvents, setIslandApi
    createGame.ts    tạo Phaser Game
    config/          dữ liệu tĩnh, React được phép import
      world.ts       W=1280, H=860, WORLD_W, islandCentre(), Point, Resource
      islands.ts      ISLANDS, IslandDef, BuildingType
      economy.ts      BUILDING_SCALE, PRODUCES, BUILDING_NAME, RESOURCE_NAME,
                      PRODUCTION, DRAGON_SCALE, FLY_SPEED, FLY_ALT, TAKEOFF_S, LAND_S
      species.ts      SPECIES, SpeciesId, SPECIES_INFO, rigUrl, cloudKey, cloudUrl
      index.ts        re-export tất cả config exports
    rig/             khung xương rồng (Phaser only)
      types.ts        RigData, StrikeKind, Strike, COMBAT_HOVER, Vec, LegName
      tuning.ts       RIG (tốc độ bay/thở/lắc đuôi…)
      strikes.ts       STRIKES (keyframe đánh/cast/ultimate)
      ik.ts           solveLeg (IK 2 xương)
      DragonRig.ts    class: forward kinematics, IK chân, tư thế đứng/chạy/ngủ
      index.ts        re-export public API
    skills/           kỹ năng (React được phép import)
      types.ts         SkillDef, SkillSlot, SkillCtx, SkillActor, Spot, FxOpts…
      registry.ts      SKILLS (Record<SpeciesId, SkillDef[]>)
      helpers.ts       spitDragonHead, dmg
      hac_long.ts      Hắc Long skills
      hai_long.ts      Hải Long skills
      rong_xuong.ts    Rồng Xương skills
      tuan_long.ts     Tuấn Long skills
      ki_lan.ts        Kì Lân skills
      index.ts         re-export public API
    scene/            Phaser scenes
      IslandScene.ts   biển, camera kéo/chuyển đảo, chọn rồng, chạy kỹ năng
      Island.ts        một đảo: ảnh, sóng, vùng đi được, công trình + sản xuất
      Dragon.ts        một con rồng: đi/bay/ngủ/tự dạo/ra đòn
      ocean.ts         fragment shader nước biển
      effects/
        combatFx.ts    fx, projectile, bite, gust, boneRain, orb, waterSplash, floatText
        ambientFx.ts   makeTextures, splash, footDust, cloudPuff, dustRing, sleepZ
```

**Quy tắc quan trọng: React không bao giờ import Phaser.** React chỉ được import từ:
- `@/game/bridge` (island, gameEvents)
- `@/game/config` (tất cả config)
- `@/game/skills` (SKILLS, SkillDef, SpitDragonHead…)
- `@/game/rig/types` (types cho TypeScript, không có logic)

## Asset pipeline (`tools/`)

```
tools/
  lib/               shared helpers (2+ scripts dùng)
    paths.py         ROOT, ASSETS, PUBLIC, DRAGONS, OUT, UI_OUT
    image.py         key_magenta, key_distance, components, cut, shade
    __init__.py      re-exports
  rig_configs/       layout mỗi loài rồng (cho build_rig.py)
    __init__.py      CONFIGS dict + LEG_SIDES
    hac_long.py      Hắc Long layout
    rong_xuong.py    Rồng Xương layout
    tuan_long.py     Tuấn Long layout
    hai_long.py      Hải Long layout
    ki_lan.py        Kì Lân layout
  build_rig.py       cắt parts/body.png + parts/legs.png → public/dragons/<id>/
  slice_skills.py    cắt skills/icons.png + skills/vfx.png → public/dragons/<id>/skills/
  slice_cloud.py     cắt cloud.png → public/dragons/<id>/cloud*.png
  slice_eggs.py      cắt eggs/eggs.png (10 cấp trứng) + eggs/nest.png → public/eggs/
  slice_world.py     cắt islands/ + buildings/ + resources.png
  slice_ui.py        logo + loading screen
  slice_hud_icons.py cắt hud_icons.png → public/ui/
  slice_sheet.py     cắt sprite sheet → public/sprites/ (legacy)
  legacy/
    slice_sheet.py   sprite pipeline gốc (tham khảo)
    gait_design.py   thiết kế dáng đi (tham khảo)
  README.md          quick reference
```

Chạy pipeline:
```bash
.venv/bin/python tools/build_rig.py            # tất cả rồng
.venv/bin/python tools/build_rig.py hac_long    # một rồng
.venv/bin/python tools/slice_skills.py
.venv/bin/python tools/slice_cloud.py hai_long
.venv/bin/python tools/slice_world.py
.venv/bin/python tools/slice_ui.py
.venv/bin/python tools/slice_hud_icons.py
git status --porcelain frontend/public           # phải trống hoàn toàn
```

Mỗi rồng trong `assets/dragons/<id>/`: `reference.png` (thiết kế), `parts/body.png` + `parts/legs.png` (ráp khung xương), `skills/icons.png` (2×2), `skills/vfx.png` (4×2, nền đen), tùy chọn `cloud.png`.
