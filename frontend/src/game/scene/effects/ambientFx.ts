// Ambient effects: foot dust, cloud puff, dust ring, grass step, fish jump, splash.
// All use this.scene for Phaser objects.
import { makeProceduralVfx } from './proceduralVfx';
import type { IslandScene } from '../IslandScene';
import type { Dragon } from '../Dragon';

import { cloudKey } from '../../config/species';
import * as Phaser from 'phaser';

const CLOUD_PUFFS = 3;

export class AmbientFx {
  constructor(private scene: IslandScene) {}

  makeTextures() { makeFxTextures(this.scene); }

  /** Water rings from a tap on the sea. */
  splash(x: number, y: number) {
    for (let k = 0; k < 3; k++) {
      const ring = this.scene.add.ellipse(x, y, 40, 16).setStrokeStyle(2, 0xffffff, 0.8).setDepth(1).setScale(0.2);
      this.scene.tweens.add({ targets: ring, scale: 2.2 + k * 0.6, alpha: 0, duration: 1200, delay: k * 180, ease: 'Sine.easeOut', onComplete: () => ring.destroy() });
    }
  }

  /** A few grass blades flattened by a step: they tip over away from the dragon and spring back. */
  grassStep(d: Dragon) {
    const s = d.scale, { y } = d.feet();
    for (let k = 0; k < 4; k++) {
      const x = d.x + Phaser.Math.Between(-34, 34) * s;
      const blade = this.scene.add.triangle(x, y + 2, 0, 18, 4, 0, 8, 18, Phaser.Utils.Array.GetRandom([0x5fbf3a, 0x7fd44a, 0x4aa632]))
        .setOrigin(0.5, 1).setDepth(4).setScale(s * 1.4);
      const lean = (x > d.x ? 1 : -1) * Phaser.Math.FloatBetween(0.6, 1.1);
      this.scene.tweens.add({ targets: blade, rotation: lean, duration: 120, yoyo: true, hold: 260, ease: 'Quad.easeOut' });
      this.scene.tweens.add({ targets: blade, alpha: 0, delay: 420, duration: 300, onComplete: () => blade.destroy() });
    }
    // a couple of bits of grass flicked up
    for (let k = 0; k < 2; k++) {
      const bit = this.scene.add.rectangle(d.x + Phaser.Math.Between(-20, 20) * s, y, 3, 6, 0x6cc63e).setDepth(4);
      this.scene.tweens.add({ targets: bit, y: y - Phaser.Math.Between(14, 26) * s, x: bit.x - d.dir * 16 * s, angle: 200, alpha: 0,
        duration: 520, ease: 'Quad.easeOut', onComplete: () => bit.destroy() });
    }
  }

  /** A fish leaps out of the water at `at` and dives back in, with rings where it goes in and out. */
  fishJump(at: { x: number; y: number }) {
    const sc = this.scene, dir = Math.random() < 0.5 ? 1 : -1, span = Phaser.Math.Between(60, 110), h = Phaser.Math.Between(60, 100);
    const from = { x: at.x - dir * span / 2, y: at.y }, to = { x: at.x + dir * span / 2, y: at.y };
    this.splash(from.x, from.y);
    const fish = sc.add.image(from.x, from.y, 'food_2').setDepth(3).setScale(0.16).setFlipX(dir > 0);
    const p = { u: 0 };
    sc.tweens.add({ targets: p, u: 1, duration: 900, ease: 'Linear',
      onUpdate: () => {
        fish.setPosition(from.x + (to.x - from.x) * p.u, from.y - Math.sin(Math.PI * p.u) * h);
        fish.setRotation(dir * (p.u - 0.5) * 1.6);
      },
      onComplete: () => { fish.destroy(); this.splash(to.x, to.y); } });
  }

  footDust(d: Dragon) {
    const s = d.scale;
    for (let k = 0; k < 3; k++) {
      const p = this.scene.add.image(d.x + Phaser.Math.Between(-30, 30) * s, d.feet().y + Phaser.Math.Between(-4, 4) * s, 'puff')
        .setTint(0xe6f2c8).setAlpha(0.55).setScale(0.8 * s).setDepth(4);
      this.scene.tweens.add({ targets: p, y: p.y - 10 * s, x: p.x - d.dir * 14 * s, scale: 2.6 * s, alpha: 0,
        duration: 650, ease: 'Sine.easeOut', onComplete: () => p.destroy() });
    }
  }

  /** A faint wisp of cloud left behind a cloud-riding dragon (as misty as the wisps under its paws); drifts back and fades. */
  cloudPuff(d: Dragon) {
    const s = d.scale, { x, y } = d.feet();
    const back = -d.dir;
    const p = this.scene.add.image(x + back * Phaser.Math.Between(42, 77) * s, y - (d.height - 4) * s + Phaser.Math.Between(-6, 6) * s,
      cloudKey(d.id, Phaser.Math.Between(1, CLOUD_PUFFS))).setScale(0.25 * s).setAlpha(0.6).setDepth(d.root.depth - 0.01).setFlipX(back > 0);
    this.scene.tweens.add({ targets: p, x: p.x + back * 85 * s, y: p.y + 7 * s, scale: 0.39 * s, alpha: 0,
      duration: 1100, ease: 'Sine.easeOut', onComplete: () => p.destroy() });
  }

  /** Dust blown outward by the wings on take-off and landing. */
  dustRing(d: Dragon) {
    const s = d.scale, { x, y } = d.feet();
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * Math.PI * 2;
      const p = this.scene.add.image(x + Math.cos(a) * 20 * s, y + Math.sin(a) * 6 * s, 'puff')
        .setTint(0xe6f2c8).setAlpha(0.6).setScale(0.9 * s).setDepth(4);
      this.scene.tweens.add({ targets: p, x: p.x + Math.cos(a) * 90 * s, y: p.y + Math.sin(a) * 26 * s - 6 * s,
        scale: 2.4 * s, alpha: 0, duration: 750, ease: 'Sine.easeOut', onComplete: () => p.destroy() });
    }
  }
}

/** Effect textures drawn in code (gust, bone, spark, puff, glow, rain pieces, fangs); the islands and the battle field. */
export function makeFxTextures(scene: Phaser.Scene) {
  const g = scene.make.graphics({}, false);
  // wind crescent (bulges to the right) and a cartoon bone
  g.lineStyle(26, 0x6b5a3a, 0.35).beginPath().arc(24, 80, 70, -1.1, 1.1).strokePath();
  g.lineStyle(18, 0xffffff, 1).beginPath().arc(24, 80, 70, -1.1, 1.1).strokePath();
  g.lineStyle(8, 0xffffff, 0.55).beginPath().arc(4, 80, 70, -0.95, 0.95).strokePath();
  g.generateTexture('gust', 110, 160); g.clear();
  g.fillStyle(0x3a2a14).fillRoundedRect(8, 12, 48, 12, 5).fillCircle(9, 12, 8).fillCircle(9, 24, 8).fillCircle(55, 12, 8).fillCircle(55, 24, 8);
  g.fillStyle(0xf1e3bd).fillRoundedRect(10, 14, 44, 8, 4).fillCircle(9, 12, 6).fillCircle(9, 24, 6).fillCircle(55, 12, 6).fillCircle(55, 24, 6);
  g.generateTexture('bone', 64, 36); g.clear();
  g.fillStyle(0xffffff).fillRect(5, 0, 2, 12).fillRect(0, 5, 12, 2).fillCircle(6, 6, 2);
  g.generateTexture('spark', 12, 12); g.clear();
  g.fillStyle(0xffffff).fillCircle(8, 8, 8);
  g.generateTexture('puff', 16, 16); g.clear();
  // soft round glow (the egg in the nest): stacked translucent circles
  for (let k = 10; k >= 1; k--) g.fillStyle(0xfff0b0, 0.07).fillCircle(32, 32, k * 3.2);
  g.generateTexture('glow', 64, 64); g.clear();
  // elemental rain pieces (white, tinted per element): a flame feather and an ice shard, pointing down
  g.fillStyle(0xffffff, 1).fillEllipse(16, 30, 18, 44).fillTriangle(8, 34, 24, 34, 16, 60);
  g.fillStyle(0xffffff, 0.55).fillEllipse(16, 16, 10, 22);
  g.generateTexture('rain_feather', 32, 64); g.clear();
  g.fillStyle(0xffffff, 1).fillPoints([{ x: 14, y: 0 }, { x: 26, y: 22 }, { x: 14, y: 64 }, { x: 2, y: 22 }], true);
  g.fillStyle(0xffffff, 0.5).fillPoints([{ x: 14, y: 6 }, { x: 20, y: 22 }, { x: 14, y: 48 }], true);
  g.generateTexture('rain_shard', 28, 64); g.clear();
  // one row of a giant jaw: dark gum arch with fangs hanging down (flipped for the lower jaw)
  const JW = 240, JH = 96;
  g.fillStyle(0x1b0828).fillEllipse(JW / 2, 10, JW, 40);
  g.lineStyle(4, 0xc58cff, 1).strokeEllipse(JW / 2, 10, JW - 4, 36);
  const fangs = 9;
  for (let k = 0; k < fangs; k++) {
    const u = k / (fangs - 1), x = 16 + u * (JW - 32);
    const long = k === 1 || k === fangs - 2;
    const len = (long ? 80 : 44) * (0.75 + 0.25 * Math.sin(Math.PI * u));
    const w = long ? 22 : 16;
    const y0 = 14 + 8 * Math.sin(Math.PI * u);
    g.fillStyle(0xf4eeff).fillTriangle(x - w / 2, y0, x + w / 2, y0, x, Math.min(JH - 2, y0 + len));
    g.fillStyle(0xcab8e8).fillTriangle(x + w / 6, y0, x + w / 2, y0, x, Math.min(JH - 2, y0 + len));
  }
  g.generateTexture('fangs', JW, JH); g.destroy();
  makeProceduralVfx(scene);   // skill effects drawn in code (no drawn art for them yet)
}
