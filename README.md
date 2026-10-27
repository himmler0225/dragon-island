# Dragon Island

| Thư mục | Nội dung | Chạy |
|---|---|---|
| `frontend/src/` | Next.js 16 + React 19 + Phaser 3.90 (game client) | `cd frontend && npm run dev` → http://localhost:3000 |
| `backend/` | NestJS 12 API, mọi route dưới `/api` | `cd backend && npm run start:dev` → http://localhost:4000/api/health |
| `frontend/public/` | Ảnh game đã build (do repo `../dragon-island-tools` sinh ra) | — |
| `legacy/` | Bản demo HTML cũ (tham khảo khi port sang React/Phaser) | — |

## Cài đặt lần đầu
```bash
cd frontend && npm install && cp .env.example .env.local
cd ../backend && npm install && cp .env.example .env     # npm 10 lỗi "edgesOut" -> dùng: npx npm@11 install
```

## Frontend (`frontend/src`)

```
src/
  app/               Next.js routes
    page.tsx         trang chủ Dragon Island
    play/page.tsx    game thật: đảo Phaser + HUD + loading
    dev/island/      trang thử nghiệm: 3 đảo cạnh nhau
    games/           kho game + trang chi tiết game
    news/            tin tức
    globals.css      design tokens + style chung của portal
  components/
    portal/          TopBar, Footer, GameCard, Breadcrumb
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
      breeding.ts     trứng Lai Rồng, tỉ lệ sao
      team.ts         đội hình (lưu localStorage)
      index.ts        re-export tất cả config exports
    rig/             khung xương rồng (Phaser only)
      types.ts        RigData, StrikeKind, Strike, COMBAT_HOVER, Vec, LegName
      tuning.ts       RIG (tốc độ bay/thở/lắc đuôi…)
      strikes_data.ts STRIKES_DATA (keyframe đánh/cast/ultimate)
      strikes_math.ts track(), smoothstep()
      ik.ts           solveLeg (IK 2 xương)
      DragonRig.ts    class: forward kinematics, IK chân, tư thế đứng/chạy/ngủ
      index.ts        re-export public API
    skills/           kỹ năng (React được phép import)
      types.ts         SkillDef, SkillSlot, SkillCtx, SkillActor, Spot, FxOpts…
      registry.ts      SKILLS (Record<SpeciesId, SkillDef[]>)
      helpers.ts       spitDragonHead, dmg
      blackDragon.ts   Hắc Long skills
      seaDragon.ts     Hải Long skills
      boneDragon.ts    Rồng Xương skills
      stagDragon.ts    Tuấn Long skills
      qilin.ts         Kì Lân skills
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
- `@/game/skills` (SKILLS, SkillDef, spitDragonHead…)
- `@/game/rig/types` (types cho TypeScript, không có logic)

## Styling

CSS thuần, không framework: design tokens (màu, bo góc, shadow) nằm ở `app/globals.css`, style riêng
theo component dùng CSS Module (`*.module.css`). Palette bám theo art game: nền xanh biển sâu,
vàng kim cho mọi thứ người chơi bấm được.

## Asset pipeline

Ảnh gốc (`assets/`) và pipeline Python (`tools/`) nằm ở repo riêng **`../dragon-island-tools`** (checkout cạnh repo này). Pipeline ghi thẳng vào `frontend/public/` ở đây; xem README bên đó để cài đặt và chạy.
