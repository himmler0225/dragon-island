// Dragon on the island: position, action, rig, hunger and AI.
// Movement: walk on grass, take off / cruise / land, wander.
import * as Phaser from 'phaser';
import type { Point } from '../config/world';
import { gameEvents, type DragonAction } from '../bridge';
import { COMBAT_HOVER, DragonRig, type RigData, type StrikeKind } from '../rig';
import { skill, type SkillActor, type SkillDef, type SkillSlot } from '../skills';
import type { SpeciesId } from '../config/species';
import type { Island } from './Island';
import type { IslandScene } from './IslandScene';
import { DRAGON_SCALE, HUNGER, WALK_SPEED } from '../config/economy';
import { bump, clamp01, smooth } from '../config/world';
import type { DragonFlight } from './Dragon.flight';
import { advanceFlight } from './Dragon.flight';

/** Knock-back (push): base skid time (ms, plus ~1.2 ms per px), hop (body px), rear-back tilt (rad). */
const KNOCK = { dur: 260, hop: 22, tilt: 0.16 };
/** On-screen size of the hunger art (images ~180 px): thought bubble, growl swirl, drool drop. */
const HUNGER_FX = { bubble: 0.3, growl: 0.22, drool: 0.14 };

type Flight = DragonFlight;

export class Dragon implements SkillActor {
  x: number;
  y: number;
  dir: 1 | -1 = -1;           // art faces left
  action: DragonAction = 'idle';
  alt = 0;
  private t = 0;
  private target: Point | null = null;
  private waypoint: Point | null = null;
  private flight: Flight | null = null;
  private rest: number;
  private nextStep = 0;
  private turnT = 9;
  private pending: { slot: SkillSlot; targets: SkillActor[] }[] = [];
  private strikeSeq = 0;
  private cancelAt = 0;
  private hover = 0;
  private knock = { hop: 0, tilt: 0 };   // knock-back: hop height (body px) and backward tilt (rad)
  private combatT = 0;
  /** 0 starving .. 100 full (HUNGER); random start so they don't all get hungry at once */
  hunger = Phaser.Math.Between(45, 100);
  private bubble: Phaser.GameObjects.Image | null = null;
  private nextGrowl = 2;   // s to the next stomach growl (hungry) or drool drop (starving)

  readonly root: Phaser.GameObjects.Container;
  private readonly body: Phaser.GameObjects.Container;
  private readonly contact: Phaser.GameObjects.Ellipse;
  readonly ring: Phaser.GameObjects.Ellipse;
  readonly rig: DragonRig;
  private readonly rideCloud: boolean;
  private seenStomps = 0;
  private puffT = 0;
  height = 0;

  constructor(private scene: IslandScene, readonly island: Island, readonly id: SpeciesId, private rigData: RigData, at: Point) {
    [this.x, this.y] = at;
    this.rest = Phaser.Math.FloatBetween(1, 5);
    this.root = scene.add.container(this.x, this.y);
    this.ring = scene.add.ellipse(0, 0, 190, 44).setStrokeStyle(4, 0xffd75e, 0.9).setVisible(false);
    this.contact = scene.add.ellipse(0, 0, 150, 30, 0x0b2a12, 0.3);
    this.body = scene.add.container(0, 0);
    this.root.add([this.ring, this.contact, this.body]);
    this.rig = new DragonRig(scene, rigData, this.body, id);
    this.rideCloud = !!rigData.motion?.rideCloud;
  }

  get scale() { return DRAGON_SCALE * this.island.depthScale(this.y); }

  // ---- commands -------------------------------------------------------------------------------

  play(action: Exclude<DragonAction, 'strike'>) {
    if (this.action === 'strike') return;
    if (action === 'fly') return this.flyTo(...this.farPoint());
    if (action === 'walk') return this.rigData.motion?.alwaysFly ? this.flyTo(...this.nearPoint()) : this.walkTo(...this.nearPoint());
    this.target = this.waypoint = null;
    this.setAction(action);
  }

  walkTo(x: number, y: number): void {
    if (this.rigData.motion?.alwaysFly) return this.flyTo(x, y);   // never on foot (a tap on the ground, the food pile): it flies there
    if (this.action === 'strike') return;
    const ok = this.island.closestFree([x, y]);   // never stop on a building
    if (!ok) return;
    [x, y] = ok;
    if (!this.island.pathFree(this.x, this.y, x, y)) {
      const via = this.island.detour([this.x, this.y], [x, y]);
      if (!via) return;
      this.waypoint = [x, y]; [x, y] = via;
    } else this.waypoint = null;
    this.target = [x, y];
    if (Math.abs(x - this.x) > 10) this.turn(Math.sign(x - this.x) as 1 | -1);
    if (this.action !== 'walk') this.setAction('walk');
  }

  flyTo(x: number, y: number): void {
    if (this.action === 'strike') return;
    if (this.rigData.motion?.noFly) return this.walkTo(x, y);
    if (Math.abs(x - this.x) > 10) this.turn(Math.sign(x - this.x) as 1 | -1);
    if (this.action === 'fly' && this.flight) {
      this.flight.target = [x, y];
      if (this.flight.phase === 'land') { this.flight.phase = 'cruise'; this.alt = Math.max(this.alt, 1); }
      return;
    }
    this.target = this.waypoint = null;
    this.flight = { phase: 'takeoff', t: 0, target: [x, y] };
    this.setAction('fly');
    this.scene.ambient.dustRing(this);
  }

  useSkill(slot: SkillSlot, targets: SkillActor[]) {
    const def = skill(this.id, slot);
    if (!def.anim) return;
    if (this.action === 'strike') { if (this.pending.length < 3) this.pending.push({ slot, targets }); return; }
    this.startStrike(def, targets);
  }

  /** Play a combo pose (Hợp Kích) with a partner; `onHit` runs when this dragon's blow lands.
   *  Returns false when the dragon is already striking. */
  comboStrike(anim: StrikeKind, face: SkillActor | undefined, onHit?: () => void) {
    if (this.action === 'strike') return false;
    this.startStrike({ type: 'ultimate', name: '', desc: '', anim }, face ? [face] : [], onHit ?? (() => {}));
    return true;
  }

  private startStrike(def: SkillDef, targets: SkillActor[], onHit?: () => void) {
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
    this.cancelAt = Math.min(dur, hit * dur + 0.15);
    this.scene.time.delayedCall(hit * dur * 1000, () => (onHit ? onHit() : this.scene.runSkill(this, def, targets)));
    this.scene.time.delayedCall(dur * 1000, () => {
      if (seq !== this.strikeSeq || this.action !== 'strike') return;
      this.setAction('idle');
      this.rest = Phaser.Math.FloatBetween(2, 5);
    });
  }

  // ---- SkillActor ------------------------------------------------------------------------------

  feet() { return { x: this.x, y: this.screenY }; }
  chest() { return { x: this.x, y: this.screenY - (this.alt + this.hover + this.rig.air + 60) * this.scale }; }
  head() { const p = this.rig.headWorld(); return { x: p.x, y: p.y - 10 }; }
  mouth() { const p = this.rig.mouthWorld(); return { x: p.x, y: p.y }; }
  eye() { const p = this.rig.eyeWorld(); return { x: p.x, y: p.y }; }
  point(bone: string, fx: number, fy: number) { const p = this.rig.boneWorld(bone, fx, fy); return { x: p.x, y: p.y }; }
  get facing() { return this.dir; }
  hurt() {
    this.rig.hurt();
  }
  text(text: string, color?: string) { this.scene.combat.floatText(this.x, this.chest().y - 70 * this.scale, text, color); }

  push(dx: number) {
    if (this.action === 'walk') { this.target = this.waypoint = null; this.setAction('idle'); }
    let x = this.x;
    const step = Math.sign(dx) * 6;
    for (let moved = 0; Math.abs(moved) < Math.abs(dx); moved += step) {
      if (!this.island.free(x + step, this.y)) break;
      x += step;
    }
    // thrown back: a little hop and a rear-back tilt while it skids, dust trailing under the feet
    const dur = KNOCK.dur + Math.abs(x - this.x) * 1.2;
    this.scene.tweens.add({ targets: this, x, duration: dur, ease: 'Expo.easeOut' });
    this.scene.tweens.add({ targets: this.knock, hop: KNOCK.hop, duration: dur * 0.3, yoyo: true, ease: 'Quad.easeOut' });
    this.scene.tweens.add({ targets: this.knock, tilt: KNOCK.tilt, duration: dur * 0.25, yoyo: true, hold: dur * 0.2, ease: 'Sine.easeOut' });
    const trail = this.scene.time.addEvent({ delay: 70, repeat: Math.floor(dur / 70) - 2, callback: () => this.scene.ambient.footDust(this) });
    this.scene.time.delayedCall(dur * 0.6, () => { trail.remove(); this.scene.ambient.dustRing(this); });
  }

  private get screenY() { return this.y + this.island.bob; }

  // ---- per frame -------------------------------------------------------------------------------

  update(dt: number) {
    this.t += dt;
    this.updateHunger(dt);
    if (this.action === 'walk' && this.target) {
      const dx = this.target[0] - this.x, dy = this.target[1] - this.y, dist = Math.hypot(dx, dy);
      const slow = this.hunger < HUNGER.hungry ? 0.6 : 1;   // hungry: drags its feet
      const step = WALK_SPEED * this.island.depthScale(this.y) * dt * slow;
      // every species walks at WALK_SPEED: its steps are timed to it so the feet stay planted
      this.rig.gaitRate = WALK_SPEED * slow / this.rig.walkSpeed(DRAGON_SCALE);
      if (dist <= step) {
        this.target = null;
        if (this.waypoint) { const w = this.waypoint; this.waypoint = null; this.walkTo(...w); }
        else { this.setAction('idle'); this.rest = Phaser.Math.FloatBetween(2, 8); }
      } else {
        this.x += dx / dist * step; this.y += dy / dist * step;
        if (Math.abs(dx) > 30 && Math.sign(dx) !== this.dir) this.turn(Math.sign(dx) as 1 | -1);
        if ((this.nextStep -= dt) <= 0) {
          this.scene.ambient.footDust(this);
          this.nextStep = 0.3;
        }
      }
    }
    if (this.action === 'strike' && this.pending.length && this.t >= this.cancelAt) {
      const { slot, targets } = this.pending.shift()!;
      this.startStrike(skill(this.id, slot), targets);
    }
    this.updateFlight(dt);

    const wasUp = this.hover > 5;
    this.combatT = Math.max(0, this.combatT - dt);
    const rest = this.action === 'idle' ? this.rigData.motion?.idleHover ?? 0 : 0;   // rests in the air
    const goal = this.combatT > 0 ? COMBAT_HOVER[this.id] ?? rest : rest;
    this.hover += Math.sign(goal - this.hover) * Math.min(Math.abs(goal - this.hover), dt * 160);
    if (wasUp && this.hover <= 5 && goal === 0) this.scene.ambient.dustRing(this);
    const up = this.hover > 5 && (this.action === 'strike' || this.action === 'idle');
    this.rig.update(dt, up ? 'fly' : this.action === 'strike' ? 'idle' : this.action);

    let sy = 1, sx = 1;
    if (this.flight?.phase === 'takeoff') sy *= 1 - 0.1 * bump(this.flight.t, 0, 0.3);
    if (this.turnT < 0.22) { this.turnT += dt; sx *= 0.7 + 0.3 * smooth(clamp01(this.turnT / 0.22)); }
    const height = this.alt + this.hover + this.rig.air + this.knock.hop;
    this.height = height;
    this.body.setPosition(0, -height).setScale(sx, sy).setRotation(this.knock.tilt);
    if (this.rideCloud && this.rig.fly > 0.5 && height > 20 && (this.puffT -= dt) <= 0) { this.scene.ambient.cloudPuff(this); this.puffT = 0.28; }
    if (this.rig.stomps !== this.seenStomps) {   // a front paw landed: a puff off the cloud (or dust on the ground)
      this.seenStomps = this.rig.stomps;
      if (this.rideCloud && this.rig.fly > 0.5) this.scene.ambient.cloudPuff(this); else this.scene.ambient.footDust(this);
    }

    const fade = 1 - Math.min(0.75, height / 150);
    this.contact.setScale(1 - height / 250).setAlpha(fade);

    const s = this.scale, flip = this.dir > 0 ? -1 : 1;
    this.root.setPosition(this.x, this.screenY).setScale(flip * s, s).setDepth(5 + this.y / 1000 + (height > 20 ? 1 : 0));
  }

  /** Hunger falls over time. Hungry: a thought bubble with a ham over the head and now and then a
   *  growl swirl off the belly. Starving: the bubble turns red with an empty bowl and it drools.
   *  Art: public/balloon/hunger_1..4.png (tools/slice_balloon.py). */
  private updateHunger(dt: number) {
    const was = this.hungerLevel;
    this.hunger = Math.max(0, this.hunger - (HUNGER.perMinute / 60) * dt);
    const level = this.hungerLevel;
    if (level !== was) gameEvents.emit('hunger', { id: this.id, hunger: this.hunger, level });
    if (level === 'full') {
      if (this.bubble) { this.bubble.destroy(); this.bubble = null; }
      return;
    }
    const key = level === 'starving' ? 'hunger_2' : 'hunger_1';
    if (!this.bubble) {
      this.bubble = this.scene.add.image(0, 0, key).setOrigin(0.4, 1).setDepth(30).setScale(0);
      this.scene.tweens.add({ targets: this.bubble, scale: HUNGER_FX.bubble, duration: 300, ease: 'Back.easeOut',
        onComplete: () => this.bubble && this.scene.tweens.add({ targets: this.bubble, scale: HUNGER_FX.bubble * 1.08,
          duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }) });
    } else if (this.bubble.texture.key !== key) {
      this.bubble.setTexture(key);
    }
    this.bubble.setPosition(this.x + 18 * this.dir * -1, this.head().y - 40 * this.scale);
    if (this.height > 20 || (this.nextGrowl -= dt) > 0) return;
    this.nextGrowl = Phaser.Math.FloatBetween(2.5, 4.5);
    if (level === 'starving') this.drool(); else this.growl();
  }

  /** A growl swirl rises off the belly and fades. */
  private growl() {
    const c = this.chest();
    const g = this.scene.add.image(c.x - 30 * this.dir * this.scale, c.y + 50 * this.scale, 'hunger_4')
      .setScale(0).setDepth(this.root.depth + 0.01).setFlipX(this.dir > 0);
    this.scene.tweens.add({ targets: g, scale: HUNGER_FX.growl, y: g.y - 30, duration: 450, ease: 'Back.easeOut' });
    this.scene.tweens.add({ targets: g, alpha: 0, delay: 700, duration: 500, onComplete: () => g.destroy() });
  }

  /** A drop of drool falls from the mouth. */
  private drool() {
    const m = this.mouth();
    const d = this.scene.add.image(m.x, m.y + 4, 'hunger_3').setOrigin(0.5, 0).setScale(HUNGER_FX.drool * 0.4, 0).setDepth(this.root.depth + 0.01);
    this.scene.tweens.add({ targets: d, scaleY: HUNGER_FX.drool, scaleX: HUNGER_FX.drool, duration: 500, ease: 'Sine.easeOut' });
    this.scene.tweens.add({ targets: d, y: this.feet().y - 4, alpha: 0, delay: 650, duration: 450, ease: 'Quad.easeIn', onComplete: () => d.destroy() });
  }

  get hungerLevel(): 'full' | 'hungry' | 'starving' {
    return this.hunger <= HUNGER.starving ? 'starving' : this.hunger < HUNGER.hungry ? 'hungry' : 'full';
  }

  /** Eat a meal: hunger goes up, a little heart pops. */
  feed(amount = HUNGER.meal) {
    this.hunger = Math.min(HUNGER.full, this.hunger + amount);
    this.text('+' + Math.round(amount) + ' 🍖', '#ffd27a');
    gameEvents.emit('hunger', { id: this.id, hunger: this.hunger, level: this.hungerLevel });
  }

  think(dt: number) {
    if (this.action !== 'idle' || this.combatT > 0 || (this.hover > 0 && !this.rigData.motion?.idleHover)) return;
    if ((this.rest -= dt) > 0) return;
    if (this.hunger <= HUNGER.starving) { this.rest = 8; return; }   // too weak to wander: it stays put
    const r = Math.random();
    if (r < 0.7 && !this.rigData.motion?.alwaysFly) this.walkTo(...this.nearPoint());   // (alwaysFly: never walks)
    else this.flyTo(...this.farPoint());
    this.rest = Phaser.Math.FloatBetween(2, 8);
  }

  hit(x: number, y: number) { return this.rig.hit(x, y, this.scene); }

  private nearPoint() { return this.island.randomPoint([this.x, this.y], 120, true); }
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

  private updateFlight(dt: number) {
    const { alt } = advanceFlight(dt, this.flight, {
      getX: () => this.x, getY: () => this.y,
      getAlt: () => this.alt, depthScale: y => this.island.depthScale(y),
      setAlt: v => { this.alt = v; }, setX: v => { this.x = v; }, setY: v => { this.y = v; },
      turn: d => this.turn(d), dir: this.dir, action: this.action,
      setAction: a => this.setAction(a as import('../bridge').DragonAction),
      dustRing: () => this.scene.ambient.dustRing(this),
      setRest: () => { this.rest = Phaser.Math.FloatBetween(2, 8); },
    });
    this.alt = alt;
  }
}
