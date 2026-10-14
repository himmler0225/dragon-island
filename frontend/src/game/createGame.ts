// Boot Phaser with the island scene. Browser only: import this module dynamically from a
// Client Component (see components/Island.tsx).
import * as Phaser from 'phaser';
import { H, W } from './constants';
import { IslandScene } from './IslandScene';
import type { RigData } from './rig';
import { SPECIES, rigUrl, type SpeciesId } from './species';

export async function createGame(parent: HTMLElement) {
  const list = await Promise.all(SPECIES.map(id => fetch(rigUrl(id)).then(r => r.json() as Promise<RigData>)));
  const rigs = Object.fromEntries(SPECIES.map((id, i) => [id, list[i]])) as Record<SpeciesId, RigData>;
  const game = new Phaser.Game({
    type: Phaser.WEBGL,
    parent,
    width: W,
    height: H,
    backgroundColor: '#0d4f7a',
    scene: new IslandScene(rigs),
    // fill the parent; IslandScene zooms its camera so the island fits and the ocean fills the rest
    scale: { mode: Phaser.Scale.RESIZE },
  });
  // dev only: inspect from the browser console, e.g. __game.scene.getScene('island')
  if (process.env.NODE_ENV !== 'production') (window as unknown as { __game?: Phaser.Game }).__game = game;
  return game;
}
