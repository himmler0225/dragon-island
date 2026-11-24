// Combo skills (Hợp Kích): two dragons on the same island strike together. Phaser-free (the HUD lists
// them). Both dragons play `anim`; when the leader's blow lands `run` gets one SkillCtx per dragon
// (each ctx's fx/projectile use that dragon's own vfx) and the shared enemy list.
import type { SpeciesId } from '../config/species';
import type { SkillCtx, SkillActor } from './types';
import type { StrikeKind } from '../rig/types';

export interface ComboDef {
  id: string;
  name: string;
  desc: string;
  /** [leader, partner]: the leader's hit time starts the combo */
  pair: [SpeciesId, SpeciesId];
  /** Its icon in the HUD (else the two dragons' portraits, split). */
  icon?: string;
  anim: StrikeKind;
  run(lead: SkillCtx, partner: SkillCtx, targets: SkillActor[]): Promise<void> | void;
}

const dmg = (scale: number) => `-${Math.round((180 + Math.random() * 40) * scale)}`;
const VIOLET = 0xb050ff, GOLD = 0xffe27a, HEAL = '#7dffa0';

export const COMBOS: ComboDef[] = [
  {
    id: 'am_duong_long_kich', name: 'Âm Dương Long Kích', pair: ['black_dragon', 'celestial_dragon'], anim: 'ultimate',
    icon: '/dragons/black_dragon/skills/combo_am_duong_long_kich.png',
    desc: 'Hắc Long và Thần Long cùng bổ nhào, bóng tối và thánh quang hợp nhất: 2 đòn 150% Công lên toàn bộ địch, '
      + 'phá 30% Giáp và choáng 1 lượt; toàn đội hồi 20% Sinh lực.',
    // effects: Hắc Long's skills/vfx_30..35 (combo_am_duong.png): 30 yin-yang sigil, 31 twin pillar, 32 the two
    // dragons chasing in a ring, 33 shadow and light colliding, 34 ground impact, 35 healing rain of light; and its
    // 21 (violet claw), Thần Long's 21 (golden claw)
    run: async (dark, light, targets) => {
      const xs = targets.map(t => t.feet()), n = Math.max(1, xs.length);
      const mid = { x: xs.reduce((s, p) => s + p.x, 0) / n, y: xs.reduce((s, p) => s + p.y, 0) / n };
      const above = { x: mid.x, y: mid.y - 210 };
      // the shadow and the light fly in as two dragons chasing round each other, and collide over the foes
      dark.fx(32, above, { scale: 0.75, spin: 3, dur: 1100 });
      await Promise.all([
        dark.orb(dark.self.mouth(), above, { tint: VIOLET, scale: 1.2, dur: 520 }),
        light.orb(light.self.mouth(), above, { tint: GOLD, scale: 1.2, dur: 520 }),
      ]);
      dark.shake(700, 0.016);
      dark.fx(33, above, { scale: 0.85, dur: 750 });
      // the yin-yang opens on the ground under them, turning
      dark.fx(30, mid, { scale: 1.25, ground: true, spin: 3, dur: 2800 });
      dark.fx(30, above, { scale: 0.45, spin: -5, dur: 1300 });
      await dark.wait(320);
      await Promise.all(targets.map(async (t, k) => {
        await dark.wait(k * 140);
        // a violet and a golden claw cross over it
        dark.fx(21, t.chest(), { scale: 0.7, dur: 420, angle: -0.3 });
        light.fx(21, t.chest(), { scale: 0.7, dur: 420, angle: 0.3, flipX: true });
        t.hurt(); t.text(dmg(1.5)); t.text('-Giáp', '#d9a6ff');
        await dark.wait(220);
        // the twin pillar of shadow and light crashes down on it
        const at = t.feet();
        dark.fx(31, at, { scale: 0.8, anchor: 'bottom', dur: 950 });
        dark.fx(34, at, { scale: 0.55, anchor: 'bottom', dur: 900 });
        t.hurt(); t.text(dmg(1.5)); t.text('Choáng', '#ffe08a');
      }));
      // light rains on the two of them: the team heals
      dark.fx(35, dark.self.feet(), { scale: 0.6, anchor: 'bottom', dur: 1400 });
      dark.fx(35, light.self.feet(), { scale: 0.6, anchor: 'bottom', dur: 1400 });
      dark.self.text('+20%', HEAL);
      light.self.text('+20%', HEAL);
    },
  },
];

export const combosFor = (id: SpeciesId) => COMBOS.filter(c => c.pair.includes(id));
