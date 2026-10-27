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
export const COMBAT_HOVER: Partial<Record<SpeciesId, number>> = { black_dragon: 95, celestial_dragon: 95, fire_phoenix: 95, ice_phoenix: 95 };

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
    /** peacock tail: how far each fan_k feather turns (rad) when the tail opens fully (strike channel `fan`) */
    fan?: number[];
    rigidLegs?: boolean;
    stride?: number;
    /** how high the swinging paws lift, x RIG.lift (default 1): low for short crouched legs */
    liftScale?: number;
    flyHang?: [number, number];
    /** share of the head's own sway kept (default 1); low for a stiff neck drawn in one piece with the skull */
    neck?: number;
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
