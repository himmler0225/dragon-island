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
  anim: StrikeKind;
  run(lead: SkillCtx, partner: SkillCtx, targets: SkillActor[]): Promise<void> | void;
}

const dmg = (scale: number) => `-${Math.round((180 + Math.random() * 40) * scale)}`;
const VIOLET = 0xb050ff, GOLD = 0xffe27a, HEAL = '#7dffa0';

export const COMBOS: ComboDef[] = [
  {
    id: 'am_duong_long_kich', name: 'Âm Dương Long Kích', pair: ['hac_long', 'than_long'], anim: 'ultimate',
    desc: 'Hắc Long và Thần Long cùng bổ nhào, bóng tối và thánh quang hợp nhất: 2 đòn 150% Công lên toàn bộ địch, '
      + 'phá 30% Giáp và choáng 1 lượt; toàn đội hồi 20% Sinh lực.',
    run: async (dark, light, targets) => {
      const xs = targets.map(t => t.feet()), n = Math.max(1, xs.length);
      const mid = { x: xs.reduce((s, p) => s + p.x, 0) / n, y: xs.reduce((s, p) => s + p.y, 0) / n };
      const above = { x: mid.x, y: mid.y - 170 };
      // two orbs fly in and collide
      await Promise.all([
        dark.orb(dark.self.mouth(), above, { tint: VIOLET, scale: 1.3, dur: 520 }),
        light.orb(light.self.mouth(), above, { tint: GOLD, scale: 1.3, dur: 520 }),
      ]);
      dark.shake(700, 0.016);
      // sigils open and spin opposite ways
      dark.fx(4, mid, { scale: 1.1, ground: true, spin: 6, dur: 1800, tint: VIOLET });
      light.fx(5, mid, { scale: 0.75, ground: true, spin: -6, dur: 1800 });
      await dark.wait(250);
      await Promise.all(targets.map(async (t, k) => {
        await dark.wait(k * 120);
        await dark.bite(t.chest(), { scale: 0.85, tint: VIOLET });
        t.hurt(); t.text(dmg(1.5)); t.text('-Giáp', '#d9a6ff');
        const at = t.feet();
        await light.projectile(3, { x: at.x, y: at.y - 520 }, { x: at.x, y: at.y - 40 }, { dur: 280, scale: 0.4, rotate: false });
        light.fx(4, { x: at.x, y: at.y - 20 }, { scale: 0.42, anchor: 'bottom', dur: 550 });
        t.hurt(); t.text(dmg(1.5)); t.text('Choáng', '#ffe08a');
      }));
      light.fx(8, light.self.feet(), { scale: 0.5, anchor: 'bottom', dur: 1200 });
      light.fx(8, dark.self.feet(), { scale: 0.5, anchor: 'bottom', dur: 1200 });
      dark.self.text('+20%', HEAL);
      light.self.text('+20%', HEAL);
    },
  },
];

export const combosFor = (id: SpeciesId) => COMBOS.filter(c => c.pair.includes(id));
