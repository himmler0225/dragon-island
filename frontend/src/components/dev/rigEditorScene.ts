// The rig editor's Phaser scene: one dragon, big, on a plain background. Click a piece to pick it; drag to move it,
// right-drag (or Shift + drag) to turn it about its joint, wheel to turn it a degree, Ctrl + wheel to scale it.
// Every change goes straight into the species' live tweak object (rig/tweaks.ts), which the rig draws with.
// The eraser (tool 'erase' / 'restore') paints on the picked piece's mask: there its dark outlines take the colour
// round them (tweaks.ts healedImage; the piece keeps its shape), on a canvas copy so the original stays to restore
// from; saved as a PNG per piece.
import * as Phaser from 'phaser';
import { DragonRig, rigTextureKey, type RigData } from '@/game/rig';
import { PAINT, drawHealed, drawPaint, healedImage, maskFor, paintFor, tweaksFor, type Tweak } from '@/game/rig/tweaks';
import { rigUrl, type SpeciesId } from '@/game/config/species';

export type EditorMode = 'idle' | 'walk' | 'pause';
export type EditorTool = 'move' | 'erase' | 'restore' | 'paint' | 'pick' | 'skin';
export interface EditorEvents {
  /** the eyedropper took this colour (#rrggbb) */
  picked_colour?(hex: string): void;
  /** the dragon is built: its pieces, front to back */
  loaded(pieces: string[]): void;
  picked(bone: string | null): void;
  /** a tweak changed by mouse or keys */
  changed(bone: string): void;
}

const ZERO: Tweak = { dx: 0, dy: 0, rot: 0, scale: 1 };

export class RigEditorScene extends Phaser.Scene {
  private rig: DragonRig | null = null;
  private holder!: Phaser.GameObjects.Container;
  private marker!: Phaser.GameObjects.Graphics;
  private species: SpeciesId | null = null;
  private picked: string | null = null;
  private drag: { kind: 'move' | 'turn' | 'paint'; x: number; y: number; angle: number } | null = null;
  mode: EditorMode = 'pause';
  tool: EditorTool = 'move';
  /** eraser radius, screen px */
  brush = 14;
  /** the colour brush's colour */
  colour = '#d22a1e';
  /** pieces being erased: their mask (opaque = erased), the untouched image, the canvas drawn instead */
  private edits = new Map<string, { mask: HTMLCanvasElement; paint: HTMLCanvasElement; orig: CanvasImageSource; src: Uint8ClampedArray; healed: HTMLCanvasElement; tex: Phaser.Textures.CanvasTexture; dirty: boolean }>();

  constructor(private readonly events_: EditorEvents) {
    super('rig-editor');
  }

  create() {
    this.cameras.main.setBackgroundColor('#cfdcc4');
    this.holder = this.add.container(0, 0);
    this.marker = this.add.graphics().setDepth(10);
    this.input.mouse?.disableContextMenu();
    this.input.on(Phaser.Input.Events.POINTER_DOWN, (p: Phaser.Input.Pointer) => this.down(p));
    this.input.on(Phaser.Input.Events.POINTER_MOVE, (p: Phaser.Input.Pointer) => this.move(p));
    this.input.on(Phaser.Input.Events.POINTER_UP, () => { this.drag = null; });
    this.input.on(Phaser.Input.Events.POINTER_WHEEL, (p: Phaser.Input.Pointer, _: unknown, __: number, dy: number) => {
      if (!this.picked) return;
      const t = this.tweak(this.picked);
      if ((p.event as WheelEvent).ctrlKey) t.scale = Math.round(Phaser.Math.Clamp(t.scale * (dy > 0 ? 0.98 : 1.02), 0.2, 4) * 1000) / 1000;
      else t.rot += Phaser.Math.DegToRad(dy > 0 ? 1 : -1);
      (p.event as WheelEvent).preventDefault();
      this.events_.changed(this.picked);
    });
    // keys straight from the window (Phaser's keyboard events came twice for some keys)
    const onKey = (e: KeyboardEvent) => {
      if (!this.picked || ['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      const step = e.shiftKey ? 10 : 1, t = this.tweak(this.picked);
      const keys: Record<string, () => void> = {
        ArrowLeft: () => { t.dx -= step; }, ArrowRight: () => { t.dx += step; },
        ArrowUp: () => { t.dy -= step; }, ArrowDown: () => { t.dy += step; },
        q: () => { t.rot -= Phaser.Math.DegToRad(step); }, e: () => { t.rot += Phaser.Math.DegToRad(step); },
        Q: () => { t.rot -= Phaser.Math.DegToRad(step); }, E: () => { t.rot += Phaser.Math.DegToRad(step); },
      };
      if (!keys[e.key]) return;
      keys[e.key]();
      e.preventDefault();
      this.events_.changed(this.picked);
    };
    window.addEventListener('keydown', onKey);
    this.events.once(Phaser.Scenes.Events.DESTROY, () => window.removeEventListener('keydown', onKey));
    this.scale.on(Phaser.Scale.Events.RESIZE, () => this.fit());
  }

  /** Build `id`'s rig (loading its pieces the first time). */
  async show(id: SpeciesId) {
    const data = await fetch(rigUrl(id)).then(r => r.json() as Promise<RigData>);
    const missing = data.bones.filter(b => !this.textures.exists(rigTextureKey(id, b.name)));
    if (missing.length) {
      for (const b of missing) this.load.image(rigTextureKey(id, b.name), `/dragons/${id}/${b.name}.png`);
      await new Promise<void>(res => { this.load.once(Phaser.Loader.Events.COMPLETE, () => res()); this.load.start(); });
    }
    this.rig?.destroy();
    this.holder.removeAll(true);
    for (const e of this.edits.values()) e.tex.destroy();
    this.edits.clear();
    this.species = id;
    this.rig = new DragonRig(this, data, this.holder, id);
    for (const b of data.bones) if (maskFor(id, b.name) || paintFor(id, b.name)) this.editable(b.name);   // show what was erased / painted before
    this.rig.update(0, 'idle');
    this.pick(null);
    this.fit(data.height);
    this.events_.loaded(this.rig.pieces().map(p => p.name).reverse());
  }

  private height = 300;
  private fit(height = this.height) {
    this.height = height;
    const cam = this.cameras.main, w = this.scale.width, h = this.scale.height;
    // the rig's origin is the middle of its feet: centre the dragon, its height filling ~70% of the view
    const k = Math.min((h * 0.7) / Math.max(1, height * this.rigScale()), (w * 0.8) / Math.max(1, height * 1.6 * this.rigScale()));
    cam.setZoom(k);
    cam.centerOn(0, -height * this.rigScale() * 0.45);
  }

  private rigScale() { return Math.abs(this.rig?.container.scaleX ?? 1); }

  /** Play a strike (attack / cast / ultimate) once, to see the pose and the pieces it swaps (e.g. a lit head). */
  playStrike(kind: 'attack' | 'cast' | 'ultimate') {
    if (!this.rig) return;
    if (this.mode === 'pause') this.mode = 'idle';   // (a paused rig would not move)
    this.rig.strike(kind);
  }

  /** View the dragon mirrored (the editor only: the game draws it as before). */
  setFlipView(on: boolean) { this.holder.setScale(on ? -1 : 1, 1); }

  /** Turn a piece's image into an erasable canvas copy (once). */
  private editable(bone: string) {
    const hit = this.edits.get(bone);
    if (hit) return hit;
    const img = this.image(bone)!, key = rigTextureKey(this.species!, bone);
    const orig = this.textures.get(key).getSourceImage() as HTMLImageElement;
    const mask = document.createElement('canvas');
    mask.width = orig.width; mask.height = orig.height;
    const saved = maskFor(this.species!, bone);
    if (saved) mask.getContext('2d')!.drawImage(saved, 0, 0, mask.width, mask.height);
    const paint = document.createElement('canvas');
    paint.width = orig.width; paint.height = orig.height;
    const painted = paintFor(this.species!, bone);
    if (painted) paint.getContext('2d')!.drawImage(painted, 0, 0, paint.width, paint.height);
    const texKey = `${key}__erase`;
    if (this.textures.exists(texKey)) this.textures.remove(texKey);
    const tex = this.textures.createCanvas(texKey, orig.width, orig.height)!;
    const px = document.createElement('canvas');
    px.width = orig.width; px.height = orig.height;
    const pctx = px.getContext('2d', { willReadFrequently: true })!;
    pctx.drawImage(orig, 0, 0);
    const src = pctx.getImageData(0, 0, px.width, px.height).data;   // the piece as drawn (the skin brush samples it)
    const e = { mask, paint, orig, src, healed: healedImage(orig), tex, dirty: false };
    this.edits.set(bone, e);
    this.redraw(e);
    img.setTexture(texKey);
    return e;
  }

  private redraw(e: { mask: HTMLCanvasElement; paint: HTMLCanvasElement; orig: CanvasImageSource; healed: HTMLCanvasElement; tex: Phaser.Textures.CanvasTexture }) {
    const ctx = e.tex.getContext();
    drawHealed(ctx, e.orig, e.healed, e.mask);   // erased: the outline takes the colour round it
    drawPaint(ctx, e.paint);                     // then the colour brush on top
    e.tex.refresh();
  }

  /** Paint the eraser (or restore) on the picked piece, along the segment from the last point. */
  private paint(x0: number, y0: number, x1: number, y1: number) {
    if (!this.picked) return;
    const img = this.image(this.picked)!, e = this.editable(this.picked), m = img.getWorldTransformMatrix();
    const local = (x: number, y: number) => {
      const q = m.applyInverse(x, y);
      const px = q.x + img.displayOriginX;
      return [img.flipX ? img.width - px : px, q.y + img.displayOriginY];
    };
    const k = Math.hypot(m.a, m.b) * this.cameras.main.zoom, r = this.brush / Math.max(1e-3, k);
    const [ax, ay] = local(x0, y0), [bx, by] = local(x1, y1);
    const steps = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / (r * 0.4)));
    if (this.tool === 'skin') {
      // the skin brush: at each dab, the colour of the skin right round it (the piece as drawn, its dark outline pixels
      // left out), laid on with a soft edge - so it follows the skin as it changes colour along the stroke
      const ctx = e.paint.getContext('2d')!, w = e.paint.width, h = e.paint.height, d = e.src;
      ctx.globalCompositeOperation = 'source-over';
      for (let i = 0; i <= steps; i++) {
        const cx = ax + ((bx - ax) * i) / steps, cy = ay + ((by - ay) * i) / steps;
        const R = Math.ceil(r * 1.8), lum: number[] = [], px: number[] = [];
        for (let y = Math.max(0, Math.floor(cy - R)); y < Math.min(h, cy + R); y++) {
          for (let x = Math.max(0, Math.floor(cx - R)); x < Math.min(w, cx + R); x++) {
            if ((x - cx) ** 2 + (y - cy) ** 2 > R * R) continue;
            const o = (y * w + x) * 4;
            if (d[o + 3] < 200) continue;
            lum.push(0.3 * d[o] + 0.59 * d[o + 1] + 0.11 * d[o + 2]); px.push(o);
          }
        }
        if (!px.length) continue;
        const sorted = [...lum].sort((p, q) => p - q), cut = 0.75 * sorted[Math.floor(sorted.length * 0.6)];   // the outline: well under the usual brightness
        let R0 = 0, G0 = 0, B0 = 0, n = 0;
        px.forEach((o, k) => { if (lum[k] >= cut) { R0 += d[o]; G0 += d[o + 1]; B0 += d[o + 2]; n++; } });
        if (!n) continue;
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        const rgb = `${Math.round(R0 / n)},${Math.round(G0 / n)},${Math.round(B0 / n)}`;
        g.addColorStop(0, `rgba(${rgb},1)`); g.addColorStop(0.6, `rgba(${rgb},0.85)`); g.addColorStop(1, `rgba(${rgb},0)`);
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
      }
      e.dirty = true;
      this.redraw(e);
      return;
    }
    // erase: on the mask; paint: the colour on the paint layer; restore: off both
    const layers = this.tool === 'erase' ? [e.mask] : this.tool === 'paint' ? [e.paint] : [e.mask, e.paint];
    for (const layer of layers) {
      const ctx = layer.getContext('2d')!;
      ctx.globalCompositeOperation = this.tool === 'restore' ? 'destination-out' : 'source-over';
      ctx.fillStyle = this.tool === 'paint' ? this.colour : '#fff';
      for (let i = 0; i <= steps; i++) {
        ctx.beginPath();
        ctx.arc(ax + ((bx - ax) * i) / steps, ay + ((by - ay) * i) / steps, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    e.dirty = true;
    this.redraw(e);
  }

  /** Clear the picked piece's eraser marks. */
  clearMask(bone: string) {
    const e = this.editable(bone);
    e.mask.getContext('2d')!.clearRect(0, 0, e.mask.width, e.mask.height);
    e.paint.getContext('2d')!.clearRect(0, 0, e.paint.width, e.paint.height);
    e.dirty = true;
    this.redraw(e);
  }

  /** Pieces with unsaved erasing. */
  get unsavedMasks() { return [...this.edits.entries()].filter(([, e]) => e.dirty).map(([b]) => b); }

  /** The masks changed since the last load / save, ready to send: bone -> png data URL, or null (emptied). */
  changedMasks(): Record<string, string | null> {
    const out: Record<string, string | null> = {};
    const used = (c: HTMLCanvasElement) => {
      const px = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data;
      for (let i = 3; i < px.length; i += 4) if (px[i] > 8) return true;
      return false;
    };
    for (const [bone, e] of this.edits) {
      if (!e.dirty) continue;
      out[bone] = used(e.mask) ? e.mask.toDataURL('image/png') : null;
      out[bone + PAINT] = used(e.paint) ? e.paint.toDataURL('image/png') : null;
    }
    return out;
  }

  /** After a save: the masks as sent are what is kept. */
  masksSaved() { for (const e of this.edits.values()) e.dirty = false; }


  tweak(bone: string): Tweak {
    const all = tweaksFor(this.species!);
    return (all[bone] ??= { ...ZERO });
  }

  pick(bone: string | null) {
    if (this.picked && this.picked !== bone) this.image(this.picked)?.clearTint();
    this.picked = bone;
    this.image(bone)?.setTint(0x9fd4ff);
    this.events_.picked(bone);
  }

  private image(bone: string | null) {
    return bone ? this.rig?.pieces().find(p => p.name === bone)?.img ?? null : null;
  }

  /** The topmost piece with paint under the pointer (pieces before their caps). */
  private hit(x: number, y: number): string | null {
    if (!this.rig) return null;
    const pieces = this.rig.pieces().slice().reverse();
    for (const caps of [false, true]) {
      for (const p of pieces) {
        if (p.name.startsWith('cap_') !== caps || !p.img.visible || p.img.alpha < 0.05) continue;
        const local = p.img.getWorldTransformMatrix().applyInverse(x, y);
        const px = local.x + p.img.displayOriginX, py = local.y + p.img.displayOriginY;
        if (px < 0 || py < 0 || px >= p.img.width || py >= p.img.height) continue;
        if ((this.textures.getPixelAlpha(px, py, p.img.texture.key) ?? 0) > 60) return p.name;
      }
    }
    return null;
  }

  private down(p: Phaser.Input.Pointer) {
    if (this.tool === 'pick') {   // the eyedropper: the colour of the dragon under the pointer
      const bone = this.hit(p.worldX, p.worldY), img = this.image(bone);
      if (!img) return;
      const q = img.getWorldTransformMatrix().applyInverse(p.worldX, p.worldY);
      const px = Math.floor(img.flipX ? img.width - (q.x + img.displayOriginX) : q.x + img.displayOriginX), py = Math.floor(q.y + img.displayOriginY);
      const c = this.textures.getPixel(px, py, img.texture.key);
      if (c && c.alpha > 0) {
        const hex = '#' + [c.red, c.green, c.blue].map(v => v.toString(16).padStart(2, '0')).join('');
        this.colour = hex;
        this.events_.picked_colour?.(hex);
      }
      return;
    }
    if (this.tool !== 'move') {   // the brushes: on the piece under the pointer (picked as it is touched), never moving it
      const under = this.hit(p.worldX, p.worldY);
      if (under && under !== this.picked) this.pick(under);
      if (!this.picked) return;
      this.drag = { kind: 'paint', x: p.worldX, y: p.worldY, angle: 0 };
      this.paint(p.worldX, p.worldY, p.worldX, p.worldY);
      this.events_.changed(this.picked);
      return;
    }
    const bone = this.hit(p.worldX, p.worldY);
    if (bone !== this.picked) this.pick(bone);
    if (!bone) return;
    const img = this.image(bone)!, m = img.getWorldTransformMatrix();
    const turn = p.rightButtonDown() || (p.event as MouseEvent).shiftKey;
    this.drag = { kind: turn ? 'turn' : 'move', x: p.worldX, y: p.worldY, angle: Math.atan2(p.worldY - m.ty, p.worldX - m.tx) };
  }

  private move(p: Phaser.Input.Pointer) {
    if (!this.drag || !this.picked || !p.isDown) return;
    if (this.drag.kind === 'paint') {
      this.paint(this.drag.x, this.drag.y, p.worldX, p.worldY);
      this.drag.x = p.worldX; this.drag.y = p.worldY;
      this.events_.changed(this.picked);
      return;
    }
    const t = this.tweak(this.picked), piece = this.rig!.pieces().find(q => q.name === this.picked)!;
    if (this.drag.kind === 'move') {
      // screen -> rig px (through the rig container: its scale, and the mirrored view), then into the piece's frame
      const cm = this.rig!.container.getWorldTransformMatrix();
      const a = cm.applyInverse(this.drag.x, this.drag.y), b = cm.applyInverse(p.worldX, p.worldY);
      const dx = b.x - a.x, dy = b.y - a.y;
      // (the frame it is drawn in: its pose turn plus whatever the pieces it hangs from were turned by)
      const frame = piece.img.rotation - t.rot, c = Math.cos(-frame), sn = Math.sin(-frame);
      t.dx = Math.round((t.dx + dx * c - dy * sn) * 10) / 10;
      t.dy = Math.round((t.dy + dx * sn + dy * c) * 10) / 10;
      this.drag.x = p.worldX; this.drag.y = p.worldY;
    } else {
      const m = piece.img.getWorldTransformMatrix(), a = Math.atan2(p.worldY - m.ty, p.worldX - m.tx);
      t.rot += Phaser.Math.Angle.Wrap(a - this.drag.angle) * Math.sign(this.holder.scaleX);
      this.drag.angle = a;
    }
    this.events_.changed(this.picked);
  }

  update(_: number, ms: number) {
    if (!this.rig) return;
    const dt = Math.min(ms, 50) / 1000;
    this.rig.update(this.mode === 'pause' ? 0 : dt, this.mode === 'walk' ? 'walk' : 'idle');
    this.marker.clear();
    // the ground the paws stand on (rig y 0): a paw pushed below it sinks into the island
    const z = this.cameras.main.zoom, half = (this.scale.width / z) * 0.6;
    this.marker.lineStyle(2 / z, 0x8a5a2a, 0.8).lineBetween(-half, 0, half, 0);
    const img = this.image(this.picked);
    if (this.tool === 'move') img?.setTint(0x9fd4ff);   // (the rig clears tints when a hit flash ends)
    else img?.clearTint();   // erasing: the true colours
    if (img && this.tool !== 'move') {   // the eraser's size round the pointer
      const ptr = this.input.activePointer;
      this.marker.lineStyle(1.5 / z, 0xff3b6b, 1).strokeCircle(ptr.worldX, ptr.worldY, this.brush / z);
    }
    if (img) {   // the picked piece's joint: what it turns about
      const m = img.getWorldTransformMatrix(), r = 6 / this.cameras.main.zoom;
      this.marker.lineStyle(2 / this.cameras.main.zoom, 0x1a4dff, 1).strokeCircle(m.tx, m.ty, r)
        .lineBetween(m.tx - r * 1.8, m.ty, m.tx + r * 1.8, m.ty).lineBetween(m.tx, m.ty - r * 1.8, m.tx, m.ty + r * 1.8);
    }
  }
}
