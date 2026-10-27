// Khổng Tước skills. vfx_1..8 (skills/vfx.png): 1 fan of light, 2 landing ring, 3 peacock-eye sigil,
// 4 feather storm, 5 rainbow beam, 6 feather burst, 7 healing glow, 8 giant falling feather;
// vfx_17..24 (skills/basic.png): 17-20 feather arrows, 21-24 arrow hit frames.
import type { SkillDef } from './types';

const dmg = (scale: number) => `-${Math.round((180 + Math.random() * 40) * scale)}`;
const HEAL = '#7dffa0';
const ARROWS = [17, 18, 19, 20], HIT = [21, 22, 23, 24];

export const PEACOCK_SKILLS: SkillDef[] = [
  { type: 'passive', name: 'Bách Điểu Chi Vương', desc: 'Mỗi lần xòe đuôi: toàn đội +8% Né tránh 1 lượt.' },
  {
    type: 'basic', name: 'Khổng Tước Tiễn', desc: 'Hé xòe đuôi bắn ra 3 mũi tên lông vũ: mỗi mũi 35% Công lên 1 mục tiêu.', anim: 'attack', target: 'enemy',
    run: async ({ self, targets: [t], fx, projectile, wait }) => {
      const c = self.chest(), from = { x: c.x - 50 * self.facing, y: c.y - 70 };
      await Promise.all([0, 1, 2].map(async k => {
        await wait(k * 120);
        const to = { x: t.chest().x, y: t.chest().y + (k - 1) * 14 };
        await projectile(ARROWS[k % ARROWS.length], { x: from.x, y: from.y + (k - 1) * 22 }, to, { dur: 320, scale: 0.26, flipX: self.facing < 0 });
        fx(HIT[0], to, { scale: 0.2, dur: 200 });
        fx(HIT[2], to, { scale: 0.24, dur: 480 });
        t.hurt(); t.text(dmg(0.35));
      }));
      fx(HIT[3], t.chest(), { scale: 0.24, dur: 700 });
    },
  },
  {
    type: 'skill', name: 'Lông Vũ Cuồng Phong', desc: 'Bật nhảy xòe đuôi, quạt ra bão lông vũ: 85% Công lên toàn bộ địch.',
    anim: 'cast', target: 'enemies',
    run: async ({ self, targets, fx, wait, shake }) => {
      await wait(300);
      fx(1, { x: self.chest().x + 30 * self.facing * -1, y: self.chest().y - 60 }, { scale: 0.6, dur: 900 });
      await wait(250);
      targets.forEach(t => { fx(4, t.chest(), { scale: 0.45, dur: 800, spin: 2 }); t.hurt(); t.text(dmg(0.85)); });
      await wait(400);
      fx(2, self.feet(), { scale: 0.5, ground: true, dur: 700 });
      shake(200, 0.006);
    },
  },
  {
    type: 'ultimate', name: 'Khổng Tước Khai Bình', desc: 'Bay vọt lên xòe trọn đuôi: cột sáng cầu vồng và lông vũ khổng lồ giáng xuống toàn bộ địch, 200% Công; hồi 15% Sinh lực toàn đội.',
    anim: 'ultimate', target: 'enemies',
    run: async ({ self, targets, fx, projectile, wait, shake }) => {
      await wait(350);
      const c = self.chest();
      fx(1, { x: c.x + 20 * self.facing * -1, y: c.y - 90 }, { scale: 0.8, dur: 1500 });
      fx(3, { x: c.x, y: c.y - 200 }, { scale: 0.45, dur: 1400, spin: 0.5 });
      await wait(300);
      await Promise.all(targets.map(async (t, k) => {
        await wait(k * 130);
        const at = t.feet();
        fx(5, at, { scale: 0.5, anchor: 'bottom', dur: 700 });
        await projectile(8, { x: at.x, y: at.y - 520 }, { x: at.x, y: at.y - 40 }, { dur: 320, scale: 0.4, rotate: false });
        fx(6, { x: at.x, y: at.y - 30 }, { scale: 0.5, dur: 700 });
        shake(150, 0.008);
        t.hurt(); t.text(dmg(2));
      }));
      await wait(300);
      fx(7, self.feet(), { scale: 0.5, anchor: 'bottom', dur: 1200 });
      self.text('+15%', HEAL);
    },
  },
];
