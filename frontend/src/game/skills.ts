// Skills of each species: names/descriptions for the HUD and what happens on the island when one
// is used. Plain TS (no Phaser) so React can import the names and icons.
//
// Effect images come from public/dragons/<id>/skills/vfx_<n>.png (tools/slice_skills.py), drawn
// with additive blending (black = transparent). `run` is called at the moment the blow lands
// (STRIKES[anim].hit in rig.ts); the scene supplies the helpers in SkillCtx.
// Damage / heal numbers here are only for show — real combat maths belongs in the backend.
import type { StrikeKind } from './rig';
import type { SpeciesId } from './species';

export type SkillSlot = 'basic' | 'skill' | 'ultimate';
export type SkillType = 'passive' | SkillSlot;

export interface Spot { x: number; y: number }

export interface FxOpts {
  scale?: number;
  /** Total life in ms (fade in, hold, fade out). */
  dur?: number;
  /** Extra ms held at full strength (status overlays). */
  hold?: number;
  /** Radians turned over the effect's life. */
  spin?: number;
  /** Lay it flat on the ground (squashed, drawn under the dragons). */
  ground?: boolean;
  /** Which point of the image sits on the spot. Default: centre. */
  anchor?: 'center' | 'bottom';
  flipX?: boolean;
  /** Turn the image (radians), e.g. to point a slash at the target. */
  angle?: number;
  /** Recolour the effect (e.g. 0xff3040 for a blood-red drain). */
  tint?: number;
}

export interface SkillActor {
  readonly id: SpeciesId;
  chest(): Spot;
  feet(): Spot;
  /** Just above the head. */
  head(): Spot;
  hurt(): void;
  text(text: string, color?: string): void;
  /** Knock back by `dx` world px (sign = direction); only dragons move. */
  push?(dx: number): void;
}

export interface SkillCtx {
  self: SkillActor & { mouth(): Spot; facing: 1 | -1 };
  /** Resolved from the skill's `target`: nearest dragon, all other dragons, or the whole team. */
  targets: SkillActor[];
  fx(n: number, at: Spot, opts?: FxOpts): void;
  /** Fly effect n from `from` to `to`, pointed along the way; resolves on arrival. */
  projectile(n: number, from: Spot, to: Spot, opts?: { dur?: number; scale?: number; tint?: number; rotate?: boolean; flipX?: boolean }): Promise<void>;
  wait(ms: number): Promise<void>;
  shake(ms: number, intensity: number): void;
  /** Giant jaws open over `at` and snap shut; resolves at the snap. */
  bite(at: Spot, opts?: { scale?: number; tint?: number }): Promise<void>;
  /** Crescent wind waves rolling from `from` in direction `dir`; resolves when they reach `reach` px. */
  gust(from: Spot, dir: 1 | -1, opts?: { reach?: number; scale?: number; tint?: number }): Promise<void>;
  /** Bones raining down on `at`; resolves on impact. */
  boneRain(at: Spot, opts?: { count?: number; scale?: number }): Promise<void>;
  /** A glowing orb spat from `from` to `to` with a trail; resolves on arrival. */
  orb(from: Spot, to: Spot, opts?: { scale?: number; tint?: number; dur?: number }): Promise<void>;
  /** Water splash at `at`: foam rings and droplets (`big` adds a falling water pillar). */
  splash(at: Spot, opts?: { scale?: number; big?: boolean }): void;
}

export interface SkillDef {
  type: SkillType;
  name: string;
  desc: string;
  /** Pose played by the rig; passives have none. */
  anim?: StrikeKind;
  target?: 'enemy' | 'enemies' | 'team';
  run?(ctx: SkillCtx): Promise<void> | void;
}

const dmg = (scale: number) => `-${Math.round((180 + Math.random() * 40) * scale)}`;
const HEAL = '#7dffa0';

/** A golden dragon head flies from the mouth straight through every target in front, hitting each as it passes. */
async function spitDragonHead({ self, targets, fx, projectile, wait }: SkillCtx, scale: number) {
  const dir = self.facing, m = self.mouth();
  const enemies = targets.filter(t => t.id !== self.id);
  const far = Math.max(380, ...enemies.map(t => Math.abs(t.chest().x - m.x) + 140));
  const end = { x: m.x + far * dir, y: m.y + 10 };
  const ms = far / 0.9;                                         // ~900 px per second
  fx(3, m, { scale: 0.45, dur: 350 });
  fx(2, { x: m.x + far * 0.5 * dir, y: m.y + 6 }, { scale: 0.9, dur: ms + 250, flipX: dir < 0 });
  const flight = projectile(1, m, end, { dur: ms, scale: 0.4, rotate: false, flipX: dir < 0 });
  await Promise.all(enemies.map(async t => {
    await wait((Math.abs(t.chest().x - m.x) / far) * ms);
    fx(4, t.chest(), { scale: 0.5, dur: 420, flipX: dir < 0 });
    t.hurt(); t.text(dmg(scale));
  }));
  await flight;
  fx(5, end, { scale: 0.5, dur: 500 });
}

export const SKILLS: Record<SpeciesId, SkillDef[]> = {
  // ---- Hải Long (Thủy): spits water from the mouth, head thrust forward ------------------------
  // vfx: 1 water orb, 2 water jet (points right), 3 mouth spray (right), 4 splash hit, 5 wet mark,
  //      6 dragon pearl, 7 water pillar, 8 foam ring
  hai_long: [
    { type: 'passive', name: 'Long Vương Hộ Hải', desc: 'Toàn đội +10% Sinh lực tối đa; Hải Long hồi 8% Sinh lực mỗi lượt khi đang cưỡi mây.' },
    {
      type: 'basic', name: 'Thủy Châu', desc: 'Khạc ra một viên thủy châu: 110% Công lên 1 mục tiêu, gây Ướt.', anim: 'attack', target: 'enemy',
      run: async ({ self, targets: [t], fx, projectile }) => {
        const m = self.mouth();
        fx(3, { x: m.x + 30 * self.facing, y: m.y }, { scale: 0.35, dur: 350, flipX: self.facing < 0 });
        await projectile(1, m, t.chest(), { dur: 380, scale: 0.32, rotate: false });
        fx(4, t.feet(), { scale: 0.42, anchor: 'bottom', dur: 550 });
        fx(5, t.head(), { scale: 0.22, hold: 700 });
        t.hurt(); t.text(dmg(1.1));
      },
    },
    {
      type: 'skill', name: 'Hải Triều Thủy Tiễn', desc: 'Chúi đầu khạc liên tiếp 3 luồng nước: mỗi luồng 45% Công lên toàn bộ địch, đẩy lùi và giảm 25% Tốc 2 lượt.',
      anim: 'cast', target: 'enemies',
      run: async ({ self, targets, fx, projectile, wait }) => {
        for (let k = 0; k < 3; k++) {
          const m = self.mouth();
          fx(3, { x: m.x + 30 * self.facing, y: m.y }, { scale: 0.32, dur: 300, flipX: self.facing < 0 });
          await Promise.all(targets.map(async t => {
            await projectile(2, m, t.chest(), { dur: 300, scale: 0.4 });   // the jet points along its flight
            fx(4, t.feet(), { scale: 0.36, anchor: 'bottom', dur: 450 });
            t.hurt(); t.text(dmg(0.45));
            if (k === 2) { t.push?.(90 * self.facing); fx(8, t.feet(), { scale: 0.5, ground: true, dur: 800 }); }
          }));
          await wait(90);
        }
      },
    },
    {
      type: 'ultimate', name: 'Long Châu Hải Thần', desc: 'Bay lên khạc ra Long Châu khổng lồ: nổ thành cột nước, 220% Công toàn bộ địch, toàn đội nhận Lá Chắn 15% Sinh lực.',
      anim: 'ultimate', target: 'enemies',
      run: async ({ self, targets, fx, projectile, shake, wait }) => {
        const m = self.mouth();
        fx(3, { x: m.x + 40 * self.facing, y: m.y }, { scale: 0.36, dur: 450, flipX: self.facing < 0 });
        await Promise.all(targets.map(async t => {
          await projectile(6, m, t.chest(), { dur: 600, scale: 0.34, rotate: false });
          fx(8, t.feet(), { scale: 0.48, ground: true, dur: 1300 });
          fx(7, t.feet(), { scale: 0.48, anchor: 'bottom', dur: 1100 });
          await wait(200);
          t.hurt(); t.text(dmg(2.2));
        }));
        shake(500, 0.012);
        self.text('Lá Chắn', '#bfe9ff');
      },
    },
  ],


  // ---- Kì Lân (Hỏa): spits golden dragon heads that pierce the whole enemy line -------------
  // vfx: 1 golden dragon head (faces right), 2 gold trail, 3 mouth flash, 4 pierce hit, 5 sparks,
  //      6 ground ring, 7 golden swirls, 8 soft glow
  ki_lan: [
    { type: 'passive', name: 'Kim Lân Hộ Thể', desc: 'Giáp vàng: giảm 15% sát thương nhận vào; mỗi lần bị đánh +5% Công (tối đa 5 lần).' },
    {
      type: 'basic', name: 'Lân Trảo', desc: '100% Công lên 1 mục tiêu.', anim: 'attack', target: 'enemy',
      run: ({ targets: [t], fx }) => {
        fx(4, t.chest(), { scale: 0.45, dur: 420 });
        fx(5, t.chest(), { scale: 0.4, dur: 500 });
        t.hurt(); t.text(dmg(1));
      },
    },
    {
      type: 'skill', name: 'Long Thủ Xuyên Trận', desc: 'Khạc ra đầu rồng vàng bay thẳng xuyên qua toàn bộ đội hình địch: 120% Công lên mỗi mục tiêu trên đường bay.',
      anim: 'cast', target: 'enemies',
      run: (ctx) => spitDragonHead(ctx, 1.2),
    },
    {
      type: 'ultimate', name: 'Kim Long Liên Châu', desc: 'Liên tiếp khạc 3 đầu rồng vàng xuyên trận: mỗi đầu 90% Công lên mọi mục tiêu trên đường bay.',
      anim: 'ultimate', target: 'enemies',
      run: async (ctx) => {
        ctx.fx(6, ctx.self.feet(), { scale: 0.7, ground: true, dur: 1800 });
        for (let k = 0; k < 3; k++) {
          void spitDragonHead(ctx, 0.9);
          await ctx.wait(500);
        }
      },
    },
  ],

  // ---- Hắc Long (Băng): assassin that strikes from the air -------------------------------
  hac_long: [
    { type: 'passive', name: 'Cuồng Nộ', desc: 'Khi Sinh lực dưới 50%: +40% Tốc độ và +25% tỉ lệ chí mạng trong 2 lượt (1 lần/trận).' },
    {
      type: 'basic', name: 'Vuốt Rồng', desc: 'Bay lên rồi bổ nhào, cào 110% Công vào 1 mục tiêu.', anim: 'attack', target: 'enemy',
      run: ({ self, targets: [t], fx }) => {
        fx(1, t.chest(), { scale: 0.6, dur: 450, flipX: self.facing < 0 });
        fx(2, t.chest(), { scale: 0.42, dur: 420 });
        t.hurt(); t.text(dmg(1.1));
      },
    },
    {
      type: 'skill', name: 'Hấp Huyết', desc: 'Lơ lửng hút sinh lực: 60% Công lên toàn bộ địch, toàn đội hút máu 30% sát thương gây ra trong 2 lượt.',
      anim: 'cast', target: 'enemies',
      run: async ({ self, targets, fx, projectile }) => {
        const RED = 0xff3048;
        fx(4, self.feet(), { scale: 0.7, ground: true, dur: 1400, tint: RED, spin: 1.5 });
        await Promise.all(targets.map(async t => {
          fx(2, t.chest(), { scale: 0.45, dur: 600, tint: RED });
          t.hurt(); t.text(dmg(0.6));
          await projectile(3, t.chest(), self.chest(), { dur: 650, scale: 0.4, tint: RED });   // life flows back
        }));
        self.text('Hấp Huyết +30%', '#ff8a96');
      },
    },
    {
      type: 'ultimate', name: 'Đoạt Mệnh', desc: 'Bay vút lên rồi bổ nhào: 300% Công lên 1 mục tiêu; mục tiêu dưới 30% Sinh lực bị tiêu diệt ngay.',
      anim: 'ultimate', target: 'enemy',
      run: async ({ targets: [t], fx, wait, shake, bite }) => {
        const VIOLET = 0xb050ff;
        fx(7, t.feet(), { scale: 1.0, ground: true, spin: -8, dur: 1500, tint: VIOLET });
        await bite(t.chest(), { scale: 1.1, tint: VIOLET });   // giant jaws snap shut on the target
        fx(6, t.chest(), { scale: 0.65, dur: 500 });
        fx(8, t.feet(), { scale: 0.8, anchor: 'bottom', dur: 900, tint: VIOLET });
        shake(550, 0.014);
        t.hurt(); t.text(dmg(3), '#d9a6ff');
        await wait(450);
        t.text('ĐOẠT MỆNH', '#e7c4ff');
      },
    },
  ],

  // ---- Rồng Xương (Ám): bone wyvern, its wings are weapons -------------------------------
  // vfx: 1 gust crescent, 2 gust cone, 3 dust/bone burst, 4 bite flash, 5 green life drain,
  //      6 falling bone, 7 ground crack, 8 green ghost fire
  rong_xuong: [
    { type: 'passive', name: 'Bất Tử Cốt', desc: 'Lần đầu bị hạ: đứng dậy với 30% Sinh lực và Lá Chắn 15% Sinh lực tối đa.' },
    {
      type: 'basic', name: 'Cắn Xương', desc: 'Chúi tới táp mạnh: 100% Công, hút 30% sát thương gây ra.', anim: 'attack', target: 'enemy',
      run: async ({ self, targets: [t], fx, projectile }) => {
        fx(4, t.chest(), { scale: 0.55, dur: 420, flipX: self.facing < 0 });
        fx(3, t.chest(), { scale: 0.4, dur: 450 });
        t.hurt(); t.text(dmg(1));
        await projectile(5, t.chest(), self.chest(), { dur: 600, scale: 0.42 });   // life drain flows back
        fx(8, self.feet(), { scale: 0.35, anchor: 'bottom', dur: 600 });
        self.text('+60', HEAL);
      },
    },
    {
      type: 'skill', name: 'Cốt Dực Cuồng Phong', desc: 'Dang cánh quạt ra cuồng phong: 80% Công toàn bộ địch, đẩy lùi và giảm 20% Tốc 2 lượt.',
      anim: 'cast', target: 'enemies',
      run: async ({ self, targets, fx, projectile, shake, wait }) => {
        const dir = self.facing, c = self.chest(), flip = dir < 0;
        const from = { x: c.x + 60 * dir, y: c.y };
        fx(2, { x: c.x + 130 * dir, y: c.y }, { scale: 0.6, dur: 600, flipX: flip });   // blast cone off the wings
        shake(400, 0.007);
        const reach = (k: number) => ({ x: from.x + (330 + 40 * k) * dir, y: from.y + (k - 1) * 22 });
        // three crescents rolling forward, a beat apart
        const waves = [0, 1, 2].map(k => wait(k * 110).then(() =>
          projectile(1, from, reach(k), { dur: 520, scale: 0.38 + 0.08 * k, rotate: false, flipX: flip })));
        await waves[0];
        targets.forEach(t => {
          fx(3, t.chest(), { scale: 0.45, dur: 500 });
          t.hurt(); t.push?.(110 * dir); t.text(dmg(0.8));
        });
        await Promise.all(waves);
      },
    },
    {
      type: 'ultimate', name: 'Mưa Cốt Long', desc: 'Gầm lên trời gọi mưa xương: 180% Công toàn bộ địch, choáng 1 lượt.',
      anim: 'ultimate', target: 'enemies',
      run: async ({ targets, fx, projectile, shake, wait }) => {
        await Promise.all(targets.map(async (t, k) => {
          const at = t.feet();
          // a volley of bones falling around the target
          const drops = [-60, 30, -15, 55, 0].map((dx, n) => wait(k * 120 + n * 90).then(() =>
            projectile(6, { x: at.x + dx - 30, y: at.y - 460 }, { x: at.x + dx, y: at.y - 30 }, { dur: 420, scale: 0.4, rotate: false })));
          await drops[0];
          fx(7, at, { scale: 0.75, ground: true, dur: 1200 });
          shake(450, 0.012);
          t.hurt(); t.text(dmg(1.8));
          await Promise.all(drops);
          fx(3, { x: at.x, y: at.y - 30 }, { scale: 0.55, dur: 500 });
          t.text('Choáng', '#ffe08a');
        }));
      },
    },
  ],

  // ---- Tuấn Long (Quang): support, healing ------------------------------------------------
  tuan_long: [
    { type: 'passive', name: 'Linh Giác', desc: 'Đầu mỗi lượt, đồng đội ít máu nhất hồi 5% Sinh lực tối đa.' },
    {
      type: 'basic', name: 'Húc Sừng', desc: '80% Công, 30% khả năng xoá 1 hiệu ứng tốt của mục tiêu.', anim: 'attack', target: 'enemy',
      run: ({ self, targets: [t], fx }) => {
        fx(1, t.chest(), { scale: 0.5, dur: 400, flipX: self.facing < 0 });
        fx(2, t.chest(), { scale: 0.4, dur: 450 });
        t.hurt(); t.text(dmg(0.8));
      },
    },
    {
      type: 'skill', name: 'Hào Quang Tuyết', desc: 'Toàn đội nhận Lá Chắn 120% Công, giải mọi hiệu ứng xấu.',
      anim: 'cast', target: 'team',
      run: ({ targets, fx }) => {
        targets.forEach(t => {
          fx(3, t.feet(), { scale: 0.62, anchor: 'bottom', hold: 900 });
          fx(5, t.chest(), { scale: 0.35, dur: 700 });
          t.text('Lá Chắn', '#bfe9ff');
        });
      },
    },
    {
      type: 'ultimate', name: 'Sừng Thiêng Phục Sinh', desc: 'Toàn đội hồi 35% Sinh lực, +20% Tốc 2 lượt, hồi sinh 1 đồng đội.',
      anim: 'ultimate', target: 'team',
      run: async ({ self, targets, fx, wait }) => {
        fx(8, self.feet(), { scale: 0.8, ground: true, spin: 2, dur: 1600 });
        targets.forEach(t => fx(6, t.feet(), { scale: 0.75, anchor: 'bottom', dur: 1100 }));
        await wait(350);
        targets.forEach(t => {
          fx(4, t.chest(), { scale: 0.45, dur: 1000 });
          fx(7, t.head(), { scale: 0.4, dur: 1200 });
          t.text('+350', HEAL);
        });
      },
    },
  ],
};

export const skill = (id: SpeciesId, type: SkillType) => SKILLS[id].find(s => s.type === type)!;
export const skillIconUrl = (id: SpeciesId, type: SkillType) => `/dragons/${id}/skills/icon_${type}.png`;
export const vfxKey = (id: SpeciesId, n: number) => `vfx_${id}_${n}`;
/** Species whose skills use only code-drawn effects (no skills/vfx.png yet). */
export const NO_VFX: SpeciesId[] = [];
/** Species with drawn bite jaws (skills/jaw_upper.png + jaw_lower.png); others get procedural fangs. */
export const JAW_SPECIES: SpeciesId[] = ['hac_long'];
export const jawKey = (id: SpeciesId, part: 'upper' | 'lower') => `jaw_${part}_${id}`;
export const jawUrl = (id: SpeciesId, part: 'upper' | 'lower') => `/dragons/${id}/skills/jaw_${part}.png`;
export const vfxUrl = (id: SpeciesId, n: number) => `/dragons/${id}/skills/vfx_${n}.png`;
