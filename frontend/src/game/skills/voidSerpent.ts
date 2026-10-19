// Tử Xà Long (Hư Không) skills: it never fights in the line - its attacks come out of time rifts
// torn open beside the enemy line (ctx.rift: its own head reaches out of the tear).
// No vfx.png yet: the rift, the purple fire and the embers are code-drawn.
import type { SkillDef, Spot } from './types';

const dmg = (scale: number) => `-${Math.round((180 + Math.random() * 40) * scale)}`;
const FIRE = '#e98bff';

/** Where the rift opens: beside the enemy line (right of the rightmost one), a bit above their
 *  heads, so the head reaches out sideways at them. */
const beside = (ts: { feet(): Spot }[], dx = 0, dy = 0): Spot => {
  const xs = ts.map(t => t.feet());
  const x = Math.max(...xs.map(p => p.x)), y = xs.reduce((s, p) => s + p.y, 0) / Math.max(1, xs.length);
  return { x: x + 260 + dx, y: y - 150 + dy };
};

export const VOID_SERPENT_SKILLS: SkillDef[] = [
  { type: 'passive', name: 'Hư Không Xà Ảnh', desc: 'Không đứng trên sân đấu nên không bị chọn làm mục tiêu; đầu trận toàn đội +10% Tốc.' },
  {
    type: 'basic', name: 'Xà Ảnh Đoạt Hồn', desc: 'Cổng thời gian mở cạnh 1 địch, đầu rồng phóng ngang ra cắn: 120% Công, hút 1 lượt năng lượng.',
    anim: 'attack', target: 'enemy',
    run: ({ targets: [t], rift }) => rift(beside([t], -120, 40), [t], x => {
      x.hurt(); x.text(dmg(1.2)); x.text('-Năng lượng', '#d9a6ff');
    }, { bite: true, scale: 0.85 }),
  },
  {
    type: 'skill', name: 'Tử Diễm Hư Không', desc: 'Xé cổng thời gian cạnh đội hình địch, ló đầu ngang ra phun lửa tím quét toàn bộ đội hình địch: 100% Công, Thiêu Đốt 2 lượt.',
    anim: 'cast', target: 'enemies',
    run: ({ targets, rift }) => rift(beside(targets), targets, t => {
      t.hurt(); t.text(dmg(1)); t.text('Thiêu Đốt', FIRE);
    }),
  },
  {
    type: 'ultimate', name: 'Thời Không Liệt Hỏa', desc: 'Ba cổng thời gian mở cùng lúc, ba đầu rồng phun lửa đan chéo: 220% Công toàn bộ địch, giảm 30% hồi máu 3 lượt.',
    anim: 'ultimate', target: 'enemies',
    run: async ({ targets, rift, wait, shake }) => {
      shake(500, 0.01);
      const hits = (t: Parameters<Parameters<typeof rift>[2]>[0]) => { t.hurt(); t.text(dmg(0.75)); };
      await Promise.all([
        rift(beside(targets, 0, -120), targets, hits, { scale: 0.8, dur: 1800 }),
        wait(500).then(() => rift(beside(targets, 70, 10), [...targets].reverse(), hits, { scale: 0.95, dur: 1800 })),
        wait(1000).then(() => rift(beside(targets, 0, 140), targets, hits, { scale: 0.8, dur: 1800 })),
      ]);
      targets.forEach(t => t.text('-30% hồi máu', FIRE));
    },
  },
];
