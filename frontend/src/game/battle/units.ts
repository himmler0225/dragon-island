// Battle unit struct.
import * as Phaser from 'phaser';
import type { SpeciesId } from '../config/species';
import type { SkillSlot } from '../skills/types';
import type { DragonRig } from '../rig/DragonRig';
import type { Side } from './types';

export interface Unit {
  root: Phaser.GameObjects.Container;
  body: Phaser.GameObjects.Container;
  shadow: Phaser.GameObjects.Ellipse;
  bar: Phaser.GameObjects.Graphics;
  cloud: boolean;
  id: SpeciesId;
  rig: DragonRig;
  side: Side;
  y: number;
  fly: boolean;
  t: number;
  hp: number;
  maxHp: number;
  /** the health bar's trailing "just lost" part (share of maxHp): it eases down after each hit */
  hpLag?: number;
  dead: boolean;
  reach: number;
  /** fighting a foe (its reach is then REACH_SLACK longer) */
  engaged: boolean;
  /** knocked back: px/s it is still sliding (dies away), and how high it was thrown */
  shove: number;
  hop: number;
  /** seconds to the next puff of dust under a slide */
  skidT: number;
  /** 0..1: share of MARCH_SPEED it is moving at (eases in and out) */
  go: number;
  alt: number;
  stop: number;
  kick: number;
  pops: number[];
  ult: number;
  drop: number;
  busy: number;
  anim: number;
  cd: Record<SkillSlot, number>;
}
