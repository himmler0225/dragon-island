// Weather on the islands: clear, cloudy (gloomy grey) or rain. Changes every few minutes at random.
// A grey multiply layer dims the world (on top of the day/night tint), rain streaks fall over the
// camera view and land as ripples on the sea; lamps light up when it gets gloomy (scene.night).
import * as Phaser from 'phaser';

export type WeatherKind = 'clear' | 'cloudy' | 'rain';

const GLOOM: Record<WeatherKind, number> = { clear: 0, cloudy: 0.6, rain: 0.85 };
const DROPS = 260;

export class Weather {
  kind: WeatherKind = 'clear';
  /** 0..1, eased toward the current kind's gloom */
  gloom = 0;
  /** dev: force a kind, e.g. window.__game.scene.getScene('island').weather.set('rain') */
  private next = 0;
  private layer: Phaser.GameObjects.Rectangle;
  private drops: Phaser.GameObjects.Rectangle[] = [];
  private rain = 0;   // 0..1 rain strength (eased)

  constructor(private scene: Phaser.Scene, x: number, y: number, w: number, h: number, private onSea: (x: number, y: number) => boolean) {
    this.layer = scene.add.rectangle(x, y, w, h, 0x56606e, 0).setDepth(899).setBlendMode(Phaser.BlendModes.MULTIPLY);
    for (let k = 0; k < DROPS; k++) {
      this.drops.push(scene.add.rectangle(0, 0, 2.5, Phaser.Math.Between(18, 32), 0xdcecff, 0.8).setDepth(950).setAngle(12).setVisible(false));
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
        d.setPosition(Phaser.Math.FloatBetween(view.x - 60, view.right), view.y - Phaser.Math.FloatBetween(0, view.height))
          .setVisible(true);
        d.setData('land', view.y + Phaser.Math.FloatBetween(view.height * 0.25, view.height));
      }
      d.y += 900 * dt; d.x += 190 * dt;
      if (d.y >= d.getData('land')) {
        if (Math.random() < 0.08 && this.onSea(d.x, d.y)) this.ripple(d.x, d.y);
        d.y = view.bottom + 30;   // recycled next frame
      }
    });
  }

  private ripple(x: number, y: number) {
    const r = this.scene.add.ellipse(x, y, 14, 5).setStrokeStyle(1, 0xffffff, 0.7).setDepth(1);
    this.scene.tweens.add({ targets: r, scale: 2.4, alpha: 0, duration: 600, onComplete: () => r.destroy() });
  }
}
