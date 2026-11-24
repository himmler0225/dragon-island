// Rồng Cây skills: leaves and wind. vfx_1..8 (skills/vfx.png), drawn flying left: 1 leaf blade, 2 leaf burst,
// 3 leaf whirlwind, 4 thorn vines from the ground, 5 falling autumn leaf, 6 leaf circle on the ground,
// 7 healing aura, 8 drifting leaves.
import type { SkillDef } from './types';

const dmg = (scale: number) => `-${Math.round((160 + Math.random() * 40) * scale)}`;
const ROOT = '#c8f28a';

export const LEAF_DRAGON_SKILLS: SkillDef[] = [
  { type: 'passive', name: 'Diệp Sinh', desc: 'Mỗi giây hồi 1% Sinh lực; khi dưới 50% Sinh lực, hồi gấp đôi.' },
  {
    type: 'basic', name: 'Lá Phi Tiêu', desc: 'Phóng liền 2 chiếc lá sắc vào 1 địch: mỗi chiếc 55% Công.',
    anim: 'attack', target: 'enemy',
    run: async ({ self, targets: [t], projectile, fx, wait }) => {
      for (let k = 0; k < 2; k++) {
        await projectile(1, self.mouth(), t.chest(), { dur: 320, scale: 0.2, rotate: false, flipX: self.facing > 0 });
        fx(2, t.chest(), { scale: 0.24, dur: 500 });
        t.hurt(); t.text(dmg(0.55));
        await wait(80);
      }
    },
  },
  {
    type: 'skill', name: 'Lốc Lá', desc: 'Vỗ cánh tạo lốc lá, dây gai trồi lên trói mọi kẻ địch phía trước: 90% Công, 25% Trói Chân 1 lượt.',
    anim: 'cast', target: 'enemies',
    run: async ({ targets, fx, wait }) => {
      await Promise.all(targets.map(async (t, k) => {
        await wait(k * 100);
        fx(3, t.feet(), { scale: 0.34, anchor: 'bottom', dur: 1000 });
        fx(4, t.feet(), { scale: 0.3, anchor: 'bottom', dur: 900 });
        t.hurt(); t.text(dmg(0.9));
        if (Math.random() < 0.25) t.text('Trói Chân', ROOT);
      }));
    },
  },
  {
    type: 'ultimate', name: 'Thiên Diệp Vũ', desc: 'Vẽ trận lá dưới chân toàn bộ địch rồi gọi mưa lá thần: 3 đợt 70% Công, Trói Chân 1 lượt; bản thân được hồi phục.',
    anim: 'ultimate', target: 'enemies',
    run: async ({ self, targets, fx, projectile, wait }) => {
      fx(7, self.feet(), { scale: 0.4, anchor: 'bottom', dur: 1800 });
      targets.forEach(t => fx(6, t.feet(), { scale: 0.36, ground: true, dur: 2600 }));
      await wait(350);
      for (let wave = 0; wave < 3; wave++) {
        await Promise.all(targets.map(async (t, k) => {
          await wait(k * 70);
          const to = t.chest();
          await projectile(5, { x: to.x - 240 * self.facing, y: to.y - 440 }, to, { dur: 420, scale: 0.22, rotate: false, flipX: self.facing > 0 });
          fx(2, to, { scale: 0.26, dur: 450 });
          t.hurt(); t.text(dmg(0.7));
        }));
        await wait(110);
      }
      targets.forEach(t => { fx(8, t.chest(), { scale: 0.3, dur: 1000 }); t.text('Trói Chân', ROOT); });
    },
  },
];
