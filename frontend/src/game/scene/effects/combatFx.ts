// Combat effects: fx, projectile, beam, bite, floatText.
// Area effects (rift, elementRain, gust, boneRain, orb, splash) live in ./area.
import * as Phaser from 'phaser';
import type { Spot, FxOpts, AnimOpts, SkillActor, RiftOpts, ElementRainOpts } from '../../skills/types';
import type { SpeciesId } from '../../config/species';
import { jawKey } from '../../skills/registry';
import type { RigData } from '../../rig';
import { AreaFx } from './combatFx/area';

/** Skill animations (skills/anims.png, tools/slice_skill_anims.py) are written at 2x their sheet size and sharpened, so
 *  drawn big on the field they stay crisp: drawn at 1 / ANIM_RES, the `scale` a skill asks for keeps its meaning. */
const ANIM_RES = 2;

export class CombatFx {
  constructor(private scene: Phaser.Scene) {
    this.area = new AreaFx(scene);
  }

  intensity = 1;
  budget = Infinity;
  blend: Phaser.BlendModes = Phaser.BlendModes.ADD;
  size = 1;

  private active = 0;
  private area: AreaFx;

  private take(img: Phaser.GameObjects.Image) {
    this.active++;
    img.once(Phaser.GameObjects.Events.DESTROY, () => this.active--);
  }

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
    // swells in softly, then lingers and dissolves: it keeps spreading and (in the air) drifts up as it fades,
    // with a slight turn, so it reads as light and smoke rather than a picture popping on and off
    const fadeIn = Math.min(220, dur * 0.3), fadeOut = dur * 0.65, total = dur + hold;
    img.setScale(scale * 0.55, scale * 0.55 * sy);
    this.scene.tweens.add({ targets: img, alpha: this.intensity, scaleX: scale, scaleY: scale * sy, duration: fadeIn, ease: 'Cubic.easeOut' });
    this.scene.tweens.add({ targets: img, alpha: 0, scaleX: scale * 1.35, scaleY: scale * 1.35 * sy, y: img.y - (o.ground ? 0 : 22 * scale),
      delay: total - fadeOut, duration: fadeOut, ease: 'Sine.easeInOut', onComplete: () => img.destroy() });
    if (!o.spin && !o.ground) this.scene.tweens.add({ targets: img, rotation: img.rotation + (Math.random() - 0.5) * 0.25, duration: total, ease: 'Sine.easeOut' });
    if (o.light !== undefined) this.light(at, o.light, img.displayWidth, total, o.ground);
    if (o.spin) this.scene.tweens.add({ targets: img, rotation: img.rotation + o.spin, duration: total });
  }

  /** Frames `keys` played in turn at `at` (an animation drawn as separate images); resolves when it has faded. */
  anim(keys: string[], at: Spot, o: AnimOpts = {}) {
    return new Promise<void>(res => {
      if (!keys.length || !this.scene.textures.exists(keys[0])) { res(); return; }
      const imgs = Array.from({ length: 1 + (o.boost ?? 0) }, () => {
        const img = this.scene.add.image(at.x, at.y, keys[0]).setBlendMode(this.blend).setAlpha(this.intensity)
          .setDepth(o.depth ?? (o.ground ? 4 : 20)).setScale(((o.scale ?? 0.5) * this.size) / ANIM_RES).setFlipX(!!o.flipX);
        if (o.anchor === 'bottom') img.setOrigin(0.5, 0.95);
        if (o.tint !== undefined) img.setTint(o.tint);
        return img;
      });
      const follow = o.follow && (() => { const p = o.follow!(); for (const img of imgs) img.setPosition(p.x, p.y); });
      if (follow) { follow(); this.scene.events.on('update', follow); }
      const step = 1000 / (o.fps ?? 14), [loopN, loopMs] = o.loop ?? [0, 0];
      let k = 0, held = 0;
      o.onFrame?.(0);
      const timer = this.scene.time.addEvent({ delay: step, loop: true, callback: () => {
        k++;
        if (k >= keys.length) {
          if (loopN && (held < loopMs || o.hold?.())) { held += step * loopN; k = keys.length - loopN; }   // hold: replay the last frames
          else {
            timer.remove();
            this.scene.tweens.add({ targets: imgs, alpha: 0, duration: 180, onComplete: () => {
              if (follow) this.scene.events.off('update', follow);
              for (const img of imgs) img.destroy();
              res();
            } });
            return;
          }
        }
        if (this.scene.textures.exists(keys[k])) for (const img of imgs) img.setTexture(keys[k]);
        o.onFrame?.(k);
      } });
    });
  }

  /** A soft pool of the effect's colour round it, lighting the air (and the ground under a ground effect). */
  private light(at: Spot, color: number, width: number, dur: number, ground?: boolean) {
    const k = Math.max(1.5, (width * 1.5) / 64);   // the 'glow' texture is 64 px wide
    const g = this.scene.add.image(at.x, at.y, 'glow').setBlendMode(Phaser.BlendModes.ADD).setTint(color).setAlpha(0)
      .setDepth(ground ? 3.9 : 19.9).setScale(k * 0.6, k * 0.6 * (ground ? 0.42 : 1));
    this.scene.tweens.add({ targets: g, alpha: 0.32, scaleX: k, scaleY: k * (ground ? 0.42 : 1), duration: dur * 0.3, ease: 'Sine.easeOut' });
    this.scene.tweens.add({ targets: g, alpha: 0, delay: dur * 0.35, duration: dur * 0.65, ease: 'Sine.easeIn', onComplete: () => g.destroy() });
  }

  private projectile(key: string, from: Spot, to: Spot, o: { dur?: number; scale?: number; tint?: number; rotate?: boolean; flipX?: boolean; light?: number } = {}) {
    return new Promise<void>(res => {
      if (this.active >= this.budget) { this.scene.time.delayedCall(o.dur ?? 400, res); return; }
      const img = this.scene.add.image(from.x, from.y, key).setBlendMode(this.blend).setDepth(21)
        .setScale((o.scale ?? 0.4) * this.size).setFlipX(!!o.flipX).setAlpha(this.intensity)
        .setRotation(o.rotate === false ? 0 : Math.atan2(to.y - from.y, to.x - from.x));
      this.take(img);
      if (o.tint !== undefined) img.setTint(o.tint);
      // a fading trail of ghosts behind it, and on arrival it flares and melts away instead of vanishing
      const trail = this.scene.time.addEvent({ delay: 35, loop: true, callback: () => {
        const g = this.scene.add.image(img.x, img.y, key).setBlendMode(this.blend).setDepth(20.9).setRotation(img.rotation)
          .setScale(img.scaleX * 0.9).setFlipX(img.flipX).setAlpha(this.intensity * 0.45);
        if (o.tint !== undefined) g.setTint(o.tint);
        this.scene.tweens.add({ targets: g, alpha: 0, scale: g.scaleX * 0.5, duration: 260, ease: 'Quad.easeOut', onComplete: () => g.destroy() });
      } });
      // a pool of light travels with it and flares where it lands
      const lit = o.light === undefined ? null : this.scene.add.image(from.x, from.y, 'glow').setBlendMode(Phaser.BlendModes.ADD).setTint(o.light)
        .setAlpha(0.4).setDepth(20.8).setScale((img.displayWidth * 1.2) / 64);
      if (lit) this.scene.tweens.add({ targets: lit, x: to.x, y: to.y, duration: o.dur ?? 400, ease: 'Sine.easeInOut', onComplete: () => this.scene.tweens.add({ targets: lit, alpha: 0, scale: lit.scale * 2, duration: 260, onComplete: () => lit.destroy() }) });
      const full = img.scaleX;
      img.setScale(full * 0.5);
      this.scene.tweens.add({ targets: img, scale: full, duration: Math.min(140, (o.dur ?? 400) * 0.35), ease: 'Cubic.easeOut' });
      this.scene.tweens.add({ targets: img, x: to.x, y: to.y, duration: o.dur ?? 400, ease: 'Sine.easeInOut',
        onComplete: () => {
          trail.remove(); res();
          this.scene.tweens.add({ targets: img, alpha: 0, scale: img.scaleX * 1.5, duration: 220, ease: 'Quad.easeOut', onComplete: () => img.destroy() });
        } });
    });
  }

  private beam(key: string, from: Spot, to: Spot, o: { dur?: number; width?: number; tint?: number; light?: number } = {}) {
    return new Promise<void>(res => {
      const dur = o.dur ?? 700, w = o.width ?? 0.5;
      if (o.light !== undefined) { this.light(from, o.light, 160, dur); this.light(to, o.light, 220, dur); }
      if (this.active >= this.budget) { this.scene.time.delayedCall(dur * 0.25, res); return; }
      const img = this.scene.add.image(from.x, from.y, key).setOrigin(0.04, 0.5).setBlendMode(this.blend)
        .setDepth(21).setRotation(Math.atan2(to.y - from.y, to.x - from.x)).setAlpha(this.intensity);
      this.take(img);
      if (o.tint !== undefined) img.setTint(o.tint);
      const len = Math.hypot(to.x - from.x, to.y - from.y) / img.width;
      img.setScale(0.05, w * 0.4);
      this.scene.tweens.add({ targets: img, scaleX: len, scaleY: w, duration: dur * 0.25, ease: 'Cubic.easeOut', onComplete: () => res() });
      // flickers while it burns, then thins out and fades slowly
      const flicker = this.scene.tweens.add({ targets: img, alpha: this.intensity * 0.75, duration: 70, yoyo: true, repeat: -1, delay: dur * 0.25 });
      this.scene.tweens.add({ targets: img, scaleY: w * 0.15, alpha: 0, delay: dur * 0.55, duration: dur * 0.45, ease: 'Quad.easeOut',
        onStart: () => flicker.remove(), onComplete: () => img.destroy() });
    });
  }

  // ---- Area effects (delegated) ----
  callRift(id: SpeciesId, rig: RigData, at: Spot, targets: SkillActor[], onHit: (t: SkillActor) => void, opts?: RiftOpts) {
    return this.area.rift(id, rig, at, targets, onHit, opts);
  }

  callProjectile(key: string, from: Spot, to: Spot, opts?: { dur?: number; scale?: number; tint?: number; rotate?: boolean; flipX?: boolean; light?: number }) {
    return this.projectile(key, from, to, opts);
  }

  callElementRain(ts: SkillActor[], onHit: (t: SkillActor) => void, o: ElementRainOpts) {
    return this.area.elementRain(ts, onHit, o);
  }

  callBeam(key: string, from: Spot, to: Spot, opts?: { dur?: number; width?: number; tint?: number; light?: number }) {
    return this.beam(key, from, to, { ...opts, width: (opts?.width ?? 0.5) * this.size });
  }

  callBite(id: SpeciesId, at: Spot, opts?: { scale?: number; tint?: number }) {
    return this.bite(id, at, { ...opts, scale: (opts?.scale ?? 1) * this.size });
  }

  callGust(from: Spot, dir: 1 | -1, opts?: { reach?: number; scale?: number; tint?: number }) {
    return this.gust(from, dir, { ...opts, scale: (opts?.scale ?? 1) * this.size });
  }

  callBoneRain(at: Spot, opts?: { count?: number; scale?: number }) {
    return this.boneRain(at, { ...opts, scale: (opts?.scale ?? 1) * this.size });
  }

  callOrb(from: Spot, to: Spot, opts?: { scale?: number; tint?: number; dur?: number }) {
    return this.orb(from, to, { ...opts, scale: (opts?.scale ?? 1) * this.size });
  }

  callWaterSplash(at: Spot, opts?: { scale?: number; big?: boolean }) {
    return this.waterSplash(at, { ...opts, scale: (opts?.scale ?? 1) * this.size });
  }

  // ---- Individual skill effects ----

  private bite(id: SpeciesId, at: Spot, o: { scale?: number; tint?: number } = {}) {
    const s = o.scale ?? 1, tint = o.tint ?? 0xb050ff;
    const drawn = this.scene.textures.exists(jawKey(id, 'upper'));
    let upper: Phaser.GameObjects.Image, lower: Phaser.GameObjects.Image, k: number, shut: number;
    if (drawn) {
      upper = this.scene.add.image(at.x, at.y, jawKey(id, 'upper')).setOrigin(0.5, 0.92).setBlendMode(Phaser.BlendModes.ADD);
      lower = this.scene.add.image(at.x, at.y, jawKey(id, 'lower')).setOrigin(0.5, 0.08).setBlendMode(Phaser.BlendModes.ADD);
      k = (300 / upper.width) * s; const open = 70 * s; shut = -14 * s;
      upper.setY(at.y - open * 0.8).setScale(0.6 * k).setAlpha(0).setDepth(22);
      lower.setY(at.y + open * 0.8).setScale(0.6 * k).setAlpha(0).setDepth(22);
    } else {
      upper = this.scene.add.image(at.x, at.y, 'fangs').setOrigin(0.5, 0.15);
      lower = this.scene.add.image(at.x, at.y, 'fangs').setOrigin(0.5, 0.85).setFlipY(true);
      k = s; const open = 140 * s; shut = 46 * s;
      upper.setY(at.y - open * 0.8).setScale(0.6 * k).setAlpha(0).setDepth(22);
      lower.setY(at.y + open * 0.8).setScale(0.6 * k).setAlpha(0).setDepth(22);
    }
    const glow = this.scene.add.image(at.x, at.y, 'puff').setBlendMode(Phaser.BlendModes.ADD).setTint(tint).setAlpha(0).setScale(4 * s).setDepth(21);
    return new Promise<void>(res => {
      this.scene.tweens.add({ targets: [upper, lower], alpha: 1, scale: k, duration: 220, ease: 'Back.easeOut' });
      this.scene.tweens.add({ targets: glow, alpha: 0.5, duration: 260 });
      this.scene.tweens.add({ targets: upper, y: upper.y, duration: 260, ease: 'Sine.easeOut' });
      this.scene.tweens.add({ targets: lower, y: lower.y, duration: 260, ease: 'Sine.easeOut' });
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

  private gust(from: Spot, dir: 1 | -1, o: { reach?: number; scale?: number; tint?: number } = {}) {
    return this.area.gust(from, dir, o);
  }

  private boneRain(at: Spot, o: { count?: number; scale?: number } = {}) {
    return this.area.boneRain(at, o);
  }

  private orb(from: Spot, to: Spot, o: { scale?: number; tint?: number; dur?: number } = {}) {
    return this.area.orb(from, to, o);
  }

  private waterSplash(at: Spot, o: { scale?: number; big?: boolean } = {}) {
    return this.area.waterSplash(at, o);
  }

  floatText(x: number, y: number, text: string, color = '#ffe27a') {
    const t = this.scene.add.text(x, y, text, { fontFamily: 'system-ui, sans-serif', fontSize: '16px', fontStyle: 'bold',
      color, stroke: '#0b1a2a', strokeThickness: 5 }).setOrigin(0.5).setDepth(30);
    this.scene.tweens.add({ targets: t, y: y - 50, alpha: 0, delay: 300, duration: 1100, ease: 'Sine.easeOut', onComplete: () => t.destroy() });
  }
}
