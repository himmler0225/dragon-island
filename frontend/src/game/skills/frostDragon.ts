// Băng Lộc Long skills (tên tạm). Effects: skills/vfx_n.png 1 ice shard (flying left), 2 frost hit, 3 glass ice
// cage (a dome, bottom on the ground), 4 rune ring (laid on the ground), 5 ice spikes (bottom on the ground),
// 9 the cage shattering; drawn in code (scene/effects/proceduralVfx.ts): 6 frozen crack (on the ground),
// 7 falling crystal, 8 big ice impact.
import type { SkillCtx, SkillDef } from './types';

const dmg = (scale: number) => `-${Math.round((160 + Math.random() * 40) * scale)}`;
const FROST = '#bdf0ff';

/** The passive: a glass ice cage closes round the dragon, holds, then shatters. */
export async function iceCage({ self, fx, wait }: SkillCtx) {
  fx(4, self.feet(), { scale: 0.55, ground: true, spin: 2, dur: 3200 });
  fx(3, self.feet(), { scale: 0.62, anchor: 'bottom', dur: 2400, hold: 600 });
  self.text('Lồng Kính Băng', FROST);
  await wait(2900);
  fx(9, self.feet(), { scale: 0.62, anchor: 'bottom', dur: 750 });
  fx(2, self.chest(), { scale: 0.4, dur: 500 });
}

export const FROST_DRAGON_SKILLS: SkillDef[] = [
  { type: 'passive', name: 'Lồng Kính Băng', desc: 'Đầu trận và mỗi 3 lượt, một lồng kính băng bao quanh mình, chặn sát thương bằng 20% Sinh lực tối đa; lồng vỡ làm kẻ đánh nó chậm 1 lượt.' },
  {
    type: 'basic', name: 'Băng Trảo', desc: 'Bắn 3 mảnh băng vào 1 địch: mỗi mảnh 40% Công.', anim: 'attack', target: 'enemy',
    run: async ({ self, targets: [t], projectile, fx, wait }) => {
      for (let k = 0; k < 3; k++) {
        await projectile(1, self.mouth(), t.chest(), { dur: 300, scale: 0.32, rotate: false, flipX: self.facing > 0 });
        fx(2, t.chest(), { scale: 0.28, dur: 420 });
        t.hurt(); t.text(dmg(0.4));
        await wait(60);
      }
    },
  },
  {
    type: 'skill', name: 'Sừng Băng Trỗi Dậy', desc: 'Sừng phát sáng, cột băng đâm lên từ đất dưới tối đa 3 địch: 120% Công, giảm 30% Tốc độ trong 2 lượt.',
    anim: 'cast', target: 'enemies',
    run: async ({ self, targets, fx, wait }) => {
      fx(2, self.head(), { scale: 0.3, dur: 600 });
      fx(4, self.feet(), { scale: 0.45, ground: true, spin: 3, dur: 1200 });
      await wait(250);
      await Promise.all(targets.map(async (t, k) => {
        await wait(k * 140);
        fx(6, t.feet(), { scale: 0.5, ground: true, dur: 1300 });
        fx(5, t.feet(), { scale: 0.5, anchor: 'bottom', dur: 900 });
        t.hurt(); t.text(dmg(1.2)); t.text('Chậm', FROST);
      }));
    },
  },
  {
    type: 'ultimate', name: 'Bão Tuyết Pha Lê', desc: 'Gọi bão tuyết, pha lê lớn trút xuống toàn bộ địch: 3 đợt 70% Công, đóng băng 1 lượt.',
    anim: 'ultimate', target: 'enemies',
    run: async ({ self, targets, fx, projectile, wait }) => {
      fx(4, self.feet(), { scale: 0.6, ground: true, spin: 4, dur: 2600 });
      for (let wave = 0; wave < 3; wave++) {
        await Promise.all(targets.map(async (t, k) => {
          await wait(k * 90);
          const at = t.chest();
          await projectile(7, { x: at.x - 120 * self.facing, y: at.y - 480 }, at, { dur: 380, scale: 0.42, rotate: false });
          fx(8, at, { scale: 0.32, dur: 480 });
          t.hurt(); t.text(dmg(0.7));
        }));
        await wait(120);
      }
      targets.forEach(t => {   // locked in ice
        fx(3, t.feet(), { scale: 0.42, anchor: 'bottom', dur: 1400, hold: 300 });
        t.text('Đóng Băng', FROST);
      });
    },
  },
];
