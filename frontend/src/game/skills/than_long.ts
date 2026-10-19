// Thần Long (Thiên) skills: Hắc Long's holy twin - same aerial moves, light instead of shadow.
// vfx: 1 holy bite flash, 2 healing sparkles, 3 light spear (points DOWN), 4 spear impact,
//      5 holy sigil (laid on the ground), 6 divine halo, 7 holy wind crescent (points right), 8 blessing column
// Signature: spears of light falling from the sky onto glowing sigils, a halo behind it, healing.
import type { SkillDef } from './types';

const dmg = (scale: number) => `-${Math.round((180 + Math.random() * 40) * scale)}`;
const HEAL = '#7dffa0';

export const THAN_LONG_SKILLS: SkillDef[] = [
  { type: 'passive', name: 'Thánh Quang Hộ Thể', desc: 'Đầu trận toàn đội nhận Lá Chắn 10% Sinh lực tối đa; Thần Long miễn hiệu ứng khống chế lượt đầu.' },
  {
    // dives and snaps with jaws of light, healing sparkles flow back into it
    type: 'basic', name: 'Thánh Trảo', desc: 'Bổ nhào cắn bằng hàm thánh quang: 100% Công lên 1 mục tiêu, hồi 20% sát thương gây ra.',
    anim: 'attack', target: 'enemy',
    run: async ({ self, targets: [t], fx, bite }) => {
      await bite(t.chest(), { scale: 0.85 });
      fx(1, t.chest(), { scale: 0.42, dur: 380, flipX: self.facing < 0 });
      t.hurt(); t.text(dmg(1));
      fx(2, self.feet(), { scale: 0.42, anchor: 'bottom', dur: 1000 });
      self.text('+40', HEAL);
    },
  },
  {
    // sigils open under every enemy, then a spear of light falls onto each one
    type: 'skill', name: 'Thiên Quang Phán Xét', desc: 'Gọi mưa thương ánh sáng từ trời: 90% Công lên toàn bộ địch, giảm 15% Công 2 lượt.',
    anim: 'cast', target: 'enemies',
    run: async ({ targets, fx, projectile, wait, shake }) => {
      targets.forEach(t => fx(5, t.feet(), { scale: 0.5, ground: true, spin: 1.5, dur: 1300 }));
      await wait(300);
      await Promise.all(targets.map(async (t, k) => {
        await wait(k * 140);
        const at = t.feet();
        await projectile(3, { x: at.x, y: at.y - 520 }, { x: at.x, y: at.y - 40 }, { dur: 300, scale: 0.4, rotate: false });
        fx(4, { x: at.x, y: at.y - 20 }, { scale: 0.45, anchor: 'bottom', dur: 600 });
        shake(120, 0.005);
        t.hurt(); t.text(dmg(0.9)); t.text('-Công', '#ffe08a');
      }));
    },
  },
  {
    // soars with a halo behind it, holy wind sweeps both ways, blessing light falls on the team
    type: 'ultimate', name: 'Thần Long Hàng Thế', desc: 'Bay lên dang cánh toả thánh quang: 220% Công toàn bộ địch, hồi 25% Sinh lực toàn đội.',
    anim: 'ultimate', target: 'enemies',
    run: async ({ self, targets, fx, wait, shake }) => {
      fx(6, self.chest(), { scale: 0.8, dur: 1600, spin: 0.6 });
      await wait(250);
      shake(600, 0.014);
      const c = self.chest();
      fx(7, { x: c.x + 170, y: c.y + 30 }, { scale: 0.6, dur: 800 });
      fx(7, { x: c.x - 170, y: c.y + 30 }, { scale: 0.6, dur: 800, flipX: true });
      await wait(300);
      targets.forEach(t => { fx(4, t.feet(), { scale: 0.4, anchor: 'bottom', dur: 500 }); t.hurt(); t.text(dmg(2.2)); });
      await wait(250);
      fx(8, self.feet(), { scale: 0.55, anchor: 'bottom', dur: 1300 });
      self.text('+25%', HEAL);
    },
  },
];
