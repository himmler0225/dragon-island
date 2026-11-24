// Nguyệt Long skills: moonlight. vfx_1..8 (skills/vfx.png), drawn flying left: 1 crescent bolt, 2 star
// burst, 3 full moon orb, 4 frost crystals, 5 falling crescent shard, 6 moon sigil, 7 lunar aura, 8 sparkles.
import type { SkillDef } from './types';

const dmg = (scale: number) => `-${Math.round((170 + Math.random() * 40) * scale)}`;
const FROST = '#c8e4ff';

export const MOON_DRAGON_SKILLS: SkillDef[] = [
  { type: 'passive', name: 'Nguyệt Quang', desc: 'Đòn đánh lên mục tiêu đang Đóng Băng gây thêm 15% sát thương.' },
  {
    type: 'basic', name: 'Nguyệt Quang Tiễn', desc: 'Bắn 2 tia trăng khuyết vào 1 địch: mỗi tia 55% Công.',
    anim: 'attack', target: 'enemy',
    run: async ({ self, targets: [t], projectile, fx, wait }) => {
      for (let k = 0; k < 2; k++) {
        await projectile(1, self.mouth(), t.chest(), { dur: 330, scale: 0.2, rotate: false, flipX: self.facing > 0 });
        fx(2, t.chest(), { scale: 0.2, dur: 450 });
        t.hurt(); t.text(dmg(0.55));
        await wait(80);
      }
    },
  },
  {
    type: 'skill', name: 'Trăng Rằm', desc: 'Khạc một vầng trăng sáng vào 1 địch: 140% Công, 25% Đóng Băng 1 lượt.',
    anim: 'cast', target: 'enemy',
    run: async ({ self, targets: [t], projectile, fx }) => {
      await projectile(3, self.mouth(), t.chest(), { dur: 450, scale: 0.22, rotate: false });
      fx(4, t.feet(), { scale: 0.32, anchor: 'bottom', dur: 900 });
      fx(2, t.chest(), { scale: 0.28, dur: 500 });
      t.hurt(); t.text(dmg(1.4));
      if (Math.random() < 0.25) t.text('Đóng Băng', FROST);
    },
  },
  {
    type: 'ultimate', name: 'Nguyệt Thực', desc: 'Vẽ ấn trăng dưới chân toàn bộ địch rồi gọi mưa mảnh trăng băng giá: 3 đợt 70% Công, Đóng Băng 1 lượt.',
    anim: 'ultimate', target: 'enemies',
    run: async ({ self, targets, fx, projectile, wait }) => {
      fx(7, self.chest(), { scale: 0.42, dur: 1400, spin: 1.2 });
      targets.forEach(t => fx(6, t.feet(), { scale: 0.36, ground: true, dur: 2600 }));
      await wait(400);
      for (let wave = 0; wave < 3; wave++) {
        await Promise.all(targets.map(async (t, k) => {
          await wait(k * 70);
          const to = t.chest();
          await projectile(5, { x: to.x - 260 * self.facing, y: to.y - 460 }, to, { dur: 420, scale: 0.24, rotate: false, flipX: self.facing > 0 });
          fx(2, to, { scale: 0.22, dur: 420 });
          t.hurt(); t.text(dmg(0.7));
        }));
        await wait(120);
      }
      targets.forEach(t => { fx(8, t.chest(), { scale: 0.3, dur: 1000 }); t.text('Đóng Băng', FROST); });
    },
  },
];
