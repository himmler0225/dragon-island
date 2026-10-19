// Rig types.
import type { SpeciesId } from '../config/species';

export type RigMode = 'idle' | 'walk' | 'fly' | 'sleep';
export type StrikeKind = 'attack' | 'cast' | 'ultimate';

/**
 * Strike keyframe channels (rig px / radians; dragon faces left, so negative x = forward):
 * lunge: torso x shift; rear: torso tilt; lift: torso y; head: head tilt; jaw: mouth open (0..1);
 * wings: raise (0..1); claw: paw swipe; flap: beat wings; air: lift off the ground (Dragon adds it to altitude);
 * spread: wings open (0..1); stretch: hind legs out (0..1); `hit`: share of `dur` when blow lands.
 */
export interface Strike { dur: number; hit: number; t: number[]; [ch: string]: number[] | number }

/** Species that fight from the air: they hover this high (body px) until a few seconds after a move. */
export const COMBAT_HOVER: Partial<Record<SpeciesId, number>> = { hac_long: 95, than_long: 95, phuong_hoang_lua: 95, phuong_hoang_bang: 95 };

type StrikeSet = Record<StrikeKind, Strike>;
export type { StrikeSet };

/** rig.json as written by tools/build_rig.py */
export interface RigData {
  name: string;
  height: number;
  motion?: {
    sleepTail?: [number, number, number];
    wingSpread?: [number, number];
    rideCloud?: boolean;
    flyLegs?: 'tuck' | 'dangle';
    flyPitch?: number;
    tailWave?: number[];
    hindKnee?: 'back';
    foreArms?: boolean;
    noFly?: boolean;
    rigidLegs?: boolean;
    stride?: number;
    flyHang?: [number, number];
    idleHover?: number;
    swingTilt?: number;
    slither?: boolean;
    stance?: [number, number];
    armPose?: [[number, number], [number, number]];
  };
  bones: {
    name: string;
    parent: string | null;
    joint: Vec;
    origin: Vec;
    toe?: Vec;
    cap?: [string, string];
  }[];
}

export type Vec = [number, number];

export type LegName = 'fore_near' | 'hind_near' | 'fore_far' | 'hind_far';

export const rigTextureKey = (species: SpeciesId, bone: string) => `rig_${species}_${bone}`;
