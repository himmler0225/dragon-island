// Bất Tử Điểu skills: phoenix fire. vfx_1..8 (skills/vfx.png), drawn flying left: 1 flaming feather dart,
// 2 fire burst, 3 fire wind wave, 4 big explosion, 5 falling flame feather, 6 ring of fire on the ground,
// 7 rising phoenix of flame (rebirth), 8 embers.
import type { SkillDef } from './types';

const dmg = (scale: number) => `-${Math.round((180 + Math.random() * 40) * scale)}`;
const EMBER = '#ffc46a';

export const IMMORTAL_BIRD_SKILLS: SkillDef[] = [
  { type: 'passive', name: 'Bất Tử', desc: 'Lần đầu bị hạ trong trận: tái sinh từ tro lửa với 30% Sinh lực.' },
  {
    type: 'basic', name: 'Hỏa Vũ Tiễn', desc: 'Phóng liền 2 chiếc lông lửa vào 1 địch: mỗi chiếc 55% Công, 30% Thiêu Đốt.',
    anim: 'attack', target: 'enemy',
    run: async ({ self, targets: [t], projectile, fx, wait }) => {
      for (let k = 0; k < 2; k++) {
        await projectile(1, self.mouth(), t.chest(), { dur: 320, scale: 0.22, rotate: false, flipX: self.facing > 0 });
        fx(2, t.chest(), { scale: 0.26, dur: 500 });
        t.hurt(); t.text(dmg(0.55));
        await wait(80);
      }
      if (Math.random() < 0.3) t.text('Thiêu Đốt', EMBER);
    },
  },
  {
    type: 'skill', name: 'Phượng Diệm Phong', desc: 'Vỗ cánh thổi sóng gió lửa qua mọi kẻ địch phía trước: 100% Công, nổ lửa, Thiêu Đốt 2 lượt.',
    anim: 'cast', target: 'enemies',
    run: async ({ self, targets, fx, wait }) => {
      const c = self.chest();
      fx(3, { x: c.x + 220 * self.facing, y: c.y + 20 }, { scale: 0.5, dur: 800, flipX: self.facing > 0 });
      await wait(300);
      targets.forEach(t => { fx(4, t.chest(), { scale: 0.34, dur: 700 }); t.hurt(); t.text(dmg(1)); t.text('Thiêu Đốt', EMBER); });
    },
  },
  {
    type: 'ultimate', name: 'Niết Bàn Hỏa Vũ', desc: 'Hóa thân phượng hoàng lửa, gọi vòng lửa dưới chân và mưa lông vũ lửa xuống toàn bộ địch: 3 đợt 75% Công, Thiêu Đốt 2 lượt.',
    anim: 'ultimate', target: 'enemies',
    run: async ({ self, targets, fx, projectile, wait }) => {
      fx(7, self.chest(), { scale: 0.5, dur: 1600 });
      targets.forEach(t => fx(6, t.feet(), { scale: 0.38, ground: true, dur: 2600 }));
      await wait(400);
      for (let wave = 0; wave < 3; wave++) {
        await Promise.all(targets.map(async (t, k) => {
          await wait(k * 70);
          const to = t.chest();
          await projectile(5, { x: to.x - 240 * self.facing, y: to.y - 440 }, to, { dur: 420, scale: 0.22, rotate: false, flipX: self.facing > 0 });
          fx(2, to, { scale: 0.28, dur: 450 });
          t.hurt(); t.text(dmg(0.75));
        }));
        await wait(110);
      }
      targets.forEach(t => { fx(8, t.chest(), { scale: 0.3, dur: 1000 }); t.text('Thiêu Đốt', EMBER); });
    },
  },
];
