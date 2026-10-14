// Skills types used across the skills folder.
import type { SpeciesId } from '../config/species';
import type { StrikeKind } from '../rig/types';

export type SkillSlot = 'basic' | 'skill' | 'ultimate';
export type SkillType = 'passive' | SkillSlot;

export interface Spot { x: number; y: number }

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
  /** Turn the image (radians), e.g. to point a slash at the target. */
  angle?: number;
  /** Recolour the effect (e.g. 0xff3040 for a blood-red drain). */
  tint?: number;
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
  self: SkillActor & { mouth(): Spot; facing: 1 | -1 };
  /** Resolved from the skill's `target`: nearest dragon, all other dragons, or the whole team. */
  targets: SkillActor[];
  fx(n: number, at: Spot, opts?: FxOpts): void;
  /** Fly effect n from `from` to `to`, pointed along the way; resolves on arrival. */
  projectile(n: number, from: Spot, to: Spot, opts?: { dur?: number; scale?: number; tint?: number; rotate?: boolean; flipX?: boolean }): Promise<void>;
  wait(ms: number): Promise<void>;
  shake(ms: number, intensity: number): void;
  /** Giant jaws open over `at` and snap shut; resolves at the snap. */
  bite(at: Spot, opts?: { scale?: number; tint?: number }): Promise<void>;
  /** Crescent wind waves rolling from `from` in direction `dir`; resolves when they reach `reach` px. */
  gust(from: Spot, dir: 1 | -1, opts?: { reach?: number; scale?: number; tint?: number }): Promise<void>;
  /** Bones raining down on `at`; resolves on impact. */
  boneRain(at: Spot, opts?: { count?: number; scale?: number }): Promise<void>;
  /** A glowing orb spat from `from` to `to` with a trail; resolves on arrival. */
  orb(from: Spot, to: Spot, opts?: { scale?: number; tint?: number; dur?: number }): Promise<void>;
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
  run?(ctx: SkillCtx): Promise<void> | void;
}
