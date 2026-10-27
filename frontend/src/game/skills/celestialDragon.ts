// Thần Long skills.
import type { SkillDef } from './types';
import { skyfall } from './skyfall';

const dmg = (scale: number) => `-${Math.round((180 + Math.random() * 40) * scale)}`;
const HEAL = '#7dffa0';

export const CELESTIAL_DRAGON_SKILLS: SkillDef[] = [
  { type: 'passive', name: 'Thánh Quang Hộ Thể', desc: 'Đầu trận toàn đội nhận Lá Chắn 10% Sinh lực tối đa; Thần Long miễn hiệu ứng khống chế lượt đầu.' },
  {
    type: 'basic', name: 'Thánh Quang Thương', desc: 'Gọi thương ánh sáng từ trời: 3 ngọn, mỗi ngọn 35% Công lên 1 mục tiêu, hồi 20% sát thương gây ra.',
    anim: 'attack', target: 'enemy',
    run: async ctx => {
      const [t] = ctx.targets;
      await skyfall(ctx, t, 3, () => { t.hurt(); t.text(dmg(0.35)); });
      ctx.self.text('+40', HEAL);
    },
  },
  {
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
