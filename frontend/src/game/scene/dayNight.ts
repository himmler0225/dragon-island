// Day / night cycle following Ho Chi Minh City time.
// A multiply-tint layer darkens and colours the world; the ocean shader gets a `night` uniform.
import * as Phaser from 'phaser';

/** Keyframes by hour of day: tint colour, tint strength (0..1), water darkness (0..1). */
const KEYS: [hour: number, rgb: number, strength: number, night: number][] = [
  [0, 0x5a6ab8, 0.38, 1],
  [4.5, 0x5a6ab8, 0.38, 1],
  [5.5, 0xd88ab0, 0.28, 0.6],    // dawn: pink
  [6.5, 0xffd9a8, 0.15, 0.2],
  [8, 0xffffff, 0, 0],           // day
  [16.5, 0xffffff, 0, 0],
  [17.5, 0xffa860, 0.3, 0.25],   // dusk: orange
  [18.5, 0xc0607a, 0.32, 0.6],
  [19.5, 0x5a6ab8, 0.38, 1],     // night: soft blue (bright enough to see the dragons)
  [24, 0x5a6ab8, 0.38, 1],
];

/** Current hour (fractional) in Ho Chi Minh City; `override` (dev) wins when set. */
export function hcmHour(now = new Date()): number {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    .formatToParts(now);
  const get = (t: string) => Number(parts.find(p => p.type === t)?.value ?? 0);
  return get('hour') + get('minute') / 60;
}

export function sky(hour: number) {
  const h = ((hour % 24) + 24) % 24;
  let k = 0;
  while (k < KEYS.length - 2 && KEYS[k + 1][0] <= h) k++;
  const [h0, c0, s0, n0] = KEYS[k], [h1, c1, s1, n1] = KEYS[k + 1];
  const u = h1 > h0 ? (h - h0) / (h1 - h0) : 0;
  const a = Phaser.Display.Color.IntegerToColor(c0), b = Phaser.Display.Color.IntegerToColor(c1);
  const c = Phaser.Display.Color.Interpolate.ColorWithColor(a, b, 100, Math.round(u * 100));
  return { rgb: Phaser.Display.Color.GetColor(c.r, c.g, c.b), strength: s0 + (s1 - s0) * u, night: n0 + (n1 - n0) * u };
}

/** The tint layer over the world. Call update() now and then (every few seconds is plenty). */
export class DayNight {
  private layer: Phaser.GameObjects.Rectangle;
  /** dev: force an hour (e.g. window.__game.scene.getScene('island').dayNight.override = 21) */
  override: number | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number, w: number, h: number, private ocean: Phaser.GameObjects.Shader) {
    this.layer = scene.add.rectangle(x, y, w, h, 0xffffff, 0).setDepth(900).setBlendMode(Phaser.BlendModes.MULTIPLY);
  }

  /** last darkness from update() (0 day .. 1 night) */
  night = 0;

  update() {
    const s = sky(this.override ?? hcmHour());
    this.night = s.night;
    // MULTIPLY with alpha: blend the tint toward white by (1 - strength) so 0 strength = no change
    const c = Phaser.Display.Color.IntegerToRGB(s.rgb);
    const mix = (v: number) => Math.round(255 - (255 - v) * s.strength);
    this.layer.setFillStyle(Phaser.Display.Color.GetColor(mix(c.r), mix(c.g), mix(c.b)), 1);
    this.ocean.setUniform('night.value', s.night);
    return s;
  }
}
