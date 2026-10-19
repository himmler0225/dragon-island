// Combat helpers: dive/land, foe search, impact, damage numbers, kill, status.
import * as Phaser from 'phaser';
import type { Unit } from './units';
import { DROP_H, DROP_MS, HUE, SCALE, STOP_MS } from './constants';
import { STATUS } from '../skills/status';

export class CombatScene {
  constructor(private scene: Phaser.Scene) {}

  dive(u: Unit) {
    const tint = u.side === 'ally' ? 0x9fe8ff : 0xff9a7a;
    const land = u.y - u.alt;
    const streak = this.scene.add.image(u.root.x, land - DROP_H / 2, 'glow')
      .setTint(tint).setBlendMode(Phaser.BlendModes.ADD).setScale(1.3, DROP_H / 40).setAlpha(0).setDepth(19);
    this.scene.tweens.add({ targets: streak, alpha: 0.85, duration: DROP_MS * 0.6, yoyo: true, onComplete: () => streak.destroy() });
    this.scene.tweens.add({ targets: u, drop: 0, duration: DROP_MS, ease: 'Quad.easeIn', onComplete: () => this.land(u, land, tint) });
  }

  land(u: Unit, y: number, tint: number) {
    const x = u.root.x;
    const flash = this.scene.add.image(x, y - 20, 'glow').setTint(tint).setBlendMode(Phaser.BlendModes.ADD).setScale(4).setDepth(19);
    this.scene.tweens.add({ targets: flash, scale: 0.5, alpha: 0, duration: 380, ease: 'Quad.easeOut', onComplete: () => flash.destroy() });
    for (let k = 0; k < 2; k++) {
      const ring = this.scene.add.ellipse(x, y, 90, 30).setStrokeStyle(5 - k * 2, k ? 0xffffff : tint, 0.9).setDepth(4).setScale(0.3);
      this.scene.tweens.add({ targets: ring, scale: 2.6 + k, alpha: 0, delay: k * 90, duration: 520, ease: 'Cubic.easeOut', onComplete: () => ring.destroy() });
    }
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2, r = Phaser.Math.Between(70, 130);
      const p = this.scene.add.image(x, y, u.fly ? 'spark' : 'puff').setTint(u.fly ? tint : 0xd9c39a).setAlpha(0.85).setDepth(4)
        .setScale(u.fly ? 1.6 : Phaser.Math.FloatBetween(1.2, 2.2));
      this.scene.tweens.add({ targets: p, x: x + Math.cos(a) * r, y: y + Math.sin(a) * r * 0.35 - (u.fly ? 0 : 14), alpha: 0, scale: p.scale * 1.6,
        duration: Phaser.Math.Between(380, 620), ease: 'Cubic.easeOut', onComplete: () => p.destroy() });
    }
    u.rig.hurt();
  }

  foe(u: Unit, units: Unit[]): Unit | null {
    const dir = u.side === 'ally' ? 1 : -1;
    let best: Unit | null = null, bestD = u.reach;
    for (const o of units) {
      if (o.dead || o.side === u.side) continue;
      const d = (o.root.x - u.root.x) * dir;
      if (d > -40 && d < bestD) { best = o; bestD = d; }
    }
    return best;
  }

  impact(u: Unit, by: Unit | undefined, crit: boolean) {
    const ms = by && by.ult > 0 ? STOP_MS.ultimate : crit ? STOP_MS.crit : STOP_MS.hit;
    u.stop = Math.max(u.stop, ms / 1000);
    if (by && !by.dead) by.stop = Math.max(by.stop, ms / 1000);
    u.rig.hurt(true);
    u.kick = crit ? 26 : 14;
    this.scene.tweens.add({ targets: u, kick: 0, delay: ms, duration: 260, ease: 'Back.easeOut' });
    const spark = this.scene.add.image(u.root.x, u.y - u.alt - 60 * SCALE, 'glow').setBlendMode(Phaser.BlendModes.SCREEN)
      .setTint(by ? HUE[by.id].c : 0xffffff).setScale(crit ? 3.2 : 2.2).setDepth(21).setAlpha(0.9);
    this.scene.tweens.add({ targets: spark, scale: 0.4, alpha: 0, duration: 260, ease: 'Quad.easeOut', onComplete: () => spark.destroy() });
  }

  pop(u: Unit, by: Unit | undefined, crit: boolean, dmg: number, headY: number) {
    const now = this.scene.time.now;
    u.pops = u.pops.filter(t => now - t < 450);
    const lift = u.pops.length * 26;
    u.pops.push(now);
    const text = this.scene.add.text(u.root.x + (Math.random() - 0.5) * 30, headY - lift, `-${dmg}`, {
      fontFamily: 'system-ui, sans-serif', fontStyle: '900', fontSize: crit ? '40px' : '28px',
      color: crit ? '#ffd84d' : by ? HUE[by.id].css : u.side === 'ally' ? '#ff6b6b' : '#ffffff',
      stroke: '#1a0d00', strokeThickness: crit ? 7 : 5, resolution: 2,
    }).setOrigin(0.5).setDepth(5000).setScale(crit ? 2 : 1.6);
    this.scene.tweens.add({ targets: text, scale: 1, duration: 160, ease: 'Back.easeOut' });
    this.scene.tweens.add({ targets: text, y: text.y - 70, alpha: 0, delay: 380, duration: 700, ease: 'Cubic.easeIn', onComplete: () => text.destroy() });
    if (crit) {
      const tag = this.scene.add.text(u.root.x, headY - lift - 34, 'CHÍ MẠNG', {
        fontFamily: 'system-ui, sans-serif', fontStyle: 'italic 900', fontSize: '18px', color: '#fff6c8',
        stroke: '#7a2a00', strokeThickness: 5, resolution: 2,
      }).setOrigin(0.5).setDepth(5001).setAngle(-8).setScale(0.4);
      this.scene.tweens.add({ targets: tag, scale: 1, duration: 140, ease: 'Back.easeOut' });
      this.scene.tweens.add({ targets: tag, y: tag.y - 104, alpha: 0, delay: 380, duration: 700, ease: 'Cubic.easeIn', onComplete: () => tag.destroy() });
    }
  }

  kill(u: Unit) {
    u.dead = true;
    u.bar.destroy();
    this.scene.tweens.add({
      targets: u.root, alpha: 0, y: u.root.y + 20, duration: 600, ease: 'Quad.easeIn',
      onComplete: () => { u.rig.destroy(); u.root.destroy(); },
    });
    if (u.fly) this.scene.tweens.add({ targets: u.body, y: 0, duration: 600, ease: 'Quad.easeIn' });
  }

  float(u: Unit, text: string, color: string, headY: number) {
    const t = this.scene.add.text(u.root.x, headY - 30, text, {
      fontFamily: 'system-ui, sans-serif', fontStyle: '900', fontSize: '28px', color,
      stroke: '#1a0d00', strokeThickness: 5, resolution: 2,
    }).setOrigin(0.5).setDepth(5000).setScale(1.6);
    this.scene.tweens.add({ targets: t, scale: 1, duration: 160, ease: 'Back.easeOut' });
    this.scene.tweens.add({ targets: t, y: t.y - 70, alpha: 0, delay: 380, duration: 700, ease: 'Cubic.easeIn', onComplete: () => t.destroy() });
  }

  inflict(u: Unit, kind: keyof typeof STATUS, headY: number) {
    const tick = STATUS[kind].tick ?? 0;
    u.hp -= tick;
    const popColor = kind === 'burn' ? '#ffab5a' : '#d39bff';
    const text = this.scene.add.text(u.root.x + (Math.random() - 0.5) * 30, headY - 10, `-${tick}`, {
      fontFamily: 'system-ui, sans-serif', fontStyle: '900', fontSize: '28px', color: popColor,
      stroke: '#1a0d00', strokeThickness: 5, resolution: 2,
    }).setOrigin(0.5).setDepth(5000).setScale(1.6);
    this.scene.tweens.add({ targets: text, scale: 1, duration: 160, ease: 'Back.easeOut' });
    this.scene.tweens.add({ targets: text, y: text.y - 70, alpha: 0, delay: 380, duration: 700, ease: 'Cubic.easeIn', onComplete: () => text.destroy() });
    if (u.hp <= 0) this.kill(u);
  }
}
