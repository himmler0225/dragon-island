// Rồng Ma Thạch skills: red crystal light fired from the lenses on its tail tip. vfx_1..8 (skills/vfx.png):
// 1 star flare, 2 crystal burst, 3 spinning crystal ring, 4 crystal bolt (flying
// left), 5 explosion, 6 ground shockwave, 7 energy stream (drawn pointing RIGHT: the beam), 8 sparks.
import type { SkillActor, SkillDef, Spot } from './types';

const dmg = (scale: number) => `-${Math.round((180 + Math.random() * 40) * scale)}`;
const RED = 0xff3a4a, STUN = '#ff9aa6';

/** The lenses on the tail tip: the tail curls under the body and forward, its tip in front, below the arms. */
const tail = (self: SkillActor, foe: Spot): Spot => {
  const c = self.chest(), dir = Math.sign(foe.x - c.x) || 1;
  return { x: c.x + dir * 50, y: c.y + 55 };
};

export const STONE_GHOST_DRAGON_SKILLS: SkillDef[] = [
  { type: 'passive', name: 'Giáp Ma Thạch', desc: 'Giảm 12% sát thương nhận vào; mỗi lần trúng đòn, tuyệt kỹ hồi nhanh hơn một chút.' },
  {
    type: 'basic', name: 'Thạch Trảo', desc: 'Thấu kính đuôi lóe sáng, bắn 2 viên tinh thể đỏ vào 1 địch: mỗi viên 55% Công.',
    anim: 'attack', target: 'enemy',
    run: async ({ self, targets: [t], fx, projectile, wait }) => {
      const from = tail(self, t.chest());
      for (let k = 0; k < 2; k++) {
        fx(1, from, { scale: 0.22, dur: 350 });
        await projectile(4, from, t.chest(), { dur: 320, scale: 0.22, rotate: false, flipX: self.facing > 0 });
        fx(5, t.chest(), { scale: 0.3, dur: 500 });
        t.hurt(); t.text(dmg(0.55));
        await wait(80);
      }
    },
  },
  {
    type: 'skill', name: 'Hồng Tinh Chấn', desc: 'Tụ năng lượng ở đuôi rồi bắn khối tinh thể đỏ lớn vào 1 địch: 140% Công, nổ chấn động đẩy lùi mục tiêu, 25% Choáng 1 lượt.',
    anim: 'cast', target: 'enemy',
    run: async ({ self, targets: [t], fx, projectile, wait, shake }) => {
      const from = tail(self, t.chest());
      fx(3, from, { scale: 0.26, dur: 700, spin: 1.2 });
      fx(1, from, { scale: 0.3, dur: 600 });
      await wait(300);
      await projectile(4, from, t.chest(), { dur: 420, scale: 0.36, rotate: false, flipX: self.facing > 0 });
      fx(5, t.chest(), { scale: 0.5, dur: 650 });
      fx(6, t.feet(), { scale: 0.36, ground: true, dur: 900 });
      shake(200, 0.004);
      t.hurt(); t.push?.(170 * self.facing); t.text(dmg(1.4));
      if (Math.random() < 0.25) t.text('Choáng', STUN);
    },
  },
  {
    type: 'ultimate', name: 'Ma Thạch Xạ Quang', desc: 'Tụ năng lượng ở thấu kính đuôi rồi bắn tia sáng đỏ xuyên thẳng qua cả đội hình địch: 230% Công và đẩy lùi mọi kẻ địch trên đường bắn.',
    anim: 'ultimate', target: 'enemies',
    run: async ({ self, targets, fx, beam, wait, shake }) => {
      if (!targets.length) return;
      const c = self.chest();
      const line = [...targets].sort((a, b) => Math.abs(a.chest().x - c.x) - Math.abs(b.chest().x - c.x));
      const last = line[line.length - 1].chest(), from = tail(self, last);
      // charge: a spinning ring and a growing star on the lenses
      fx(3, from, { scale: 0.34, dur: 1100, spin: 2 });
      fx(1, from, { scale: 0.42, dur: 1100, hold: 300 });
      await wait(550);
      // the beam: from the tail through every foe, on past the last one
      const dir = Math.sign(last.x - from.x) || 1;
      const end = { x: last.x + dir * 160, y: last.y };
      void beam(7, from, end, { dur: 1100, width: 0.55, tint: RED });
      fx(1, from, { scale: 0.5, dur: 700 });
      shake(600, 0.006);
      for (const t of line) {
        await wait(70);
        fx(5, t.chest(), { scale: 0.42, dur: 600 });
        fx(8, t.chest(), { scale: 0.3, dur: 800 });
        t.hurt(); t.push?.(130 * self.facing); t.text(dmg(2.3));
      }
    },
  },
];
