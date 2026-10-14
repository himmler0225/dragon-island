// One dragon on the island: where it is, what it is doing, and its rig.
// Movement rules (walk on grass, take off / cruise / land, wander) ported from legacy/index.html.
import * as Phaser from 'phaser';
import {
  DRAGON_SCALE, FLY_ALT, FLY_SPEED, LAND_S, TAKEOFF_S, bump, clamp01, smooth,
  type Point,
} from './constants';
import type { DragonAction } from './bridge';
import { COMBAT_HOVER, DragonRig, type RigData } from './rig';
import { skill, type SkillActor, type SkillDef, type SkillSlot } from './skills';
import { cloudKey, type SpeciesId } from './species';
import type { Island } from './Island';
import type { IslandScene } from './IslandScene';

/** Width of the riding cloud in body px (the dragon is ~340 long). */
const CLOUD_W = 470;

interface Flight { phase: 'takeoff' | 'cruise' | 'land'; t: number; target: Point; landAt?: number; from?: number }

export class Dragon implements SkillActor {
  x: number;
  y: number;
  dir: 1 | -1 = -1;           // art faces left
  action: DragonAction = 'idle';
  alt = 0;                    // height above the ground while flying
  private t = 0;              // seconds in the current action
  private target: Point | null = null;
  private waypoint: Point | null = null;
  private flight: Flight | null = null;
  private rest: number;       // idle seconds left before the next wander decision
  private sleepFor = 0;
  private nextStep = 0;
  private nextZ = 0;
  private turnT = 9;
  private pending: { slot: SkillSlot; targets: SkillActor[] }[] = [];   // queued strikes (combo)
  private strikeSeq = 0;
  private cancelAt = 0;
  private hover = 0;          // combat hover height (species in COMBAT_HOVER)
  private combatT = 0;        // seconds left in combat: hover-fighters stay up meanwhile

  readonly root: Phaser.GameObjects.Container;
  private readonly body: Phaser.GameObjects.Container;
  private readonly contact: Phaser.GameObjects.Ellipse;
  readonly ring: Phaser.GameObjects.Ellipse;   // selection marker
  readonly rig: DragonRig;
  private cloud: Phaser.GameObjects.Image | null = null;
  private puffT = 0;
  /** Current height above the ground (flight + combat hover + strike lift), body px. */
  height = 0;

  constructor(private scene: IslandScene, readonly island: Island, readonly id: SpeciesId, rigData: RigData, at: Point) {
    [this.x, this.y] = at;
    this.rest = Phaser.Math.FloatBetween(1, 5);
    this.root = scene.add.container(this.x, this.y);
    this.ring = scene.add.ellipse(0, 0, 190, 44).setStrokeStyle(4, 0xffd75e, 0.9).setVisible(false);
    this.contact = scene.add.ellipse(0, 0, 150, 30, 0x0b2a12, 0.3);
    this.body = scene.add.container(0, 0);
    this.root.add([this.ring, this.contact, this.body]);
    this.rig = new DragonRig(scene, rigData, this.body, id);
    if (rigData.motion?.rideCloud) {
      // the cloud it rides when flying: behind the rig, its flat top under the feet
      this.cloud = scene.add.image(-20, 4, cloudKey(id, 'main')).setOrigin(0.5, 0.52).setAlpha(0);
      this.cloud.setScale(CLOUD_W / this.cloud.width);
      this.body.addAt(this.cloud, 0);
    }
  }

  get scale() { return DRAGON_SCALE * this.island.depthScale(this.y); }

  // ---- commands -------------------------------------------------------------------------------

  play(action: Exclude<DragonAction, 'strike'>) {
    if (this.action === 'strike') return;
    if (action === 'fly') return this.flyTo(...this.farPoint());
    if (action === 'walk') return this.walkTo(...this.nearPoint());
    if (action === 'sleep') { this.sleepFor = Phaser.Math.FloatBetween(6, 15); this.nextZ = 1.2; }
    this.target = this.waypoint = null;
    this.setAction(action);
  }

  walkTo(x: number, y: number) {
    if (this.action === 'strike') return;
    if (!this.island.pathFree(this.x, this.y, x, y)) {
      // blocked by a building or the island's shape: go round via a free spot in between
      const via = this.island.detour([this.x, this.y], [x, y]);
      if (!via) return;
      this.waypoint = [x, y]; [x, y] = via;
    } else this.waypoint = null;
    this.target = [x, y];
    if (Math.abs(x - this.x) > 10) this.turn(Math.sign(x - this.x) as 1 | -1);
    if (this.action !== 'walk') this.setAction('walk');
  }

  flyTo(x: number, y: number) {
    if (this.action === 'strike') return;
    if (Math.abs(x - this.x) > 10) this.turn(Math.sign(x - this.x) as 1 | -1);
    if (this.action === 'fly' && this.flight) {   // already up: change course (or take off again)
      this.flight.target = [x, y];
      if (this.flight.phase === 'land') { this.flight.phase = 'cruise'; this.alt = Math.max(this.alt, 1); }
      return;
    }
    this.target = this.waypoint = null;
    this.flight = { phase: 'takeoff', t: 0, target: [x, y] };
    this.setAction('fly');
    this.scene.dustRing(this);
  }

  /** Play a skill: face the first target, run the pose, fire the effects when the blow lands. */
  useSkill(slot: SkillSlot, targets: SkillActor[]) {
    const def = skill(this.id, slot);
    if (!def.anim) return;
    // mid-strike: queue it; it starts as soon as the current blow has landed (see update)
    if (this.action === 'strike') { if (this.pending.length < 3) this.pending.push({ slot, targets }); return; }
    this.startStrike(def, targets);
  }

  private startStrike(def: SkillDef, targets: SkillActor[]) {
    this.target = this.waypoint = this.flight = null;
    this.alt = 0;
    if (COMBAT_HOVER[this.id]) this.combatT = 6;
    const first = targets.find(t => t !== this);
    if (first) {
      const dx = first.feet().x - this.x;
      if (Math.abs(dx) > 5) this.turn(Math.sign(dx) as 1 | -1);
    }
    this.setAction('strike');
    const { dur, hit } = this.rig.strike(def.anim!);
    const seq = ++this.strikeSeq;
    this.cancelAt = Math.min(dur, hit * dur + 0.15);   // a queued strike may cut the recovery from here
    this.scene.time.delayedCall(hit * dur * 1000, () => this.scene.runSkill(this, def, targets));
    this.scene.time.delayedCall(dur * 1000, () => {
      if (seq !== this.strikeSeq || this.action !== 'strike') return;   // chained into another strike
      this.setAction('idle');
      this.rest = Phaser.Math.FloatBetween(2, 5);
    });
  }

  // ---- SkillActor ------------------------------------------------------------------------------

  feet() { return { x: this.x, y: this.screenY }; }
  chest() { return { x: this.x, y: this.screenY - (this.alt + this.hover + this.rig.air + 60) * this.scale }; }
  head() { const p = this.rig.headWorld(); return { x: p.x, y: p.y - 10 }; }
  mouth() { const p = this.rig.mouthWorld(); return { x: p.x, y: p.y }; }
  get facing() { return this.dir; }
  hurt() {
    this.rig.hurt();
    if (this.action === 'sleep') this.play('idle');   // a hit wakes it up
  }
  text(text: string, color?: string) { this.scene.floatText(this.x, this.chest().y - 70 * this.scale, text, color); }

  /** Knocked back by dx (sliding, stops at the edge of walkable ground or a building). */
  push(dx: number) {
    if (this.action === 'walk') { this.target = this.waypoint = null; this.setAction('idle'); }
    let x = this.x;
    const step = Math.sign(dx) * 6;
    for (let moved = 0; Math.abs(moved) < Math.abs(dx); moved += step) {
      if (!this.island.free(x + step, this.y)) break;
      x += step;
    }
    this.scene.tweens.add({ targets: this, x, duration: 380, ease: 'Cubic.easeOut' });
    this.scene.footDust(this);
  }

  /** Y on screen (the island bobs on the swell). */
  private get screenY() { return this.y + this.island.bob; }

  // ---- per frame -------------------------------------------------------------------------------

  update(dt: number) {
    this.t += dt;
    if (this.action === 'walk' && this.target) {
      const dx = this.target[0] - this.x, dy = this.target[1] - this.y, dist = Math.hypot(dx, dy);
      const step = DragonRig.walkSpeed(DRAGON_SCALE) * this.island.depthScale(this.y) * dt;
      if (dist <= step) {
        this.target = null;
        if (this.waypoint) { const w = this.waypoint; this.waypoint = null; this.walkTo(...w); }
        else { this.setAction('idle'); this.rest = Phaser.Math.FloatBetween(2, 8); }
      } else {
        this.x += dx / dist * step; this.y += dy / dist * step;
        if (Math.abs(dx) > 30 && Math.sign(dx) !== this.dir) this.turn(Math.sign(dx) as 1 | -1);
        if ((this.nextStep -= dt) <= 0) { this.scene.footDust(this); this.nextStep = 0.3; }
      }
    }
    if (this.action === 'strike' && this.pending.length && this.t >= this.cancelAt) {
      const { slot, targets } = this.pending.shift()!;
      this.startStrike(skill(this.id, slot), targets);
    }
    this.updateFlight(dt);
    if (this.action === 'sleep' && this.rig.sleep > 0.9 && (this.nextZ -= dt) <= 0) {
      this.scene.sleepZ(this); this.nextZ = 1.4;
    }

    // hover-fighters take off when combat starts and land when it is over
    const wasUp = this.hover > 5;
    this.combatT = Math.max(0, this.combatT - dt);
    const goal = this.combatT > 0 ? COMBAT_HOVER[this.id] ?? 0 : 0;
    this.hover += Math.sign(goal - this.hover) * Math.min(Math.abs(goal - this.hover), dt * 160);
    if (wasUp && this.hover <= 5 && goal === 0) this.scene.dustRing(this);
    const up = this.hover > 5 && (this.action === 'strike' || this.action === 'idle');
    this.rig.update(dt, up ? 'fly' : this.action === 'strike' ? 'idle' : this.action);

    // body offset: height in flight, a crouch on take-off, a squash after turning round
    let sy = 1, sx = 1;
    if (this.flight?.phase === 'takeoff') sy *= 1 - 0.1 * bump(this.flight.t, 0, 0.3);
    if (this.turnT < 0.22) { this.turnT += dt; sx *= 0.7 + 0.3 * smooth(clamp01(this.turnT / 0.22)); }
    // strikes may lift the dragon too (Hắc Long attacks from the air)
    const height = this.alt + this.hover + this.rig.air;
    this.height = height;
    this.body.setPosition(0, -height).setScale(sx, sy);
    if (this.cloud) {
      // the cloud gathers under the feet on take-off, bobs gently, and sheds puffs behind while flying
      const ride = this.rig.fly;
      this.cloud.setAlpha(ride).setVisible(ride > 0.01).setY(4 + 3 * Math.sin(this.t * 2.2)).setScale((CLOUD_W / this.cloud.width) * (0.7 + 0.3 * ride));
      if (ride > 0.5 && height > 20 && (this.puffT -= dt) <= 0) { this.scene.cloudPuff(this); this.puffT = 0.28; }
    }

    const lift = height, fade = 1 - Math.min(0.75, lift / 150);
    this.contact.setScale(1 - lift / 250).setAlpha(fade);

    const s = this.scale, flip = this.dir > 0 ? -1 : 1;
    // on the ground: sorted with the buildings by y; in the air: above every building
    this.root.setPosition(this.x, this.screenY).setScale(flip * s, s).setDepth(5 + this.y / 1000 + (height > 20 ? 1 : 0));
  }

  /** Wander: after a random rest, walk / fly / nap. Returns quietly if busy. */
  think(dt: number) {
    if (this.action === 'sleep' && this.t > this.sleepFor) {
      this.setAction('idle'); this.rest = Phaser.Math.FloatBetween(3, 6); return;
    }
    if (this.action !== 'idle' || this.combatT > 0 || this.hover > 0) return;   // stays put in combat
    if ((this.rest -= dt) > 0) return;
    const r = Math.random();
    if (r < 0.55) this.walkTo(...this.nearPoint());
    else if (r < 0.8) this.flyTo(...this.farPoint());
    else this.play('sleep');
    this.rest = Phaser.Math.FloatBetween(2, 8);
  }

  hit(x: number, y: number) { return this.rig.hit(x, y, this.scene); }

  /** Somewhere to stroll to (reachable on foot). */
  private nearPoint() { return this.island.randomPoint([this.x, this.y], 120, true); }
  /** Somewhere far on the same island, worth flying to (may cross water or buildings). */
  private farPoint() { return this.island.randomPoint([this.x, this.y], 260, false); }

  private setAction(a: DragonAction) {
    if (a !== 'fly') this.flight = null;
    this.action = a;
    this.t = 0;
    this.scene.onAction(this);
  }

  private turn(dir: 1 | -1) {
    if (dir === this.dir) return;
    this.dir = dir;
    this.turnT = 0;
  }

  // take off -> cruise to the target -> land; the height is drawn as a body offset so the
  // contact shadow stays on the ground (and shrinks) while the dragon is up
  private updateFlight(dt: number) {
    const F = this.flight;
    if (!F || this.action !== 'fly') {
      this.alt = Math.max(0, this.alt - 260 * dt);
      return;
    }
    F.t += dt;
    if (F.phase === 'takeoff') {
      this.alt = FLY_ALT * smooth(clamp01((F.t - 0.15) / (TAKEOFF_S - 0.15)));
      if (F.t >= TAKEOFF_S) F.phase = 'cruise';
    }
    if (F.phase !== 'land' && F.t > 0.35) {
      const dx = F.target[0] - this.x, dy = F.target[1] - this.y, dist = Math.hypot(dx, dy);
      const step = FLY_SPEED * this.island.depthScale(this.y) * dt;
      if (dist <= step) {
        [this.x, this.y] = F.target; F.phase = 'land'; F.landAt = F.t; F.from = this.alt;
      } else {
        this.x += dx / dist * step; this.y += dy / dist * step;
        if (Math.abs(dx) > 30 && Math.sign(dx) !== this.dir) this.turn(Math.sign(dx) as 1 | -1);
      }
    }
    if (F.phase === 'land') {
      const u = clamp01((F.t - F.landAt!) / LAND_S);
      this.alt = F.from! * (1 - smooth(u));
      if (u >= 1) {
        this.alt = 0;
        this.scene.dustRing(this);
        this.setAction('idle');
        this.rest = Phaser.Math.FloatBetween(2, 8);
      }
    }
  }
}
