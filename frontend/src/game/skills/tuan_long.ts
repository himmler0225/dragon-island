// Tuấn Long (Quang) skills: support, healing.
import type { SkillDef } from './types';

const dmg = (scale: number) => `-${Math.round((180 + Math.random() * 40) * scale)}`;
const HEAL = '#7dffa0';

export const TUAN_LONG_SKILLS: SkillDef[] = [
  { type: 'passive', name: 'Linh Giác', desc: 'Đầu mỗi lượt, đồng đội ít máu nhất hồi 5% Sinh lực tối đa.' },
  {
    type: 'basic', name: 'Húc Sừng', desc: '80% Công, 30% khả năng xoá 1 hiệu ứng tốt của mục tiêu.', anim: 'attack', target: 'enemy',
    // antler charge: a streak of light from Tuấn Long to the target, the hit knocks it back
    run: async ({ self, targets: [t], fx, projectile }) => {
      await projectile(1, self.chest(), t.chest(), { dur: 260, scale: 0.4, flipX: self.facing < 0, rotate: false });
      fx(2, t.chest(), { scale: 0.45, dur: 450 });
      t.hurt(); t.push?.(70 * self.facing); t.text(dmg(0.8));
      if (Math.random() < 0.3) t.text('Xoá buff', '#bfe9ff');
    },
  },
  {
    type: 'skill', name: 'Hào Quang Tuyết', desc: 'Toàn đội nhận Lá Chắn 120% Công, giải mọi hiệu ứng xấu.',
    anim: 'cast', target: 'team',
    run: ({ targets, fx }) => {
      targets.forEach(t => {
        fx(3, t.feet(), { scale: 0.62, anchor: 'bottom', hold: 900 });
        fx(5, t.chest(), { scale: 0.35, dur: 700 });
        t.text('Lá Chắn', '#bfe9ff');
      });
    },
  },
  {
    type: 'ultimate', name: 'Sừng Thiêng Phục Sinh', desc: 'Toàn đội hồi 35% Sinh lực, +20% Tốc 2 lượt, hồi sinh 1 đồng đội.',
    anim: 'ultimate', target: 'team',
    run: async ({ self, targets, fx, wait }) => {
      fx(8, self.feet(), { scale: 0.8, ground: true, spin: 2, dur: 1600 });
      targets.forEach(t => fx(6, t.feet(), { scale: 0.75, anchor: 'bottom', dur: 1100 }));
      await wait(350);
      targets.forEach(t => {
        fx(4, t.chest(), { scale: 0.45, dur: 1000 });
        fx(7, t.head(), { scale: 0.4, dur: 1200 });
        t.text('+350', HEAL);
      });
    },
  },
];
