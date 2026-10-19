// Stand-in target in front of a dragon when no other dragon is on its island.
import type { SkillActor } from '../skills';
import type { SpeciesId } from '../config/species';
import type { Island } from './Island';
import type { IslandScene } from './IslandScene';
import type { Point } from '../config/world';

export class SpotTarget implements SkillActor {
  constructor(
    private scene: IslandScene,
    readonly id: SpeciesId,
    private at: Point,
    private island: Island,
  ) {}

  feet() { return { x: this.at[0], y: this.at[1] + this.island.bob }; }
  chest() { return { x: this.at[0], y: this.at[1] + this.island.bob - 45 }; }
  head() { return { x: this.at[0], y: this.at[1] + this.island.bob - 95 }; }
  hurt() {}
  text(text: string, color?: string) { this.scene.combat.floatText(this.at[0], this.chest().y - 40, text, color); }
}
