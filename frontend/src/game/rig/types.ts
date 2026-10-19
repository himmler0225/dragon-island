// Rig types exported from rig/ for use by other modules (skills/, scene/, bridge).
import type { SpeciesId } from '../config/species';

export type RigMode = 'idle' | 'walk' | 'fly' | 'sleep';
export type StrikeKind = 'attack' | 'cast' | 'ultimate';

/**
 * Attack poses as keyframe tracks over the move's duration (t = 0..1 of `dur`). Missing channels are 0.
 * Channels (rig px / radians; the dragon faces left, so negative x = forward):
 *   lunge  torso x shift          rear  torso tilt (+ = nose up)    lift  torso y (- = up)
 *   head   head tilt (+ = up)     jaw   mouth open (0..1)            wings raise (0..1)
 *   claw   near front paw swipe forward/up (0..1)                     flap  beat the wings like flying (0..1)
 *   air    whole dragon off the ground, screen px (Dragon adds it to its altitude)
 *   spread wings thrown wide open (0..1: bigger, near wing back, far wing forward)
 *   stretch hind legs pushed out straight behind the body (0..1)
 * `hit` is the share of `dur` at which the blow lands (the game spawns the impact there).
 */
export interface Strike { dur: number; hit: number; t: number[]; [ch: string]: number[] | number }

/** Species that fight from the air: they take off when they attack and hover this high (body px)
 *  until a few seconds after their last move. Their `air` tracks are relative to the hover. */
// these fight in the air (like Hắc Long): they rise before every move and hover until it is over
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
    /** upright biped: the fore limbs are arms that hang from the chest and sway (never touch the ground) */
    foreArms?: boolean;
    /** walks only (no wings): fly commands become walks */
    noFly?: boolean;
    /** chibi legs drawn as one solid piece: each swings whole from the hip and rises when stepping (no knee) */
    rigidLegs?: boolean;
    /** own walk stride in rig px (default RIG.stride) - short-legged chibis take small steps */
    stride?: number;
    /** flight: angle back from straight down at which [fore, hind] legs hang (default [0.35, 1.05]) */
    flyHang?: [number, number];
    /** px it hovers, wings beating, while resting idle (winged dragons that rest in the air) */
    idleHover?: number;
    /** how far a swinging paw tips (default 0.55 rad); less keeps a drawn ankle closed */
    swingTilt?: number;
    /** legless serpent: crawling is a travelling wave down the body, locked to the gait */
    slither?: boolean;
    /** standing: far foot offset [fore, hind] in rig px (+ = toward the tail) so the far legs show beside the near ones */
    stance?: [number, number];
    /** rest offset of each hand [near, far] in rig px, so the two arms are held apart instead of overlapping */
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
