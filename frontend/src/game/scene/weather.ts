// Weather: clear, cloudy or rain. Changes at random intervals.
// Rain art: public/weather/rain_1..4.png (streaks), splash_1..4.png (on the ground), ripple_1..4.png
// (on the sea) from tools/slice_rain.py.
import * as Phaser from 'phaser';

export type WeatherKind = 'clear' | 'cloudy' | 'rain';

const GLOOM: Record<WeatherKind, number> = { clear: 0, cloudy: 0.6, rain: 0.85 };
const DROPS = 260;
export const RAIN_TEXTURES = ['rain', 'splash', 'ripple'].flatMap(k => [1, 2, 3, 4].map(n => `${k}_${n}`));
// the streaks are drawn falling down and to the left (about 17 degrees): the drops move the same way
const FALL = { x: -270, y: 900 };
const RAIN = { scale: [0.1, 0.17], splash: 0.14, ripple: 0.12, splashChance: 0.1, rippleChance: 0.12 };

export class Weather {
  kind: WeatherKind = 'clear';
  gloom = 0;
  /** dev: force a kind */
  private next = 0;
  private layer: Phaser.GameObjects.Rectangle;
  private drops: Phaser.GameObjects.Image[] = [];
  private rain = 0;

  constructor(private scene: Phaser.Scene, x: number, y: number, w: number, h: number, private onSea: (x: number, y: number) => boolean) {
    this.layer = scene.add.rectangle(x, y, w, h, 0x56606e, 0).setDepth(899).setBlendMode(Phaser.BlendModes.MULTIPLY);
    for (let k = 0; k < DROPS; k++) {
      this.drops.push(scene.add.image(0, 0, `rain_${1 + (k % 4)}`).setOrigin(0.5, 1).setAlpha(0.8).setDepth(950)
        .setScale(Phaser.Math.FloatBetween(RAIN.scale[0], RAIN.scale[1])).setVisible(false));
    }
    this.next = Phaser.Math.Between(60, 120);
  }

  set(kind: WeatherKind) {
    this.kind = kind;
    this.next = kind === 'clear' ? Phaser.Math.Between(240, 480) : Phaser.Math.Between(90, 240);
  }

  update(dt: number) {
    if ((this.next -= dt) <= 0) {
      const r = Math.random();
      this.set(this.kind !== 'clear' ? 'clear' : r < 0.55 ? 'cloudy' : 'rain');
    }
    const goal = GLOOM[this.kind], rainGoal = this.kind === 'rain' ? 1 : 0;
    this.gloom += (goal - this.gloom) * Math.min(1, dt * 0.4);
    this.rain += (rainGoal - this.rain) * Math.min(1, dt * 0.5);
    this.layer.setFillStyle(0x56606e, this.gloom);

    const view = this.scene.cameras.main.worldView;
    const active = Math.round(DROPS * this.rain);
    this.drops.forEach((d, k) => {
      if (k >= active) { d.setVisible(false); return; }
      if (!d.visible || d.y > view.bottom + 20) {
        d.setPosition(Phaser.Math.FloatBetween(view.x, view.right + view.height * -FALL.x / FALL.y), view.y - Phaser.Math.FloatBetween(0, view.height))
          .setVisible(true);
        d.setData('land', view.y + Phaser.Math.FloatBetween(view.height * 0.25, view.height));
      }
      d.y += FALL.y * dt; d.x += FALL.x * dt;
      if (d.y >= d.getData('land')) {
        const sea = this.onSea(d.x, d.y);
        if (Math.random() < (sea ? RAIN.rippleChance : RAIN.splashChance)) this.play(sea ? 'ripple' : 'splash', d.x, d.y);
        d.y = view.bottom + 30;
      }
    });
  }

  /** One splash on the ground or ripple on the sea: its 4 frames, then gone. */
  private play(kind: 'splash' | 'ripple', x: number, y: number) {
    const sea = kind === 'ripple';
    const img = this.scene.add.image(x, y, `${kind}_1`).setOrigin(0.5, sea ? 0.5 : 0.8)
      .setScale(sea ? RAIN.ripple : RAIN.splash).setDepth(sea ? 1 : 5 + y / 1000).setAlpha(0.9);
    this.scene.tweens.addCounter({
      from: 0, to: 3.999, duration: sea ? 650 : 420,
      onUpdate: t => img.setTexture(`${kind}_${1 + Math.floor(t.getValue() ?? 0)}`),
      onComplete: () => img.destroy(),
    });
  }
}
