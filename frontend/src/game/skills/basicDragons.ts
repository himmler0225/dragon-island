// Basic chibi dragon skills.
import type { SkillDef } from './types';

const dmg = (scale: number) => `-${Math.round((150 + Math.random() * 40) * scale)}`;
const FIRE = 0xff6a1a, EMBER = '#ffab5a';
const SAND = 0xd9a45a, ROCK = '#e8c48a';

export const FIRE_DRAGON_SKILLS: SkillDef[] = [
  { type: 'passive', name: 'Tâm Hỏa', desc: 'Mỗi lần đánh trúng mục tiêu đang Thiêu Đốt: +10% Công trong 2 lượt.' },
  {
    type: 'basic', name: 'Cắn Lửa', desc: 'Lao tới cắn bằng hàm răng rực lửa: 100% Công lên 1 địch, 30% Thiêu Đốt.',
    anim: 'attack', target: 'enemy',
    run: async ({ targets: [t], bite }) => {
      await bite(t.chest(), { scale: 0.55, tint: FIRE });
      t.hurt(); t.text(dmg(1));
    },
  },
  {
    type: 'skill', name: 'Cầu Lửa', desc: 'Khạc một quả cầu lửa vào 1 địch: 140% Công, Thiêu Đốt 2 lượt.',
    anim: 'cast', target: 'enemy',
    run: async ({ self, targets: [t], orb }) => {
      await orb(self.mouth(), t.chest(), { tint: FIRE, scale: 1.1, dur: 380 });
      t.hurt(); t.text(dmg(1.4)); t.text('Thiêu Đốt', EMBER);
    },
  },
  {
    type: 'ultimate', name: 'Mưa Hỏa Vũ', desc: 'Vỗ cánh gọi mưa lông vũ lửa xuống toàn bộ địch: 3 đợt 70% Công, Thiêu Đốt 2 lượt.',
    anim: 'ultimate', target: 'enemies',
    run: async ({ targets, elementRain }) => {
      await elementRain(targets, t => { t.hurt(); t.text(dmg(0.7)); }, { tint: FIRE, core: 0xfff2a0, shape: 'feather', waves: 3, perTarget: 2 });
      targets.forEach(t => t.text('Thiêu Đốt', EMBER));
    },
  },
];

export const EARTH_DRAGON_SKILLS: SkillDef[] = [
  { type: 'passive', name: 'Giáp Đá', desc: 'Giảm 15% sát thương nhận vào; khi dưới 30% Sinh lực, giảm thêm 15%.' },
  {
    type: 'basic', name: 'Hàm Đá', desc: 'Ngoạm bằng hàm răng đá: 110% Công lên 1 địch.',
    anim: 'attack', target: 'enemy',
    run: async ({ targets: [t], bite }) => {
      await bite(t.chest(), { scale: 0.6, tint: SAND });
      t.hurt(); t.text(dmg(1.1));
    },
  },
  {
    type: 'skill', name: 'Địa Chấn', desc: 'Dậm chân tạo sóng chấn động lan qua toàn bộ địch: 80% Công, 25% Choáng 1 lượt.',
    anim: 'cast', target: 'enemies',
    run: async ({ self, targets, gust }) => {
      await gust(self.feet(), self.facing, { reach: 520, scale: 1.1, tint: SAND });
      targets.forEach(t => { t.hurt(); t.text(dmg(0.8)); if (Math.random() < 0.25) t.text('Choáng', ROCK); });
    },
  },
  {
    type: 'ultimate', name: 'Thiên Thạch Đá', desc: 'Gầm vang gọi mưa đá rơi xuống toàn bộ địch: 3 đợt 75% Công, Choáng 1 lượt.',
    anim: 'ultimate', target: 'enemies',
    run: async ({ targets, elementRain, splash }) => {
      await elementRain(targets, t => { t.hurt(); t.text(dmg(0.75)); }, { tint: SAND, core: 0xfff0d0, shape: 'shard', waves: 3, perTarget: 2 });
      targets.forEach(t => { splash(t.feet(), { scale: 0.6 }); t.text('Choáng', ROCK); });
    },
  },
];
