// Skill effects drawn in code (canvas), registered under the same keys as a species' drawn vfx images, so a
// skill's fx(n) / projectile(n) finds them as usual: the effects no drawn art was made for. Bright on a transparent
// ground (drawn with the screen / add blend like the image effects).
//   Băng Lộc Long (frost_dragon; its drawn ones: registry VFX_LIST): 6 frozen crack (on the ground),
//     7 falling crystal (pointing down), 8 big ice impact.
import * as Phaser from 'phaser';
import { vfxKey } from '../../skills/registry';

type Ctx = CanvasRenderingContext2D;
const TAU = Math.PI * 2;

function tex(scene: Phaser.Scene, key: string, w: number, h: number, draw: (c: Ctx) => void) {
  if (scene.textures.exists(key)) return;
  const t = scene.textures.createCanvas(key, w, h);
  if (!t) return;
  draw(t.getContext());
  t.refresh();
}

/** Glow for what is drawn next. */
const glow = (c: Ctx, color: string, blur: number) => { c.shadowColor = color; c.shadowBlur = blur; };

/** A faceted crystal along +x from (x, y): length l, width w (a long diamond with a lit facet). */
function crystal(c: Ctx, x: number, y: number, l: number, w: number, a: number) {
  c.save(); c.translate(x, y); c.rotate(a);
  const g = c.createLinearGradient(0, 0, l, 0);
  g.addColorStop(0, 'rgba(120,210,255,0.9)'); g.addColorStop(0.6, 'rgba(200,240,255,1)'); g.addColorStop(1, '#ffffff');
  c.fillStyle = g; c.strokeStyle = 'rgba(235,250,255,0.95)'; c.lineWidth = 2;
  c.beginPath(); c.moveTo(0, 0); c.lineTo(l * 0.35, -w / 2); c.lineTo(l, 0); c.lineTo(l * 0.35, w / 2); c.closePath(); c.fill(); c.stroke();
  c.fillStyle = 'rgba(255,255,255,0.75)';
  c.beginPath(); c.moveTo(l * 0.1, 0); c.lineTo(l * 0.35, -w / 2); c.lineTo(l * 0.95, 0); c.closePath(); c.fill();
  c.restore();
}

function sparkles(c: Ctx, cx: number, cy: number, r: number, n: number, color = '#e8fbff') {
  c.fillStyle = color;
  for (let k = 0; k < n; k++) {
    const a = Math.random() * TAU, d = r * Math.sqrt(Math.random()), s = 1.5 + Math.random() * 3;
    const x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d;
    c.fillRect(x - s, y - 0.6, 2 * s, 1.2); c.fillRect(x - 0.6, y - s, 1.2, 2 * s);
  }
}

function frost(scene: Phaser.Scene) {
  const key = (n: number) => vfxKey('frost_dragon', n);
  // 6. frozen crack spreading on the ground
  tex(scene, key(6), 384, 384, c => {
    glow(c, '#6fd0ff', 14); c.strokeStyle = 'rgba(200,245,255,1)'; c.lineCap = 'round';
    for (let k = 0; k < 9; k++) {
      let x = 192, y = 192, a = (k / 9) * TAU + Math.random() * 0.4;
      c.lineWidth = 6; c.beginPath(); c.moveTo(x, y);
      for (let s = 0; s < 6; s++) { a += (Math.random() - 0.5) * 0.9; x += Math.cos(a) * 28; y += Math.sin(a) * 28; c.lineTo(x, y); c.lineWidth = 6 - s; }
      c.stroke();
    }
    const core = c.createRadialGradient(192, 192, 0, 192, 192, 70);
    core.addColorStop(0, 'rgba(240,252,255,0.95)'); core.addColorStop(1, 'rgba(240,252,255,0)');
    c.shadowBlur = 0; c.fillStyle = core; c.fillRect(0, 0, 384, 384);
  });
  // 7. a big crystal falling straight down, streaks above it
  tex(scene, key(7), 200, 384, c => {
    c.strokeStyle = 'rgba(170,235,255,0.6)'; c.lineCap = 'round';
    for (const [x, l] of [[70, 140], [100, 190], [130, 150], [85, 90], [118, 110]]) { c.lineWidth = 4; c.beginPath(); c.moveTo(x, 20); c.lineTo(x, 20 + l); c.stroke(); }
    glow(c, '#7fd8ff', 22); crystal(c, 100, 120, 250, 90, Math.PI / 2);
  });
  // 8. big ice impact: a ring of shards round a white flash
  tex(scene, key(8), 512, 512, c => {
    const core = c.createRadialGradient(256, 256, 0, 256, 256, 200);
    core.addColorStop(0, 'rgba(255,255,255,1)'); core.addColorStop(0.35, 'rgba(160,230,255,0.75)'); core.addColorStop(1, 'rgba(160,230,255,0)');
    c.fillStyle = core; c.fillRect(0, 0, 512, 512);
    glow(c, '#7fd8ff', 20); c.strokeStyle = 'rgba(210,248,255,0.95)'; c.lineWidth = 8;
    c.beginPath(); c.arc(256, 256, 190, 0, TAU); c.stroke();
    for (let k = 0; k < 16; k++) { const a = (k / 16) * TAU; crystal(c, 256 + Math.cos(a) * 120, 256 + Math.sin(a) * 120, k % 2 ? 90 : 130, k % 2 ? 22 : 30, a); }
    c.shadowBlur = 0; sparkles(c, 256, 256, 240, 50);
  });
}

export function makeProceduralVfx(scene: Phaser.Scene) {
  frost(scene);
}
