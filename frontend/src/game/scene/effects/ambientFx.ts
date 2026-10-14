// Ambient effects: makeTextures, splash, footDust, cloudPuff, dustRing, sleepZ.
// All use this.scene for Phaser objects.
import type { IslandScene } from '../IslandScene';
import type { Dragon } from '../Dragon';

import { cloudKey } from '../../config/species';
import * as Phaser from 'phaser';

const CLOUD_PUFFS = 3;

export class AmbientFx {
  constructor(private scene: IslandScene) {}

  makeTextures() {
    const g = this.scene.make.graphics({}, false);
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
  }

  /** Water rings from a tap on the sea. */
  splash(x: number, y: number) {
    for (let k = 0; k < 3; k++) {
      const ring = this.scene.add.ellipse(x, y, 40, 16).setStrokeStyle(2, 0xffffff, 0.8).setDepth(1).setScale(0.2);
      this.scene.tweens.add({ targets: ring, scale: 2.2 + k * 0.6, alpha: 0, duration: 1200, delay: k * 180, ease: 'Sine.easeOut', onComplete: () => ring.destroy() });
    }
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

  /** A small cloud puff left behind a cloud-riding dragon; drifts back and fades. */
  cloudPuff(d: Dragon) {
    const s = d.scale, { x, y } = d.feet();
    const back = -d.dir;
    const p = this.scene.add.image(x + back * Phaser.Math.Between(60, 110) * s, y - (d.height - 4) * s + Phaser.Math.Between(-6, 6) * s,
      cloudKey(d.id, Phaser.Math.Between(1, CLOUD_PUFFS))).setScale(0.35 * s).setAlpha(0.9).setDepth(d.root.depth - 0.01).setFlipX(back > 0);
    this.scene.tweens.add({ targets: p, x: p.x + back * 120 * s, y: p.y + 10 * s, scale: 0.55 * s, alpha: 0,
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

  /** A "z" drifting up from a sleeping dragon's head. */
  sleepZ(d: Dragon) {
    const p = d.head();
    const z = this.scene.add.text(p.x, p.y, 'z', { fontFamily: 'system-ui, sans-serif', fontSize: '18px', fontStyle: 'bold',
      color: '#dff4ff', stroke: '#16354f', strokeThickness: 4 }).setOrigin(0.5).setDepth(20).setAlpha(0);
    this.scene.tweens.add({ targets: z, alpha: { from: 0, to: 0.95 }, duration: 400, yoyo: true, hold: 900 });
    this.scene.tweens.add({ targets: z, x: z.x + 18 * d.dir, y: z.y - 46, scale: 1.5, duration: 1700, ease: 'Sine.easeOut', onComplete: () => z.destroy() });
  }
}
