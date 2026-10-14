// Combat effects: fx, projectile, bite, gust, boneRain, orb, waterSplash, floatText.
// All use this.scene for Phaser objects.
import type { IslandScene } from '../IslandScene';
import type { Spot, FxOpts } from '../../skills/types';
import type { SpeciesId } from '../../config/species';
import { jawKey } from '../../skills/registry';
import * as Phaser from 'phaser';

export class CombatFx {
  constructor(private scene: IslandScene) {}

  /** A glowing effect image (additive: black is transparent) that fades in, holds and fades out. */
  fx(key: string, at: Spot, o: FxOpts = {}) {
    const scale = o.scale ?? 0.5, dur = o.dur ?? 600, hold = o.hold ?? 0;
    const img = this.scene.add.image(at.x, at.y, key).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0)
      .setDepth(o.ground ? 4 : 20).setFlipX(!!o.flipX).setRotation(o.angle ?? 0);
    if (o.anchor === 'bottom') img.setOrigin(0.5, 0.95);
    if (o.tint !== undefined) img.setTint(o.tint);
    const sy = o.ground ? 0.42 : 1;
    img.setScale(scale * 0.7, scale * 0.7 * sy);
    const fadeIn = Math.min(160, dur * 0.25), total = dur + hold;
    this.scene.tweens.add({ targets: img, alpha: 1, scaleX: scale, scaleY: scale * sy, duration: fadeIn, ease: 'Sine.easeOut' });
    this.scene.tweens.add({ targets: img, alpha: 0, scaleX: scale * 1.08, scaleY: scale * 1.08 * sy, delay: total - dur * 0.35,
      duration: dur * 0.35, ease: 'Sine.easeIn', onComplete: () => img.destroy() });
    if (o.spin) this.scene.tweens.add({ targets: img, rotation: img.rotation + o.spin, duration: total });
  }

  private projectile(key: string, from: Spot, to: Spot, o: { dur?: number; scale?: number; tint?: number; rotate?: boolean; flipX?: boolean } = {}) {
    return new Promise<void>(res => {
      const img = this.scene.add.image(from.x, from.y, key).setBlendMode(Phaser.BlendModes.ADD).setDepth(21)
        .setScale(o.scale ?? 0.4).setFlipX(!!o.flipX)
        .setRotation(o.rotate === false ? 0 : Math.atan2(to.y - from.y, to.x - from.x));
      if (o.tint !== undefined) img.setTint(o.tint);
      this.scene.tweens.add({ targets: img, x: to.x, y: to.y, duration: o.dur ?? 400, ease: 'Sine.easeIn',
        onComplete: () => { img.destroy(); res(); } });
    });
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
  callBite(id: SpeciesId, at: Spot, opts?: { scale?: number; tint?: number }) { return this.bite(id, at, opts); }
  callGust(from: Spot, dir: 1 | -1, opts?: { reach?: number; scale?: number; tint?: number }) { return this.gust(from, dir, opts); }
  callBoneRain(at: Spot, opts?: { count?: number; scale?: number }) { return this.boneRain(at, opts); }
  callOrb(from: Spot, to: Spot, opts?: { scale?: number; tint?: number; dur?: number }) { return this.orb(from, to, opts); }
  callWaterSplash(at: Spot, opts?: { scale?: number; big?: boolean }) { return this.waterSplash(at, opts); }
}
