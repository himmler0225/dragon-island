# Refactor task: reorganise the Dragon Island codebase (NO behaviour changes)

You are working in the folder `dragon-island/` (repo root = this folder). Your job is to **move and split
existing code into a clearer structure** so a human can keep developing it by hand. You are NOT adding
features, NOT fixing bugs, NOT tuning numbers, NOT restyling anything.

Work in **phases**. Do **one phase per reply**. At the end of each phase: run the checks for that phase,
paste their output, list every file you created/moved/deleted, then **STOP and wait** for me to say
"continue". Never start the next phase on your own.

---

## 0. Hard rules (read twice, follow always)

1. **Behaviour must stay identical.** The game must look and play exactly the same after every phase.
   Move code **verbatim**: copy functions/classes/constants as they are, including their comments.
   Do not rename variables, "simplify" maths, change numbers, reorder animation code, or convert
   styles. If you think something is a bug, write it in a `NOTES` list in your reply — do not fix it.
2. **Do not touch** these at all:
   - `assets/` (source art), `legacy/` (old demo), `backend/` (leave as is),
   - `frontend/public/` (generated images; only the tools write there),
   - `frontend/AGENTS.md`, `frontend/next.config.ts`, `package.json` / lock files (no new dependencies,
     no upgrades),
   - `frontend/src/app/globals.css`, `frontend/src/app/home.module.css`.
3. This project uses **Next.js 16 + React 19 + Phaser 3.90**. Next 16 differs from what you know; do
   not change routing, layouts, `'use client'` lines, `next/dynamic(..., { ssr: false })` calls or
   metadata exports. If unsure about a Next API, read `frontend/node_modules/next/dist/docs/` first.
4. **Phaser must never be imported by React code.** Phaser only runs in the browser; the game is
   loaded with `next/dynamic(..., { ssr: false })`. React files (`src/app/**`, `src/components/**`)
   may only import from the Phaser-free modules listed in each phase below. After you move things,
   check that no file imported by React has `import * as Phaser from 'phaser'` anywhere in its import
   chain (type-only imports `import type ...` are fine).
5. Use the path alias `@/` for imports from React code (as now). Inside `src/game/**` use relative
   imports (as now).
6. Code comments stay in **English**, short, in the same style as the existing code. Every new file
   starts with a 1–3 line comment saying what lives in it.
7. Do **not** run Prettier/ESLint `--fix` over whole files and do not reformat untouched code. The
   diff must show moves, not reformatting.
8. Do **not** start `next dev` — I already run it on http://localhost:3000. A second one refuses to
   start. Use the commands in the checks instead.
9. Python tools: always run with `.venv/bin/python` from the `dragon-island/` folder (plain `python3`
   is a different environment and lacks numpy/opencv).
10. If a step is unclear or a check fails and you cannot see why within 2 attempts: **stop and ask**.
    Do not guess, do not delete code to make errors go away, do not add `// @ts-ignore` or `any`.

---

## Phase 1 — Safety net (git baseline)

The folder is **not** a git repository yet.

1. Create `dragon-island/.gitignore` with at least:
   ```
   node_modules/
   .next/
   dist/
   .venv/
   __pycache__/
   *.tsbuildinfo
   .env
   .env.local
   .DS_Store
   frontend/public/dragons/_try/
   ```
2. `git init`, then `git add -A` and commit: `chore: baseline before refactor`.
   (`frontend/public/` **must** be committed — Phase 4 uses it to prove the tools still produce the
   same files.)
3. Run the baseline checks and paste the output (they must pass before you change anything; if one
   fails, STOP and tell me):
   ```bash
   cd frontend && npx tsc --noEmit && npm run lint && npm run build
   ```

---

## Phase 2 — Split `frontend/src/game/` into folders

Current files (all in `frontend/src/game/`): `IslandScene.ts` (~430 lines), `rig.ts` (~500),
`skills.ts` (~330), `Dragon.ts` (~290), `Island.ts`, `constants.ts`, `species.ts`, `bridge.ts`,
`ocean.ts`, `createGame.ts`.

Target structure:

```
frontend/src/game/
  bridge.ts                 (unchanged; React <-> Phaser bridge)
  createGame.ts             (unchanged except import paths)
  config/                   Phaser-free data, safe for React
    world.ts                W, H, WORLD_W, islandCentre, Point and other world-size/geometry constants
    islands.ts              ISLANDS (island definitions, walkable areas, dragons/guests, building placements)
    economy.ts              Resource, RESOURCE_NAME, PRODUCTION, PRODUCES, BUILDING_NAME, BUILDING_SCALE, building types
    species.ts              (moved from game/species.ts, content unchanged)
  rig/
    types.ts                RigData and the other exported rig types (StrikeKind, RigMode, motion options type, ...)
    tuning.ts               the RIG constants object and COMBAT_HOVER
    strikes.ts              STRIKES (per-species strike keyframes) + the keyframe helpers they use (track, smoothstep, ...)
    ik.ts                   solveLeg as a pure function (see below)
    DragonRig.ts            the DragonRig class (everything else from rig.ts)
    index.ts                re-exports the public API that other files import today
  skills/
    types.ts                SkillDef, SkillSlot, SkillCtx, SkillActor, Spot, FxOpts, ...
    registry.ts             SKILLS (assembled from the species files), skill(), NO_VFX, JAW_SPECIES,
                            vfxKey/vfxUrl/jawKey/jawUrl/skillIconUrl and other helpers
    hac_long.ts  rong_xuong.ts  tuan_long.ts  hai_long.ts  ki_lan.ts
                            one file per species: that species' skill list (names, descriptions, effects)
    index.ts                re-exports what other files import today
  scene/
    IslandScene.ts          the scene: preload/create/update, input/camera, selection, running skills
    Island.ts               (moved)
    Dragon.ts               (moved)
    ocean.ts                (moved)
    effects/
      combatFx.ts           fx, projectile, bite, gust, boneRain, orb, waterSplash, floatText
      ambientFx.ts          makeTextures, splash, footDust, cloudPuff, dustRing, sleepZ
```

How to do it, step by step:

1. **config/**: open `constants.ts`, sort every export into `world.ts`, `islands.ts` or `economy.ts` by
   topic (if something fits none, put it in `world.ts` and mention it). Move `species.ts` into
   `config/`. Delete `constants.ts` once nothing imports it. Update **all** imports (React files
   import `@/game/constants` and `@/game/species` today; grep for them).
2. **rig/**: split `rig.ts` as in the tree. For `ik.ts`: today `solveLeg` is a private method of the
   class that reads `this.motion` and `RIG.bend`. Turn it into an exported function
   `solveLeg(L: Leg, hip: Vec, target: Vec, pawTilt: number, bend: number): void` whose body is the
   old body; compute `bend` in the class exactly as the old code did and pass it in. Nothing else
   changes. Export `Leg`/`Vec` types from `types.ts` if `ik.ts` needs them.
3. **skills/**: `skills.ts` has no Phaser import — keep it that way (React imports SKILLS for the HUD
   and the landing page). Move each species' entry of `SKILLS` into its own file exporting e.g.
   `export const HAI_LONG_SKILLS: SkillDef[] = [...]`; `registry.ts` builds
   `SKILLS: Record<SpeciesId, SkillDef[]>` from them. Shared helper functions used by several species
   (e.g. `spitDragonHead`) go into `skills/helpers.ts`.
4. **scene/effects/**: move the effect methods out of `IslandScene` into two classes,
   `CombatFx` and `AmbientFx`, each constructed with the scene (`constructor(private scene: IslandScene)`).
   The method bodies stay the same, only `this.` becomes `this.scene.` where they touch the scene
   (`this.add`, `this.tweens`, `this.time`, `this.cameras`, ...). In `IslandScene` add
   `readonly combat = new CombatFx(this)` and `readonly ambient = new AmbientFx(this)` and update the
   callers (`Dragon.ts`, the SkillCtx built in `runSkill`, etc.). Public scene methods called from
   other files must still be reachable — tsc will tell you.
5. Move `IslandScene.ts`, `Island.ts`, `Dragon.ts`, `ocean.ts` into `scene/` and fix imports.
6. Allowed imports from React code after this phase: `@/game/bridge`, `@/game/config/*`,
   `@/game/skills` (index), `@/game/rig/types`. `createGame.ts` stays loaded only through dynamic
   `import()` (see `components/game/GameScreen.tsx`, `components/Island.tsx`) — keep it that way.

Checks (paste output):
```bash
cd frontend && npx tsc --noEmit && npm run lint && npm run build
grep -rn "from 'phaser'\|from \"phaser\"" src/app src/components   # must print nothing
grep -rln "phaser" src/game/config src/game/skills src/game/bridge.ts src/game/rig/types.ts   # must print nothing
```
Then commit: `refactor(frontend): split game/ into config, rig, skills, scene`.

I will then test manually at http://localhost:3000/play and /dev/island (all 5 dragons idle/walk/
fly/sleep, every skill, island switching, fullscreen). Wait for my "continue".

---

## Phase 3 — Tidy `frontend/src/components/`

Target:
```
components/
  portal/   TopBar, Footer, GameCard, GameFrame, GameCanvas, Breadcrumb, HeroBanner, NewsList, AntdProvider
  game/     GameScreen, GameScreenLoader, GameHud, LoadingScreen (+ their .module.css)   (already there)
  dev/      DevPanel, Island, IslandLoader (+ their .module.css)   — used only by /dev/island
  index.ts  keep the same named exports as today, pointing at the new paths
```
Move files together with their `.module.css`. Do not edit component code except import paths.
`GameHud.tsx` is long: you MAY split its JSX sections (top bar, dragon list, side menu, skills panel,
bottom menu, modal) into small components in `components/game/hud/` — same markup, same class names,
same `GameHud.module.css` (import it in each part). If you are not confident, skip the split and say so.

Checks: same 3 commands as Phase 2. Commit: `refactor(frontend): group components by area`.

---

## Phase 4 — Tidy `tools/` (Python asset pipeline)

Today: `build_rig.py` imports keying helpers (`key_magenta`, `key_distance`) from `slice_sheet.py`,
which mostly contains an **old sprite-strip pipeline that is no longer used** (the game uses the
cut-out rigs). `rig_configs.py` holds all 5 species layouts in one file. `gait_design.py` is an old
design experiment.

Target:
```
tools/
  lib/
    __init__.py
    paths.py         ROOT, ASSETS (= ROOT/"assets"), PUBLIC (= ROOT/"frontend"/"public")
    image.py         shared image helpers: key_magenta, key_distance, components, cut, shade, ...
                     (anything used by 2+ scripts)
  rig_configs/
    __init__.py      CONFIGS = {...}, LEG_SIDES, and the big docstring that documents every option
    hac_long.py  rong_xuong.py  tuan_long.py  hai_long.py  ki_lan.py   (one dict each, comments kept)
  build_rig.py       entry point (same command as today)
  slice_skills.py  slice_world.py  slice_ui.py  slice_cloud.py   entry points (same commands)
  slice_hud_icons.py the HUD-icon export that today lives in slice_sheet.py (export_icons)
  legacy/
    slice_sheet.py   the rest of the old sprite pipeline, unchanged except imports
    gait_design.py
  README.md          one line per script: what it reads, what it writes, the exact command
```
Rules for this phase:
- Every entry point must keep working with the **same command as today**, e.g.
  `.venv/bin/python tools/build_rig.py hai_long`. Scripts add their own folder to `sys.path` the way
  they do now, so `from lib.image import ...` and `from rig_configs import CONFIGS, LEG_SIDES` work.
- Move functions verbatim. Keep every comment in `rig_configs` — they explain hand-tuned numbers.

**Proof that nothing changed** (this is the most important check): regenerate everything and make
sure git sees no difference in `frontend/public/`:
```bash
for id in hac_long rong_xuong tuan_long hai_long ki_lan; do .venv/bin/python tools/build_rig.py $id; done
for id in hac_long rong_xuong tuan_long hai_long ki_lan; do .venv/bin/python tools/slice_skills.py $id; done
.venv/bin/python tools/slice_cloud.py hai_long
.venv/bin/python tools/slice_world.py
.venv/bin/python tools/slice_ui.py
.venv/bin/python tools/slice_hud_icons.py
git status --porcelain frontend/public      # must print NOTHING
```
(Read each script's `main()` first to confirm its arguments; if a script needs other arguments, use
them and tell me.) If `git status` shows changed files, your move altered behaviour: run
`git diff --stat frontend/public`, find the cause, fix it, re-run. Do **not** commit regenerated files
to "make it pass".

Commit: `refactor(tools): shared lib, per-species rig configs, legacy folder`.

---

## Phase 5 — Documentation for the human who continues the work

1. Update the root `README.md` so every path in it matches the new structure (keep it in Vietnamese,
   like now).
2. Create `docs/ARCHITECTURE.md` (Vietnamese, short): the folders, what talks to what
   (React → bridge → IslandScene → Dragon → DragonRig; skills → SkillCtx → CombatFx), the rule
   "React never imports Phaser", where the world/island/economy numbers live.
3. Create `docs/THEM_RONG_MOI.md` ("how to add a new dragon"), a numbered checklist that names the
   exact files and fields, based on how the 5 existing dragons are wired:
   - art: `assets/dragons/<id>/reference.png`, `parts/body.png`, `parts/legs.png` (magenta background),
     optional `skills/icons.png` (2×2) and `skills/vfx.png` (4×2, black background), `cloud.png`;
   - layout: new file in `tools/rig_configs/`, register it in `CONFIGS`; explain `src`, `at`,
     `joints`, `parents`, `legs`, `ground`, `leg_scale`, `leg_pull`, `motion` and the optional
     options documented in the docstring;
   - build: `build_rig.py <id>`, `slice_skills.py <id>`;
   - game: add the species in `game/config/species.ts`, its skills file in `game/skills/`, its strike
     poses in `game/rig/strikes.ts`, place it on an island (`dragon` or `guests`) in
     `game/config/islands.ts`, landing-page blurb in `src/app/page.tsx` (`DRAGON_BLURB`);
   - how to check it: open /dev/island.
4. Create `docs/DIEU_CHINH_THUONG_GAP.md` ("common tweaks"): where to change walk speed/stride, leg
   lift, flight pitch, tail sway (`tailWave`), skill effect sizes, island/building positions,
   production rates — file + constant name for each. Only list things you actually found in the code.

Check: every path mentioned in the docs exists (`ls` them). Commit: `docs: architecture and how-tos`.

---

## What to send me at the end of each phase
- The commands you ran and their output (shortened if very long, but keep all errors).
- Files created / moved / deleted.
- `NOTES`: anything odd you noticed but did not change.
- Then STOP.
