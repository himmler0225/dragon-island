// Combat effects: fx, projectile, bite, gust, boneRain, orb, waterSplash, floatText.
// All use this.scene for Phaser objects (any scene that ran makeFxTextures and loaded the vfx).
import type { Spot, FxOpts } from '../../skills/types';
import type { SpeciesId } from '../../config/species';
import { jawKey } from '../../skills/registry';
import * as Phaser from 'phaser';
import { rigTextureKey, type RigData } from '../../rig';
import type { SkillActor, RiftOpts, ElementRainOpts } from '../../skills/types';

export class CombatFx {
  constructor(private scene: Phaser.Scene) {}   // the islands and the battle field

  /** Peak opacity of the glow images: additive light piles up, so a crowded field (the battle) turns
   *  it down or the stacked effects wash everything out to white. */
  intensity = 1;
  /** At most this many glow images at once; further ones are skipped (the moves still land). */
  budget = Infinity;
  /** ADD on the islands; the battle uses SCREEN: it lightens too, but stacked glows never burn to
   *  white over the bright battleground */
  blend: Phaser.BlendModes = Phaser.BlendModes.ADD;
  /** Size factor for fx / projectiles (the battle draws them a little smaller). */
  size = 1;
  private active = 0;
  private take(img: Phaser.GameObjects.Image) {
    this.active++;
    img.once(Phaser.GameObjects.Events.DESTROY, () => this.active--);
  }

  /** A glowing effect image (additive: black is transparent) that fades in, holds and fades out. */
  fx(key: string, at: Spot, o: FxOpts = {}) {
    if (this.active >= this.budget) return;
    const scale = (o.scale ?? 0.5) * this.size, dur = o.dur ?? 600, hold = o.hold ?? 0;
    const img = this.scene.add.image(at.x, at.y, key).setBlendMode(this.blend).setAlpha(0)
      .setDepth(o.ground ? 4 : 20).setFlipX(!!o.flipX).setRotation(o.angle ?? 0);
    this.take(img);
    if (o.anchor === 'bottom') img.setOrigin(0.5, 0.95);
    if (o.tint !== undefined) img.setTint(o.tint);
    const sy = o.ground ? 0.42 : 1;
    img.setScale(scale * 0.7, scale * 0.7 * sy);
    const fadeIn = Math.min(160, dur * 0.25), total = dur + hold;
    this.scene.tweens.add({ targets: img, alpha: this.intensity, scaleX: scale, scaleY: scale * sy, duration: fadeIn, ease: 'Sine.easeOut' });
    this.scene.tweens.add({ targets: img, alpha: 0, scaleX: scale * 1.08, scaleY: scale * 1.08 * sy, delay: total - dur * 0.35,
      duration: dur * 0.35, ease: 'Sine.easeIn', onComplete: () => img.destroy() });
    if (o.spin) this.scene.tweens.add({ targets: img, rotation: img.rotation + o.spin, duration: total });
  }

  private projectile(key: string, from: Spot, to: Spot, o: { dur?: number; scale?: number; tint?: number; rotate?: boolean; flipX?: boolean } = {}) {
    return new Promise<void>(res => {
      if (this.active >= this.budget) { this.scene.time.delayedCall(o.dur ?? 400, res); return; }
      const img = this.scene.add.image(from.x, from.y, key).setBlendMode(this.blend).setDepth(21)
        .setScale((o.scale ?? 0.4) * this.size).setFlipX(!!o.flipX).setAlpha(this.intensity)
        .setRotation(o.rotate === false ? 0 : Math.atan2(to.y - from.y, to.x - from.x));
      this.take(img);
      if (o.tint !== undefined) img.setTint(o.tint);
      this.scene.tweens.add({ targets: img, x: to.x, y: to.y, duration: o.dur ?? 400, ease: 'Sine.easeIn',
        onComplete: () => { img.destroy(); res(); } });
    });
  }

  /** A beam: effect image stretched from `from` to `to` (its left end at `from`), flaring in, holding,
   *  then thinning out. Resolves when it reaches full length. */
  private beam(key: string, from: Spot, to: Spot, o: { dur?: number; width?: number; tint?: number } = {}) {
    return new Promise<void>(res => {
      const dur = o.dur ?? 700, w = o.width ?? 0.5;
      if (this.active >= this.budget) { this.scene.time.delayedCall(dur * 0.25, res); return; }
      const img = this.scene.add.image(from.x, from.y, key).setOrigin(0.04, 0.5).setBlendMode(this.blend)
        .setDepth(21).setRotation(Math.atan2(to.y - from.y, to.x - from.x)).setAlpha(this.intensity);
      this.take(img);
      if (o.tint !== undefined) img.setTint(o.tint);
      const len = Math.hypot(to.x - from.x, to.y - from.y) / img.width;
      img.setScale(0.05, w * 0.4);
      this.scene.tweens.add({ targets: img, scaleX: len, scaleY: w, duration: dur * 0.25, ease: 'Cubic.easeOut', onComplete: () => res() });
      this.scene.tweens.add({ targets: img, scaleY: 0, alpha: 0, delay: dur * 0.7, duration: dur * 0.3, ease: 'Sine.easeIn',
        onComplete: () => img.destroy() });
    });
  }

  /** Time rift: a tear opens in the sky at `at`, the dragon's head (its own rig pieces) reaches out,
   *  opens its jaws and breathes fire sweeping across `targets` (or snaps down on the first one);
   *  `onHit` fires as the fire/bite reaches each target. Resolves when the rift has closed. */
  private rift(id: SpeciesId, rig: RigData, at: Spot, targets: SkillActor[], onHit: (t: SkillActor) => void, o: RiftOpts = {}) {
    const sc = this.scene, s = o.scale ?? 1, tint = o.tint ?? 0xc04cff;
    // keep the tear inside the view (enemies near the top of the island would put it off screen)
    const view = sc.cameras.main.worldView;
    at = { x: Phaser.Math.Clamp(at.x, view.x + 130, view.right - 130), y: Math.max(at.y, view.y + 110) };
    const head = rig.bones.find(b => b.name === 'head'), jaw = rig.bones.find(b => b.name === 'jaw');
    if (!head) return Promise.resolve();
    // the tear: a dark violet void with a glowing jagged rim
    const tear = sc.add.graphics().setPosition(at.x, at.y).setDepth(23).setScale(0);
    const pts = Array.from({ length: 18 }, (_, k) => {
      const a = (k / 18) * Math.PI * 2, r = 1 + (k % 2 ? 0.14 : -0.06);
      return new Phaser.Math.Vector2(Math.cos(a) * 55 * r * s, Math.sin(a) * 100 * r * s);   // upright tear: the head comes out sideways
    });
    tear.fillStyle(0x12021f, 0.95).fillPoints(pts, true).lineStyle(6 * s, 0xff6cf0, 1).strokePoints(pts, true)
      .lineStyle(14 * s, tint, 0.35).strokePoints(pts, true);
    const glow = sc.add.image(at.x, at.y, 'glow').setTint(tint).setBlendMode(Phaser.BlendModes.ADD).setDepth(22).setScale(0).setAlpha(0.8);
    // the head (+ jaw) built from the rig pieces, in rig px around the head joint
    // the head stays level (only tips a little up/down toward the aim) and faces the enemies;
    // the art faces left, so it is mirrored when they are on the right
    const face = (targets[0]?.feet().x ?? at.x - 1) < at.x ? 1 : -1;
    const k = 0.8 * s;   // head bigger than on the island: it is the star of the move
    const box = sc.add.container(at.x, at.y).setDepth(24).setAlpha(0);
    const size = (m: number) => box.setScale(face * m * k, m * k);
    size(0.15);
    const img = (b: typeof head) => sc.add.image(b.joint[0] - head.joint[0], b.joint[1] - head.joint[1], rigTextureKey(id, b.name)).setOrigin(b.origin[0], b.origin[1]);
    const jawImg = jaw ? img(jaw) : null;
    const headImg = img(head);
    box.add([...(jawImg ? [jawImg] : []), headImg]);
    const mouth = () => headImg.getWorldTransformMatrix().transformPoint((0.12 - headImg.originX) * headImg.width, (0.7 - headImg.originY) * headImg.height);
    const aimAt = (p: Spot) => {
      const dx = Math.abs(p.x - box.x) || 1;
      box.rotation = -face * Phaser.Math.Clamp(Math.atan2(p.y - box.y, dx), -0.35, 0.35);
    };
    const order = [...targets].sort((a, b) => a.feet().x - b.feet().x);
    const tw = (cfg: Phaser.Types.Tweens.TweenBuilderConfig) => new Promise<void>(res => sc.tweens.add({ ...cfg, onComplete: () => res() }));
    const wait = (ms: number) => new Promise<void>(res => sc.time.delayedCall(ms, res));
    return (async () => {
      await Promise.all([tw({ targets: tear, scale: 1, duration: 700, ease: 'Back.easeOut' }), tw({ targets: glow, scale: 3.2 * s, duration: 700 })]);
      // reach out of the rift toward the first target
      const first = order[0]?.chest() ?? { x: at.x, y: at.y + 200 };
      aimAt(first);
      // the neck base (the container origin) stays inside the tear, so the head is drawn over the
      // rim and the neck seems to come out of the void
      const out = { x: at.x - face * 12 * s, y: at.y + 10 * s };
      await tw({ targets: box, x: out.x, y: out.y, scaleX: face * k, scaleY: k, alpha: 1, duration: o.bite ? 650 : 1000, ease: 'Sine.easeOut' });
      if (jawImg) sc.tweens.add({ targets: jawImg, rotation: -0.55, duration: 450, ease: 'Sine.easeOut' });
      if (o.bite) {
        // dart down, snap shut on the target
        const t = order[0];
        await wait(350);
        // lunge toward the target, but only as far as the neck reaches (the neck stays in the tear)
        const reach = Math.min(1, (70 * s) / Math.max(1, Math.hypot(first.x - out.x, first.y - out.y)));
        await tw({ targets: box, x: out.x + (first.x - out.x) * reach, y: out.y + (first.y - out.y) * reach, duration: 280, ease: 'Quad.easeIn' });
        if (jawImg) sc.tweens.add({ targets: jawImg, rotation: 0.05, duration: 120 });
        if (t) onHit(t);
        await wait(400);
        await tw({ targets: box, x: out.x, y: out.y, duration: 550, ease: 'Sine.easeOut' });
      } else {
        // breathe fire: the aim sweeps from the first enemy to the last, flames stream from the mouth
        const from = order[0]?.feet() ?? first, to = order[order.length - 1]?.feet() ?? first;
        const dur = o.dur ?? 2400, hit = new Set<SkillActor>();
        await wait(450);
        const start = sc.time.now;
        await new Promise<void>(res => {
          const ev = sc.time.addEvent({ delay: 35, loop: true, callback: () => {
            const u = Math.min(1, (sc.time.now - start) / dur);
            const aim = { x: from.x + (to.x - from.x) * u, y: from.y + (to.y - from.y) * u - 10 };
            aimAt(aim);
            const m = mouth();
            for (let n = 0; n < 2; n++) {
              const f = sc.add.image(m.x, m.y, 'puff').setBlendMode(Phaser.BlendModes.ADD).setDepth(23)
                .setTint(Phaser.Utils.Array.GetRandom([0xff4cf0, 0xb04cff, 0xffffff, 0xe080ff])).setScale(1.2 * s);
              sc.tweens.add({ targets: f, x: aim.x + Phaser.Math.Between(-30, 30), y: aim.y + Phaser.Math.Between(-12, 12),
                scale: Phaser.Math.FloatBetween(3.5, 5.5) * s, alpha: { from: 1, to: 0 }, duration: 600, ease: 'Quad.easeIn', onComplete: () => f.destroy() });
            }
            const ember = sc.add.image(aim.x + Phaser.Math.Between(-40, 40), aim.y, 'puff').setBlendMode(Phaser.BlendModes.ADD).setDepth(4).setTint(0xb04cff).setScale(2.5 * s).setAlpha(0.8);
            sc.tweens.add({ targets: ember, y: ember.y - 40, scaleX: 4 * s, alpha: 0, duration: 900, onComplete: () => ember.destroy() });
            for (const t of order) if (!hit.has(t) && Math.abs(t.feet().x - aim.x) < 40) { hit.add(t); onHit(t); }
            if (u >= 1) { ev.remove(); res(); }
          } });
        });
        for (const t of order) if (!hit.has(t)) onHit(t);
      }
      // back into the rift, which collapses
      if (jawImg) sc.tweens.add({ targets: jawImg, rotation: 0, duration: 400 });
      await tw({ targets: box, x: at.x, y: at.y, scaleX: face * 0.15 * k, scaleY: 0.15 * k, alpha: 0, duration: 800, ease: 'Sine.easeIn' });
      box.destroy();
      await Promise.all([tw({ targets: tear, scale: 0, angle: 90, duration: 650, ease: 'Back.easeIn' }), tw({ targets: glow, scale: 0, duration: 650 })]);
      tear.destroy(); glow.destroy();
    })();
  }

  /** Elemental rain (Phượng Hoàng main skill). Summon: a glowing ring opens in the sky over each target
   *  and pieces pop out of it and hover, bobbing. Rain: each wave the pieces dive at the target with a
   *  streak, then burst (core flash, sparks, ground ring); new pieces appear for the next wave. */
  private elementRain(targets: SkillActor[], onHit: (t: SkillActor) => void, o: ElementRainOpts) {
    const sc = this.scene, waves = o.waves ?? 3, per = o.perTarget ?? 3, core = o.core ?? 0xffffff;
    const tex = o.shape === 'feather' ? 'rain_feather' : 'rain_shard';
    const wait = (ms: number) => new Promise<void>(res => sc.time.delayedCall(ms, res));
    const view = sc.cameras.main.worldView;
    const skyY = (t: SkillActor) => Math.max(view.y + 70, t.feet().y - 330);
    const glowAt = (x: number, y: number, tint: number, scale: number, alpha: number, depth = 22) =>
      sc.add.image(x, y, 'glow').setTint(tint).setBlendMode(Phaser.BlendModes.ADD).setDepth(depth).setScale(scale).setAlpha(alpha);
    // the summoning ring over every target
    const rings = targets.map(t => {
      const r = glowAt(t.feet().x, skyY(t), o.tint, 0.2, 0.9, 21);
      sc.tweens.add({ targets: r, scaleX: 4.2, scaleY: 1.4, duration: 450, ease: 'Back.easeOut' });
      sc.tweens.add({ targets: r, angle: 360, duration: 3000, repeat: -1 });
      return r;
    });
    const spawn = (t: SkillActor, k: number) => {
      const x = t.feet().x + (k - (per - 1) / 2) * 42, y = skyY(t) + (k % 2) * 26;
      const halo = glowAt(x, y, o.tint, 0.1, 0.8);
      const piece = sc.add.image(x, y, tex).setTint(o.tint).setBlendMode(Phaser.BlendModes.ADD).setDepth(23).setScale(0);
      sc.tweens.add({ targets: piece, scale: 0.9, duration: 260, ease: 'Back.easeOut' });
      sc.tweens.add({ targets: halo, scale: 1.3, duration: 260 });
      const bob = sc.tweens.add({ targets: [piece, halo], y: y - 10, duration: 420, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      return { piece, halo, bob };
    };
    const dive = (t: SkillActor, p: ReturnType<typeof spawn>, k: number) => new Promise<void>(res => {
      p.bob.remove();
      const to = { x: t.chest().x + (k - (per - 1) / 2) * 18, y: t.feet().y - 8 };
      const trail = sc.time.addEvent({ delay: 30, loop: true, callback: () => {
        const s = sc.add.image(p.piece.x, p.piece.y, tex).setTint(o.tint).setBlendMode(Phaser.BlendModes.ADD).setDepth(22).setScale(0.7).setAlpha(0.5);
        sc.tweens.add({ targets: s, alpha: 0, scale: 0.3, duration: 220, onComplete: () => s.destroy() });
      } });
      sc.tweens.add({ targets: p.halo, alpha: 0, duration: 150 });
      sc.tweens.add({ targets: p.piece, x: to.x, y: to.y, duration: 260, ease: 'Quad.easeIn', onComplete: () => {
        trail.remove(); p.piece.destroy(); p.halo.destroy();
        // burst: bright core, coloured flash, sparks and a ring on the ground
        const flash = glowAt(to.x, to.y - 10, core, 0.4, 1, 24);
        const glow = glowAt(to.x, to.y - 10, o.tint, 0.6, 0.9, 23);
        sc.tweens.add({ targets: flash, scale: 1.6, alpha: 0, duration: 260, onComplete: () => flash.destroy() });
        sc.tweens.add({ targets: glow, scale: 3, alpha: 0, duration: 480, onComplete: () => glow.destroy() });
        for (let n = 0; n < 6; n++) {
          const a = -Math.PI * (0.1 + 0.8 * Math.random()), d = Phaser.Math.Between(30, 70);
          const sp = sc.add.image(to.x, to.y - 10, 'spark').setTint(o.tint).setBlendMode(Phaser.BlendModes.ADD).setDepth(24).setScale(1.4);
          sc.tweens.add({ targets: sp, x: to.x + Math.cos(a) * d, y: to.y - 10 + Math.sin(a) * d, alpha: 0, duration: 420, ease: 'Quad.easeOut', onComplete: () => sp.destroy() });
        }
        const ring = sc.add.ellipse(to.x, to.y, 40, 14).setStrokeStyle(3, o.tint, 0.9).setDepth(4).setScale(0.3);
        sc.tweens.add({ targets: ring, scale: 2.4, alpha: 0, duration: 520, onComplete: () => ring.destroy() });
        res();
      } });
    });
    return (async () => {
      let pieces = targets.map(t => Array.from({ length: per }, (_, k) => spawn(t, k)));
      await wait(500);   // they hang there, glowing
      for (let w = 0; w < waves; w++) {
        await Promise.all(targets.map(async (t, i) => {
          await wait(i * 70);
          const hits = pieces[i].map((p, k) => wait(k * 90).then(() => dive(t, p, k)));
          await hits[0];
          onHit(t);
          await Promise.all(hits);
        }));
        if (w < waves - 1) { pieces = targets.map(t => Array.from({ length: per }, (_, k) => spawn(t, k))); await wait(260); }
      }
      rings.forEach(r => sc.tweens.add({ targets: r, scaleX: 0, scaleY: 0, alpha: 0, duration: 350, onComplete: () => r.destroy() }));
    })();
  }

  /** Giant jaws: open wide above and below `at`, pause, snap shut with a flash; resolves at the snap. */
  private bite(id: SpeciesId, at: Spot, o: { scale?: number; tint?: number } = {}) {
    const s = o.scale ?? 1, tint = o.tint ?? 0xb050ff;
    const drawn = this.scene.textures.exists(jawKey(id, 'upper'));
    let upper: Phaser.GameObjects.Image, lower: Phaser.GameObjects.Image, k: number, open: number, shut: number;
    if (drawn) {
      upper = this.scene.add.image(at.x, at.y, jawKey(id, 'upper')).setOrigin(0.5, 0.92).setBlendMode(Phaser.BlendModes.ADD);
      lower = this.scene.add.image(at.x, at.y, jawKey(id, 'lower')).setOrigin(0.5, 0.08).setBlendMode(Phaser.BlendModes.ADD);
      k = (300 / upper.width) * s; open = 70 * s; shut = -14 * s;
    } else {
      upper = this.scene.add.image(at.x, at.y, 'fangs').setOrigin(0.5, 0.15);
      lower = this.scene.add.image(at.x, at.y, 'fangs').setOrigin(0.5, 0.85).setFlipY(true);
      k = s; open = 140 * s; shut = 46 * s;
    }
    upper.setY(at.y - open * 0.8).setScale(0.6 * k).setAlpha(0).setDepth(22);
    lower.setY(at.y + open * 0.8).setScale(0.6 * k).setAlpha(0).setDepth(22);
    const glow = this.scene.add.image(at.x, at.y, 'puff').setBlendMode(Phaser.BlendModes.ADD).setTint(tint).setAlpha(0).setScale(4 * s).setDepth(21);
    return new Promise<void>(res => {
      this.scene.tweens.add({ targets: [upper, lower], alpha: 1, scale: k, duration: 220, ease: 'Back.easeOut' });
      this.scene.tweens.add({ targets: glow, alpha: 0.5, duration: 260 });
      this.scene.tweens.add({ targets: upper, y: at.y - open, duration: 260, ease: 'Sine.easeOut' });
      this.scene.tweens.add({ targets: lower, y: at.y + open, duration: 260, ease: 'Sine.easeOut' });
      this.scene.time.delayedCall(420, () => {
        this.scene.tweens.add({ targets: upper, y: at.y - shut, duration: 110, ease: 'Quad.easeIn' });
        this.scene.tweens.add({ targets: lower, y: at.y + shut, duration: 110, ease: 'Quad.easeIn', onComplete: () => {
          glow.setAlpha(1).setScale(7 * s);
          this.scene.tweens.add({ targets: glow, alpha: 0, scale: 10 * s, duration: 400, onComplete: () => glow.destroy() });
          this.scene.tweens.add({ targets: [upper, lower], alpha: 0, delay: 350, duration: 300, onComplete: () => { upper.destroy(); lower.destroy(); } });
          res();
        } });
      });
    });
  }

  /** Three crescent wind waves rolling forward and widening, kicking up dust along the ground. */
  private gust(from: Spot, dir: 1 | -1, o: { reach?: number; scale?: number; tint?: number } = {}) {
    const reach = o.reach ?? 320, s = o.scale ?? 1;
    for (let k = 0; k < 4; k++) {
      const w = this.scene.add.image(from.x, from.y + (k % 2 ? 14 : -6) * s, 'gust').setFlipX(dir < 0).setTint(o.tint ?? 0xffffff)
        .setScale(0.45 * s, 0.6 * s).setAlpha(0).setDepth(21);
      this.scene.tweens.add({ targets: w, alpha: { from: 0.95, to: 0 }, x: from.x + dir * reach, scaleX: 1.2 * s, scaleY: 2.1 * s,
        delay: k * 80, duration: 700, ease: 'Sine.easeOut', onComplete: () => w.destroy() });
    }
    for (let k = 0; k < 7; k++) {
      const y = from.y + Phaser.Math.Between(-60, 70) * s;
      const line = this.scene.add.rectangle(from.x, y, 70 * s, 4, 0xffffff, 0.85).setOrigin(dir > 0 ? 0 : 1, 0.5).setDepth(21);
      this.scene.tweens.add({ targets: line, x: from.x + dir * reach * 1.1, scaleX: 1.8, alpha: 0,
        delay: 40 + k * 45, duration: 500, ease: 'Sine.easeOut', onComplete: () => line.destroy() });
    }
    for (let k = 0; k < 8; k++) {
      const p = this.scene.add.image(from.x + dir * k * 30 * s, from.y + 60 * s + Phaser.Math.Between(-8, 8), 'puff')
        .setTint(0xe8dcb8).setAlpha(0).setScale(0.8 * s).setDepth(4);
      this.scene.tweens.add({ targets: p, alpha: { from: 0.6, to: 0 }, x: p.x + dir * reach * 0.8, scale: 2.4 * s,
        delay: 60 + k * 40, duration: 700, ease: 'Sine.easeOut', onComplete: () => p.destroy() });
    }
    return new Promise<void>(res => this.scene.time.delayedCall(330, res));
  }

  /** Bones falling from the sky onto `at`, bouncing and fading; resolves at the first impact. */
  private boneRain(at: Spot, o: { count?: number; scale?: number } = {}) {
    const n = o.count ?? 6, s = o.scale ?? 1;
    for (let k = 0; k < n; k++) {
      const x = at.x + Phaser.Math.Between(-70, 70) * s, y = at.y + Phaser.Math.Between(-14, 10) * s;
      const b = this.scene.add.image(x - 40 * s, y - 420, 'bone').setScale(Phaser.Math.FloatBetween(0.7, 1.2) * s)
        .setRotation(Math.random() * 6).setDepth(22);
      this.scene.tweens.add({ targets: b, x, y, rotation: b.rotation + 5, delay: k * 70, duration: 420, ease: 'Quad.easeIn',
        onComplete: () => {
          this.scene.tweens.add({ targets: b, y: y - 22 * s, x: x + Phaser.Math.Between(-20, 20), rotation: b.rotation + 1.5,
            duration: 220, yoyo: true, ease: 'Sine.easeOut' });
          this.scene.tweens.add({ targets: b, alpha: 0, delay: 700, duration: 300, onComplete: () => b.destroy() });
        } });
    }
    return new Promise<void>(res => this.scene.time.delayedCall(420, res));
  }

  /** Glowing water orb flying from -> to, leaving a trail of droplets. */
  private orb(from: Spot, to: Spot, o: { scale?: number; tint?: number; dur?: number } = {}) {
    const s = o.scale ?? 1, tint = o.tint ?? 0x6fd2ff, dur = o.dur ?? 380;
    const core = this.scene.add.image(from.x, from.y, 'puff').setScale(1.4 * s).setTint(0xffffff).setDepth(22).setBlendMode(Phaser.BlendModes.ADD);
    const glow = this.scene.add.image(from.x, from.y, 'puff').setScale(2.6 * s).setTint(tint).setAlpha(0.8).setDepth(21).setBlendMode(Phaser.BlendModes.ADD);
    const trail = this.scene.time.addEvent({ delay: 25, loop: true, callback: () => {
      const d = this.scene.add.image(core.x, core.y, 'puff').setScale(1.4 * s).setTint(tint).setAlpha(0.6).setDepth(20).setBlendMode(Phaser.BlendModes.ADD);
      this.scene.tweens.add({ targets: d, scale: 0.2 * s, alpha: 0, duration: 260, onComplete: () => d.destroy() });
    } });
    return new Promise<void>(res => {
      this.scene.tweens.add({ targets: [core, glow], x: to.x, y: to.y, duration: dur, ease: 'Sine.easeIn', onComplete: () => {
        trail.remove(); core.destroy(); glow.destroy(); res();
      } });
    });
  }

  /** Water splash: a burst of droplets, foam rings on the ground, and with `big` a falling pillar. */
  private waterSplash(at: Spot, o: { scale?: number; big?: boolean } = {}) {
    const s = o.scale ?? 1;
    for (let k = 0; k < 12; k++) {
      const a = -Math.PI * (0.1 + 0.8 * Math.random()), v = (60 + Math.random() * 70) * s;
      const d = this.scene.add.image(at.x, at.y, 'puff').setScale((0.5 + Math.random() * 0.5) * s).setTint(0x8fdcff).setDepth(22).setBlendMode(Phaser.BlendModes.ADD);
      this.scene.tweens.add({ targets: d, x: at.x + Math.cos(a) * v, y: at.y + Math.sin(a) * v * 0.8, alpha: 0, duration: 500, ease: 'Quad.easeOut', onComplete: () => d.destroy() });
    }
    for (let k = 0; k < 2; k++) {
      const ring = this.scene.add.ellipse(at.x, at.y + 30 * s, 60 * s, 22 * s).setStrokeStyle(4, 0xe0f6ff, 0.9).setDepth(4).setScale(0.3);
      this.scene.tweens.add({ targets: ring, scale: 2 + k, alpha: 0, delay: k * 120, duration: 700, ease: 'Sine.easeOut', onComplete: () => ring.destroy() });
    }
    if (o.big) {
      const col = this.scene.add.rectangle(at.x, at.y - 260 * s, 70 * s, 300 * s, 0x6fd2ff, 0.75).setDepth(21).setBlendMode(Phaser.BlendModes.ADD).setOrigin(0.5, 0);
      col.setScale(1, 0);
      this.scene.tweens.add({ targets: col, scaleY: 1, duration: 180, ease: 'Quad.easeIn', yoyo: true, hold: 200, onComplete: () => col.destroy() });
    }
  }

  floatText(x: number, y: number, text: string, color = '#ffe27a') {
    const t = this.scene.add.text(x, y, text, { fontFamily: 'system-ui, sans-serif', fontSize: '22px', fontStyle: 'bold',
      color, stroke: '#0b1a2a', strokeThickness: 5 }).setOrigin(0.5).setDepth(30);
    this.scene.tweens.add({ targets: t, y: y - 50, alpha: 0, delay: 300, duration: 1100, ease: 'Sine.easeOut', onComplete: () => t.destroy() });
  }

  // ---- SkillCtx helpers exposed for IslandScene ----
  callProjectile(key: string, from: Spot, to: Spot, opts?: { dur?: number; scale?: number; tint?: number; rotate?: boolean; flipX?: boolean }) {
    return this.projectile(key, from, to, opts);
  }
  callElementRain(ts: SkillActor[], onHit: (t: SkillActor) => void, o: ElementRainOpts) { return this.elementRain(ts, onHit, o); }
  callBeam(key: string, from: Spot, to: Spot, opts?: { dur?: number; width?: number; tint?: number }) { return this.beam(key, from, to, opts); }
  callRift(id: SpeciesId, rig: RigData, at: Spot, targets: SkillActor[], onHit: (t: SkillActor) => void, opts?: RiftOpts) { return this.rift(id, rig, at, targets, onHit, opts); }
  callBite(id: SpeciesId, at: Spot, opts?: { scale?: number; tint?: number }) { return this.bite(id, at, opts); }
  callGust(from: Spot, dir: 1 | -1, opts?: { reach?: number; scale?: number; tint?: number }) { return this.gust(from, dir, opts); }
  callBoneRain(at: Spot, opts?: { count?: number; scale?: number }) { return this.boneRain(at, opts); }
  callOrb(from: Spot, to: Spot, opts?: { scale?: number; tint?: number; dur?: number }) { return this.orb(from, to, opts); }
  callWaterSplash(at: Spot, opts?: { scale?: number; big?: boolean }) { return this.waterSplash(at, opts); }
}
