// Food boat: sails in to an island, throws food onto the grass near the shore, sails away empty.
// Hungry dragons on that island walk to the food pile and eat (hunger up, a heart pops).
// Comes on its own every BOAT.every seconds when a dragon there is hungry, or when called (HUD 🍖).
// Art: public/boat/boat_full.png, boat_empty.png, food_1..8.png (tools/slice_boat.py).
import * as Phaser from 'phaser';
import { HUNGER } from '../config/economy';
import type { Point } from '../config/world';
import type { Dragon } from './Dragon';
import type { Island } from './Island';
import type { IslandScene } from './IslandScene';

export const BOAT = {
  every: 150,        // s between automatic visits to an island with a hungry dragon
  servings: 4,       // meals in one food pile
  width: 240,        // world px of the boat
  sail: 3.2,         // s to sail in (and out)
};
export const BOAT_TEXTURES = ['boat_full', 'boat_empty', ...Array.from({ length: 8 }, (_, k) => `food_${k + 1}`)];
const FOOD = ['food_1', 'food_2', 'food_3'];   // ham, fish, apple thrown from the boat

interface Pile { img: Phaser.GameObjects.Image; at: Point; left: number; eaters: Set<Dragon> }

export class FoodBoats {
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

  /** Send the boat to an island (no-op while it is already on its way or food is still there). */
  call(isl: Island) {
    if (this.busy.has(isl) || (this.piles.get(isl)?.left ?? 0) > 0) return;
    this.busy.add(isl);
    const sc = this.scene, at = this.spot(isl);
    const dock = { x: at[0] - 40, y: at[1] + 130 };   // on the water just below the feeding spot (clear of the bottom HUD)
    const boat = sc.add.image(dock.x - 900, dock.y, 'boat_full').setOrigin(0.5, 0.85).setDepth(4.5);
    boat.setScale(BOAT.width / boat.width).setFlipX(true);   // art sails left; it comes in from the left
    const bob = sc.tweens.add({ targets: boat, angle: { from: -2, to: 2 }, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    sc.tweens.add({
      targets: boat, x: dock.x, duration: BOAT.sail * 1000, ease: 'Sine.easeOut',
      onComplete: () => {
        this.splash(dock.x - 60, dock.y + 6);
        this.throwFood(boat, at, () => {
          boat.setTexture('boat_empty');
          sc.tweens.add({ targets: boat, x: dock.x + 900, delay: 400, duration: BOAT.sail * 1000, ease: 'Sine.easeIn',
            onComplete: () => { bob.remove(); boat.destroy(); this.busy.delete(isl); } });
        }, isl);
      },
    });
  }

  private splash(x: number, y: number) {
    const s = this.scene.add.image(x, y, 'food_6').setOrigin(0.5, 0.9).setDepth(4.6).setScale(0.1);
    this.scene.tweens.add({ targets: s, scale: 0.45, alpha: { from: 1, to: 0 }, duration: 700, ease: 'Quad.easeOut', onComplete: () => s.destroy() });
  }

  /** Food flies in arcs from the deck onto the grass, then the pile appears there. */
  private throwFood(boat: Phaser.GameObjects.Image, at: Point, done: () => void, isl: Island) {
    const sc = this.scene, from = { x: boat.x, y: boat.y - boat.displayHeight * 0.45 };
    const n = 5;
    for (let k = 0; k < n; k++) {
      const img = sc.add.image(from.x, from.y, FOOD[k % FOOD.length]).setDepth(30).setScale(0.22).setAngle(Phaser.Math.Between(-30, 30));
      const tx = at[0] + Phaser.Math.Between(-30, 30), ty = at[1] + Phaser.Math.Between(-12, 12);
      const p = { u: 0 };
      sc.tweens.add({
        targets: p, u: 1, delay: k * 220, duration: 650, ease: 'Linear',
        onUpdate: () => {
          img.setPosition(from.x + (tx - from.x) * p.u, from.y + (ty - from.y) * p.u - Math.sin(Math.PI * p.u) * 160);
          img.angle += 9;
        },
        onComplete: () => {
          img.destroy();
          if (k === n - 1) { this.makePile(isl, at); done(); }
        },
      });
    }
  }

  private makePile(isl: Island, at: Point) {
    const old = this.piles.get(isl);
    old?.img.destroy();
    const img = this.scene.add.image(at[0], at[1], 'food_7').setOrigin(0.5, 0.8).setScale(0).setDepth(5 + at[1] / 1000);
    this.scene.tweens.add({ targets: img, scale: 0.42, duration: 300, ease: 'Back.easeOut' });
    this.piles.set(isl, { img, at, left: BOAT.servings, eaters: new Set() });
  }

  update(dt: number) {
    for (const isl of this.islands) {
      const dragons = this.dragonsOn(isl);
      const hungry = dragons.filter(d => d.hunger < HUNGER.hungry);
      // automatic visits while someone is hungry
      let t = (this.timers.get(isl) ?? 0) - dt;
      if (t <= 0) { if (hungry.length) this.call(isl); t = BOAT.every; }
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
        } else if (!pile.eaters.has(d) || d.action === 'idle' || d.action === 'sleep') {
          pile.eaters.add(d);
          if (d.action === 'sleep') d.play('idle');
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
      pile.img.setScale(0.42 * (0.6 + 0.4 * pile.left / BOAT.servings));
    }
  }
}
