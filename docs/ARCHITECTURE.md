# Kiến trúc Dragon Island

## Tổng quan các tầng

```
React (Next.js App Router)
  ├── page.tsx, /play, /dev/island, /games, /news
  ├── portal/ components (TopBar, Footer, GameCard…)
  └── game/ components (GameHud, GameScreen, LoadingScreen)

React → bridge.ts → Phaser
  └── Phaser (IslandScene, Dragon, DragonRig, CombatFx, AmbientFx)
        ├── config/ (islands, economy, species, world)
        ├── rig/    (DragonRig, IK, strikes, tuning)
        └── skills/ (SKILLS, SkillDef, SkillCtx)
```

## Đường đi dữ liệu chính

### React → Phaser (user clicks)
```
GameHud (React)
  └── onClick slot → island().useSkill(id, slot)
                          └── Dragon.useSkill()
                              └── Dragon.startStrike() → DragonRig.strike()
```

### Phaser → React (resource collected, dragon selected)
```
Dragon.update() → IslandScene.onAction() → bridge.gameEvents.emit('collect'|'select')
  └── GameHud.on() listener (React) → setState → re-render HUD
```

### Skills (cross-species)
```
SkillCtx
  ├── actor (Dragon) — attacker
  ├── target (Dragon) — defender, called actor.hurt(), actor.push()
  └── fx (CombatFx) — visual effects: fx(), projectile(), bite(), gust(), orb(), waterSplash(), boneRain(), floatText()
```

## Quy tắc Phaser / React

**React không bao giờ import Phaser.** Lý do: Phaser chỉ chạy trên trình duyệt; Next.js server-side render sẽ crash.

### Được phép import từ React
| Import | Dùng cho |
|--------|-----------|
| `@/game/bridge` | `island()`, `gameEvents`, `setIslandApi` |
| `@/game/config` | `ISLANDS`, `PRODUCTION`, `SPECIES`, `SPECIES_INFO`, `RESOURCE_NAME`, … |
| `@/game/skills` | `SKILLS`, `SkillDef`, `spitDragonHead` |
| `@/game/rig/types` | Types TypeScript (`RigData`, `SpeciesId`, `StrikeKind`…) |

### Game được load thế nào
```
components/game/GameScreen.tsx
  └── next/dynamic(() => import('@/game/createGame'), { ssr: false })
        └── createGame() → new Phaser.Game(...)
              └── IslandScene.create() → new DragonRig(scene, rigData, container, id)
```

## Nơi chứa số liệu thế giới

| Thứ muốn thay đổi | File | Constant |
|---------------------|------|----------|
| Kích thước viewport, world width | `game/config/world.ts` | `W`, `H`, `WORLD_W`, `islandCentre()` |
| Định nghĩa đảo (walk polygon, dragon, guests, buildings) | `game/config/islands.ts` | `ISLANDS` |
| Loại resource, tên, tốc độ sản xuất | `game/config/economy.ts` | `PRODUCTION`, `RESOURCE_NAME`, `BUILDING_NAME`, `DRAGON_SCALE`, `FLY_SPEED`, `FLY_ALT` |
| Danh sách species, tên hiển thị, rarity | `game/config/species.ts` | `SPECIES`, `SPECIES_INFO` |
| Tốc độ walk cycle, stride, leg lift, flap rate | `game/rig/tuning.ts` | `RIG.cycle`, `RIG.stride`, `RIG.lift`, `RIG.flapRate` |
| Tư thế đánh/cast/ultimate | `game/rig/strikes_data.ts` (bảng `STRIKES_DATA`) | `STRIKES` (re-export từ `strikes.ts`) |
| Số lượng/đường dẫn vfx của từng loài | `game/skills/registry.ts` | `VFX_COUNT`, `BASIC_FX`, `NO_VFX`, `JAW_SPECIES`, `vfxNumbers()` |

## Cấu trúc scene

```
IslandScene
  ├── ocean (Shader)           fragment shader nước biển
  ├── islands[]                 ISLANDS.map → Island
  ├── selected: Island
  ├── focusIsland(i)           camera pan đến đảo i
  ├── dragStart/Move/End        kéo thả camera
  ├── dragons[]                 tất cả Dragon trên tất cả đảo
  ├── ambient: AmbientFx        hiệu ứng nền: splash, dust, cloud puff, sleep Z
  ├── combat: CombatFx          hiệu ứng đánh: fx, projectile, bite, gust…
  └── runSkill(actor, def, targets)  trigger skill effect

Island
  ├── image + wave polygon
  ├── walk polygon
  ├── buildings[]
  └── free(x, y)               kiểm tra pixel đi được

Dragon
  ├── root (Container)
  ├── rig: DragonRig           skeleton rig
  ├── cloud (rideCloud species) mây cưỡi
  ├── walkTo / flyTo / sleep
  └── update(dt) → rig.update()
```

## DragonRig (khung xương rồng)

Khung xương gồm các bone (image + pivot point), xếp theo thứ tự draw. Game làm:

1. **IK chân** (`solveLeg`): 2-bone IK từ hip → target paw trên mặt đất. `bend: +1` (knee bends back), `bend: -1` (knee bends forward).
2. **Forward kinematics**: mỗi bone được `setRotation`, `setPosition` quanh joint.
3. **Breathing / tail sway**: sin/cos oscillation trên torso/head/tail joints.
4. **Strike poses** (`STRIKES`): Catmull-Rom interpolation qua các keyframe của từng `StrikeKind`.

## CombatFx — các loại skill effect

| Effect | Mô tả |
|--------|--------|
| `fx()` | Glowing vortex ở vị trí target |
| `projectile()` | Đạn bay từ actor → target, với trail |
| `bite()` | Giant jaws tấn công từ phía trên |
| `gust()` | Wind burst đẩy lùi target |
| `boneRain()` | Falling bone fragments |
| `orb()` | Energy orb bay lên rồi nổ |
| `waterSplash()` | Splash effect |
| `floatText()` | Damage/heal number bay lên |
