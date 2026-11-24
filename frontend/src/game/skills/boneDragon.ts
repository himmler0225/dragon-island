// Rồng Xương skills.
import type { SkillDef } from './types';

const dmg = (scale: number) => `-${Math.round((180 + Math.random() * 40) * scale)}`;
const HEAL = '#7dffa0';

export const BONE_DRAGON_SKILLS: SkillDef[] = [
  { type: 'passive', name: 'Bất Tử Cốt', desc: 'Lần đầu bị hạ: đứng dậy với 30% Sinh lực và Lá Chắn 15% Sinh lực tối đa.' },
  {
    type: 'basic', name: 'Cắn Xương', desc: 'Chúi tới táp mạnh, hất lùi mục tiêu: 100% Công, hút 30% sát thương gây ra.', anim: 'attack', target: 'enemy',
    run: async ({ self, targets: [t], fx, projectile }) => {
      fx(4, t.chest(), { scale: 0.55, dur: 420, flipX: self.facing < 0 });
      fx(3, t.chest(), { scale: 0.4, dur: 450 });
      t.hurt(); t.push?.(90 * self.facing); t.text(dmg(1));
      await projectile(5, t.chest(), self.chest(), { dur: 600, scale: 0.42 });
      fx(8, self.feet(), { scale: 0.35, anchor: 'bottom', dur: 600 });
      self.text('+60', HEAL);
    },
  },
  {
    type: 'skill', name: 'Cốt Dực Cuồng Phong', desc: 'Dang cánh quạt ra cuồng phong: 80% Công toàn bộ địch, đẩy lùi và giảm 20% Tốc 2 lượt.',
    anim: 'cast', target: 'enemies',
    run: async ({ self, targets, fx, projectile, shake, wait }) => {
      const dir = self.facing, c = self.chest(), flip = dir < 0;
      const from = { x: c.x + 60 * dir, y: c.y };
      fx(2, { x: c.x + 130 * dir, y: c.y }, { scale: 0.6, dur: 600, flipX: flip });
      shake(400, 0.007);
      const reach = (k: number) => ({ x: from.x + (330 + 40 * k) * dir, y: from.y + (k - 1) * 22 });
      const waves = [0, 1, 2].map(k => wait(k * 110).then(() =>
        projectile(1, from, reach(k), { dur: 520, scale: 0.38 + 0.08 * k, rotate: false, flipX: flip })));
      await waves[0];
      targets.forEach(t => {
        fx(3, t.chest(), { scale: 0.45, dur: 500 });
        t.hurt(); t.push?.(180 * dir); t.text(dmg(0.8));
      });
      await Promise.all(waves);
    },
  },
  {
    type: 'ultimate', name: 'Mưa Cốt Long', desc: 'Gầm lên trời gọi mưa xương: 180% Công toàn bộ địch, choáng 1 lượt.',
    anim: 'ultimate', target: 'enemies',
    run: async ({ targets, fx, projectile, shake, wait }) => {
      await Promise.all(targets.map(async (t, k) => {
        const at = t.feet();
        const drops = [-60, 30, -15, 55, 0].map((dx, n) => wait(k * 120 + n * 90).then(() =>
          projectile(6, { x: at.x + dx - 30, y: at.y - 460 }, { x: at.x + dx, y: at.y - 30 }, { dur: 420, scale: 0.4, rotate: false })));
        await drops[0];
        fx(7, at, { scale: 0.75, ground: true, dur: 1200 });
        shake(450, 0.012);
        t.hurt(); t.text(dmg(1.8));
        await Promise.all(drops);
        fx(3, { x: at.x, y: at.y - 30 }, { scale: 0.55, dur: 500 });
        t.text('Choáng', '#ffe08a');
      }));
    },
  },
];
