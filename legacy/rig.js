// Cut-out (skeletal) dragon: pieces and joints from rig/rig.json (tools/build_rig.py).
// Forward kinematics for head/wings/tail, 2-bone IK for the legs, a lateral-sequence walk
// (left hind -> left fore -> right hind -> right fore), breathing, tail sway and wing flap.
// Rig space: origin on the ground under the body, y up is negative, the dragon faces left.

const RIG = {
  scale: 0.5,          // rig.json is exported at 2x the sprite size
  cycle: 1.6,          // seconds per walk cycle
  stride: 54,          // rig px a planted foot travels per cycle
  duty: 0.62,          // share of the cycle a foot is on the ground
  lift: { fore: 16, hind: 13 },
  phase: { hind_near: 0, fore_near: 0.25, hind_far: 0.5, fore_far: 0.75 },
  bend: { fore: 1, hind: -1 },   // +1: middle joint points back (elbow), -1: forward (stifle)
  blendRate: 6,        // how fast walk/fly blend in and out (per second)
  sleepRate: 0.9,      // lying down / getting up takes ~1 s
  lieDown: 46,         // rig px the torso sinks when asleep
  flapRate: 1.7,       // wing beats per second
};

class DragonRig {
  // texture keys are `rig_<species>_<bone>` (loaded by index.html from dragons/<species>/)
  constructor(scene, data, parent, species) {
    this.container = scene.add.container(0, 0).setScale(RIG.scale);
    parent.add(this.container);
    this.motion = { sleepTail: [0.3, 0.35, 0.3], ...(data.motion || {}) };   // per-species tweaks
    this.bones = {};
    for (const b of data.bones) {
      const img = scene.add.image(b.joint[0], b.joint[1], `rig_${species}_${b.name}`).setOrigin(b.origin[0], b.origin[1]);
      this.container.add(img);
      this.bones[b.name] = { ...b, img, rot: 0, pos: [...b.joint] };
    }
    const bone = n => this.bones[n];
    // rest-pose geometry used by FK / IK
    for (const b of Object.values(this.bones)) {
      const p = b.parent && bone(b.parent);
      b.offset = p ? [b.joint[0] - p.joint[0], b.joint[1] - p.joint[1]] : [0, 0];
    }
    this.legs = ['fore_near', 'hind_near', 'fore_far', 'hind_far'].map(name => {
      const up = bone(name + '_upper'), lo = bone(name + '_lower'), paw = bone(name + '_paw');
      const kind = name.startsWith('fore') ? 'fore' : 'hind';
      const dir = (a, b) => Math.atan2(b.joint[1] - a.joint[1], b.joint[0] - a.joint[0]);
      return {
        name, kind, up, lo, paw,
        len1: Math.hypot(lo.joint[0] - up.joint[0], lo.joint[1] - up.joint[1]),
        len2: Math.hypot(paw.joint[0] - lo.joint[0], paw.joint[1] - lo.joint[1]),
        rest1: dir(up, lo), rest2: dir(lo, paw),
        home: [...paw.joint],                 // ankle position when standing
        phase: RIG.phase[name],
      };
    });
    this.walk = 0;     // 0..1 blend of the walk cycle
    this.fly = 0;      // 0..1 blend of flight
    this.gait = 0;     // walk cycle phase 0..1
    this.t = 0;
  }

  destroy() { this.container.destroy(); }

  set visible(v) { this.container.setVisible(v); }
  get visible() { return this.container.visible; }
  get images() { return Object.values(this.bones).map(b => b.img); }

  // ground speed (screen px/s at root scale 1) that matches the feet
  static walkSpeed(rootScale) { return RIG.stride * RIG.scale * rootScale / RIG.cycle; }

  update(dt, mode) {
    this.t += dt;
    const towards = (v, target, rate = RIG.blendRate) => v + Math.sign(target - v) * Math.min(Math.abs(target - v), dt * rate);
    this.walk = towards(this.walk, mode === 'walk' ? 1 : 0);
    this.fly = towards(this.fly, mode === 'fly' ? 1 : 0);
    this.sleep = towards(this.sleep || 0, mode === 'sleep' ? 1 : 0, RIG.sleepRate);   // lie down / get up slowly
    if (this.walk > 0) this.gait = (this.gait + dt / RIG.cycle) % 1;
    const t = this.t, g = this.gait, W = this.walk, F = this.fly, ground = 1 - F;
    const Z = this.sleep * this.sleep * (3 - 2 * this.sleep);   // eased
    const B = this.bones;

    // flap: 0..1..0, 1 = wings fully up. Down-stroke is quicker than the up-stroke, like a bird.
    const fp = (t * RIG.flapRate) % 1;
    const flapUp = fp < 0.4 ? 0.5 + 0.5 * Math.cos(Math.PI * fp / 0.4) : 0.5 - 0.5 * Math.cos(Math.PI * (fp - 0.4) / 0.6);
    this.flapUp = flapUp;

    // torso: breathing (slow and deep asleep), walk bob, lift on each down-stroke in flight, lie down to sleep
    const breathe = Math.sin(t * 2 * Math.PI / (3 + 2 * Z));
    const bob = W * 2.5 * Math.cos(4 * Math.PI * g) * ground;
    const flapLift = F * 7 * (1 - flapUp);
    B.torso.pos = [B.torso.joint[0], B.torso.joint[1] + breathe * (1.6 + 1.4 * Z) * (1 - W) + bob - flapLift + Z * RIG.lieDown];
    B.torso.rot = 0.012 * breathe * (1 - W) + W * 0.015 * Math.sin(2 * Math.PI * g) - F * 0.1 + Z * 0.04;

    // head: look around when idle, counter-bob walking, chin down asleep
    this.local('head', (0.04 * Math.sin(t * 0.7) * (1 - W) + W * 0.04 * Math.sin(4 * Math.PI * g + 1.2)) * (1 - Z)
      + F * (0.06 + 0.07 * flapUp) - Z * 0.32);   // in flight the head (and mane) bobs with each beat

    // jaw (species that have one): breathes slightly open, gapes in a yawn while lying down to sleep
    if (B.jaw) {
      const yawn = Math.max(0, Math.sin(Math.PI * Math.min(1, this.sleep * 1.4)));
      this.local('jaw', -(0.03 * (1 + breathe) * (1 - Z) + 0.45 * yawn * (mode === 'sleep' ? 1 : 0) + F * 0.12 * (1 - flapUp)));
    }

    // wings. Flight: flip the wing through its root (scaleY 1 -> -0.55: up, edge-on, below the body)
    // with a small turn, so it beats instead of swinging around a point in the air.
    // Rest: a breath; asleep: folded flat along the back.
    // far wing: beats a little later and fans further forward (towards the head) so it never hides
    // exactly behind the near wing
    for (const [name, lag, fan] of [['wing_near', 0, 0], ['wing_far', 0.12, -0.32]]) {
      const fpl = ((t - lag) * RIG.flapRate) % 1;
      const up = fpl < 0.4 ? 0.5 + 0.5 * Math.cos(Math.PI * fpl / 0.4) : 0.5 - 0.5 * Math.cos(Math.PI * (fpl - 0.4) / 0.6);
      const rest = 0.03 * breathe * (1 - Z) + W * 0.04 * Math.sin(2 * Math.PI * g) + Z * 0.28;
      this.local(name, rest * (1 - F) + F * (0.25 * (1 - up) - 0.1 + fan * up));
      const b = B[name];
      b.sy = (1 - F) * (1 - 0.25 * Z) + F * (-0.55 + 1.55 * up);
      b.sx = 1 - F * 0.12 * (1 - up);
    }

    // tail: travelling wave, faster walking, streaming back in flight, curled round asleep
    const wave = (k, amp) => amp * Math.sin(t * (1.6 + 2.5 * W - 0.8 * Z) - k * 0.9);
    const curl = this.motion.sleepTail;
    this.local('tail_base', wave(0, 0.05 + 0.04 * W) - F * 0.15 + Z * curl[0]);
    this.local('tail_mid', wave(1, 0.08 + 0.05 * W) - F * 0.1 + Z * curl[1]);
    this.local('tail_tip', wave(2, 0.12 + 0.06 * W) + F * 0.1 + Z * curl[2]);

    // legs: IK to an ankle target (planted at home, walk cycle, or tucked in flight)
    for (const L of this.legs) {
      const hip = this.place(L.up.name);
      let [tx, ty] = L.home;
      let pawTilt = 0;
      if (W > 0) {
        const phi = (g - L.phase + 1) % 1, S = RIG.stride;
        if (phi < RIG.duty) {                     // stance: slide back at ground speed
          tx += (-S / 2 + S * phi / RIG.duty) * W;
        } else {                                  // swing: lift and reach forward
          const u = (phi - RIG.duty) / (1 - RIG.duty), e = u * u * (3 - 2 * u), s = Math.sin(Math.PI * u);
          tx += (S / 2 - S * e) * W;
          ty -= RIG.lift[L.kind] * s * W;
          pawTilt = -0.35 * s * W;               // toes hang down a little in the air
        }
      }
      // asleep: front paws stretched forward on the ground, hind legs folded under the hips
      if (Z > 0) {
        const fold = L.kind === 'fore' ? [hip[0] - 32, L.home[1]] : [hip[0] + 4, L.home[1]];
        tx += (fold[0] - tx) * Z; ty += (fold[1] - ty) * Z;
      }
      // breathing moves the hips; keep feet planted (the knees take it up)
      if (F > 0) {                                // tuck: paws pulled up and back under the belly
        const tuck = [hip[0] + (L.kind === 'fore' ? 14 : 24), hip[1] + 0.55 * (L.len1 + L.len2)];
        tx += (tuck[0] - tx) * F; ty += (tuck[1] - ty) * F;
        pawTilt += F * (L.kind === 'fore' ? 0.9 : 0.6);
      }
      this.solveLeg(L, hip, [tx, ty], pawTilt);
    }

    // joint caps sit on the child's joint, turned half way between the two pieces
    for (const b of Object.values(this.bones)) {
      if (!b.cap) continue;
      const [pa, ch] = b.cap.map(n => this.bones[n]);
      b.pos = ch.pos;
      b.rot = (pa.rot + ch.rot) / 2;
    }
    for (const b of Object.values(this.bones)) b.img.setPosition(b.pos[0], b.pos[1]).setRotation(b.rot).setScale(b.sx ?? 1, b.sy ?? 1);
  }

  // FK: bone rotation relative to its parent; position follows the parent's joint
  local(name, angle) {
    const b = this.bones[name];
    const [x, y] = this.place(name);
    b.pos = [x, y];
    b.rot = this.bones[b.parent].rot + angle;
  }

  // where a bone's joint is, given its parent's current pose
  place(name) {
    const b = this.bones[name], p = this.bones[b.parent];
    const c = Math.cos(p.rot), s = Math.sin(p.rot);
    return [p.pos[0] + b.offset[0] * c - b.offset[1] * s, p.pos[1] + b.offset[0] * s + b.offset[1] * c];
  }

  solveLeg(L, hip, target, pawTilt) {
    const [hx, hy] = hip;
    let dx = target[0] - hx, dy = target[1] - hy;
    let d = Math.hypot(dx, dy);
    const max = L.len1 + L.len2 - 0.01;
    if (d > max) { dx *= max / d; dy *= max / d; d = max; }   // out of reach: stretch towards it
    const base = Math.atan2(dy, dx);
    const off = Math.acos(Math.max(-1, Math.min(1, (L.len1 ** 2 + d * d - L.len2 ** 2) / (2 * L.len1 * d))));
    // pick the solution whose middle joint points the right way
    const cands = [base + off, base - off].map(a => [hx + L.len1 * Math.cos(a), hy + L.len1 * Math.sin(a), a]);
    const [kx, ky, a1] = cands.sort((p, q) => RIG.bend[L.kind] * (q[0] - p[0]))[0];
    const ax = hx + dx, ay = hy + dy;
    const a2 = Math.atan2(ay - ky, ax - kx);
    L.up.pos = [hx, hy];  L.up.rot = a1 - L.rest1;
    L.lo.pos = [kx, ky];  L.lo.rot = a2 - L.rest2;
    L.paw.pos = [ax, ay]; L.paw.rot = pawTilt;
  }

  // world position of the head joint (for "z z z" while asleep)
  headWorld() {
    const h = this.bones.head;
    return this.container.getWorldTransformMatrix().transformPoint(h.pos[0] - 40, h.pos[1] - 60);
  }

  // pixel-accurate hit test (world coordinates)
  hit(x, y, scene) {
    if (!this.visible) return false;
    return this.images.some(img => {
      const pt = img.getLocalPoint(x, y);
      if (pt.x < 0 || pt.y < 0 || pt.x >= img.width || pt.y >= img.height) return false;
      return scene.textures.getPixelAlpha(Math.floor(pt.x), Math.floor(pt.y), img.texture.key) > 60;
    });
  }
}
