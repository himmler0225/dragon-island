// Hải Long skills.
import type { SkillDef } from './types';

const dmg = (scale: number) => `-${Math.round((180 + Math.random() * 40) * scale)}`;

export const SEA_DRAGON_SKILLS: SkillDef[] = [
  { type: 'passive', name: 'Long Vương Hộ Hải', desc: 'Toàn đội +10% Sinh lực tối đa; Hải Long hồi 8% Sinh lực mỗi lượt khi đang cưỡi mây.' },
  {
    type: 'basic', name: 'Thủy Châu', desc: 'Khạc ra một viên thủy châu: 110% Công lên 1 mục tiêu, gây Ướt.', anim: 'attack', target: 'enemy',
    run: async ({ self, targets: [t], fx, projectile }) => {
      const m = self.mouth();
      fx(3, { x: m.x + 30 * self.facing, y: m.y }, { scale: 0.35, dur: 350, flipX: self.facing < 0 });
      await projectile(1, m, t.chest(), { dur: 380, scale: 0.32, rotate: false });
      fx(4, t.feet(), { scale: 0.42, anchor: 'bottom', dur: 550 });
      fx(5, t.head(), { scale: 0.22, hold: 700 });
      t.hurt(); t.text(dmg(1.1));
    },
  },
  {
    type: 'skill', name: 'Hải Triều Thủy Tiễn', desc: 'Chúi đầu khạc liên tiếp 3 luồng nước: mỗi luồng 45% Công lên toàn bộ địch, đẩy lùi và giảm 25% Tốc 2 lượt.',
    anim: 'cast', target: 'enemies',
    run: async ({ self, targets, fx, projectile, wait }) => {
      for (let k = 0; k < 3; k++) {
        const m = self.mouth();
        fx(3, { x: m.x + 30 * self.facing, y: m.y }, { scale: 0.32, dur: 300, flipX: self.facing < 0 });
        await Promise.all(targets.map(async t => {
          await projectile(2, m, t.chest(), { dur: 300, scale: 0.4 });
          fx(4, t.feet(), { scale: 0.36, anchor: 'bottom', dur: 450 });
          t.hurt(); t.text(dmg(0.45));
          if (k === 2) { t.push?.(90 * self.facing); fx(8, t.feet(), { scale: 0.5, ground: true, dur: 800 }); }
        }));
        await wait(90);
      }
    },
  },
  {
    type: 'ultimate', name: 'Long Châu Hải Thần', desc: 'Bay lên khạc ra Long Châu khổng lồ: nổ thành cột nước, 220% Công toàn bộ địch, toàn đội nhận Lá Chắn 15% Sinh lực.',
    anim: 'ultimate', target: 'enemies',
    run: async ({ self, targets, fx, projectile, shake, wait }) => {
      const m = self.mouth();
      fx(3, { x: m.x + 40 * self.facing, y: m.y }, { scale: 0.36, dur: 450, flipX: self.facing < 0 });
      await Promise.all(targets.map(async t => {
        await projectile(6, m, t.chest(), { dur: 600, scale: 0.34, rotate: false });
        fx(8, t.feet(), { scale: 0.48, ground: true, dur: 1300 });
        fx(7, t.feet(), { scale: 0.48, anchor: 'bottom', dur: 1100 });
        await wait(200);
        t.hurt(); t.text(dmg(2.2));
      }));
      shake(500, 0.012);
      self.text('Lá Chắn', '#bfe9ff');
    },
  },
];
