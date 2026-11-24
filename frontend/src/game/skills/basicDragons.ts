// Rồng Lửa and Rồng Đất skills. Both skills/vfx.png sheets (vfx_1..8), drawn flying left:
// Rồng Lửa (fire only): 1 small fireball, 2 fire burst, 3 big fireball, 4 explosion, 5 burning ground,
//   6 falling flame, 7 ring of fire, 8 embers.
// Rồng Đất: 1 flying boulder, 2 rock impact, 3 ground shockwave, 4 stone spikes, 5 falling meteor rock,
//   6 crater, 7 dust cloud, 8 stone shield.
import type { SkillActor, SkillCtx, SkillDef } from './types';

const dmg = (scale: number) => `-${Math.round((150 + Math.random() * 40) * scale)}`;
const EMBER = '#ffab5a', ROCK = '#e8c48a';

/** A piece of effect n falling diagonally onto `t` (drawn falling down-left; mirrored for the other side). */
const fall = ({ self, projectile }: SkillCtx, n: number, t: SkillActor, scale: number) => {
  const to = t.chest();
  return projectile(n, { x: to.x - 260 * self.facing, y: to.y - 460 }, to, { dur: 420, scale, rotate: false, flipX: self.facing > 0 });
};

export const FIRE_DRAGON_SKILLS: SkillDef[] = [
  { type: 'passive', name: 'Tâm Hỏa', desc: 'Mỗi lần đánh trúng mục tiêu đang Thiêu Đốt: +10% Công trong 2 lượt.' },
  {
    type: 'basic', name: 'Đốm Lửa', desc: 'Khạc liền 2 đốm lửa nhỏ vào 1 địch: mỗi đốm 55% Công, 30% Thiêu Đốt.',
    anim: 'attack', target: 'enemy',
    run: async ({ self, targets: [t], projectile, fx, wait }) => {
      for (let k = 0; k < 2; k++) {
        await projectile(1, self.mouth(), t.chest(), { dur: 320, scale: 0.2, rotate: false, flipX: self.facing > 0 });
        fx(2, t.chest(), { scale: 0.22, dur: 480 });
        t.hurt(); t.text(dmg(0.55));
        await wait(80);
      }
      if (Math.random() < 0.3) t.text('Thiêu Đốt', EMBER);
    },
  },
  {
    type: 'skill', name: 'Cầu Lửa', desc: 'Khạc một quả cầu lửa lớn vào 1 địch: 140% Công, lửa cháy dưới chân, Thiêu Đốt 2 lượt.',
    anim: 'cast', target: 'enemy',
    run: async ({ self, targets: [t], projectile, fx, wait }) => {
      await projectile(3, self.mouth(), t.chest(), { dur: 420, scale: 0.3, rotate: false, flipX: self.facing > 0 });
      fx(4, t.chest(), { scale: 0.34, dur: 700 });
      fx(5, t.feet(), { scale: 0.36, anchor: 'bottom', dur: 1300 });
      t.hurt(); t.text(dmg(1.4)); t.text('Thiêu Đốt', EMBER);
      await wait(300);
      fx(8, t.chest(), { scale: 0.26, dur: 900 });
    },
  },
  {
    type: 'ultimate', name: 'Mưa Hỏa Vũ', desc: 'Vòng lửa bùng lên quanh mình, gọi mưa lông vũ lửa xuống toàn bộ địch: 3 đợt 70% Công, Thiêu Đốt 2 lượt.',
    anim: 'ultimate', target: 'enemies',
    run: async ctx => {
      const { self, targets, fx, wait } = ctx;
      fx(7, self.chest(), { scale: 0.42, dur: 1300, spin: 1.5 });
      await wait(350);
      for (let wave = 0; wave < 3; wave++) {
        await Promise.all(targets.map(async (t, k) => {
          await wait(k * 70);
          await fall(ctx, 6, t, 0.24);
          fx(2, t.chest(), { scale: 0.24, dur: 450 });
          t.hurt(); t.text(dmg(0.7));
        }));
        await wait(120);
      }
      targets.forEach(t => { fx(5, t.feet(), { scale: 0.32, anchor: 'bottom', dur: 1100 }); t.text('Thiêu Đốt', EMBER); });
    },
  },
];

export const EARTH_DRAGON_SKILLS: SkillDef[] = [
  { type: 'passive', name: 'Giáp Đá', desc: 'Giảm 15% sát thương nhận vào; khi dưới 30% Sinh lực, giảm thêm 15%.' },
  {
    type: 'basic', name: 'Ném Đá', desc: 'Khạc một tảng đá vào 1 địch: 110% Công.',
    anim: 'attack', target: 'enemy',
    run: async ({ self, targets: [t], projectile, fx }) => {
      await projectile(1, self.mouth(), t.chest(), { dur: 380, scale: 0.22, rotate: false, flipX: self.facing > 0 });
      fx(2, t.chest(), { scale: 0.26, dur: 550 });
      t.hurt(); t.text(dmg(1.1));
    },
  },
  {
    type: 'skill', name: 'Địa Chấn', desc: 'Dậm chân tạo sóng đất nứt lan qua toàn bộ địch: 80% Công, 25% Choáng 1 lượt.',
    anim: 'cast', target: 'enemies',
    run: async ({ self, targets, fx, wait, shake }) => {
      fx(3, self.feet(), { scale: 0.4, anchor: 'bottom', dur: 900, flipX: self.facing > 0 });
      shake(300, 0.004);
      await wait(250);
      await Promise.all(targets.map(async (t, k) => {
        await wait(k * 90);
        fx(4, t.feet(), { scale: 0.3, anchor: 'bottom', dur: 800 });
        t.hurt(); t.text(dmg(0.8));
        if (Math.random() < 0.25) t.text('Choáng', ROCK);
      }));
    },
  },
  {
    type: 'ultimate', name: 'Thiên Thạch Đá', desc: 'Khoác khiên đá, gọi thiên thạch rơi xuống toàn bộ địch: 3 đợt 75% Công, Choáng 1 lượt.',
    anim: 'ultimate', target: 'enemies',
    run: async ctx => {
      const { self, targets, fx, wait, shake } = ctx;
      fx(8, self.chest(), { scale: 0.4, dur: 1400, spin: 0.8 });
      await wait(350);
      for (let wave = 0; wave < 3; wave++) {
        await Promise.all(targets.map(async (t, k) => {
          await wait(k * 70);
          await fall(ctx, 5, t, 0.26);
          fx(6, t.feet(), { scale: 0.34, anchor: 'bottom', dur: 700 });
          t.hurt(); t.text(dmg(0.75));
        }));
        shake(200, 0.005);
        await wait(120);
      }
      targets.forEach(t => { fx(7, t.feet(), { scale: 0.34, anchor: 'bottom', dur: 1200 }); t.text('Choáng', ROCK); });
    },
  },
];
