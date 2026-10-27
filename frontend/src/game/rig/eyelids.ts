// Eyelids: skin-coloured lids drawn over each eye, growing down from the top.
// Blink now and then while awake; close fully when sleeping.
import * as Phaser from 'phaser';
import type { SpeciesId } from '../config/species';
import { pixels } from './alphaMask';

export interface Eye {
  x: number; y: number;
  rx: number; ry: number;
}

export const EYES: Partial<Record<SpeciesId, Eye[]>> = {
  stag_dragon: [{ x: 0.155, y: 0.645, rx: 0.045, ry: 0.034 }],
  void_serpent: [{ x: 0.335, y: 0.48, rx: 0.058, ry: 0.062 }],
  fire_phoenix: [{ x: 0.318, y: 0.484, rx: 0.071, ry: 0.067 }],
  ice_phoenix: [{ x: 0.347, y: 0.481, rx: 0.073, ry: 0.072 }],
  fire_dragon: [{ x: 0.475, y: 0.575, rx: 0.105, ry: 0.14 }],
  earth_dragon: [{ x: 0.54, y: 0.44, rx: 0.1, ry: 0.08 }],
  qilin: [{ x: 0.25, y: 0.615, rx: 0.055, ry: 0.05 }],
  gold_dragon: [{ x: 0.19, y: 0.69, rx: 0.025, ry: 0.04 }],
  silver_dragon: [{ x: 0.19, y: 0.69, rx: 0.025, ry: 0.04 }],
  // bone_dragon: an empty skull socket, nothing to blink
};

export const MOUTH_OPEN = 0.6; // how far mouth interior pieces are drawn open (rad), see tools/rig_jaw.py

export interface Lid {
  img: Phaser.GameObjects.Image;
  /** top-centre of the lid on the head image, as a share of its width/height */
  at: { x: number; y: number };
}

/** How far a pixel's colour must be from the skin to count as part of the eye. */
const EYE_CONTRAST = 70;

export function makeLids(
  scene: Phaser.Scene,
  head: Phaser.GameObjects.Image,
  species: SpeciesId,
  container: Phaser.GameObjects.Container,
): Lid[] {
  const lids: Lid[] = [];
  const px = pixels(scene, head.texture.key), W = head.width, H = head.height;
  const rgba = (x: number, y: number) => { const o = (y * px.w + x) * 4; return [px.data[o], px.data[o + 1], px.data[o + 2], px.data[o + 3]]; };
  (EYES[species] ?? []).forEach((e, k) => {
    const key = `lid_${species}_${k}`;
    // skin: the colour around the eye (a ring just outside the measured ellipse), its dark outlines
    // left out, median of the rest
    const ring: number[][] = [];
    for (let a = 0; a < 2 * Math.PI; a += 0.05) for (const f of [1.25, 1.45, 1.65]) {
      const [pr, pg, pb, pa] = rgba(Math.round((e.x + Math.cos(a) * e.rx * f) * W), Math.round((e.y + Math.sin(a) * e.ry * f) * H));
      if ((pa ?? 0) > 200) ring.push([pr, pg, pb]);
    }
    const luma = (c: number[]) => 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2];
    ring.sort((p, q) => luma(p) - luma(q));
    const light = ring.slice(Math.floor(ring.length * 0.35));
    const median = (ch: number) => light.map(c => c[ch]).sort((p, q) => p - q)[light.length >> 1];
    const skin = light.length ? [median(0), median(1), median(2)] : [136, 136, 136];
    // the eye's own outline: pixels inside the measured ellipse that are not skin, filled across each
    // row so the lid covers the whole eye (pupil, highlight and rim included)
    const cx = e.x * W, cy = e.y * H, ax = e.rx * W * 1.15, ay = e.ry * H * 1.15;
    const x0 = Math.max(0, Math.floor(cx - ax)), x1 = Math.min(W - 1, Math.ceil(cx + ax));
    const y0 = Math.max(0, Math.floor(cy - ay)), y1 = Math.min(H - 1, Math.ceil(cy + ay));
    const rows: [number, number][] = [];
    let top = -1, bottom = -1;
    for (let y = y0; y <= y1; y++) {
      let lo = -1, hi = -1;
      for (let x = x0; x <= x1; x++) {
        if (((x - cx) / ax) ** 2 + ((y - cy) / ay) ** 2 > 1) continue;
        const [pr, pg, pb, pa] = rgba(x, y);
        if (pa < 128 || Math.hypot(pr - skin[0], pg - skin[1], pb - skin[2]) < EYE_CONTRAST) continue;
        if (lo < 0) lo = x;
        hi = x;
      }
      rows.push([lo, hi]);
      if (lo >= 0) { if (top < 0) top = y; bottom = y; }
    }
    if (top < 0) return;
    const left = Math.min(...rows.filter(([lo]) => lo >= 0).map(([lo]) => lo)) - 1;
    const right = Math.max(...rows.map(([, hi]) => hi)) + 1;
    const w = right - left + 1, h = bottom - top + 3;
    if (!scene.textures.exists(key)) {
      const tex = scene.textures.createCanvas(key, w, h)!;
      const ctx = tex.getContext();
      const img = ctx.createImageData(w, h);
      const inside = (x: number, y: number) => {
        const row = rows[y + top - 1 - y0];
        return !!row && row[0] >= 0 && x + left >= row[0] - 1 && x + left <= row[1] + 1;
      };
      const lash = Math.max(1, Math.round(h * 0.12));
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        if (!inside(x, y)) continue;
        // the lash: a dark line along the bottom edge of the eye's shape
        let edge = false;
        for (let d = 1; d <= lash; d++) if (!inside(x, y + d)) { edge = true; break; }
        const k = edge ? 0.35 : 1 - 0.12 * (y / h);   // a little shade toward the lash
        const o = (y * w + x) * 4;
        img.data[o] = skin[0] * k; img.data[o + 1] = skin[1] * k; img.data[o + 2] = skin[2] * k; img.data[o + 3] = 255;
      }
      ctx.putImageData(img, 0, 0);
      tex.refresh();
    }
    const img = scene.add.image(0, 0, key).setOrigin(0.5, 0).setVisible(false);
    container.add(img);
    container.moveAbove(img, head);
    lids.push({ img, at: { x: (left + w / 2) / W, y: (top - 1) / H } });
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
  for (const { img, at } of lids) {
    const lx = (at.x - head.originX) * W, ly = (at.y - head.originY) * H;
    img.setPosition(head.x + lx * c - ly * s, head.y + lx * s + ly * c)
      .setRotation(head.rotation).setScale(1, shut).setVisible(shut > 0.02);
  }
  return blinkT;
}
