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
