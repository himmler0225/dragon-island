# Cleanup task: English file names, remove AI-style comments, split files to ≤ 200 lines (NO behaviour changes)

You are working in `dragon-island/` (repo root = this folder, it is a git repo). This is a **cleanup**
pass so a human can maintain the code by hand. You are NOT adding features, NOT fixing bugs, NOT
tuning numbers, NOT restyling UI.

Three goals, done in this order:
1. **Rename files (and folders, docs) whose names are Vietnamese to English names.**
2. **Remove "AI-style" comments** (rules below) — keep comments that a human developer needs.
3. **Split every source file longer than 200 lines** into smaller modules, each ≤ 200 lines.

Work in **phases**. Do **one phase per reply**. At the end of each phase: run that phase's checks,
paste their output, list every file you created / renamed / deleted, make **one git commit** for the
phase, then **STOP and wait** for me to say "continue". Never start the next phase on your own.

---

## 0. Hard rules (read twice, follow always)

1. **Behaviour must stay identical.** The game must look and play exactly the same after every phase.
   Move code **verbatim**: same statements, same order, same numbers, same variable names (except
   where this prompt explicitly asks for a rename). Do not "simplify" maths, merge branches, convert
   `function` ↔ arrow, change `let`/`const`, reorder animation code or change CSS. If you think
   something is a bug, write it in a `NOTES` list in your reply — do not fix it.
2. **Never change runtime data keys.** Species IDs such as `'hac_long'`, `'rong_xuong'`,
   `'phuong_hoang_lua'` are data, not file names: they are used as asset folder names
   (`assets/dragons/<id>/`, `frontend/public/dragons/<id>/`), texture keys, `rig.json` lookups,
   `CONFIGS['<id>']`, `SPECIES`, `STRIKES`, skill registries, etc. **Keep every string ID exactly as
   it is.** Only *file / module names* and *TS/Python identifiers that exist only to name a module*
   (e.g. `RONG_BAC_SKILLS`) may change, and only if listed in the rename table.
3. **Never change user-facing Vietnamese text** (dragon names like `'Rồng Bạc'`, element names,
   button labels, tips, toasts, `RARE_LABEL`, etc.). The game UI is Vietnamese on purpose.
4. **Do not touch**:
   - `assets/` (source art), `legacy/` (old HTML demo), `backend/`,
   - `frontend/public/` (generated images — only the Python tools write there),
   - `tools/legacy/` (old scripts, keep as they are),
   - `frontend/AGENTS.md`, `frontend/next.config.ts`, `package.json` / lock files (no new
     dependencies, no upgrades), `tsconfig.json`, eslint config,
   - `frontend/src/app/globals.css`, `frontend/src/app/home.module.css`,
   - `frontend/src/app/**/page.tsx` and `layout.tsx` (my own portal pages) — except updating an
     import path if a file they import was renamed.
   - `CURSOR_REFACTOR_PROMPT.md`, this file.
5. Stack: **Next.js 16 + React 19 + Phaser 3.90**. Next 16 differs from what you know; do not change
   routing, layouts, `'use client'` lines, `next/dynamic(..., { ssr: false })` calls or metadata
   exports. If unsure about a Next API, read `frontend/node_modules/next/dist/docs/` first.
6. **Phaser must never be imported by React code.** React files (`src/app/**`, `src/components/**`)
   may only import Phaser-free modules (`@/game/config`, `@/game/bridge`, `import type ...`). When
   you split a Phaser file, do not let a new Phaser-importing module end up in a React import chain.
7. Imports: React code uses the `@/` alias; code inside `src/game/**` uses relative imports (as now).
   Keep each folder's `index.ts` barrel as the public API; if you split a module, re-export from the
   barrel so outside importers don't change.
8. Do **not** run Prettier / `eslint --fix` over files and do not reformat code you did not move.
   Diffs must show renames and moves, not reformatting. Keep the existing indentation (2 spaces TS,
   4 spaces Python) and the existing long-line style.
9. Do **not** start `next dev` — I already run it on http://localhost:3000; a second one refuses to
   start. Do not run `next build` either (it fights with the running dev server over `.next/`).
10. Python tools: always run with `.venv/bin/python` from `dragon-island/` (plain `python3` is a
    different environment without numpy/opencv).
11. Use `git mv` for every rename/move so history follows the file.
12. If a step is unclear, or a check fails and you cannot see why within 2 attempts: **stop and ask**.
    Never delete code to make an error go away, never add `// @ts-ignore`, `@ts-expect-error`,
    `any`, `# type: ignore` or `eslint-disable`.

### Standard checks (run at the end of every phase)

```bash
# TypeScript + lint (frontend)
cd frontend && npx tsc --noEmit -p . && npx eslint src && cd ..

# Python: every tool compiles and the rig configs still load with the same keys
.venv/bin/python -m compileall -q tools
cd tools && ../.venv/bin/python -c "from rig_configs import CONFIGS; print(sorted(CONFIGS))" && cd ..

# Nothing outside the allowed areas changed
git status --short -- assets legacy backend frontend/public tools/legacy
```

The `CONFIGS` key list printed must be **identical** before and after every phase (record it in
phase 1). The last command must print nothing.

---

## Phase 1 — Baseline

1. `git status`. There are uncommitted changes from me (README, docs, `frontend/public/dragons/...`,
   deleted old assets). **Do not revert or edit them.** Commit them as they are:
   `git add -A && git commit -m "chore: baseline before cleanup"`.
2. Run the standard checks and paste the output (this is the reference). If `tsc` or `eslint` already
   report errors, list them — they are not yours to fix, but no **new** error may appear later.
3. Print a table of every `.ts`, `.tsx`, `.py` file in `frontend/src/`, `tools/` (excluding
   `tools/legacy/`) and `backend/src/` with its line count (`wc -l`), sorted descending, and mark the
   ones > 200 lines. Expected (roughly):

   | file | lines |
   |---|---|
   | tools/build_rig.py | ~578 |
   | frontend/src/game/battle/createBattle.ts | ~532 |
   | frontend/src/game/rig/DragonRig.ts | ~429 |
   | frontend/src/game/scene/effects/combatFx.ts | ~370 |
   | frontend/src/game/scene/Dragon.ts | ~327 |
   | frontend/src/game/scene/IslandScene.ts | ~305 |
   | frontend/src/game/scene/Island.ts | ~298 |
   | frontend/src/game/rig/strikes.ts | ~229 |
   | frontend/src/components/game/BreedPanel.tsx | ~217 |
   | frontend/src/components/game/BattleScreen.tsx | ~212 |
   | tools/rig_jaw.py | ~209 |

   CSS modules > 200 lines (if any, except `globals.css`/`home.module.css`) also count.
4. STOP.

---

## Phase 2 — Rename Vietnamese file names to English

Rename **files only** (module names). String IDs inside the code stay the same (rule 0.2).
Use camelCase for TS files (like `dayNight.ts`, `foodBoat.ts`) and snake_case for Python files.

### 2a. Frontend skill modules (`frontend/src/game/skills/`)

| old | new | species ID it covers (unchanged) |
|---|---|---|
| `hac_long.ts` | `blackDragon.ts` | `hac_long` |
| `rong_xuong.ts` | `boneDragon.ts` | `rong_xuong` |
| `tuan_long.ts` | `stagDragon.ts` | `tuan_long` |
| `hai_long.ts` | `seaDragon.ts` | `hai_long` |
| `ki_lan.ts` | `qilin.ts` | `ki_lan` |
| `rong_vang.ts` | `goldSilverTwins.ts` | `rong_vang`, `rong_bac` (check which it holds) |
| `than_long.ts` | `celestialDragon.ts` | `than_long` |
| `tu_xa_long.ts` | `voidSerpent.ts` | `tu_xa_long` |
| `phuong_hoang.ts` | `phoenix.ts` | `phuong_hoang_lua`, `phuong_hoang_bang` |
| `basic_dragons.ts` | `basicDragons.ts` | the 4 chibi dragons |

- Also rename the **exported constant names** that only describe the module, e.g.
  `HAC_LONG_SKILLS` → `BLACK_DRAGON_SKILLS`, `RONG_BAC_SKILLS` → `SILVER_DRAGON_SKILLS`. Keep a
  table of every identifier you rename in your reply. Do **not** rename object keys:
  `rong_bac: SILVER_DRAGON_SKILLS` is correct, `silver_dragon: ...` is wrong.
- Update every import (`registry.ts`, `combos.ts`, `index.ts`, `status.ts`, scene/battle files…).
  Search with `grep -rn "skills/<old>" frontend/src` and `grep -rn "<OLD_CONST>" frontend/src`
  until both return nothing.

### 2b. Python rig configs (`tools/rig_configs/`)

| old | new |
|---|---|
| `hac_long.py` | `black_dragon.py` |
| `rong_xuong.py` | `bone_dragon.py` |
| `tuan_long.py` | `stag_dragon.py` |
| `hai_long.py` | `sea_dragon.py` |
| `ki_lan.py` | `qilin.py` |
| `rong_vang.py` | `gold_dragon.py` |
| `rong_bac.py` | `silver_dragon.py` |
| `than_long.py` | `celestial_dragon.py` |
| `tu_xa_long.py` | `void_serpent.py` |
| `phuong_hoang_lua.py` | `fire_phoenix.py` |
| `phuong_hoang_bang.py` | `ice_phoenix.py` |
| `rong_lua_do.py` | `fire_dragon.py` |
| `rong_dat_nau.py` | `earth_dragon.py` |
| `rong_cay_xanh_la.py` | `forest_dragon.py` |
| `rong_bang_xanh_bien.py` | `ice_dragon.py` |

- In `tools/rig_configs/__init__.py` update the `from . import ...` lines and the values, but **keep
  every dict key**: `"hac_long": black_dragon.CONFIG` (key stays `"hac_long"`).
- Some configs import each other's `layout()` (e.g. `than_long.py` uses `hac_long.layout`,
  `rong_bac.py` uses `rong_vang.layout`, `phuong_hoang_bang.py` uses `phuong_hoang_lua.layout`).
  Update those imports too. `grep -rn "hac_long\.\|rong_vang\.\|phuong_hoang_lua\." tools` must only
  show string IDs, not module references.
- Any other tool that imports a config module by name (`build_rig.py`, `rig_jaw.py`,
  `slice_*.py`, `skill_icons_from_portrait.py`) must be updated.

### 2c. Docs (`docs/`)

| old | new |
|---|---|
| `docs/DIEU_CHINH_THUONG_GAP.md` | `docs/COMMON_TWEAKS.md` |
| `docs/THEM_RONG_MOI.md` | `docs/ADDING_A_DRAGON.md` |

Update every link to them (`README.md`, `docs/ARCHITECTURE.md`, `tools/README.md`, …). Do not
translate the docs' content in this phase. Also update file paths mentioned inside the docs
(e.g. `skills/hac_long.ts` → `skills/blackDragon.ts`, `rig_configs/hac_long.py` →
`rig_configs/black_dragon.py`) — but paths like `assets/dragons/hac_long/` stay (they are IDs).

### 2d. Anything else

Run `git ls-files | grep -v -e '^assets/' -e '^legacy/' -e '^frontend/public/' -e '^tools/legacy/'`
and list every remaining file/folder name that is Vietnamese (or contains a Vietnamese word such as
`rong`, `long`, `lan`, `phuong`, `hoang`, `xuong`). Propose English names in a table and **wait for my
OK** before renaming them.

### Checks
- Standard checks (CONFIGS keys identical to phase 1).
- `grep -rnE "from '\./(hac_long|rong_|tuan_long|hai_long|ki_lan|than_long|tu_xa_long|phuong_hoang|basic_dragons)" frontend/src` → nothing.
- `cd tools && ../.venv/bin/python build_rig.py hac_long rong_vang rong_bac than_long && cd .. && git status --short frontend/public`
  → must print nothing (regenerated rig files are byte-identical). If files differ, STOP and show
  `git diff --stat frontend/public` — do not commit regenerated files.
- Commit: `refactor: English file names for skills, rig configs and docs`.

---

## Phase 3 — Remove AI-style comments

Go through every file in `frontend/src/game/**`, `frontend/src/components/**`, `frontend/src/lib/**`,
`tools/*.py`, `tools/lib/**`, `tools/rig_configs/**` (NOT `tools/legacy/`, NOT `assets/`, NOT
`frontend/src/app/**`).

### DELETE a comment when it is:
1. **Change history / narration** — describes what was changed, when, or why it used to be different:
   `(was 30)`, `redrawn ... (2026-10-15)`, `previously`, `no longer`, `now uses`, `the old ...`,
   `before the jaw was added`, `ported from legacy/index.html`, `the user asked`, `fixed ...`,
   any date. (Git history is the place for that.)
2. **Restating the code**: `// set x`, `// loop over dragons`, `// return the result`,
   `// constructor`, `// import Phaser`, a docstring that just repeats the function name.
3. **Talking to the reader / the assistant**: `Note:`, `Important:`, `Here we...`, `We now...`,
   `Let's...`, `This ensures that...`, `As requested...`, apologies, `TODO (AI)`, emoji in comments.
4. **Meta comments about the refactor**: `Public API of the skills/ folder.`, `Rig types exported from
   rig/ for use by other modules`, `re-exported`, `defined here (not re-exported from types.ts) to
   avoid moduleResolution issues`, `This package's __init__ aggregates them into...`.
5. **Commented-out code** (dead code inside `//` or `#`). List each block you delete in your reply.
6. **Section banners with nothing to say**, e.g. `// ---- per frame ----------` **only** if the file
   ends up < 120 lines after phase 4; otherwise keep them (they help navigation). In this phase, keep
   them.

### KEEP a comment when it explains something the code cannot say:
- **Units and coordinate spaces**: `// field px/s`, `// sheet x`, `// world px per image px`,
  `// rig.json is exported at 2x the on-screen size`, `// 0..1 origin`.
- **Why a magic number has that value / what it does visually**: `// melee dragons stop this far from
  the statue's centre`, `// hungry: drags its feet`, `// art faces left`, `// never stop on a building`.
- **Non-obvious constraints and gotchas**: blend modes, IK knee direction, why a piece is drawn on top,
  why a step must run before another.
- **The 1–3 line header at the top of each file** that says what lives in it. Rewrite it if it is
  narration (e.g. turn "Movement rules ... ported from legacy/index.html" into
  "Movement rules: walk on grass, take off / cruise / land, wander."). Every file must still start
  with such a header after this phase.

### Rewrite (don't delete) a comment when it mixes both
e.g. `# knee pulled in 48 px (was 30): the thigh and shin read as one leg instead of stacked clumps`
→ `# knee pulled in 48 px so the thigh and shin read as one leg`.

### Rules for this phase
- Change **comments only**. `git diff -w --word-diff` must show nothing but comment text. Do not touch
  a single code token, string, or blank-line structure around code (deleting the comment line itself
  is fine).
- Keep comments in **English**, short, lowercase start, same style as the existing ones.
- Vietnamese text inside **strings** is UI text — never touch it.
- In your reply, give per-file counts: `deleted / rewritten / kept`, plus the 10 most questionable
  deletions so I can review them.

### Checks
- Standard checks.
- `git diff --stat` shows only the files you edited; `git diff | grep '^[-+]' | grep -vE '^[-+]\s*(//|#|\*|/\*|"""|$)' | grep -vE '^(\+\+\+|---)'`
  → must print **nothing** (proves only comment lines changed). If it prints a trailing-comment
  line, double-check the code part is byte-identical and show it to me.
- Commit: `chore: remove narration and redundant comments`.

---

## Phase 4 — Split files to ≤ 200 lines

**Limit:** every `.ts`, `.tsx`, `.py`, `.module.css` file in `frontend/src/game/**`,
`frontend/src/components/**`, `frontend/src/lib/**`, `tools/*.py`, `tools/lib/**`,
`tools/rig_configs/**` must be **≤ 200 lines** (`wc -l`). Excluded: `tools/legacy/`,
`frontend/src/app/**`, `globals.css`, `home.module.css`, `backend/`.

**Target:** aim for 80–180 lines per file. Do not make dozens of 20-line files; split by
**responsibility**, not by counting lines. Do one file per sub-step (4a, 4b, …), run `tsc` after each,
and commit after each sub-step (`refactor(<area>): split <file>`). Stop and ask after 4c and after
the last sub-step.

### How to split without changing behaviour
- **Constants / tables / types** → a sibling `*.config.ts`, `constants.ts` or `types.ts` file. Copy
  them verbatim, `export` them, import them back.
- **Pure helper functions** (no `this`) → a sibling helper module. Move verbatim.
- **Big classes** (Phaser scenes, `DragonRig`, `Dragon`, `CombatFx`): keep the class and its public
  methods in the original file (same file name, same export, so importers don't change). Move groups
  of private logic into **plain functions** in new files that take the instance (or the few fields
  they need) as the first argument, e.g.
  ```ts
  // battle/units.ts
  export function spawnUnit(scene: BattleScene, id: SpeciesId, side: Side) { /* old body, this. → scene. */ }
  // createBattle.ts
  spawn(id: SpeciesId, side: Side) { return spawnUnit(this, id, side); }
  ```
  - Replace `this.` with the parameter name and nothing else. Fields that were `private` and are now
    needed by the helper become non-private (drop `private`, add a one-line comment
    `// used by <file>`); do not add getters/setters.
  - Keep `this` binding correct for callbacks (`this.time.delayedCall(..., () => ...)` → arrow with
    the parameter, never a bare `function`).
- **A single function/method over 200 lines** (e.g. `DragonRig.update`, `build()` in
  `build_rig.py`): cut it into **sequential steps** in the order they run (`updateBody`, `updateLegs`,
  `updateWings`, `updateTail`, `updateHead`, …). Local variables shared between steps are passed as
  arguments or returned as a small object. Statement order across the steps must be exactly the
  original order. If a block reads/writes many locals so splitting would need > 6 parameters, keep it
  together and tell me.
- **React components**: move sub-components (`Egg`, `StarRing`, …) and constant tables (`TIPS`,
  `WAVES`, `ALLY_BUFFS`, `RARE_LABEL`, …) to sibling files; move a group of `useEffect`s with their
  state into a custom hook `useXxx.ts` in the same folder. Keep `'use client'` at the top of every
  file that has JSX or hooks. Keep each component's CSS module import where its class names are used
  (it's fine for two files to import the same `.module.css`).
- Each new file starts with a 1–3 line English header comment saying what lives in it.
- Put new files **next to** the file they came from, or in a new sub-folder named after it
  (e.g. `game/battle/` already exists; `game/rig/dragonRig/` for the rig pieces). Add them to the
  folder's `index.ts` only if they are needed outside the folder.
- **Circular imports**: never let a helper module import the class file it was cut from at runtime.
  Use `import type { BattleScene } from './createBattle'` (type-only) for the parameter type.

### Suggested split per file (adjust after reading the code; tell me if you deviate)

| file (lines) | suggested pieces |
|---|---|
| `game/battle/createBattle.ts` (~532) | `battle/constants.ts` (FIELD_W…DROP_MS, HUE, STATS, COOLDOWN, ANIM, LANES, FLYERS, HIGH, RANGED…), `battle/types.ts` (BattleApi, BattleEvents, Side, Unit), `battle/units.ts` (spawn, dive, land, foe, kill, inflict), `battle/combat.ts` (attack, charge, ultimate, impact, pop, ctxFor, statue), `battle/BattleScene.ts` (class: preload/create/fit/look/setHp/drawHp/update), `createBattle.ts` keeps only the exported `createBattle()` + re-exports `FIELD_W`, `FIELD_H`, types so importers stay unchanged |
| `game/rig/DragonRig.ts` (~429) | `rig/alphaMask.ts` (ALPHA, pixels, alphaAt), `rig/eyelids.ts` (EYES, MOUTH_OPEN if only used there, makeLids, updateLids), `rig/pose/*.ts` — the ~200-line `update()` cut into ordered steps (body/breathing, legs+IK, wings, tail, head/jaw/mouth, fly/sleep modes), `DragonRig.ts` keeps the class, constructor, `strike`, `update` (calling the steps), `local`, `place`, `onHead`, `hit` |
| `game/scene/effects/combatFx.ts` (~370) | `effects/combatFx/rift.ts`, `elementRain.ts`, `projectiles.ts` (projectile, beam, orb), `melee.ts` (bite, gust, boneRain, waterSplash); `combatFx.ts` keeps the class, pool (`take`), `fx`, `floatText`, the `call*` wrappers |
| `game/scene/Dragon.ts` (~327) | `scene/dragon/flight.ts` (Flight type, updateFlight, flyTo helpers), `scene/dragon/hunger.ts` (updateHunger, feed), `scene/dragon/brain.ts` (think: wandering), class stays in `Dragon.ts` |
| `game/scene/IslandScene.ts` (~305) | `scene/islandScene/loadAssets.ts` (preload body), `scene/islandScene/input.ts` (tap, onSea, select, focusIsland, fit, drag constants), `scene/islandScene/skills.ts` (useSkill, ctxFor, withStatus, runSkill, availableCombos, useCombo, SpotTarget) |
| `game/scene/Island.ts` (~298) | `scene/island/keys.ts` (islandKey…grassKey, NEST_KEY, LAMP_KEY), `scene/island/decor.ts` (createLamps, createGrass, stepGrass, waterSparkle, LAMP), `scene/island/nest.ts` (createNest), `scene/island/geometry.ts` (toWorld, toImage, free, pathFree, randomPoint, detour, closestFree, nearPoint, opaqueAt); keys must still be importable from `./Island` (re-export) |
| `game/rig/strikes.ts` (~229) | `rig/strikes/sets.ts` (CHIBI, TWIN_DRAGON, PHOENIX), `rig/strikes/table.ts` (STRIKES), `rig/strikes/track.ts` (smoothstep, track); `strikes.ts` re-exports |
| `components/game/BreedPanel.tsx` (~217) | `BreedPanel.parts.tsx` (Egg, StarRing), `breedData.ts` (OwnedDragon, OWNED, PAGE, RARE_LABEL, STAR_COLORS), optional `useBreed.ts` hook |
| `components/game/BattleScreen.tsx` (~212) | `battleScreen.data.ts` (MANA_MAX…TIME, TIPS, SUMMON_COST, STARS, ALLY_BUFFS, ENEMY_BUFFS, WAVES, fmt), `useBattleTimer.ts` / `useBattleGame.ts` hooks for the `useEffect` groups, small presentational sub-components if still > 200 |
| `tools/build_rig.py` (~578) | `tools/rig/constants.py` (SEGMENTS, ORDER, BODY_PARENT, CAPS, TARGET_*, LEG_SIDES…), `tools/rig/image_ops.py` (align_replacement, feather, split_tallest, turn_point, rotate_about, solid_x), `tools/rig/build.py` (`build(cfg)` cut into ordered steps: body pieces, legs, wings, caps/scale), `tools/rig/export.py` (compose, add_caps, split_crest, portrait, export); `build_rig.py` keeps only the CLI `if __name__ == "__main__":` and imports. **Careful:** `OUT` is a module global set in `__main__` and read by `export()` — turn it into an explicit argument (`export(cfg, pieces, out, debug)`) and pass `OUT_ROOT / dragon_id`; this is the only signature change allowed, mention it in NOTES. The CLI (`build_rig.py [ids...] [--debug dir]`) must work exactly as before. Name the new package so it does not clash with `rig_configs` or `rig_jaw.py`. |
| `tools/rig_jaw.py` (~209) | move its constants/POINTS table to `tools/rig/jaw_points.py`, helpers (clip_wedge, despill…) to `tools/rig/jaw_ops.py`; `rig_jaw.py` keeps its public functions so `build_rig` import still works |

Any other file that ends up > 200 lines (including after earlier phases) gets the same treatment.

### Checks (after each sub-step)
- `cd frontend && npx tsc --noEmit -p . && npx eslint src && cd ..`
- No React file pulls Phaser: `grep -rln "from 'phaser'" frontend/src/components frontend/src/app` →
  nothing (type-only `import type` is allowed — show me if any).
- Line limit:
  ```bash
  find frontend/src/game frontend/src/components frontend/src/lib tools -path tools/legacy -prune -o \
    \( -name '*.ts' -o -name '*.tsx' -o -name '*.py' -o -name '*.module.css' \) -print \
    | xargs wc -l | sort -rn | awk '$1 > 200 && $2 != "total"'
  ```
  → nothing (when the phase is complete).
- Python sub-steps: regenerate **all** rigs and prove output is identical:
  `cd tools && ../.venv/bin/python build_rig.py && cd .. && git status --short frontend/public`
  → must print nothing. If anything differs, STOP, show `git diff --stat frontend/public`, and
  `git checkout -- frontend/public` before continuing.
- Tell me which screen to check by hand in my running dev server
  (http://localhost:3000/play, /dev/island, the battle screen from the HUD "Chiến đấu" button, the
  breed panel), and what to look at (dragons walk/fly/sleep, skills + combos fire, battle units
  spawn and fight, eyelids blink, jaws open).

---

## Phase 5 — Final review

1. Final table: every file in scope with its line count (all ≤ 200).
2. `git log --oneline` for this task.
3. Updated `docs/ARCHITECTURE.md`, `docs/ADDING_A_DRAGON.md`, `tools/README.md`, `README.md`:
   fix every file path / folder tree that changed (skill files, rig configs, new sub-folders,
   `build_rig` package). "Adding a new dragon" steps must mention the new file names
   (e.g. "add `skills/<englishName>.ts`, register it in `registry.ts` under the species ID").
   Paths only — do not rewrite the guides.
4. Full `NOTES` list: suspected bugs you noticed but did not fix, every signature you had to change,
   every `private` you dropped, anything you were unsure about.
5. Run the standard checks one last time and paste the output. Commit:
   `docs: update paths after cleanup`.
