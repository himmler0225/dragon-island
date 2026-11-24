// Basic attack from the sky (skills/basic.png -> vfx_17..24): projectiles fall onto the target one after
// another and burst on the ground, each landing hurting it. Used by Hắc Long, Thần Long and the phoenixes.
import type { SkillActor, SkillCtx } from './types';

export const FALL = [17, 18, 19, 20];     // the falling projectiles
export const IMPACT = [21, 22, 23, 24];   // impact frames: flash, ring, big burst, fading wisps

/** `count` projectiles fall around the target; `onHit(k)` runs as each one lands. */
export async function skyfall(ctx: SkillCtx, t: SkillActor, count: number, onHit: (k: number) => void) {
  const foot = t.feet();
  await Promise.all(Array.from({ length: count }, async (_, k) => {
    await ctx.wait(k * 140);
    const dx = (k - (count - 1) / 2) * 34 + (Math.random() - 0.5) * 16;
    const land = { x: foot.x + dx, y: foot.y - 6 };
    await ctx.projectile(FALL[k % FALL.length], { x: land.x - 40, y: land.y - 420 }, land, { dur: 300, scale: 0.3, rotate: false });
    // the burst: a flash, the ring on the ground and the blast, then smoke left behind
    ctx.fx(IMPACT[0], { x: land.x, y: land.y - 10 }, { scale: 0.22, dur: 220 });
    ctx.fx(IMPACT[1], land, { scale: 0.3, anchor: 'bottom', dur: 420 });
    ctx.fx(IMPACT[2], land, { scale: 0.3, anchor: 'bottom', dur: 520 });
    ctx.fx(IMPACT[3], land, { scale: 0.3, anchor: 'bottom', dur: 900, hold: 100 });
    if (k === count - 1) ctx.shake(120, 0.004);
    onHit(k);
  }));
}

/** The straight basic attack (Hắc Long, Thần Long; their skills/basic.png -> vfx_17..24, drawn flying left: 17 one
 *  blade, 18 a fan of three, 19 a thick streak, 20 a sparkling head; 21 claw slashes, 22 column of light, 23
 *  shockwave, 24 wisps): blades shot from the mouth one after another, each bursting on the target. */
export async function volley(ctx: SkillCtx, t: SkillActor, count: number, onHit: (k: number) => void) {
  const { self, projectile, fx, wait } = ctx;
  await Promise.all(Array.from({ length: count }, async (_, k) => {
    await wait(k * 130);
    const m = self.mouth(), to = t.chest();
    fx(20, m, { scale: 0.2, dur: 260, flipX: self.facing > 0 });
    await projectile(FALL[k % 3], { x: m.x, y: m.y + (k - 1) * 14 }, { x: to.x, y: to.y + (k - 1) * 18 }, { dur: 300, scale: 0.34, rotate: false, flipX: self.facing > 0 });
    fx(IMPACT[0], to, { scale: 0.3, dur: 320 });
    onHit(k);
    if (k === count - 1) {   // the last one: the column of light and the shockwave under the target
      fx(IMPACT[1], t.feet(), { scale: 0.42, anchor: 'bottom', dur: 620 });
      fx(IMPACT[2], t.feet(), { scale: 0.34, anchor: 'bottom', dur: 620 });
      fx(IMPACT[3], to, { scale: 0.3, dur: 800 });
    }
  }));
}
