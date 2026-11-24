// Rồng Nụ Tầm Xuân skills. Animations (skills/anims.png, tools/slice_skill_anims.py), each 10 frames on black:
// vfx_40..49 Mưa Cánh Tầm Xuân: a pink ring opens, a wild rose blooms and petals pour down;
// vfx_50..59 Dây Gai Quấn Chân: thorny vines burst from a rose circle and knot round the foe;
// vfx_60..69 Nụ Xuân Hồi Sinh: a rosebud blooms in a green healing glow. The basic attack is code-drawn orbs.
import type { SkillCtx, SkillDef } from './types';

const dmg = (scale: number) => `-${Math.round((170 + Math.random() * 40) * scale)}`;
const ROSE = 0xff7ad0, ROOT = '#b6f28a', HEAL = '#8dff9a';

/** The passive (battle: every BLOOM_EVERY s once it is fighting): a rosebud blooms at its feet, `heal` HP back. */
export async function bloom({ self, anim }: SkillCtx, heal: number, depth: number) {
  await anim(60, 10, self.feet(), { anchor: 'bottom', scale: 0.9, fps: 13, depth: depth + 0.02,
    follow: () => { const f = self.feet(); return { x: f.x, y: f.y + 16 }; },
    onFrame: k => { if (k === 4) self.text(`+${heal}`, HEAL); } });
}

export const ROSEBUD_DRAGON_SKILLS: SkillDef[] = [
  { type: 'passive', name: 'Nụ Xuân Hồi Sinh', desc: 'Cứ một lúc, nụ tầm xuân dưới chân nở ra, hồi 8% máu tối đa cho bản thân. Né tránh +10%.' },
  {
    type: 'basic', name: 'Gai Hoa Tầm Xuân', desc: 'Phóng 2 gai hoa vào 1 địch: mỗi gai 50% Công.', anim: 'attack', target: 'enemy',
    run: async ({ self, targets: [t], orb, wait }) => {
      for (let k = 0; k < 2; k++) {
        await orb(self.mouth(), t.chest(), { tint: ROSE, scale: 0.5, dur: 320 });
        t.hurt(); t.text(dmg(0.5));
        await wait(70);
      }
    },
  },
  {
    type: 'skill', name: 'Dây Gai Quấn Chân', desc: 'Quất dây gai về phía trước, trúng tối đa 3 địch: 110% Công, 35% Trói Chân 1 lượt.',
    anim: 'cast', target: 'enemies',
    run: async ({ targets, anim, wait }) => {
      // the vines rise round each foe; they knot shut (frame 4) on the blow
      await Promise.all(targets.map(async (t, k) => {
        await wait(k * 110);
        await anim(50, 10, t.feet(), { anchor: 'bottom', scale: 0.95, fps: 14, onFrame: f => {
          if (f === 4) { t.hurt(); t.text(dmg(1.1)); if (Math.random() < 0.35) t.text('Trói Chân', ROOT); }
        } });
      }));
    },
  },
  {
    type: 'ultimate', name: 'Mưa Cánh Tầm Xuân', desc: 'Gọi mưa cánh hoa tầm xuân trút xuống toàn bộ địch: 3 đợt 60% Công, Trói Chân 1 lượt.',
    anim: 'ultimate', target: 'enemies',
    run: async ({ targets, anim, wait }) => {
      // over each foe the ring opens and the rose blooms; the petals pour down in 3 waves (frames 4, 6, 8)
      await Promise.all(targets.map(async (t, k) => {
        await wait(k * 90);
        await anim(40, 10, t.feet(), { anchor: 'bottom', scale: 1.15, fps: 11, onFrame: f => {
          if (f === 4 || f === 6 || f === 8) { t.hurt(); t.text(dmg(0.6)); }
        } });
        t.text('Trói Chân', ROOT);
      }));
    },
  },
];
