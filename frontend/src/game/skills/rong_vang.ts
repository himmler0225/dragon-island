// Rồng Vàng (Kim) and Rồng Bạc (Nguyệt) skills: the same upright feathered dragon in two colours,
// so one set of moves with its own names; each species' vfx.png gives the colour (gold / silver).
// vfx: 1 claw X slash, 2 hit spark, 3 mouth charge swirl, 4 light beam (points right), 5 beam impact,
//      6 light pillar falling, 7 ground shock-wave ring, 8 falling feathers
// Signature moves (no other dragon has them): an X rake that hits twice, a straight light BEAM from
// the mouth (charge -> beam -> impacts down the line), and pillars of light with a ground ring.
import type { SkillDef } from './types';

const dmg = (scale: number) => `-${Math.round((180 + Math.random() * 40) * scale)}`;

interface Look {
  text: string;          // floating status text colour
  names: [passive: string, basic: string, skill: string, ultimate: string];
  passive: string;       // passive description
}

function twinSkills(look: Look): SkillDef[] {
  const [passive, basic, skill, ultimate] = look.names;
  return [
    { type: 'passive', name: passive, desc: look.passive },
    {
      // Song Trảo: rakes both claws down in an X - two hits, the second one heavier
      type: 'basic', name: basic, desc: 'Lao tới cào chéo bằng hai vuốt: 2 lần 60% Công lên 1 mục tiêu.', anim: 'attack', target: 'enemy',
      run: async ({ self, targets: [t], fx, wait, shake }) => {
        const c = t.chest(), flip = self.facing < 0;
        fx(1, c, { scale: 0.42, dur: 380, flipX: flip, angle: -0.25 });
        fx(2, c, { scale: 0.28, dur: 300 });
        t.hurt(); t.text(dmg(0.6));
        await wait(170);
        fx(1, c, { scale: 0.5, dur: 420, flipX: !flip, angle: 0.25 });
        fx(2, c, { scale: 0.4, dur: 380 });
        shake(160, 0.005);
        t.hurt(); t.text(dmg(0.6));
      },
    },
    {
      // Long Quang: light gathers in the mouth, then one straight beam scorches every enemy in a line
      type: 'skill', name: skill, desc: 'Tụ sáng trong miệng rồi phun một luồng sáng thẳng: 110% Công lên toàn bộ địch trên đường, giảm 20% Thủ 2 lượt.',
      anim: 'cast', target: 'enemies',
      run: async ({ self, targets, fx, beam, wait, shake }) => {
        const m = self.mouth();
        fx(3, m, { scale: 0.32, dur: 650, spin: 2.5 });
        await wait(420);
        // aim past the farthest enemy so the beam crosses the whole line
        const far = targets.reduce((a, t) => (Math.abs(t.chest().x - m.x) > Math.abs(a.x - m.x) ? t.chest() : a), { x: m.x + 300 * self.facing, y: m.y });
        const end = { x: m.x + (far.x - m.x) * 1.25, y: m.y + (far.y - m.y) * 1.25 };
        shake(420, 0.006);
        await beam(4, m, end, { dur: 800, width: 0.42 });
        targets.forEach(t => {
          fx(5, t.chest(), { scale: 0.42, dur: 520 });
          t.hurt(); t.text(dmg(1.1)); t.text('-Thủ', look.text);
        });
      },
    },
    {
      // Thiên Long Giáng: soars up, dives and stamps - a shock ring spreads, pillars of light fall on
      // every enemy and feathers drift down
      type: 'ultimate', name: ultimate, desc: 'Vút lên rồi lao xuống đạp đất: cột sáng giáng xuống, 200% Công toàn bộ địch, choáng 1 lượt.',
      anim: 'ultimate', target: 'enemies',
      run: async ({ self, targets, fx, wait, shake }) => {
        await wait(150);
        const f = self.feet();
        fx(7, f, { scale: 0.85, ground: true, dur: 1300 });
        shake(600, 0.015);
        await Promise.all(targets.map(async (t, k) => {
          await wait(120 + k * 110);
          fx(6, t.feet(), { scale: 0.62, anchor: 'bottom', dur: 1100 });
          fx(7, t.feet(), { scale: 0.45, ground: true, dur: 900 });
          await wait(180);
          t.hurt(); t.text(dmg(2)); t.text('Choáng', look.text);
          fx(8, t.head(), { scale: 0.4, dur: 1500 });
        }));
      },
    },
  ];
}

export const RONG_VANG_SKILLS = twinSkills({
  text: '#ffe08a',
  names: ['Kim Long Giáp', 'Song Trảo Kim', 'Hống Long Quang', 'Thiên Long Giáng'],
  passive: 'Kim quang: đòn đánh thường có 25% xuyên giáp; khi Rồng Bạc cùng đội, +10% Công cả hai.',
});

export const RONG_BAC_SKILLS = twinSkills({
  text: '#d8f0ff',
  names: ['Ngân Nguyệt Giáp', 'Song Trảo Ngân', 'Nguyệt Long Quang', 'Nguyệt Long Giáng'],
  passive: 'Ánh trăng: đầu mỗi lượt hồi 4% Sinh lực; khi Rồng Vàng cùng đội, +10% Tốc cả hai.',
});
