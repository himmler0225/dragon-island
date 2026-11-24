// Combat helpers: dive/land, foe search, impact, damage numbers, kill, status.
import * as Phaser from 'phaser';
import type { Unit } from './units';
import { HUE, REACH_SLACK, SCALE, STOP_MS, SUMMON_MS } from './constants';
import { STATUS } from '../skills/status';

/** Number pop style: chunky rounded digits, a dark rim and a soft drop shadow (thousands grouped). */
const NUM_FONT = '"Baloo 2", "Lilita One", "Arial Rounded MT Bold", system-ui, sans-serif';
const fmtNum = (n: number) => Math.round(n).toLocaleString('vi-VN');

export class CombatScene {
  constructor(private scene: Phaser.Scene) {}

  /** A soft column of light comes down where the dragon stands, glows, and the dragon pops out of
   *  it (scaled up from small) while a few sparks drift up the beam. Kept dim: summons come often. */
  summon(u: Unit) {
    const sc = this.scene, tint = u.side === 'ally' ? 0x9fe8ff : 0xff9a7a;
    const x = u.root.x, ground = u.y, top = sc.cameras.main.worldView.y - 40, h = ground - top;
    const halo = sc.add.image(x, top + h / 2, 'glow').setTint(tint).setBlendMode(Phaser.BlendModes.ADD)
      .setScale(4, h / 30).setAlpha(0).setDepth(19);
    const core = sc.add.image(x, top + h / 2, 'glow').setTint(0xffffff).setBlendMode(Phaser.BlendModes.ADD)
      .setScale(1.2, h / 30).setAlpha(0).setDepth(19.1);
    for (const [beam, a] of [[halo, 0.4], [core, 0.45]] as const) {
      sc.tweens.add({ targets: beam, alpha: a, duration: 200, ease: 'Sine.easeOut' });
      sc.tweens.add({ targets: beam, alpha: 0, scaleX: beam.scaleX * 0.2, delay: 420, duration: 380, ease: 'Quad.easeIn', onComplete: () => beam.destroy() });
    }
    // sparks rising up the beam
    for (let k = 0; k < 8; k++) {
      const p = sc.add.image(x + Phaser.Math.Between(-26, 26), ground - Phaser.Math.Between(0, 120), 'spark')
        .setTint(k % 2 ? 0xffffff : tint).setBlendMode(Phaser.BlendModes.ADD).setScale(Phaser.Math.FloatBetween(0.5, 1)).setAlpha(0).setDepth(19.2);
      sc.tweens.add({ targets: p, alpha: { from: 0.6, to: 0 }, y: p.y - Phaser.Math.Between(220, 520), delay: 60 + k * 40,
        duration: Phaser.Math.Between(420, 700), ease: 'Cubic.easeOut', onComplete: () => p.destroy() });
    }
    sc.time.delayedCall(90, () => this.land(u, ground - u.alt, tint));
    // the dragon: hidden until the strike, then pops out of the light
    u.body.setScale(0.35).setAlpha(0);
    sc.tweens.add({ targets: u.body, scale: 1, alpha: 1, delay: 90, duration: SUMMON_MS - 90, ease: 'Back.easeOut' });
    sc.tweens.add({ targets: u, drop: 0, duration: SUMMON_MS, ease: 'Linear' });
  }

  land(u: Unit, y: number, tint: number) {
    const x = u.root.x;
    // a soft glow where it lands (not a white flash: several summons in a row would strobe)
    for (const [k, tint, a] of [[4, 0xffffff, 0.35], [7, u.side === 'ally' ? 0x9fe8ff : 0xff9a7a, 0.3]] as const) {
      const flash = this.scene.add.image(x, y - 40, 'glow').setTint(tint).setBlendMode(Phaser.BlendModes.ADD).setScale(k * 0.5).setDepth(19.3);
      this.scene.tweens.add({ targets: flash, scale: k, alpha: { from: a, to: 0 }, duration: 600, ease: 'Sine.easeOut', onComplete: () => flash.destroy() });
    }
    for (let k = 0; k < 2; k++) {
      const ring = this.scene.add.ellipse(x, u.y, 90, 30).setStrokeStyle(4 - k * 2, k ? 0xffffff : tint, 0.6).setDepth(4).setScale(0.3);
      this.scene.tweens.add({ targets: ring, scale: 2.6 + k, alpha: 0, delay: k * 90, duration: 520, ease: 'Cubic.easeOut', onComplete: () => ring.destroy() });
    }
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2, r = Phaser.Math.Between(70, 130);
      const p = this.scene.add.image(x, u.y, 'puff').setTint(0xd9c39a).setAlpha(0.85).setDepth(4).setScale(Phaser.Math.FloatBetween(1.2, 2.2));
      this.scene.tweens.add({ targets: p, x: x + Math.cos(a) * r, y: u.y + Math.sin(a) * r * 0.35 - 14, alpha: 0, scale: p.scale * 1.6,
        duration: Phaser.Math.Between(380, 620), ease: 'Cubic.easeOut', onComplete: () => p.destroy() });
    }
  }

  foe(u: Unit, units: Unit[]): Unit | null {
    const dir = u.side === 'ally' ? 1 : -1;
    let best: Unit | null = null, bestD = u.reach + (u.engaged ? REACH_SLACK : 0);
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
    // the hit: a flash in the attacker's colour round a white core, a ring bursting out and sparks flying off
    const sc = this.scene, c = by ? HUE[by.id].c : 0xffffff, k = crit ? 1.4 : 1;
    const x = u.root.x + (Math.random() - 0.5) * 20, y = u.y - u.alt - 60 * SCALE + (Math.random() - 0.5) * 20;
    const flash = sc.add.image(x, y, 'glow').setBlendMode(Phaser.BlendModes.ADD).setTint(c).setScale(0.6 * k).setDepth(21).setAlpha(0.95);
    sc.tweens.add({ targets: flash, scale: 3 * k, alpha: 0, duration: 320, ease: 'Cubic.easeOut', onComplete: () => flash.destroy() });
    const core = sc.add.image(x, y, 'glow').setBlendMode(Phaser.BlendModes.ADD).setScale(1.4 * k).setDepth(21.1).setAlpha(1);
    sc.tweens.add({ targets: core, scale: 0.3, alpha: 0, duration: 200, ease: 'Quad.easeIn', onComplete: () => core.destroy() });
    const ring = sc.add.circle(x, y, 18).setStrokeStyle(crit ? 5 : 3, c, 0.9).setDepth(21).setScale(0.4);
    sc.tweens.add({ targets: ring, scale: 2.6 * k, alpha: 0, duration: 360, ease: 'Cubic.easeOut', onComplete: () => ring.destroy() });
    const n = crit ? 12 : 8;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.4, r = Phaser.Math.Between(50, 95) * k;
      const p = sc.add.image(x, y, 'spark').setBlendMode(Phaser.BlendModes.ADD).setTint(i % 3 ? c : 0xffffff)
        .setDepth(21.2).setScale(Phaser.Math.FloatBetween(1, 1.8)).setRotation(a);
      sc.tweens.add({ targets: p, x: x + Math.cos(a) * r, y: y + Math.sin(a) * r * 0.75, scaleX: 0.2, scaleY: 0.2, alpha: 0,
        duration: Phaser.Math.Between(260, 420), ease: 'Cubic.easeOut', onComplete: () => p.destroy() });
    }
  }

  /** A damage number: pops in with a little overshoot over the target's head, drifts up and to the side,
   *  then fades. Several hits in a row stack upward instead of overlapping. */
  private num(x: number, y: number, text: string, o: { color: string; size: number; rim?: string; scale?: number }) {
    const t = this.scene.add.text(x, y, text, {
      fontFamily: NUM_FONT, fontStyle: '900', fontSize: `${o.size}px`, color: o.color,
      stroke: o.rim ?? '#2a1200', strokeThickness: Math.round(o.size * 0.2), resolution: 2,
    }).setOrigin(0.5).setDepth(5000).setScale(0.3).setAlpha(0);
    t.setShadow(0, Math.round(o.size * 0.1), 'rgba(0, 0, 0, 0.55)', 4, true, true);
    const peak = o.scale ?? 1.25, side = (Math.random() - 0.5) * 36;
    this.scene.tweens.add({ targets: t, scale: peak, alpha: 1, duration: 120, ease: 'Back.easeOut',
      onComplete: () => this.scene.tweens.add({ targets: t, scale: 1, duration: 140, ease: 'Sine.easeOut' }) });
    this.scene.tweens.add({ targets: t, x: x + side, y: y - 56, delay: 120, duration: 760, ease: 'Sine.easeOut' });
    this.scene.tweens.add({ targets: t, alpha: 0, delay: 620, duration: 300, ease: 'Sine.easeIn', onComplete: () => t.destroy() });
    return t;
  }

  pop(u: Unit, by: Unit | undefined, crit: boolean, dmg: number, headY: number) {
    const now = this.scene.time.now;
    u.pops = u.pops.filter(t => now - t < 450);
    const lift = u.pops.length * 24;
    u.pops.push(now);
    const x = u.root.x + (Math.random() - 0.5) * 24, y = headY - lift;
    // allies' losses red, crits gold, otherwise the attacker's colour (white for no attacker)
    const color = crit ? '#ffe066' : u.side === 'ally' ? '#ff6b6b' : by ? HUE[by.id].css : '#ffffff';
    this.num(x, y, `-${fmtNum(dmg)}`, crit ? { color, size: 26, rim: '#6a1a00', scale: 1.35 } : { color, size: 19 });
    if (crit) {
      const tag = this.scene.add.text(x, y - 30, 'CHÍ MẠNG!', {
        fontFamily: NUM_FONT, fontStyle: 'italic 900', fontSize: '12px', color: '#fff6c8',
        stroke: '#a83200', strokeThickness: 4, resolution: 2,
      }).setOrigin(0.5).setDepth(5001).setAngle(-6).setScale(0.4).setAlpha(0);
      tag.setShadow(0, 2, 'rgba(0, 0, 0, 0.5)', 3, true, true);
      this.scene.tweens.add({ targets: tag, scale: 1, alpha: 1, duration: 140, ease: 'Back.easeOut' });
      this.scene.tweens.add({ targets: tag, y: tag.y - 56, delay: 140, duration: 760, ease: 'Sine.easeOut' });
      this.scene.tweens.add({ targets: tag, alpha: 0, delay: 620, duration: 300, onComplete: () => tag.destroy() });
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
      fontFamily: 'system-ui, sans-serif', fontStyle: '900', fontSize: '18px', color,
      stroke: '#1a0d00', strokeThickness: 4, resolution: 2,
    }).setOrigin(0.5).setDepth(5000).setScale(1.3);
    this.scene.tweens.add({ targets: t, scale: 1, duration: 160, ease: 'Back.easeOut' });
    this.scene.tweens.add({ targets: t, y: t.y - 70, alpha: 0, delay: 380, duration: 700, ease: 'Cubic.easeIn', onComplete: () => t.destroy() });
  }

  inflict(u: Unit, kind: keyof typeof STATUS, headY: number) {
    const tick = STATUS[kind].tick ?? 0;
    u.hp -= tick;
    const popColor = kind === 'burn' ? '#ffab5a' : '#d39bff';
    this.num(u.root.x + (Math.random() - 0.5) * 24, headY - 10, `-${fmtNum(tick)}`, { color: popColor, size: 16, scale: 1.1 });
    if (u.hp <= 0) this.kill(u);
  }
}
