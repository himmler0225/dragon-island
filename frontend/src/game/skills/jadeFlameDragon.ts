// Rồng Lửa Mắt Xanh skills: green fire. vfx_1..8 (skills/vfx.png): 1 breath stream, 2 breath angled down,
// 3 burning patch on the ground, 4 flame pillar, 5 ring of fire, 6 explosion, 7 swirling aura, 8 embers.
import type { SkillDef } from './types';

const dmg = (scale: number) => `-${Math.round((180 + Math.random() * 40) * scale)}`;
const EMBER = '#8dffb0';

export const JADE_FLAME_DRAGON_SKILLS: SkillDef[] = [
  { type: 'passive', name: 'Lục Hỏa Tâm', desc: 'Mỗi lần đánh trúng mục tiêu đang Thiêu Đốt: +10% Công trong 2 lượt.' },
  {
    type: 'basic', name: 'Lục Hỏa Cầu', desc: 'Từ trên không khạc 2 quả cầu lửa xanh: mỗi quả 55% Công lên 1 địch, 30% Thiêu Đốt.',
    anim: 'attack', target: 'enemy',
    run: async ({ self, targets: [t], fx, projectile, wait }) => {
      for (let k = 0; k < 2; k++) {
        await projectile(1, self.mouth(), t.chest(), { dur: 360, scale: 0.22, flipX: self.facing < 0 });
        fx(6, t.chest(), { scale: 0.22, dur: 520 });
        t.hurt(); t.text(dmg(0.55));
        await wait(90);
      }
      fx(8, t.chest(), { scale: 0.24, dur: 900 });
      if (Math.random() < 0.3) t.text('Thiêu Đốt', EMBER);
    },
  },
  {
    type: 'skill', name: 'Lục Diễm Phun', desc: 'Phun luồng lửa xanh chéo xuống mặt đất: 120% Công lên 1 địch, lửa cháy dưới chân, Thiêu Đốt 2 lượt.',
    anim: 'cast', target: 'enemy',
    run: async ({ self, targets: [t], fx, beam, wait }) => {
      await beam(2, self.mouth(), t.feet(), { dur: 900, width: 0.5 });
      fx(3, t.feet(), { scale: 0.42, ground: true, dur: 1400 });
      fx(6, t.chest(), { scale: 0.3, dur: 600 });
      t.hurt(); t.text(dmg(1.2)); t.text('Thiêu Đốt', EMBER);
      await wait(300);
      fx(8, t.feet(), { scale: 0.3, anchor: 'bottom', dur: 1000 });
    },
  },
  {
    type: 'ultimate', name: 'Lục Long Hỏa Ngục', desc: 'Bay vọt lên phun lửa xanh quét cả hàng địch, cột lửa phụt lên dưới từng kẻ địch: 220% Công, Thiêu Đốt 2 lượt.',
    anim: 'ultimate', target: 'enemies',
    run: async ({ self, targets, fx, beam, wait }) => {
      fx(7, self.chest(), { scale: 0.5, dur: 1400, spin: 1.2 });
      await wait(300);
      const far = targets.reduce((a, t) => (Math.abs(t.chest().x - self.chest().x) > Math.abs(a.chest().x - self.chest().x) ? t : a), targets[0]);
      if (far) await beam(1, self.mouth(), far.chest(), { dur: 1000, width: 0.6 });
      await Promise.all(targets.map(async (t, k) => {
        await wait(k * 120);
        fx(5, t.feet(), { scale: 0.45, ground: true, dur: 1200 });
        fx(4, t.feet(), { scale: 0.42, anchor: 'bottom', dur: 900 });
        await wait(200);
        fx(6, t.chest(), { scale: 0.35, dur: 700 });
        t.hurt(); t.text(dmg(2.2)); t.text('Thiêu Đốt', EMBER);
      }));
    },
  },
];
