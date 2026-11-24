// Food balloon: drifts in over an island, drops a crate of food on a parachute onto the grass, floats
// away empty. Hungry dragons on that island walk to the food pile and eat (hunger up, a heart pops).
// Comes on its own every BALLOON.every seconds when a dragon there is hungry, or when called (HUD 🍖).
// Art: public/balloon/balloon_full.png, balloon_empty.png, crate.png (tools/slice_balloon.py);
// the pile and the heart are public/boat/food_7.png, food_8.png (tools/slice_boat.py).
import * as Phaser from 'phaser';
import { HUNGER } from '../config/economy';
import { assetUrl } from '../config/assets';
import type { Point } from '../config/world';
import type { Dragon } from './Dragon';
import type { Island } from './Island';
import type { IslandScene } from './IslandScene';

export const BALLOON = {
  every: 150,        // s between automatic visits to an island with a hungry dragon
  servings: 4,       // meals in one food pile
  width: 150,        // world px of the balloon
  hover: 260,        // world px above the feeding spot where it stops to drop the crate
  fly: 3.4,          // s to float in (and away)
  drop: 1.6,         // s the crate takes to parachute down
};
export const BALLOON_TEXTURES: [string, string][] = [
  ['balloon_full', assetUrl('balloon/balloon_full.png')], ['balloon_empty', assetUrl('balloon/balloon_empty.png')], ['crate', assetUrl('balloon/crate.png')],
  ['food_7', assetUrl('boat/food_7.png')], ['food_8', assetUrl('boat/food_8.png')],
];

interface Pile { img: Phaser.GameObjects.Image; at: Point; left: number; eaters: Set<Dragon> }

export class FoodBalloons {
  private piles = new Map<Island, Pile>();
  private busy = new Set<Island>();
  private timers = new Map<Island, number>();

  constructor(private scene: IslandScene, private islands: Island[], private dragonsOn: (isl: Island) => Dragon[]) {
    islands.forEach((isl, k) => this.timers.set(isl, 20 + k * 15));
  }

  /** Feeding spot: the lowest corner of the walk area, pulled toward the middle (grass by the shore). */
  private spot(isl: Island): Point {
    const pts = isl.def.walk.map(p => isl.toWorld(p));
    const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length, cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
    const low = pts.reduce((a, p) => (p[1] > a[1] ? p : a));
    for (const k of [0.25, 0.35, 0.45, 0.55]) {
      const p: Point = [low[0] + (cx - low[0]) * k, low[1] + (cy - low[1]) * k];
      if (isl.free(p[0], p[1], 30)) return p;
    }
    return [cx, cy];
  }

  /** Send the balloon to an island (no-op while it is already on its way or food is still there). */
  call(isl: Island) {
    if (this.busy.has(isl) || (this.piles.get(isl)?.left ?? 0) > 0) return;
    this.busy.add(isl);
    const sc = this.scene, at = this.spot(isl);
    const stop = { x: at[0], y: at[1] - BALLOON.hover };
    // above everything on the islands, below the day/night tint (900) and the rain (950)
    const balloon = sc.add.image(stop.x - 1100, stop.y - 160, 'balloon_full').setOrigin(0.5, 1).setDepth(40);
    balloon.setScale(BALLOON.width / balloon.width);
    const sway = sc.tweens.add({ targets: balloon, angle: { from: -3, to: 3 }, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    sc.tweens.add({
      targets: balloon, x: stop.x, y: stop.y, duration: BALLOON.fly * 1000, ease: 'Sine.easeOut',
      onComplete: () => {
        balloon.setTexture('balloon_empty');
        this.dropCrate(balloon, at, isl);
        sc.tweens.add({ targets: balloon, x: stop.x + 1100, y: stop.y - 420, delay: 500, duration: BALLOON.fly * 1000, ease: 'Sine.easeIn',
          onComplete: () => { sway.remove(); balloon.destroy(); this.busy.delete(isl); } });
      },
    });
  }

  /** The crate parachutes from under the basket down to the feeding spot; a puff of dust, then the pile. */
  private dropCrate(balloon: Phaser.GameObjects.Image, at: Point, isl: Island) {
    const sc = this.scene;
    const crate = sc.add.image(balloon.x, balloon.y - balloon.displayHeight * 0.08, 'crate').setOrigin(0.5, 0.95).setDepth(39).setScale(0.05);
    sc.tweens.add({ targets: crate, scale: 0.32, duration: 350, ease: 'Back.easeOut' });   // the chute opens
    const sway = sc.tweens.add({ targets: crate, angle: { from: -8, to: 8 }, duration: 520, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    sc.tweens.add({
      targets: crate, x: at[0], y: at[1] + isl.bob, duration: BALLOON.drop * 1000, ease: 'Sine.easeIn',
      onComplete: () => {
        sway.remove();
        this.dust(at[0], at[1] + isl.bob);
        sc.tweens.add({ targets: crate, scale: 0, alpha: 0, duration: 250, onComplete: () => crate.destroy() });
        this.makePile(isl, at);
      },
    });
  }

  private dust(x: number, y: number) {
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      const p = this.scene.add.image(x + Math.cos(a) * 12, y + Math.sin(a) * 4, 'puff').setTint(0xe6dcc0).setAlpha(0.7).setScale(0.6).setDepth(5 + y / 1000);
      this.scene.tweens.add({ targets: p, x: p.x + Math.cos(a) * 50, y: p.y + Math.sin(a) * 14 - 4, scale: 1.6, alpha: 0,
        duration: 600, ease: 'Sine.easeOut', onComplete: () => p.destroy() });
    }
  }

  private makePile(isl: Island, at: Point) {
    const old = this.piles.get(isl);
    old?.img.destroy();
    const img = this.scene.add.image(at[0], at[1], 'food_7').setOrigin(0.5, 0.8).setScale(0).setDepth(5 + at[1] / 1000);
    this.scene.tweens.add({ targets: img, scale: 0.42, duration: 300, ease: 'Back.easeOut' });
    this.piles.set(isl, { img, at, left: BALLOON.servings, eaters: new Set() });
  }

  update(dt: number) {
    for (const isl of this.islands) {
      const dragons = this.dragonsOn(isl);
      const hungry = dragons.filter(d => d.hunger < HUNGER.hungry);
      // automatic visits while someone is hungry
      let t = (this.timers.get(isl) ?? 0) - dt;
      if (t <= 0) { if (hungry.length) this.call(isl); t = BALLOON.every; }
      this.timers.set(isl, t);

      const pile = this.piles.get(isl);
      if (!pile || pile.left <= 0) continue;
      pile.img.setY(pile.at[1] + isl.bob);
      for (const d of hungry) {
        if (d.action === 'strike' || d.action === 'fly') continue;
        const dist = Math.hypot(d.x - pile.at[0], d.y - pile.at[1]);
        if (dist < 70) {
          if (d.action === 'walk') continue;
          this.eat(d, pile);
          if (pile.left <= 0) break;
        } else if (!pile.eaters.has(d) || d.action === 'idle') {
          pile.eaters.add(d);
          d.walkTo(pile.at[0] + (d.x < pile.at[0] ? -45 : 45), pile.at[1] + 6);
        }
      }
    }
  }

  private eat(d: Dragon, pile: Pile) {
    d.feed();
    pile.left--;
    pile.eaters.delete(d);
    const h = this.scene.add.image(d.x, d.head().y - 30, 'food_8').setDepth(31).setScale(0.18);
    this.scene.tweens.add({ targets: h, y: h.y - 60, alpha: 0, scale: 0.26, duration: 1100, ease: 'Sine.easeOut', onComplete: () => h.destroy() });
    if (pile.left <= 0) {
      this.scene.tweens.add({ targets: pile.img, scale: 0, alpha: 0, duration: 350, onComplete: () => pile.img.destroy() });
    } else {
      pile.img.setScale(0.42 * (0.6 + 0.4 * pile.left / BALLOON.servings));
    }
  }
}
