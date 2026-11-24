// Hồng Ngọc Long skills: ruby crystals. vfx_1..8 (skills/vfx.png): 1 ruby shard (flying left), 2 crystal rising
// from a ring, 3 row of small bursts, 4 great crystal eruption, 5 floating ruby in rings, 6 streak of light (drawn
// pointing RIGHT: the beam), 7 star flash, 8 sparkling shards.
import type { SkillCtx, SkillDef, Spot } from './types';

const dmg = (scale: number) => `-${Math.round((175 + Math.random() * 40) * scale)}`;

/** The tip of the snout (self.mouth() lands on the far eye of this head). */
const snout = (self: SkillCtx['self']): Spot => self.point('head', 0.25, 0.9);

export const RUBY_DRAGON_SKILLS: SkillDef[] = [
  { type: 'passive', name: 'Tâm Hồng Ngọc', desc: 'Lam ngọc trên ngực tụ sức mạnh: đòn đánh dễ gây bạo kích hơn.' },
  {
    type: 'basic', name: 'Mảnh Hồng Ngọc', desc: 'Phóng 2 mảnh hồng ngọc vào 1 địch: mỗi mảnh 55% Công.',
    anim: 'attack', target: 'enemy',
    run: async ({ self, targets: [t], projectile, fx, wait }) => {
      for (let k = 0; k < 2; k++) {
        fx(7, snout(self), { scale: 0.14, dur: 260 });
        await projectile(1, snout(self), t.chest(), { dur: 320, scale: 0.26, rotate: false, flipX: self.facing > 0 });
        fx(8, t.chest(), { scale: 0.22, dur: 450 });
        t.hurt(); t.text(dmg(0.55));
        await wait(80);
      }
    },
  },
  {
    type: 'skill', name: 'Tinh Thể Trồi', desc: 'Bắn tia sáng đỏ vào 1 địch, làm tinh thể trồi lên dưới chân nó: 140% Công và đẩy lùi.',
    anim: 'cast', target: 'enemy',
    run: async ({ self, targets: [t], beam, fx, wait, shake }) => {
      const from = snout(self);
      fx(7, from, { scale: 0.26, dur: 500 });
      await beam(6, from, t.chest(), { dur: 380, width: 0.3 });
      fx(2, t.feet(), { scale: 0.42, anchor: 'bottom', dur: 900 });
      await wait(120);
      shake(160, 0.003);
      t.hurt(); t.push?.(130 * self.facing); t.text(dmg(1.4));
    },
  },
  {
    type: 'ultimate', name: 'Hồng Ngọc Giáng Thế', desc: 'Tụ một khối hồng ngọc khổng lồ trên đầu rồi nổ thành rừng tinh thể dưới chân toàn bộ địch: 3 đợt 75% Công.',
    anim: 'ultimate', target: 'enemies',
    run: async ({ self, targets, fx, wait, shake }) => {
      const h = self.head();
      fx(5, { x: h.x, y: h.y - 70 }, { scale: 0.34, dur: 1300, spin: 0.6 });
      await wait(700);
      targets.forEach(t => fx(3, t.feet(), { scale: 0.26, anchor: 'bottom', dur: 600 }));
      for (let wave = 0; wave < 3; wave++) {
        await wait(wave ? 260 : 200);
        shake(200, 0.005);
        targets.forEach(t => {
          fx(wave === 2 ? 4 : 2, t.feet(), { scale: wave === 2 ? 0.36 : 0.24, anchor: 'bottom', dur: 750 });
          t.hurt(); t.text(dmg(0.75));
        });
      }
      targets.forEach(t => fx(8, t.chest(), { scale: 0.2, dur: 900 }));
    },
  },
];
