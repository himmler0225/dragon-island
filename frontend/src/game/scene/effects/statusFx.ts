// The look of status effects on a dragon (art: assets/status/<kind>_<n>.png, tools/slice_status.py).
// Layers follow the dragon every frame until the status ends; an icon sits over its head.
//   freeze: ice shell over the body, frost on the ground, snowflakes; shatters when it ends
//   burn:   flames on the body, rising embers and smoke, a fiery puff on every tick
//   curse:  skull sigil over the head, rune ring round the body, hex on the ground, violet drips
//   stun:   a burst of stars and a ring cracking the ground, then stars circling its head (status/stun_*, tools/slice_stun.py)
import * as Phaser from 'phaser';
import { assetUrl } from '../../config/assets';
import type { Spot } from '../../skills/types';
import { STATUS, STATUS_KINDS, type StatusKind } from '../../skills/status';
import type { CombatFx } from './combatFx';

export const statusKey = (kind: StatusKind, n: number) => `status_${kind}_${n}`;

export function loadStatusTextures(load: Phaser.Loader.LoaderPlugin) {
  for (const kind of STATUS_KINDS) for (let n = 1; n <= 8; n++) load.image(statusKey(kind, n), assetUrl(`status/${kind}_${n}.png`));
  // stun: its circling stars are stun_1..8 (frames of a loop); a burst, a ground ring and its icon besides
  for (let n = 1; n <= 8; n++) for (const p of ['b', 'g']) load.image(`status_stun_${p}${n}`, assetUrl(`status/stun_${p}${n}.png`));
  load.image('status_stun_icon', assetUrl('status/stun_icon.png'));
}
const STUN_FRAMES = Array.from({ length: 8 }, (_, k) => statusKey('stun', k + 1));

/** What a status needs from the dragon it sits on. */
export interface StatusHost {
  chest(): Spot;
  feet(): Spot;
  head(): Spot;
  /** gone (dead / removed): the status ends at once */
  gone?(): boolean;
}

interface Layer { img: Phaser.GameObjects.Image; at: (h: StatusHost, t: number) => Spot; pulse?: (t: number) => number; sx: number; sy: number;
  /** an animated layer: its frames, played in a loop */
  frames?: string[] }
interface Active { kind: StatusKind; host: StatusHost; left: number; t: number; tickT: number; puffT: number; layers: Layer[]; onTick?: () => void }

export class StatusFx {
  private on = new Map<object, Map<StatusKind, Active>>();

  constructor(private scene: Phaser.Scene, private combat: CombatFx) {
    scene.events.on(Phaser.Scenes.Events.UPDATE, (_: number, ms: number) => this.update(ms));
  }

  has(key: object, kind: StatusKind) { return this.on.get(key)?.has(kind) ?? false; }

  /** Put `kind` on the dragon `key` (refreshes the time if it already has it). `onTick` runs every
   *  second while it lasts (damage over time is the caller's rule). */
  apply(key: object, host: StatusHost, kind: StatusKind, onTick?: () => void) {
    const map = this.on.get(key) ?? new Map<StatusKind, Active>();
    this.on.set(key, map);
    const now = map.get(kind);
    if (now) { now.left = STATUS[kind].ms; now.onTick = onTick; return; }
    this.flash(kind, host);
    map.set(kind, { kind, host, left: STATUS[kind].ms, t: 0, tickT: 1000, puffT: 0, layers: this.layers(kind), onTick });
  }

  private img(kind: StatusKind, n: number | string, scale: number, depth: number) {
    const c = this.combat;
    return this.scene.add.image(0, 0, typeof n === 'string' ? n : statusKey(kind, n)).setBlendMode(c.blend).setAlpha(0).setDepth(depth)
      .setScale(scale * c.size);
  }

  private layers(kind: StatusKind): Layer[] {
    const L: Layer[] = [];
    const add = (n: number | string, scale: number, at: Layer['at'], o: { ground?: boolean; depth?: number; origin?: [number, number]; pulse?: Layer['pulse']; frames?: string[] } = {}) => {
      const img = this.img(kind, n, scale, o.depth ?? (o.ground ? 4 : 19));
      if (o.origin) img.setOrigin(...o.origin);
      if (o.ground) img.setScale(img.scaleX, img.scaleY * 0.45);
      L.push({ img, at, pulse: o.pulse, sx: img.scaleX, sy: img.scaleY, frames: o.frames });
    };
    const chest = (h: StatusHost) => h.chest(), feet = (h: StatusHost) => h.feet();
    if (kind === 'freeze') {
      add(2, 0.42, feet, { ground: true });
      add(1, 0.5, h => ({ x: h.chest().x, y: h.chest().y + 26 }), { origin: [0.5, 0.75] });   // dome over the body
    } else if (kind === 'burn') {
      add(1, 0.34, h => ({ x: h.chest().x, y: h.chest().y + 40 }), { origin: [0.5, 0.95], pulse: t => 1 + 0.08 * Math.sin(t * 13) });
    } else if (kind === 'stun') {
      add(1, 0.32, h => ({ x: h.head().x, y: h.head().y - 18 }), { frames: STUN_FRAMES, depth: 21 });   // stars circling the head
    } else {
      add(6, 0.42, feet, { ground: true, pulse: t => 1 + 0.04 * Math.sin(t * 3) });
      add(2, 0.36, chest, { pulse: t => 1 + 0.06 * Math.sin(t * 4) });
      add(1, 0.15, h => ({ x: h.head().x, y: h.head().y - 34 + 4 * Math.sin(this.scene.time.now / 300) }));
    }
    // the icon: over the head, one slot per status the dragon has
    add(kind === 'stun' ? 'status_stun_icon' : 7, kind === 'stun' ? 0.16 : 0.075,
      h => ({ x: h.head().x + (STATUS_KINDS.indexOf(kind) - 1.5) * 26, y: h.head().y - 70 }), { depth: 4100 });
    for (const l of L) this.scene.tweens.add({ targets: l.img, alpha: this.combat.intensity, duration: 220 });
    return L;
  }

  /** One-off effect (not following). */
  private once(kind: StatusKind, n: number, at: Spot, scale: number, dur: number, o: { rise?: number; depth?: number } = {}) {
    const img = this.img(kind, n, scale, o.depth ?? 20).setPosition(at.x, at.y);
    this.scene.tweens.add({ targets: img, alpha: this.combat.intensity, duration: dur * 0.25, yoyo: true, hold: dur * 0.3,
      onComplete: () => img.destroy() });
    if (o.rise) this.scene.tweens.add({ targets: img, y: at.y - o.rise, duration: dur * 1.8 });
  }

  private flash(kind: StatusKind, h: StatusHost) {
    if (kind !== 'stun') { this.once(kind, 8, h.chest(), 0.3, 420); return; }
    // stunned: a burst of stars at the head, a ring cracking the ground under it
    const frames = (p: string) => Array.from({ length: 8 }, (_, k) => `status_stun_${p}${k + 1}`);
    void this.combat.anim(frames('b'), { x: h.head().x, y: h.head().y - 10 }, { scale: 0.5, fps: 16 });
    void this.combat.anim(frames('g'), h.feet(), { scale: 0.6, fps: 14, anchor: 'bottom', ground: true });
  }

  private update(ms: number) {
    for (const [key, map] of this.on) {
      for (const a of map.values()) {
        const h = a.host;
        a.t += ms / 1000;
        a.left -= ms;
        if (h.gone?.() || a.left <= 0) {
          if (!h.gone?.() && a.kind === 'freeze') this.once('freeze', 3, h.chest(), 0.32, 500);   // the ice shatters
          for (const l of a.layers) this.scene.tweens.add({ targets: l.img, alpha: 0, duration: 250, onComplete: () => l.img.destroy() });
          map.delete(a.kind);
          continue;
        }
        for (const l of a.layers) {
          const p = l.at(h, a.t);
          l.img.setPosition(p.x, p.y);
          if (l.pulse) { const k = l.pulse(a.t); l.img.setScale(l.sx * k, l.sy * k); }
          if (l.frames) l.img.setTexture(l.frames[Math.floor(a.t * 12) % l.frames.length]);
        }
        // drifting bits
        if ((a.puffT -= ms) <= 0) {
          const c = h.chest(), jitter = () => Phaser.Math.Between(-30, 30);
          if (a.kind === 'freeze') { this.once('freeze', 4, { x: c.x + jitter(), y: c.y - 20 }, 0.14, 900, { rise: -20 }); a.puffT = 700; }
          if (a.kind === 'burn') {
            this.once('burn', 3, { x: c.x + jitter(), y: c.y - 10 }, 0.16, 900, { rise: 50 });
            if (Math.random() < 0.5) this.once('burn', 4, { x: c.x + jitter(), y: c.y - 40 }, 0.16, 1100, { rise: 60 });
            a.puffT = 450;
          }
          if (a.kind === 'curse') { this.once('curse', 5, { x: c.x + jitter(), y: c.y + 10 }, 0.14, 900, { rise: -24 }); a.puffT = 650; }
        }
        if ((a.tickT -= ms) <= 0) {
          a.tickT += 1000;
          if (a.kind === 'burn') this.once('burn', 5, h.chest(), 0.16, 380);
          if (a.kind === 'curse') this.once('curse', 3, h.chest(), 0.2, 600, { rise: 30 });
          a.onTick?.();
        }
      }
      if (!map.size) this.on.delete(key);
    }
  }
}
