// Phượng Hoàng Lửa / Băng: the same phoenix in two elements, one set of moves.
// Basic (talon dive), skill (wing gust) and the main skill (ultimate), choreographed in STRIKES.phoenix: crouch with the wings folded -> head up,
// chest out -> wings raised high and beaten down (a short take-off) -> a summoning ring opens above
// every enemy -> fireballs (Lửa) / ice beams (Băng) rain down in waves -> it lands and folds its wings.
// vfx (same slots in both sheets):
//   1 fireball (tail up) / ice beam (vertical, pointing down)   2 fire trail / ice beam tip
//   3 summon ring   4 feathers   5 explosion / ice shatter   6 ground fire / frozen ground
//   7 wing gust (points right)   8 embers / snowflakes
// vfx2 (9-16): 9 talon slash, 10 dive trail (down-left), 11 claw impact, 12 burn / frost mark,
//   13 crescent (points right), 14 feather storm, 15 heat wave / blizzard arc, 16 scorched / frozen ground
import type { SkillActor, SkillCtx, SkillDef, Spot } from './types';

const dmg = (scale: number) => `-${Math.round((180 + Math.random() * 40) * scale)}`;

interface Element {
  kind: 'fire' | 'ice';
  passive: [name: string, desc: string];
  basic: string;         // basic attack name
  skill: string;         // skill name
  text: string;          // status text colour
  name: string;          // skill name
  status: string;        // status applied by the rain
}

const WAVES = 3, PER = 3;   // waves, pieces per enemy per wave

/** Where the summoning ring opens: high above the enemy, kept inside the view. */
const skyOver = (t: SkillActor): Spot => ({ x: t.feet().x, y: t.feet().y - 330 });

/** One fireball: it falls from the ring with a fire trail, explodes and sets the ground on fire. */
async function fireball(ctx: SkillCtx, t: SkillActor, k: number) {
  const s = skyOver(t), dx = (k - (PER - 1) / 2) * 40;
  const from = { x: s.x + dx, y: s.y }, to = { x: t.feet().x + dx * 0.5, y: t.chest().y + 20 };
  ctx.fx(2, { x: from.x, y: to.y }, { scale: 0.32, anchor: 'bottom', dur: 420 });
  await ctx.projectile(1, from, to, { dur: 300, scale: 0.26, rotate: false });
  ctx.fx(5, to, { scale: 0.28, dur: 460 });
  ctx.fx(6, { x: to.x, y: t.feet().y }, { scale: 0.24, anchor: 'bottom', dur: 800 });
}

/** One ice beam: it shoots straight down from the ring onto the enemy, then the ice shatters. */
async function iceBeam(ctx: SkillCtx, t: SkillActor, k: number) {
  const s = skyOver(t), dx = (k - (PER - 1) / 2) * 46;
  const foot = { x: t.feet().x + dx, y: t.feet().y };
  // the beam image is a vertical column (bottom = impact): standing on the target, it reaches the ring
  ctx.fx(1, foot, { scale: 0.42, anchor: 'bottom', dur: 420 });
  ctx.fx(2, { x: foot.x, y: s.y + 80 }, { scale: 0.14, dur: 240 });
  await ctx.wait(180);
  ctx.fx(5, { x: foot.x, y: t.chest().y + 20 }, { scale: 0.2, dur: 420 });
  ctx.fx(6, foot, { scale: 0.22, anchor: 'bottom', dur: 900 });
}

function phoenixSkills(el: Element): SkillDef[] {
  return [
    { type: 'passive', name: el.passive[0], desc: el.passive[1] },
    {
      // Phượng Trảo: dives with the talons and rakes the target; a burst of element and feathers
      type: 'basic', name: el.basic, anim: 'attack', target: 'enemy',
      desc: `Bổ nhào từ trên không, móng vuốt ${el.kind === 'fire' ? 'rực lửa' : 'phủ băng'} cào 100% Công lên 1 mục tiêu, 30% gây ${el.status} 1 lượt.`,
      run: async ({ self, targets: [t], fx, wait }) => {
        const c = t.chest(), flip = self.facing > 0;   // art points down-left; mirrored when facing right
        fx(10, { x: c.x - 60 * self.facing, y: c.y - 50 }, { scale: 0.34, dur: 380, flipX: flip });   // dive trail
        await wait(120);
        fx(9, c, { scale: 0.32, dur: 420, flipX: flip });    // talon slash
        fx(11, c, { scale: 0.26, dur: 460 });                // claw impact
        t.hurt(); t.text(dmg(1));
        await wait(180);
        fx(12, t.head(), { scale: 0.22, dur: 900 });         // burn / frost mark
        if (Math.random() < 0.3) t.text(el.status, el.text);
      },
    },
    {
      // Phượng Dực Phong: one huge wing beat - a crescent of element rolls through the whole enemy
      // line, and the ground under each enemy burns / freezes
      type: 'skill', name: el.skill, anim: 'cast', target: 'enemies',
      desc: `Dang cánh quạt mạnh một luồng ${el.kind === 'fire' ? 'gió lửa' : 'gió băng'} quét qua toàn bộ địch: 90% Công, ${el.kind === 'fire' ? 'Thiêu Đốt 2 lượt' : 'giảm 30% Tốc 2 lượt'}.`,
      run: async ({ self, targets, fx, projectile, wait }) => {
        const c = self.chest(), dir = self.facing, flip = dir < 0;
        const far = targets.reduce((a, t) => (Math.abs(t.chest().x - c.x) > Math.abs(a - c.x) ? t.chest().x : a), c.x + 300 * dir);
        fx(14, { x: c.x + 110 * dir, y: c.y }, { scale: 0.34, dur: 800, flipX: flip });   // feather storm off the wings
        // two crescents roll through the whole enemy line, a heat wave / blizzard arc right behind
        const waves = [0, 1].map(k => wait(k * 160).then(() =>
          projectile(13, { x: c.x + 70 * dir, y: c.y + k * 30 }, { x: far + 90 * dir, y: c.y + k * 30 + 20 },
            { dur: 560, scale: 0.34 - k * 0.05, rotate: false, flipX: flip })));
        void wait(220).then(() => projectile(15, { x: c.x + 60 * dir, y: c.y + 50 }, { x: far + 60 * dir, y: c.y + 70 },
          { dur: 640, scale: 0.3, rotate: false, flipX: flip }));
        await wait(300);
        targets.forEach(t => {
          fx(16, t.feet(), { scale: 0.26, anchor: 'bottom', dur: 1200 });   // scorched / frozen ground
          fx(12, t.chest(), { scale: 0.2, dur: 700 });
          t.hurt(); t.text(dmg(0.9)); t.text(el.kind === 'fire' ? 'Thiêu Đốt' : '-Tốc', el.text);
        });
        await Promise.all(waves);
      },
    },
    {
      type: 'ultimate', name: el.name, anim: 'ultimate', target: 'enemies',
      desc: `Thu cánh lấy đà, ngẩng đầu vỗ cánh triệu hồi ${el.kind === 'fire' ? 'mưa cầu lửa' : 'những tia băng'} từ trời giáng xuống: ${WAVES} đợt 70% Công toàn bộ địch, ${el.status} 2 lượt.`,
      run: async ctx => {
        const { self, targets, fx, wait } = ctx;
        // the wing beat: a gust both ways and a few feathers
        const c = self.chest();
        fx(7, { x: c.x + 150, y: c.y + 30 }, { scale: 0.42, dur: 650 });
        fx(7, { x: c.x - 150, y: c.y + 30 }, { scale: 0.42, dur: 650, flipX: true });
        fx(4, c, { scale: 0.4, dur: 1200 });
        // the summoning ring over every enemy, held through the whole rain
        targets.forEach(t => fx(3, skyOver(t), { scale: 0.42, dur: 600, hold: 2200, spin: 0.4 }));
        await wait(450);
        const hit = el.kind === 'fire' ? fireball : iceBeam;
        for (let w = 0; w < WAVES; w++) {
          await Promise.all(targets.map(async (t, i) => {
            await wait(i * 80);
            // ice beams are big columns of light: 2 per enemy (3 washed the screen out), staggered more
            const n = el.kind === 'ice' ? 2 : PER, gap = el.kind === 'ice' ? 200 : 120;
            const shots = Array.from({ length: n }, (_, k) => wait(k * gap).then(() => hit(ctx, t, k)));
            await shots[0];
            t.hurt(); t.text(dmg(0.7));
            await Promise.all(shots);
          }));
          await wait(180);
        }
        targets.forEach(t => {
          fx(8, t.chest(), { scale: 0.32, dur: 1200 });
          t.text(el.status, el.text);
        });
      },
    },
  ];
}

export const PHUONG_HOANG_LUA_SKILLS = phoenixSkills({ kind: 'fire', passive: ['Niết Bàn', 'Lần đầu bị hạ: tái sinh từ tro lửa với 40% Sinh lực, gây 50% Công lên toàn bộ địch xung quanh.'], basic: 'Hỏa Phượng Trảo', skill: 'Hỏa Dực Phong', text: '#ffb066', name: 'Phượng Hỏa Thiên Vũ', status: 'Thiêu Đốt' });
export const PHUONG_HOANG_BANG_SKILLS = phoenixSkills({ kind: 'ice', passive: ['Băng Tâm Hộ Thể', 'Nhận Lá Chắn Băng 15% Sinh lực mỗi 2 lượt; kẻ đánh thường vào Phượng Hoàng Băng bị giảm 15% Tốc.'], basic: 'Băng Phượng Trảo', skill: 'Băng Dực Phong', text: '#bfe9ff', name: 'Phượng Băng Thiên Vũ', status: 'Đóng Băng' });
