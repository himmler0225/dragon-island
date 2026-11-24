// Rồng Rùa skills: two cannons rise out of its shell, its eyes light up and its mouth opens. vfx_1..8
// (skills/vfx.png): 1 eye flare, 2 muzzle flash (up), 3 energy ring, 4 energy shell (flying left),
// 5 impact explosion, 6 ground shockwave, 7 mouth blast (drawn pointing RIGHT), 8 sparks.
import type { SkillActor, SkillCtx, SkillDef, Spot } from './types';

const dmg = (scale: number) => `-${Math.round((160 + Math.random() * 40) * scale)}`;
const STUN = '#ffb08a';

/** The mouth of cannon k's barrel (0 near, 1 far), measured on its image: it follows the cannon as it rises. */
const muzzle = (self: SkillCtx['self'], k: number): Spot =>
  (k ? self.point('cannon_far', 0.261, 0.045) : self.point('cannon_near', 0.248, 0.045));

/** How far (field px) a shell's blast reaches round where it lands: every foe in it is hit. */
const BLAST = 420;
/** A ring of light on the ground under it while it fires (vfx 6, laid flat). */
const ring = (fx: SkillCtx['fx'], self: SkillCtx['self'], dur: number, scale = 0.42) =>
  fx(6, self.feet(), { scale, ground: true, dur });
/** A shell lands on `t`: a big explosion, and every foe within BLAST of it takes the hit. */
const blast = (fx: SkillCtx['fx'], t: SkillActor, all: SkillActor[], scale: number, onHit: (o: SkillActor) => void) => {
  const at = t.chest();
  fx(5, at, { scale, dur: 700 });
  fx(6, t.feet(), { scale: scale * 0.75, ground: true, dur: 800 });   // the blast ring spreading on the ground
  fx(8, at, { scale: scale * 0.8, dur: 900 });
  for (const o of all) if (Math.abs(o.chest().x - at.x) <= BLAST) onHit(o);
};

export const TURTLE_DRAGON_SKILLS: SkillDef[] = [
  { type: 'passive', name: 'Mai Đá Vàng', desc: 'Giảm 20% sát thương nhận vào từ đòn đánh thường.' },
  {
    type: 'basic', name: 'Song Pháo', desc: 'Mắt rực sáng, 2 khẩu pháo trồi lên từ mai nã 2 quả cầu năng lượng: mỗi quả nổ một vùng rộng, 55% Công lên mọi kẻ địch trong vùng nổ.',
    anim: 'attack', target: 'enemies',
    run: async ({ self, targets, fx, projectile, wait }) => {
      const t = targets[0];
      if (!t) return;
      fx(1, self.eye(), { scale: 0.2, dur: 500 });   // a flare as the eyes light up (the glow itself: the rig)
      ring(fx, self, 1300);
      for (let k = 0; k < 2; k++) {
        const from = muzzle(self, k);
        fx(2, from, { scale: 0.32, dur: 420, anchor: 'bottom' });   // the blast shoots up out of the barrel
        await projectile(4, from, t.chest(), { dur: 380, scale: 0.26, rotate: false, flipX: self.facing > 0 });
        blast(fx, t, targets, 0.75, o => { o.hurt(); o.text(dmg(0.55)); });
        await wait(90);
      }
    },
  },
  {
    type: 'skill', name: 'Hống Diệm', desc: 'Há miệng phun luồng năng lượng đỏ vào 1 địch, nổ lớn khi trúng: 140% Công lên mọi kẻ địch quanh chỗ nổ, 25% Choáng 1 lượt.',
    anim: 'cast', target: 'enemies',
    run: async ({ self, targets, fx, wait }) => {
      const t = targets[0];
      if (!t) return;
      fx(1, self.eye(), { scale: 0.2, dur: 500 });
      ring(fx, self, 1100);
      const m = self.mouth(), to = t.chest();
      fx(7, { x: (m.x + to.x) / 2, y: (m.y + to.y) / 2 }, { scale: 0.42, dur: 650, flipX: self.facing < 0 });
      await wait(250);
      blast(fx, t, targets, 0.9, o => {
        o.hurt(); o.text(dmg(1.4));
        if (Math.random() < 0.25) o.text('Choáng', STUN);
      });
    },
  },
  {
    type: 'ultimate', name: 'Kim Thạch Pháo Trận', desc: 'Mắt và nòng pháo rực sáng, vòng năng lượng tỏa ra dưới chân, pháo nã liên hồi xuống cả đội địch: 3 đợt nổ lớn 70% Công, chấn động dưới chân.',
    anim: 'ultimate', target: 'enemies',
    run: async ({ self, targets, fx, projectile, wait, shake }) => {
      if (!targets.length) return;
      fx(1, self.eye(), { scale: 0.2, dur: 500 });
      ring(fx, self, 2400, 0.55);
      for (let k = 0; k < 2; k++) fx(3, muzzle(self, k), { scale: 0.22, dur: 1200, spin: 0.6 });
      await wait(350);
      for (let wave = 0; wave < 3; wave++) {
        await Promise.all(targets.map(async (t, i) => {
          await wait(i * 70);
          const from = muzzle(self, (wave + i) % 2);
          fx(2, from, { scale: 0.3, dur: 380, anchor: 'bottom' });
          await projectile(4, from, t.chest(), { dur: 400, scale: 0.26, rotate: false, flipX: self.facing > 0 });
          fx(5, t.chest(), { scale: 0.8, dur: 700 });
          fx(6, t.feet(), { scale: 0.5, ground: true, dur: 700 });
          t.hurt(); t.text(dmg(0.7));
        }));
        shake(180, 0.004);
        await wait(110);
      }
      targets.forEach(t => { fx(6, t.feet(), { scale: 0.4, ground: true, dur: 900 }); fx(8, t.chest(), { scale: 0.3, dur: 800 }); });
    },
  },
];
