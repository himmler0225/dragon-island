// Pose computation: runs the math that positions all bones each frame.
// The `Bones` type matches DragonRig's internal bone map.
import { RIG } from './tuning';
import { solveLeg } from './ik';
import type { Leg } from './DragonRig';
import type { Vec } from './types';
import { MOUTH_OPEN } from './eyelids';

type Bones = Record<string, {
  joint: Vec; parent: string | null; cap?: [string, string];
  offset: Vec; pos: Vec; rot: number; sx?: number; sy?: number;
}>;

export function applyPose(
  B: Bones, legs: Leg[],
  t: number, gait: number, W: number, F: number, Z: number, hurt: number,
  A: Record<string, number>,
  motion: { slither?: boolean; rideCloud?: boolean; flyLegs?: 'tuck' | 'dangle'; flyPitch?: number;
    tailWave?: number[]; sleepTail: [number, number, number]; hindKnee?: 'back'; swingTilt?: number;
    rigidLegs?: boolean; stride?: number; flyHang?: [number, number]; neck?: number; fan?: number[]; foreArms?: boolean;
    stance?: [number, number]; armPose?: [[number, number], [number, number]]; wingSpread: [number, number] },
  tailPhase: number,
  stride: number, lift: { fore: number; hind: number },
  yawn: number,
) {
  const beat = (time: number) => {
    const fp = (time * RIG.flapRate) % 1;
    // power stroke: a quick, hard downstroke, then a slower recovery upstroke
    const d = RIG.flap.down;
    return fp < d ? 0.5 + 0.5 * Math.cos(Math.PI * fp / d) : 0.5 - 0.5 * Math.cos(Math.PI * (fp - d) / (1 - d));
  };
  const flapUp = beat(t);

  // torso
  const breathe = Math.sin(t * 2 * Math.PI / (3 + 2 * Z));
  const ground = 1 - F;
  const bob = W * RIG.strut.dip * Math.cos(4 * Math.PI * gait) * ground;
  // riding a cloud there are no wing beats: the body rests still on it (no heave, no pitching with the beat)
  const R = motion.rideCloud ? F : 0, beatF = F - R;
  const flapLift = beatF * RIG.flap.heave * (1 - flapUp);   // each downstroke heaves the body up
  const surge = W * ground * RIG.flow.surge * Math.sin(4 * Math.PI * gait + 0.6);
  B.torso.pos = [B.torso.joint[0] + A.lunge + 12 * hurt + surge,
    B.torso.joint[1] + breathe * (1.6 + 1.4 * Z) * (1 - W) + bob - flapLift + Z * RIG.lieDown + A.lift];
  B.torso.rot = 0.012 * breathe * (1 - W) + W * ground * (RIG.strut.chest + RIG.strut.roll * Math.sin(2 * Math.PI * gait)) - F * 0.1 - beatF * RIG.flap.pitch * (1 - flapUp) + Z * 0.04 + A.rear - 0.06 * hurt + F * (motion.flyPitch ?? 0);

  // head
  const slith = motion.slither ? -0.06 * W * Math.sin(4 * Math.PI * gait + 0.6) : 0;
  const steady = -RIG.flow.steady * RIG.strut.roll * Math.sin(2 * Math.PI * gait) * ground;   // head level against the roll
  const awake = (0.04 * Math.sin(t * 0.7) * (1 - W) + W * (RIG.strut.head + 0.04 * Math.sin(4 * Math.PI * gait + 1.2) + steady)) * (1 - Z);
  const fly = F * (0.06 + 0.6 * (motion.flyPitch ?? 0)) + beatF * 0.07 * flapUp;
  // breath: while breathing out the head sweeps gently up and down along the jet
  const breath = A.breath * 0.07 * Math.sin(t * 9);
  const headAngle = (motion.neck ?? 1) * (slith + awake + fly - Z * 0.32) + A.head + breath;
  applyBone(B, 'head', headAngle);

  // crest
  if (B.crest) {
    const crestAngle = (0.05 * Math.sin(t * 2.3) + 0.03 * Math.sin(t * 5.1)) * (1 - F) * (1 - Z)
      + W * 0.07 * Math.sin(4 * Math.PI * gait - 0.8) + F * (0.12 + 0.22 * (1 - flapUp)) + Z * 0.18 - 0.12 * A.rear;
    applyBone(B, 'crest', crestAngle);
  }

  // jaw
  if (B.jaw) {
    const jawAngle = -(0.03 * (1 + breathe) * (1 - Z) + 0.45 * yawn + F * 0.12 * (1 - flapUp) + 0.5 * A.jaw);
    applyBone(B, 'jaw', jawAngle);
    if (B.mouth) {
      const open = Math.max(0, B.head.rot - B.jaw.rot);
      applyBone(B, 'mouth', MOUTH_OPEN - open);
      (B.mouth as typeof B.torso & { img?: { setAlpha: (a: number) => void } }).img?.setAlpha(Math.min(1, Math.max(0, (open - 0.08) / 0.12)));
    }
  }

  // wings
  const spread = motion.wingSpread;
  for (const [k, name] of [[0, 'wing_near'], [1, 'wing_far']] as const) {
    if (!B[name]) continue;
    const up = beat(t);
    const rest = 0.03 * breathe * (1 - Z) + W * 0.04 * Math.sin(2 * Math.PI * gait) + Z * 0.28;
    // in flight the two wings fan apart (near back, far forward) so both show above the body
    const wAngle = (rest + spread[k] * (1 - Z)) * (1 - F) + F * (RIG.flap.swing * (1 - up) - 0.1 + RIG.flySplay[k]) - 0.35 * A.wings * (1 - F) + A.spread * (k === 0 ? 0.35 : -0.45);
    applyBone(B, name, wAngle);
    // downstroke: the wing sweeps down past the body to flyFold of its length below it
    B[name].sy = ((1 - F) * (1 - 0.25 * Z) + F * (RIG.flyFold + (1 - RIG.flyFold) * up)) * (1 + 0.18 * A.spread);
    B[name].sx = (1 - F * 0.12 * (1 - up)) * (1 + 0.12 * A.spread);
  }

  // tail
  const idleWave = (k: number, amp: number) => amp * Math.sin(tailPhase - k * 0.9);
  const S = motion.slither ? W : 0;
  const wave = (k: number, amp: number) => (1 - S) * idleWave(k, amp) + S * (0.45 * amp + 0.035) * Math.sin(2 * Math.PI * 2 * gait - k * 1.2);
  const curl = motion.sleepTail, back = F - R;
  const one = B.tail_mid ? 0 : 1;
  const tw = motion.tailWave ?? [1, 1, 1, 1];
  // striking: the tail swishes gently, as strong as the move, and lifts against a rearing body so it does not drag
  const effort = Math.min(1, Math.abs(A.rear) * 3 + Math.abs(A.lunge) / 30 + Math.abs(A.head) * 1.5);
  const swish = (k: number) => effort * RIG.strikeTail.swish[k] * Math.sin(t * RIG.strikeTail.rate - k * 0.9) - (k === 0 ? RIG.strikeTail.balance * A.rear : 0);
  if (B.tail_base) applyBone(B, 'tail_base', tw[0] * (wave(0, 0.05 + 0.04 * W + 0.06 * R + one * 0.07) - back * 0.15 + swish(0)) + Z * curl[0]);
  if (B.tail_mid) applyBone(B, 'tail_mid', tw[1] * (wave(1, 0.08 + 0.05 * W + 0.1 * R) - back * 0.1 + swish(1)) + Z * curl[1]);
  if (B.tail_tip) applyBone(B, 'tail_tip', tw[2] * (wave(2, 0.12 + 0.06 * W + 0.14 * R) + back * 0.1 + swish(2)) + Z * curl[2]);
  if (B.tail_fan) applyBone(B, 'tail_fan', tw[3] * (wave(3, 0.14 + 0.06 * W + 0.12 * R) + back * 0.08 + swish(3)) + Z * curl[2] * 0.5);

  // peacock tail: the feathers open wider than drawn as the fan channel rises, and shimmer a little
  motion.fan?.forEach((open, k) => {
    const name = `fan_${k + 1}`;
    if (B[name]) applyBone(B, name, open * A.fan + 0.02 * Math.sin(t * 2.2 + k * 0.7) * (1 - Z));
  });

  // legs
  for (const L of legs) {
    const hip = place(B, L.up.name);
    let [tx, ty] = L.home;
    let pawTilt = 0;
    const arm = L.kind === 'fore' && motion.foreArms;
    if (arm) {
      const walkSw = Math.sin(2 * Math.PI * (gait + (L.name === 'fore_near' ? 0.5 : 0)));
      const idleSw = Math.sin(t * 1.7 + (L.name === 'fore_near' ? 0 : 1.3));
      const sw = W * walkSw + (1 - W) * idleSw;
      const [px, py] = motion.armPose?.[L.name === 'fore_near' ? 0 : 1] ?? [0, 0];
      tx += px + (4 + 10 * W) * sw;
      ty += py - (2 + 4 * W) * Math.max(0, sw);
      pawTilt += 0.18 * sw;
    } else {
      if (L.name.endsWith('_far')) tx += (motion.stance ?? [48, 40])[L.kind === 'fore' ? 0 : 1] * (1 - W);
    }
    if (!arm && W > 0) {
      const phi = (gait - L.phase + 1) % 1;
      if (phi < RIG.duty) {
        tx += (-stride / 2 + stride * phi / RIG.duty) * W;
      } else {
        const u = (phi - RIG.duty) / (1 - RIG.duty), e = u * u * (3 - 2 * u), s = Math.sin(Math.PI * u ** RIG.flow.early);
        tx += (stride / 2 - stride * e) * W;
        ty -= lift[L.kind] * s * W;
        pawTilt = -(motion.swingTilt ?? 0.55) * s * W;
      }
    }
    if (A.stretch > 0 && L.kind === 'hind') { tx += 30 * A.stretch; pawTilt += 0.25 * A.stretch; }
    if (A.claw > 0 && L.name === 'fore_near') { tx -= 34 * A.claw; ty -= 26 * A.claw; pawTilt -= 0.6 * A.claw; }
    if (Z > 0) {
      const fold = L.kind === 'fore' ? [hip[0] - 32, L.home[1]] : [hip[0] + 4, L.home[1]];
      tx += (fold[0] - tx) * Z; ty += (fold[1] - ty) * Z;
    }
    if (F > 0 && motion.rideCloud) {
      // sitting on its cloud: the feet stay where they are drawn on the body whatever it does (rearing,
      // lunging, a strike's stretch or the standing stance), so the legs keep their curled pose instead
      // of reaching for a spot off the body and kicking up off the cloud
      const c = Math.cos(B.torso.rot), s = Math.sin(B.torso.rot);
      // far paws a step apart from the near ones (the standing stance), so all four legs show on the cloud
      const apart = L.name.endsWith('_far') ? (motion.stance ?? [48, 40])[L.kind === 'fore' ? 0 : 1] : 0;
      const ox = L.home[0] + apart - B.torso.joint[0], oy = L.home[1] - B.torso.joint[1];
      tx += (B.torso.pos[0] + ox * c - oy * s - tx) * F;
      ty += (B.torso.pos[1] + ox * s + oy * c - ty) * F;
      pawTilt += (B.torso.rot - pawTilt) * F;
    }
    // stomp (strikes): a front paw lifts and comes down hard; on a cloud it lifts off the spot it is pinned to
    if (L.kind === 'fore') {
      const st = Math.max(0, L.name === 'fore_near' ? A.stompL : A.stompR);
      ty -= st * 0.45 * (L.len1 + L.len2);
      tx -= st * 12;
      pawTilt -= st * 0.35;
    }
    if (F > 0 && !motion.rideCloud) {
      if (motion.flyLegs !== 'tuck') {
        const reach = (L.kind === 'fore' ? 0.92 : 0.995) * (L.len1 + L.len2), sway = Math.sin(t * 2.4 + L.phase * 2 * Math.PI);
        // legs hang down and sway gently (as Rồng Xương's), not trailing back as if tucked
        const hang = motion.flyHang ?? [0.35, 0.35];
        const a = hang[L.kind === 'fore' ? 0 : 1] + 0.12 * sway;
        const foot = [hip[0] + reach * Math.sin(a), hip[1] + reach * Math.cos(a)];
        tx += (foot[0] - tx) * F; ty += (foot[1] - ty) * F;
        pawTilt += F * 0.08 * sway;
      } else {
        const tuck = [hip[0] + (L.kind === 'fore' ? 14 : 24), hip[1] + 0.55 * (L.len1 + L.len2)];
        tx += (tuck[0] - tx) * F; ty += (tuck[1] - ty) * F;
        pawTilt += F * (L.kind === 'fore' ? 0.9 : 0.6);
      }
    }
    const bend = L.kind === 'hind' && motion.hindKnee === 'back' ? 1 : RIG.bend[L.kind];
    const stretched = F > 0 && !motion.rideCloud && motion.flyLegs !== 'tuck' ? F : 0;
    if (motion.rigidLegs) {
      const rise = Math.max(0, L.home[1] - ty);
      const len = Math.hypot(L.home[0] - L.up.joint[0], L.home[1] - L.up.joint[1]);
        const a = Math.atan2(len, tx - hip[0]);
      L.up.pos = [hip[0], hip[1] - rise * 0.8];
      L.up.rot = a - Math.atan2(len, L.home[0] - L.up.joint[0]) + B.torso.rot;
      L.lo.pos = L.paw.pos = [tx, ty]; L.lo.rot = L.paw.rot = 0;
      continue;
    }
    solveLeg(L, hip, [tx, ty], pawTilt, bend, stretched);
  }

  // joint caps
  for (const b of Object.values(B)) {
    if (!b.cap) continue;
    const [pa, ch] = b.cap.map(n => B[n]);
    b.pos = [...ch.pos];
    b.rot = pa.rot + Math.atan2(Math.sin(ch.rot - pa.rot), Math.cos(ch.rot - pa.rot)) / 2;
  }
}

function applyBone(B: Bones, name: string, angle: number) {
  const b = B[name];
  b.pos = place(B, name);
  b.rot = B[b.parent!].rot + angle;
}

/** Where a bone's joint is, given its parent's current pose. */
function place(B: Bones, name: string): Vec {
  const b = B[name], p = B[b.parent!];
  const c = Math.cos(p.rot), s = Math.sin(p.rot);
  return [p.pos[0] + b.offset[0] * c - b.offset[1] * s, p.pos[1] + b.offset[0] * s + b.offset[1] * c];
}
