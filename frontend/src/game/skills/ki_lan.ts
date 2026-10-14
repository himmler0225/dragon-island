// Kì Lân (Hỏa) skills: spits golden dragon heads that pierce the whole enemy line.
// vfx: 1 golden dragon head, 2 gold trail, 3 mouth flash, 4 pierce hit, 5 sparks, 6 ground ring, 7 golden swirls, 8 soft glow
import type { SkillDef } from './types';
import { spitDragonHead } from './helpers';

const dmg = (scale: number) => `-${Math.round((180 + Math.random() * 40) * scale)}`;

export const KI_LAN_SKILLS: SkillDef[] = [
  { type: 'passive', name: 'Kim Lân Hộ Thể', desc: 'Giáp vàng: giảm 15% sát thương nhận vào; mỗi lần bị đánh +5% Công (tối đa 5 lần).' },
  {
    type: 'basic', name: 'Lân Trảo', desc: '100% Công lên 1 mục tiêu.', anim: 'attack', target: 'enemy',
    run: ({ targets: [t], fx }) => {
      fx(4, t.chest(), { scale: 0.45, dur: 420 });
      fx(5, t.chest(), { scale: 0.4, dur: 500 });
      t.hurt(); t.text(dmg(1));
    },
  },
  {
    type: 'skill', name: 'Long Thủ Xuyên Trận', desc: 'Khạc ra đầu rồng vàng bay thẳng xuyên qua toàn bộ đội hình địch: 120% Công lên mỗi mục tiêu trên đường bay.',
    anim: 'cast', target: 'enemies',
    run: (ctx) => spitDragonHead(ctx, 1.2),
  },
  {
    type: 'ultimate', name: 'Kim Long Liên Châu', desc: 'Liên tiếp khạc 3 đầu rồng vàng xuyên trận: mỗi đầu 90% Công lên mọi mục tiêu trên đường bay.',
    anim: 'ultimate', target: 'enemies',
    run: async (ctx) => {
      ctx.fx(6, ctx.self.feet(), { scale: 0.7, ground: true, dur: 1800 });
      for (let k = 0; k < 3; k++) {
        void spitDragonHead(ctx, 0.9);
        await ctx.wait(500);
      }
    },
  },
];
