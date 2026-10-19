// Alpha mask cache: scene.textures.getPixelAlpha redraws the frame into a canvas on
// every call, which made tapping a dragon stutter. Cache the raw pixel data once per texture.
import * as Phaser from 'phaser';

const ALPHA = new Map<string, { w: number; data: Uint8ClampedArray }>();

export function pixels(scene: Phaser.Scene, key: string) {
  let m = ALPHA.get(key);
  if (!m) {
    const src = scene.textures.get(key).getSourceImage() as HTMLImageElement | HTMLCanvasElement;
    const c = document.createElement('canvas');
    c.width = src.width; c.height = src.height;
    const g = c.getContext('2d', { willReadFrequently: true })!;
    g.drawImage(src, 0, 0);
    m = { w: c.width, data: g.getImageData(0, 0, c.width, c.height).data };
    ALPHA.set(key, m);
  }
  return m;
}

export function alphaAt(scene: Phaser.Scene, key: string, x: number, y: number) {
  const m = pixels(scene, key);
  return m.data[(y * m.w + x) * 4 + 3] ?? 0;
}
