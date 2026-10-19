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
  cloud: Phaser.GameObjects.Image | null;
  id: SpeciesId;
  rig: DragonRig;
  side: Side;
  y: number;
  fly: boolean;
  t: number;
  hp: number;
  maxHp: number;
  dead: boolean;
  reach: number;
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
