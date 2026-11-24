// Rồng Phi Tuyết skills. Animations (skills/anims.png, tools/slice_skill_anims.py), each 10 frames on black:
// vfx_40..49 Bão Tuyết Thiên Phi: a snow-cloud ring with a great snowflake, ice shards pour down, crystals spike up;
// vfx_50..59 Quạt Gió Tuyết: two icy wings sweep a crescent of freezing wind (drawn blowing right);
// vfx_60..69 Cánh Tuyết Phiêu Diêu: icy feathers and flakes circling round it. The basic attack is code-drawn orbs.
import type { SkillCtx, SkillDef } from './types';

const dmg = (scale: number) => `-${Math.round((170 + Math.random() * 40) * scale)}`;
const SNOW = 0xeafcff, FROST = '#d4f6ff';

/** The passive's shimmer (battle: every DRIFT_EVERY s once it is fighting): snow wings circling round it. */
export async function drift({ self, anim }: SkillCtx, depth: number) {
  await anim(60, 10, self.feet(), { anchor: 'bottom', scale: 1.0, fps: 13, depth: depth + 0.02,
    follow: () => { const f = self.feet(); return { x: f.x, y: f.y + 16 }; },
    onFrame: k => { if (k === 5) self.text('Phiêu Diêu', FROST); } });
}

export const SNOWFLIGHT_DRAGON_SKILLS: SkillDef[] = [
  { type: 'passive', name: 'Cánh Tuyết Phiêu Diêu', desc: 'Né tránh +12%. Mỗi khi né được đòn, đòn đánh kế tiếp gây thêm 30% sát thương và làm Chậm mục tiêu 1 lượt.' },
  {
    type: 'basic', name: 'Bông Tuyết Xoáy', desc: 'Bắn 3 bông tuyết xoáy vào 1 địch: mỗi bông 40% Công.', anim: 'attack', target: 'enemy',
    run: async ({ self, targets: [t], orb, wait }) => {
      for (let k = 0; k < 3; k++) {
        await orb(self.mouth(), t.chest(), { tint: SNOW, scale: 0.55, dur: 300 });
        t.hurt(); t.text(dmg(0.4));
        await wait(60);
      }
    },
  },
  {
    type: 'skill', name: 'Quạt Gió Tuyết', desc: 'Vỗ đôi cánh tiên quạt gió tuyết về phía trước, trúng tối đa 3 địch: 120% Công, giảm 35% Tốc độ trong 2 lượt.',
    anim: 'cast', target: 'enemies',
    run: async ({ self, targets, anim, wait }) => {
      // the wings sweep their gust over each foe (blowing away from it), the wind hits at its widest (frame 4)
      await Promise.all(targets.map(async (t, k) => {
        await wait(k * 100);
        const c = t.chest();
        await anim(50, 10, { x: c.x, y: c.y + 40 }, { anchor: 'bottom', scale: 0.95, fps: 14, flipX: self.facing < 0,
          onFrame: f => { if (f === 4) { t.hurt(); t.text(dmg(1.2)); t.text('Chậm', FROST); } } });
      }));
    },
  },
  {
    type: 'ultimate', name: 'Bão Tuyết Thiên Phi', desc: 'Bay vút lên gọi bão tuyết trút xuống toàn bộ địch: 3 đợt 70% Công, đóng băng 1 lượt.',
    anim: 'ultimate', target: 'enemies',
    run: async ({ targets, anim, wait }) => {
      // over each foe the snow clouds swirl, the shards pour down in 3 waves (frames 5, 6, 7), the ice spikes up
      await Promise.all(targets.map(async (t, k) => {
        await wait(k * 90);
        await anim(40, 10, t.feet(), { anchor: 'bottom', scale: 1.15, fps: 11, onFrame: f => {
          if (f >= 5 && f <= 7) { t.hurt(); t.text(dmg(0.7)); }
        } });
        t.text('Đóng Băng', FROST);
      }));
    },
  },
];
