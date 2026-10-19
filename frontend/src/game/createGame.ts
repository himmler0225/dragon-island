// Boot Phaser with the island scene.
import * as Phaser from 'phaser';
import { H, W } from './config/world';
import { IslandScene } from './scene/IslandScene';
import type { RigData } from './rig';
import { SPECIES, rigUrl, type SpeciesId } from './config/species';

export async function createGame(parent: HTMLElement) {
  const list = await Promise.all(SPECIES.map(id => fetch(rigUrl(id)).then(r => r.json() as Promise<RigData>)));
  const rigs = Object.fromEntries(SPECIES.map((id, i) => [id, list[i]])) as Record<SpeciesId, RigData>;
  // render at the screen's real pixel density: a canvas sized in CSS px is stretched 2x on retina
  // screens and the whole game looks blurry. The canvas holds (CSS size x res) pixels and is shown
  // at its CSS size (zoom 1/res); IslandScene zooms its camera to whatever size the canvas has.
  let res = Math.min(window.devicePixelRatio || 1, 2);   // 3x phones: 2x is sharp enough and cheaper
  const size = () => [Math.round(Math.max(1, parent.clientWidth) * res), Math.round(Math.max(1, parent.clientHeight) * res)] as const;
  const [w0, h0] = parent.clientWidth ? size() : [W, H];
  const game = new Phaser.Game({
    type: Phaser.WEBGL,
    parent,
    width: w0,
    height: h0,
    backgroundColor: '#0d4f7a',
    powerPreference: 'high-performance',
    scene: new IslandScene(rigs),
    scale: { mode: Phaser.Scale.NONE, zoom: 1 / res },
  });
  // follow the parent's size (window resize, fullscreen)
  const watch = new ResizeObserver(() => game.scale.resize(...size()));
  watch.observe(parent);
  // a slow GPU can't fill 4x the pixels (the animated ocean is shaded per pixel): when the frame rate
  // stays low, step the resolution down (2 -> 1.5 -> 1). Only ever down, so it never flip-flops.
  let slow = 0;
  const probe = window.setInterval(() => {
    if (document.hidden || !game.isRunning || res <= 1) return;
    slow = game.loop.actualFps < 50 ? slow + 1 : 0;
    if (slow < 2) return;   // 2 checks in a row (4 s): not just a hiccup while loading
    slow = 0;
    res = Math.max(1, res - 0.5);
    game.scale.setZoom(1 / res);
    game.scale.resize(...size());
  }, 2000);
  game.events.once(Phaser.Core.Events.DESTROY, () => { watch.disconnect(); window.clearInterval(probe); });
  if (process.env.NODE_ENV !== 'production') (window as unknown as { __game?: Phaser.Game }).__game = game;
  return game;
}
