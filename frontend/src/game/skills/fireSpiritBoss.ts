// Hỏa Linh (boss) skills. vfx_1..8 (skills/vfx.png): 1 fire gathering in a palm, 2 palm fireball,
// 3 flame wave pushed by both palms, 4 burst on impact, 5 burning ring on the ground, 6 flame pillar,
// 7 swirling fire aura, 8 embers and purple droplets.
import type { SkillDef } from './types';

const dmg = (scale: number) => `-${Math.round((180 + Math.random() * 40) * scale)}`;
const EMBER = '#ffab5a';

export const FIRE_SPIRIT_BOSS_SKILLS: SkillDef[] = [
  { type: 'passive', name: 'Hỏa Linh Bất Diệt', desc: 'Boss: mỗi lần trúng đòn hồi lại 2% Sinh lực, miễn Đóng Băng.' },
  {
    type: 'basic', name: 'Hỏa Chưởng', desc: 'Tụ lửa trong lòng bàn tay rồi đẩy ra một quả cầu lửa: 120% Công lên 1 địch.',
    anim: 'attack', target: 'enemy',
    run: async ({ self, targets: [t], fx, projectile, wait }) => {
      const c = self.chest(), hand = { x: c.x - 50 * self.facing * -1, y: c.y + 10 };
      fx(1, hand, { scale: 0.22, dur: 420 });
      await wait(260);
      await projectile(2, hand, t.chest(), { dur: 380, scale: 0.26, flipX: self.facing < 0 });
      fx(4, t.chest(), { scale: 0.3, dur: 520 });
      t.hurt(); t.text(dmg(1.2));
    },
  },
  {
    type: 'skill', name: 'Liệt Diễm Song Chưởng', desc: 'Hai tay cùng đẩy ra làn sóng lửa quét cả hàng địch: 100% Công, Thiêu Đốt 2 lượt.',
    anim: 'cast', target: 'enemies',
    run: async ({ self, targets, fx, beam, wait }) => {
      fx(7, self.chest(), { scale: 0.45, dur: 900, spin: 1 });
      await wait(250);
      const far = targets.reduce((a, t) => (Math.abs(t.chest().x - self.chest().x) > Math.abs(a.chest().x - self.chest().x) ? t : a), targets[0]);
      if (far) await beam(3, self.chest(), far.chest(), { dur: 900, width: 0.6 });
      targets.forEach(t => { fx(4, t.chest(), { scale: 0.3, dur: 520 }); t.hurt(); t.text(dmg(1)); t.text('Thiêu Đốt', EMBER); });
    },
  },
  {
    type: 'ultimate', name: 'Hỏa Linh Giáng Thế', desc: 'Bay vọt lên, hào quang lửa bùng nổ, cột lửa phụt lên dưới toàn bộ địch: 250% Công.',
    anim: 'ultimate', target: 'enemies',
    run: async ({ self, targets, fx, wait }) => {
      fx(7, self.chest(), { scale: 0.7, dur: 1600, spin: 1.5 });
      await wait(450);
      await Promise.all(targets.map(async (t, k) => {
        await wait(k * 120);
        fx(5, t.feet(), { scale: 0.45, ground: true, dur: 1300 });
        fx(6, t.feet(), { scale: 0.45, anchor: 'bottom', dur: 900 });
        await wait(220);
        fx(4, t.chest(), { scale: 0.36, dur: 600 });
        fx(8, t.feet(), { scale: 0.3, anchor: 'bottom', dur: 1100 });
        t.hurt(); t.text(dmg(2.5));
      }));
    },
  },
];
