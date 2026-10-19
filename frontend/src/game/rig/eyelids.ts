// Eyelids: skin-coloured lids drawn over each eye, growing down from the top.
// Blink now and then while awake; close fully when sleeping.
import * as Phaser from 'phaser';
import type { SpeciesId } from '../config/species';
import { pixels } from './alphaMask';

export interface Eye {
  x: number; y: number;
  rx: number; ry: number;
  tilt?: number;
}

export const EYES: Partial<Record<SpeciesId, Eye[]>> = {
  tuan_long: [{ x: 0.155, y: 0.645, rx: 0.045, ry: 0.034 }],
  tu_xa_long: [{ x: 0.335, y: 0.48, rx: 0.058, ry: 0.062 }],
  phuong_hoang_lua: [{ x: 0.318, y: 0.484, rx: 0.071, ry: 0.067 }],
  phuong_hoang_bang: [{ x: 0.347, y: 0.481, rx: 0.073, ry: 0.072 }],
};

export const MOUTH_OPEN = 0.6; // how far mouth interior pieces are drawn open (rad), see tools/rig_jaw.py

export interface Lid {
  img: Phaser.GameObjects.Image;
  eye: Eye;
}

export function makeLids(
  scene: Phaser.Scene,
  head: Phaser.GameObjects.Image,
  species: SpeciesId,
  container: Phaser.GameObjects.Container,
): Lid[] {
  const lids: Lid[] = [];
  const px = pixels(scene, head.texture.key), W = head.width, H = head.height;
  (EYES[species] ?? []).forEach((e, k) => {
    const key = `lid_${species}_${k}`;
    const w = Math.max(6, Math.round(2 * e.rx * W)), h = Math.max(4, Math.round(2 * e.ry * H));
    if (!scene.textures.exists(key)) {
      let r = 0, g = 0, b = 0, n = 0;
      for (let dx = -e.rx * 0.6; dx <= e.rx * 0.6; dx += e.rx * 0.3) {
        const sx = Math.round((e.x + dx) * W), sy = Math.round((e.y - e.ry * 1.9) * H);
        const o = (sy * px.w + sx) * 4;
        if ((px.data[o + 3] ?? 0) > 200) { r += px.data[o]; g += px.data[o + 1]; b += px.data[o + 2]; n++; }
      }
      const skin = n ? Phaser.Display.Color.GetColor(r / n, g / n, b / n) : 0x888888;
      const dark = n ? Phaser.Display.Color.GetColor(r / n * 0.35, g / n * 0.35, b / n * 0.35) : 0x222222;
      const gr = scene.make.graphics({ x: 0, y: 0 }, false);
      gr.fillStyle(skin, 1).fillEllipse(w / 2 + 1, h / 2 + 1, w, h);
      gr.lineStyle(Math.max(1.5, h * 0.12), dark, 0.9).beginPath()
        .arc(w / 2 + 1, h / 2 + 1 - h * 0.1, w * 0.46, Math.PI * 0.12, Math.PI * 0.88, false).strokePath();
      gr.generateTexture(key, w + 2, h + 2); gr.destroy();
    }
    const img = scene.add.image(0, 0, key).setOrigin(0.5, 0).setVisible(false);
    container.add(img);
    container.moveAbove(img, head);
    lids.push({ img, eye: e });
  });
  return lids;
}

export function updateLids(
  lids: Lid[], head: Phaser.GameObjects.Image,
  blinkT: number, dt: number, Z: number, mode: string,
): number {
  if (!lids.length) return blinkT;
  let blink = 0;
  if ((blinkT -= dt) < 0) {
    blink = Math.sin(Math.PI * Math.min(1, -blinkT / 0.18));
    if (blinkT < -0.18) blinkT = Phaser.Math.FloatBetween(2.5, 6);
  }
  const shut = Math.max(Math.min(1, Z * 1.3), mode === 'sleep' ? Z : 0, blink);
  const W = head.width, H = head.height;
  const c = Math.cos(head.rotation), s = Math.sin(head.rotation);
  for (const { img, eye } of lids) {
    const lx = (eye.x - head.originX) * W, ly = (eye.y - eye.ry - head.originY) * H;
    img.setPosition(head.x + lx * c - ly * s, head.y + lx * s + ly * c)
      .setRotation(head.rotation + (eye.tilt ?? 0)).setScale(1, shut).setVisible(shut > 0.02);
  }
  return blinkT;
}
