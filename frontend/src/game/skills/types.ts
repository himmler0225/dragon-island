// Skills types used across the skills folder.
import type { SpeciesId } from '../config/species';
import type { StrikeKind } from '../rig/types';

export type SkillSlot = 'basic' | 'skill' | 'ultimate';
export type SkillType = 'passive' | SkillSlot;

export interface Spot { x: number; y: number }

/** Options for SkillCtx.anim. */
export interface AnimOpts {
  /** frames per second (default 14) */
  fps?: number;
  scale?: number;
  /** which point of the frames sits on the spot (default: centre) */
  anchor?: 'center' | 'bottom';
  /** keep playing the last `loop[0]` frames for `loop[1]` ms before it ends (a held aura) */
  loop?: [number, number];
  tint?: number;
  flipX?: boolean;
  /** drawn under the dragons (a ring on the ground) */
  ground?: boolean;
  /** after the frames (and `loop`), keep replaying the last `loop[0]` frames while this is true (an aura held while it lasts) */
  hold?: () => boolean;
  /** follow a moving spot (re-read every frame): an aura round a dragon that walks */
  follow?: () => Spot;
  /** extra copies stacked on it (additive): a brighter effect */
  boost?: number;
  /** draw at this depth instead (e.g. just behind a dragon, so the effect wraps round it) */
  depth?: number;
  /** called as each frame shows (k from 0): time a blow to the frame it lands on */
  onFrame?: (k: number) => void;
}

export interface FxOpts {
  scale?: number;
  /** Total life in ms (fade in, hold, fade out). */
  dur?: number;
  /** Extra ms held at full strength (status overlays). */
  hold?: number;
  /** Radians turned over the effect's life. */
  spin?: number;
  /** Lay it flat on the ground (squashed, drawn under the dragons). */
  ground?: boolean;
  /** Which point of the image sits on the spot. Default: centre. */
  anchor?: 'center' | 'bottom';
  flipX?: boolean;
  /** Colour of the soft light the effect throws round itself (set by the scene: the dragon's colour). */
  light?: number;
  /** Turn the image (radians), e.g. to point a slash at the target. */
  angle?: number;
  /** Recolour the effect (e.g. 0xff3040 for a blood-red drain). */
  tint?: number;
}

/** Options for SkillCtx.rift. */
export interface RiftOpts {
  scale?: number;
  tint?: number;
  /** ms the fire takes to sweep from the first enemy to the last */
  dur?: number;
  /** dart down and bite the first target instead of breathing fire */
  bite?: boolean;
}

/** Options for SkillCtx.elementRain. */
export interface ElementRainOpts {
  tint: number;                 // main colour of the pieces and bursts
  core?: number;                // bright core colour (default white)
  shape: 'feather' | 'shard';   // flame feathers (fire) or ice shards (ice)
  waves?: number;               // default 3
  perTarget?: number;           // pieces per target per wave, default 3
}

export interface SkillActor {
  readonly id: SpeciesId;
  chest(): Spot;
  feet(): Spot;
  /** Just above the head. */
  head(): Spot;
  hurt(): void;
  text(text: string, color?: string): void;
  /** Knock back by `dx` world px (sign = direction); only dragons move. */
  push?(dx: number): void;
}

export interface SkillCtx {
  self: SkillActor & { mouth(): Spot; eye(): Spot; facing: 1 | -1;
    /** World position of a point on a bone's image (share of its width / height), e.g. a cannon's muzzle. */
    point(bone: string, fx: number, fy: number): Spot };
  /** Resolved from the skill's `target`: nearest dragon, all other dragons, or the whole team. */
  targets: SkillActor[];
  fx(n: number, at: Spot, opts?: FxOpts): void;
  /** Fly effect n from `from` to `to`, pointed along the way; resolves on arrival. */
  projectile(n: number, from: Spot, to: Spot, opts?: { dur?: number; scale?: number; tint?: number; rotate?: boolean; flipX?: boolean }): Promise<void>;
  /** Effect n stretched into a straight beam from `from` to `to`; resolves when it reaches full length. */
  beam(n: number, from: Spot, to: Spot, opts?: { dur?: number; width?: number; tint?: number }): Promise<void>;
  /** Elemental rain: pieces appear and hover above every target, then dive down in waves; `onHit`
   *  runs on each impact. Resolves when the last wave has landed. */
  elementRain(targets: SkillActor[], onHit: (t: SkillActor) => void, opts: ElementRainOpts): Promise<void>;
  wait(ms: number): Promise<void>;
  /** A time rift opens at `at`; this dragon's head reaches out and breathes fire across `targets`
   *  (or bites the first with `bite`); `onHit` runs as each one is reached. Resolves when it closes. */
  rift(at: Spot, targets: SkillActor[], onHit: (t: SkillActor) => void, opts?: RiftOpts): Promise<void>;
  shake(ms: number, intensity: number): void;
  /** Giant jaws open over `at` and snap shut; resolves at the snap. */
  bite(at: Spot, opts?: { scale?: number; tint?: number }): Promise<void>;
  /** Crescent wind waves rolling from `from` in direction `dir`; resolves when they reach `reach` px. */
  gust(from: Spot, dir: 1 | -1, opts?: { reach?: number; scale?: number; tint?: number }): Promise<void>;
  /** Bones raining down on `at`; resolves on impact. */
  boneRain(at: Spot, opts?: { count?: number; scale?: number }): Promise<void>;
  /** A glowing orb spat from `from` to `to` with a trail; resolves on arrival. */
  orb(from: Spot, to: Spot, opts?: { scale?: number; tint?: number; dur?: number }): Promise<void>;
  /** Play effects first .. first + count - 1 as an animation at `at`; resolves when it is gone. */
  anim(first: number, count: number, at: Spot, opts?: AnimOpts): Promise<void>;
  /** Water splash at `at`: foam rings and droplets (`big` adds a falling water pillar). */
  splash(at: Spot, opts?: { scale?: number; big?: boolean }): void;
}

export interface SkillDef {
  type: SkillType;
  name: string;
  desc: string;
  /** Pose played by the rig; passives have none. */
  anim?: StrikeKind;
  target?: 'enemy' | 'enemies' | 'team';
  /** With target 'enemies': every foe ahead on the field, not just the few round the one it aims at (a shot that pierces them all). */
  pierce?: boolean;
  run?(ctx: SkillCtx): Promise<void> | void;
}
