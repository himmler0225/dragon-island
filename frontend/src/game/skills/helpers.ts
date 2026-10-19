// Helper functions shared by multiple species.
import type { SkillCtx } from './types';

const dmg = (scale: number) => `-${Math.round((180 + Math.random() * 40) * scale)}`;

/** A golden dragon head flies through every enemy in front, hitting each as it passes. */
export async function spitDragonHead(ctx: SkillCtx, scale: number) {
  const { self, targets, fx, projectile, wait } = ctx;
  const dir = self.facing, m = self.mouth();
  const enemies = targets.filter(t => t.id !== self.id);
  const far = Math.max(380, ...enemies.map(t => Math.abs(t.chest().x - m.x) + 140));
  const end = { x: m.x + far * dir, y: m.y + 10 };
  const ms = far / 0.9;
  fx(3, m, { scale: 0.45, dur: 350 });
  fx(2, { x: m.x + far * 0.5 * dir, y: m.y + 6 }, { scale: 0.9, dur: ms + 250, flipX: dir < 0 });
  const flight = projectile(1, m, end, { dur: ms, scale: 0.4, rotate: false, flipX: dir < 0 });
  await Promise.all(enemies.map(async t => {
    await wait((Math.abs(t.chest().x - m.x) / far) * ms);
    fx(4, t.chest(), { scale: 0.5, dur: 420, flipX: dir < 0 });
    t.hurt(); t.text(dmg(scale));
  }));
  await flight;
  fx(5, end, { scale: 0.5, dur: 500 });
}

export { dmg };
