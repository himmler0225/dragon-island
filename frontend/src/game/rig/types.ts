// Rig types.
import type { SpeciesId } from '../config/species';

export type RigMode = 'idle' | 'walk' | 'fly' | 'sleep';
export type StrikeKind = 'attack' | 'cast' | 'ultimate';

/**
 * Strike keyframe channels (rig px / radians; dragon faces left, so negative x = forward):
 * lunge: torso x shift; rear: torso tilt; lift: torso y; head: head tilt; jaw: mouth open (0..1);
 * wings: raise (0..1); claw: paw swipe; flap: beat wings; air: lift off the ground (Dragon adds it to altitude);
 * spread: wings open (0..1); stretch: hind legs out (0..1); guns: shell cannons out (0..1, above 1 = a shot's kick); glow: eyes lit (0..1, motion.eye);
 * `hit`: share of `dur` when blow lands.
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
    /** wing_rest (build_rig): each wing's [dx, dy, rad, scale] on the ground, about its root; none in flight */
    wingRest?: Partial<Record<'wing_near' | 'wing_far', [number, number, number, number]>>;
    /** wing_fly (build_rig): each wing's [dx, dy] in flight only */
    wingFly?: Partial<Record<'wing_near' | 'wing_far', [number, number]>>;
    /** Rồng Rùa: rig px its cannons sink into the shell when not firing (strike channel `guns`) */
    cannonDrop?: number;
    /** how much the body bobs, rocks and surges while walking (x the default; a heavy shell: less) */
    sway?: number;
    /** 'trot': the legs step in diagonal pairs, every paw lifted as high (default: one leg after another) */
    /** colour of the motes a glowing wing sheds (default gold) */
    glowColor?: number;
    gait?: 'trot';
    /** the eye's place on the head image (share of its width / height): eyeWorld() */
    eye?: [number, number];
    /** tint of the eye's glow (strike channel `glow`; default coral red) */
    eyeColor?: number;
    /** share of a step cycle a paw is on the ground (default RIG.duty) */
    duty?: number;
    tailWave?: number[];
    hindKnee?: 'back';
    foreArms?: boolean;
    noFly?: boolean;
    /** peacock tail: how far each fan_k feather turns (rad) when the tail opens fully (strike channel `fan`) */
    fan?: number[];
    /** how far (rad) the fan_k plumes sway on their own (default 0.02: a shimmer; long tail plumes: more) */
    fanWave?: number;
    /** rad the body tips forward (head down) on the ground: a biped stooping over its legs */
    lean?: number;
    /** never walks on the island: wanders by flying and rests in the air (with idleHover) */
    alwaysFly?: boolean;
    /** flyLegs 'tuck': [dx rig px, share of the leg length] the paws are drawn up to under the hip (dx < 0: forward) */
    tuck?: [number, number];
    /** how much wider the far (half-hidden) legs step, on top of the gap to their near twin (default 1) */
    farStep?: number;
    rigidLegs?: boolean;
    stride?: number;
    /** how high the swinging paws lift, x RIG.lift (default 1): low for short crouched legs */
    liftScale?: number;
    /** head nod per step while walking (rad, default 0.04): a bird bobs its head hard */
    headBob?: number;
    flyHang?: [number, number];
    /** floats instead of walking (a spirit): the legs hang and sway, the body bobs; arms still swing */
    float?: boolean;
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
