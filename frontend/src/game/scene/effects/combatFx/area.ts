// Combat area effects: rift, elementRain, gust, boneRain, orb, waterSplash.
import * as Phaser from 'phaser';
import { rigTextureKey } from '@/game/rig';
import type { SpeciesId } from '@/game/config/species';
import type { SkillActor, RiftOpts, ElementRainOpts, Spot } from '@/game/skills/types';
import type { RigData } from '@/game/rig/types';

export class AreaFx {
  constructor(private scene: Phaser.Scene) {}

  rift(id: SpeciesId, rig: RigData, at: Spot, targets: SkillActor[], onHit: (t: SkillActor) => void, o: RiftOpts = {}) {
    const sc = this.scene, s = o.scale ?? 1, tint = o.tint ?? 0xc04cff;
    const view = sc.cameras.main.worldView;
    at = { x: Phaser.Math.Clamp(at.x, view.x + 130, view.right - 130), y: Math.max(at.y, view.y + 110) };
    const head = rig.bones.find(b => b.name === 'head'), jaw = rig.bones.find(b => b.name === 'jaw');
    if (!head) return Promise.resolve();
    const tear = sc.add.graphics().setPosition(at.x, at.y).setDepth(23).setScale(0);
    const pts = Array.from({ length: 18 }, (_, k) => {
      const a = (k / 18) * Math.PI * 2, r = 1 + (k % 2 ? 0.14 : -0.06);
      return new Phaser.Math.Vector2(Math.cos(a) * 55 * r * s, Math.sin(a) * 100 * r * s);
    });
    tear.fillStyle(0x12021f, 0.95).fillPoints(pts, true).lineStyle(6 * s, 0xff6cf0, 1).strokePoints(pts, true)
      .lineStyle(14 * s, tint, 0.35).strokePoints(pts, true);
    const glow = sc.add.image(at.x, at.y, 'glow').setTint(tint).setBlendMode(Phaser.BlendModes.ADD).setDepth(22).setScale(0).setAlpha(0.8);
    const face = (targets[0]?.feet().x ?? at.x - 1) < at.x ? 1 : -1;
    const k = 0.8 * s;
    const box = sc.add.container(at.x, at.y).setDepth(24).setAlpha(0);
    const size = (m: number) => box.setScale(face * m * k, m * k);
    size(0.15);
    type Bone = { name: string; joint: [number, number]; origin: [number, number] };
    const img = (b: Bone) =>
      sc.add.image(b.joint[0] - head.joint[0], b.joint[1] - head.joint[1], rigTextureKey(id, b.name)).setOrigin(b.origin[0], b.origin[1]);
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
      const first = order[0]?.chest() ?? { x: at.x, y: at.y + 200 };
      aimAt(first);
      const out = { x: at.x - face * 12 * s, y: at.y + 10 * s };
      await tw({ targets: box, x: out.x, y: out.y, scaleX: face * k, scaleY: k, alpha: 1, duration: o.bite ? 650 : 1000, ease: 'Sine.easeOut' });
      if (jawImg) sc.tweens.add({ targets: jawImg, rotation: -0.55, duration: 450, ease: 'Sine.easeOut' });
      if (o.bite) {
        const t = order[0];
        await wait(350);
        const reach = Math.min(1, (70 * s) / Math.max(1, Math.hypot(first.x - out.x, first.y - out.y)));
        await tw({ targets: box, x: out.x + (first.x - out.x) * reach, y: out.y + (first.y - out.y) * reach, duration: 280, ease: 'Quad.easeIn' });
        if (jawImg) sc.tweens.add({ targets: jawImg, rotation: 0.05, duration: 120 });
        if (t) onHit(t);
        await wait(400);
        await tw({ targets: box, x: out.x, y: out.y, duration: 550, ease: 'Sine.easeOut' });
      } else {
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
      if (jawImg) sc.tweens.add({ targets: jawImg, rotation: 0, duration: 400 });
      await tw({ targets: box, x: at.x, y: at.y, scaleX: face * 0.15 * k, scaleY: 0.15 * k, alpha: 0, duration: 800, ease: 'Sine.easeIn' });
      box.destroy();
      await Promise.all([tw({ targets: tear, scale: 0, angle: 90, duration: 650, ease: 'Back.easeIn' }), tw({ targets: glow, scale: 0, duration: 650 })]);
      tear.destroy(); glow.destroy();
    })();
  }

  elementRain(targets: SkillActor[], onHit: (t: SkillActor) => void, o: ElementRainOpts) {
    const sc = this.scene, waves = o.waves ?? 3, per = o.perTarget ?? 3;
    const tex = o.shape === 'feather' ? 'rain_feather' : 'rain_shard';
    const wait = (ms: number) => new Promise<void>(res => sc.time.delayedCall(ms, res));
    const view = sc.cameras.main.worldView;
    const skyY = (t: SkillActor) => Math.max(view.y + 70, t.feet().y - 330);
    const glowAt = (x: number, y: number, tint: number, scale: number, alpha: number, depth = 22) =>
      sc.add.image(x, y, 'glow').setTint(tint).setBlendMode(Phaser.BlendModes.ADD).setDepth(depth).setScale(scale).setAlpha(alpha);
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
        const flash = glowAt(to.x, to.y - 10, o.core ?? 0xffffff, 0.4, 1, 24);
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
      await wait(500);
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

  gust(from: Spot, dir: 1 | -1, o: { reach?: number; scale?: number; tint?: number } = {}) {
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

  boneRain(at: Spot, o: { count?: number; scale?: number } = {}) {
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

  orb(from: Spot, to: Spot, o: { scale?: number; tint?: number; dur?: number } = {}) {
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

  waterSplash(at: Spot, o: { scale?: number; big?: boolean } = {}) {
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
}
