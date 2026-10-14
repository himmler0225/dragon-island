// Hắc Long (Băng) skills: assassin that strikes from the air.
// vfx: 1 claw slash, 2 dark mist, 3 life drain, 4 ground sigil, 5 purple sparks, 6 jaw flash, 7 ground crack, 8 water ring
import type { SkillDef } from './types';

const dmg = (scale: number) => `-${Math.round((180 + Math.random() * 40) * scale)}`;

export const HAC_LONG_SKILLS: SkillDef[] = [
  { type: 'passive', name: 'Cuồng Nộ', desc: 'Khi Sinh lực dưới 50%: +40% Tốc độ và +25% tỉ lệ chí mạng trong 2 lượt (1 lần/trận).' },
  {
    type: 'basic', name: 'Vuốt Rồng', desc: 'Bay lên rồi bổ nhào, cào 110% Công vào 1 mục tiêu.', anim: 'attack', target: 'enemy',
    run: ({ self, targets: [t], fx }) => {
      fx(1, t.chest(), { scale: 0.6, dur: 450, flipX: self.facing < 0 });
      fx(2, t.chest(), { scale: 0.42, dur: 420 });
      t.hurt(); t.text(dmg(1.1));
    },
  },
  {
    type: 'skill', name: 'Hấp Huyết', desc: 'Lơ lửng hút sinh lực: 60% Công lên toàn bộ địch, toàn đội hút máu 30% sát thương gây ra trong 2 lượt.',
    anim: 'cast', target: 'enemies',
    run: async ({ self, targets, fx, projectile }) => {
      const RED = 0xff3048;
      fx(4, self.feet(), { scale: 0.7, ground: true, dur: 1400, tint: RED, spin: 1.5 });
      await Promise.all(targets.map(async t => {
        fx(2, t.chest(), { scale: 0.45, dur: 600, tint: RED });
        t.hurt(); t.text(dmg(0.6));
        await projectile(3, t.chest(), self.chest(), { dur: 650, scale: 0.4, tint: RED });
      }));
      self.text('Hấp Huyết +30%', '#ff8a96');
    },
  },
  {
    type: 'ultimate', name: 'Đoạt Mệnh', desc: 'Bay vút lên rồi bổ nhào: 300% Công lên 1 mục tiêu; mục tiêu dưới 30% Sinh lực bị tiêu diệt ngay.',
    anim: 'ultimate', target: 'enemy',
    run: async ({ targets: [t], fx, wait, shake, bite }) => {
      const VIOLET = 0xb050ff;
      fx(7, t.feet(), { scale: 1.0, ground: true, spin: -8, dur: 1500, tint: VIOLET });
      await bite(t.chest(), { scale: 1.1, tint: VIOLET });
      fx(6, t.chest(), { scale: 0.65, dur: 500 });
      fx(8, t.feet(), { scale: 0.8, anchor: 'bottom', dur: 900, tint: VIOLET });
      shake(550, 0.014);
      t.hurt(); t.text(dmg(3), '#d9a6ff');
      await wait(450);
      t.text('ĐOẠT MỆNH', '#e7c4ff');
    },
  },
];
