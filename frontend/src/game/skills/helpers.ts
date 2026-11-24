// Helper functions shared by multiple species.
import type { SkillCtx } from './types';

const dmg = (scale: number) => `-${Math.round((180 + Math.random() * 40) * scale)}`;

/** A golden dragon head flies through every enemy in front, hitting each as it passes. */
export async function spitDragonHead(ctx: SkillCtx, scale: number) {
  const { self, targets, fx, projectile, wait } = ctx;
  const dir = self.facing, m = self.mouth();
  const enemies = targets.filter(t => t.id !== self.id);
  const far = Math.max(720, ...enemies.map(t => Math.abs(t.chest().x - m.x) + 260));
  const end = { x: m.x + far * dir, y: m.y + 10 };
  const ms = far / 0.9;
  fx(3, m, { scale: 0.65, dur: 380 });
  fx(2, { x: m.x + far * 0.5 * dir, y: m.y + 6 }, { scale: 1.3, dur: ms + 250, flipX: dir < 0 });
  const flight = projectile(1, m, end, { dur: ms, scale: 0.72, rotate: false, flipX: dir < 0 });
  await Promise.all(enemies.map(async t => {
    await wait((Math.abs(t.chest().x - m.x) / far) * ms);
    fx(4, t.chest(), { scale: 0.65, dur: 450, flipX: dir < 0 });
    t.hurt(); t.text(dmg(scale));
  }));
  await flight;
  fx(5, end, { scale: 0.7, dur: 520 });
}

export { dmg };
