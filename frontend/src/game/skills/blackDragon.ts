// Hắc Long skills. Animations (skills/anims.png, tools/slice_skill_anims.py), each 10 frames on black:
// vfx_40..49 Đoạt Mệnh: a demon maw rises from a violet ring and lunges; vfx_50..59 Cuồng Nộ: a crown of flame
// flares round it (the last 5 loop while it rages); vfx_60..69 Hấp Huyết: a horned blood ring bursts and fades.
// Older effects still used: vfx_17..24 (basic.png: the violet arrows of its basic attack, skyfall.ts).
import type { SkillCtx, SkillDef } from './types';
import { volley } from './skyfall';

const dmg = (scale: number) => `-${Math.round((180 + Math.random() * 40) * scale)}`;
const BLOOD = 0xff3048, RAGE = '#ffb347';

/** The passive's flare: the crown of flame wrapped round it (just behind it, following it as it walks), burning on
 *  while `raging` holds (battle: from the first time it drops under half HP until it falls). */
export async function rage({ self, anim }: SkillCtx, raging: () => boolean, depth: number) {
  self.text('Cuồng Nộ', RAGE);
  await anim(50, 10, self.feet(), { anchor: 'bottom', scale: 1.25, fps: 14, loop: [5, 2600], hold: raging,
    follow: () => { const f = self.feet(); return { x: f.x, y: f.y + 20 }; }, depth: depth - 0.02, boost: 1 });
}

export const BLACK_DRAGON_SKILLS: SkillDef[] = [
  { type: 'passive', name: 'Cuồng Nộ', desc: 'Khi Sinh lực dưới 50%: vương miện lửa bùng lên, +40% Tốc độ và +25% tỉ lệ chí mạng trong 2 lượt (1 lần/trận).' },
  {
    type: 'basic', name: 'Hắc Trảo Tiễn', desc: 'Phóng 3 lưỡi năng lượng tím thẳng vào 1 mục tiêu: mỗi lưỡi 40% Công, nổ thành cột sáng.', anim: 'attack', target: 'enemy',
    run: async ctx => {
      const [t] = ctx.targets;
      await volley(ctx, t, 3, () => { t.hurt(); t.text(dmg(0.4)); });
    },
  },
  {
    type: 'skill', name: 'Hấp Huyết', desc: 'Vòng máu có sừng mở dưới chân toàn bộ địch rồi bùng lên: 60% Công, toàn đội hút máu 30% sát thương gây ra trong 2 lượt.',
    anim: 'cast', target: 'enemies',
    run: async ({ self, targets, anim, orb, wait }) => {
      await Promise.all(targets.map(async (t, k) => {
        await wait(k * 120);
        // the ring opens, the burst (frame 5) is the blow; then the stolen life flies back
        await anim(60, 10, t.feet(), { anchor: 'bottom', scale: 0.85, fps: 15, onFrame: f => { if (f === 5) { t.hurt(); t.text(dmg(0.6)); } } });
      }));
      await Promise.all(targets.map(t => orb(t.chest(), self.chest(), { tint: BLOOD, scale: 0.6, dur: 520 })));
      self.text('Hấp Huyết +30%', '#ff8a96');
    },
  },
  {
    type: 'ultimate', name: 'Đoạt Mệnh', desc: 'Gọi hàm quỷ từ vòng tím dưới chân mục tiêu, ngoạm xé nó: 300% Công lên 1 mục tiêu; mục tiêu dưới 30% Sinh lực bị tiêu diệt ngay.',
    anim: 'ultimate', target: 'enemy',
    run: async ({ targets: [t], anim, shake, wait }) => {
      // the maw rises (frames 0-4), lunges and bites (6), tears away into sparks
      // (drawn twice over, a little bigger: one copy read too faint on the field)
      await anim(40, 10, t.feet(), {
        anchor: 'bottom', scale: 1.35, fps: 12, boost: 1,
        onFrame: f => { if (f === 6) { shake(550, 0.014); t.hurt(); t.text(dmg(3), '#d9a6ff'); } },
      });
      await wait(120);
      t.text('ĐOẠT MỆNH', '#e7c4ff');
    },
  },
];
