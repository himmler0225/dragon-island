'use client';
// Rig editor (/dev/rig-editor): pick a dragon, then grab its pieces and move / turn / scale them. The tweaks
// are drawn by the game on top of the built rig (rig/tweaks.ts) and saved in the backend's database
// (PUT /api/rig-tweaks/:species). Development only: the backend refuses to save in production.
import { useEffect, useRef, useState } from 'react';
import type * as PhaserNS from 'phaser';
import { SPECIES, SPECIES_INFO, type SpeciesId } from '@/game/config/species';
import { OutdatedError, SIZE_KEY, fetchSpecies, saveSpecies, tweaksFor, type Tweak } from '@/game/rig/tweaks';
import type { EditorMode, EditorTool, RigEditorScene } from './rigEditorScene';
import styles from './RigEditor.module.css';

const DEG = 180 / Math.PI;
const isSet = (t?: Tweak) => !!t && (t.dx !== 0 || t.dy !== 0 || t.rot !== 0 || t.scale !== 1 || !!t.flipX);

export default function RigEditor() {
  const stage = useRef<HTMLDivElement>(null);
  const scene = useRef<RigEditorScene | null>(null);
  const [species, setSpecies] = useState<SpeciesId>('ruby_dragon');
  const [pieces, setPieces] = useState<string[]>([]);
  const [picked, setPicked] = useState<string | null>(null);
  const [, setTick] = useState(0);   // re-render when a tweak changes in the scene
  const [mode, setMode] = useState<EditorMode>('pause');
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState('');
  const [ready, setReady] = useState(false);
  /** this species as read from the DB: 'loading', 'ok', or the error (then nothing can be saved: it would wipe the DB) */
  const [load, setLoad] = useState<'loading' | 'ok' | string>('loading');
  const [saving, setSaving] = useState(false);
  /** a save refused: the dragon was saved elsewhere since it was loaded */
  const [conflict, setConflict] = useState(false);
  /** the version of this species the editor loaded / last saved (sent with a save: a newer one in the DB refuses it) */
  const version = useRef<string>('');
  const loadSeq = useRef(0);
  const [tool, setTool] = useState<EditorTool>('move');
  const [brush, setBrush] = useState(14);
  const [colour, setColour] = useState('#d22a1e');
  const [flipView, setFlipView] = useState(false);

  // Phaser + the editor scene (browser only)
  useEffect(() => {
    let game: PhaserNS.Game | null = null, cancelled = false;
    (async () => {
      const Phaser = await import('phaser');
      const { RigEditorScene } = await import('./rigEditorScene');
      if (cancelled) return;
      const sc = new RigEditorScene({
        loaded: list => setPieces(list),
        picked: bone => setPicked(bone),
        changed: () => { setDirty(true); setTick(t => t + 1); },
        picked_colour: hex => { setColour(hex); setTool('paint'); },
      });
      const el = stage.current!;
      game = new Phaser.Game({
        type: Phaser.WEBGL, parent: el, width: el.clientWidth, height: el.clientHeight, backgroundColor: '#cfdcc4',
        scene: sc, scale: { mode: Phaser.Scale.RESIZE },
      });
      game.events.once(Phaser.Core.Events.READY, () => { scene.current = sc; setReady(true); });
    })();
    return () => { cancelled = true; game?.destroy(true); scene.current = null; };
  }, []);

  /** Read the species fresh from the DB and show it (every time it is picked, and on "Tải lại"). */
  const reload = async (id: SpeciesId) => {
    const seq = ++loadSeq.current;   // (a later pick wins over a slow earlier load)
    setLoad('loading'); setConflict(false); setStatus('Đang tải từ DB…');
    try {
      const v = await fetchSpecies(id);
      if (seq !== loadSeq.current) return;
      await scene.current?.show(id);
      if (seq !== loadSeq.current) return;
      version.current = v;
      setLoad('ok'); setDirty(false); setStatus(v ? `Đã tải (bản lưu lúc ${new Date(v).toLocaleTimeString('vi-VN')})` : 'Đã tải (con này chưa có chỉnh sửa nào)');
    } catch (e) {
      if (seq !== loadSeq.current) return;
      setLoad((e as Error).message || 'lỗi không rõ');
      setStatus('');
    }
    setTick(t => t + 1);
  };

  useEffect(() => {
    if (ready && scene.current) void reload(species);
  }, [species, ready]);

  // leaving the page with unsaved changes: the browser asks first
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  useEffect(() => { if (scene.current) scene.current.mode = mode; }, [mode, ready]);
  useEffect(() => { if (scene.current) { scene.current.tool = tool; scene.current.brush = brush; scene.current.colour = colour; } }, [tool, brush, colour, ready]);
  useEffect(() => { scene.current?.setFlipView(flipView); }, [flipView, ready]);

  const tw = picked ? tweaksFor(species)[picked] : undefined;
  const edit = (field: 'dx' | 'dy' | 'rot' | 'scale', value: number) => {
    if (!picked || !scene.current || Number.isNaN(value)) return;
    scene.current.tweak(picked)[field] = field === 'rot' ? value / DEG : value;
    setDirty(true); setTick(t => t + 1);
  };
  const flipPiece = (on: boolean) => {
    if (!picked || !scene.current) return;
    scene.current.tweak(picked).flipX = on;
    setDirty(true); setTick(t => t + 1);
  };
  const size = tweaksFor(species)[SIZE_KEY]?.scale ?? 1;
  const setSize = (k: number) => {
    if (!k || Number.isNaN(k)) return;
    const all = tweaksFor(species);
    if (Math.abs(k - 1) < 1e-3) delete all[SIZE_KEY];
    else all[SIZE_KEY] = { dx: 0, dy: 0, rot: 0, scale: Math.round(k * 1000) / 1000 };
    setDirty(true); setTick(t => t + 1);
  };
  const resetPiece = () => {
    if (!picked) return;
    delete tweaksFor(species)[picked];
    setDirty(true); setTick(t => t + 1);
  };
  const resetAll = () => {
    const all = tweaksFor(species);
    for (const k of Object.keys(all)) delete all[k];
    setDirty(true); setTick(t => t + 1);
  };
  /** Save this species: its tweaks and changed masks in one go. overwrite: even if it was saved elsewhere since. */
  const save = async (overwrite = false) => {
    if (saving || load !== 'ok' || !scene.current) return;
    setSaving(true); setConflict(false); setStatus('Đang lưu…');
    try {
      const v = await saveSpecies(species, tweaksFor(species), scene.current.changedMasks(), overwrite ? null : version.current);
      scene.current.masksSaved();
      version.current = v;
      setDirty(false);
      setStatus(`Đã lưu vào DB lúc ${new Date().toLocaleTimeString('vi-VN')} (${Object.keys(tweaksFor(species)).length} mảnh đã chỉnh)`);
    } catch (e) {
      if (e instanceof OutdatedError) { setConflict(true); setStatus(''); }
      else setStatus(`Lưu không được: ${(e as Error).message}. Thay đổi của bạn vẫn còn trên màn hình, bấm Lưu lại khi backend chạy.`);
    } finally {
      setSaving(false); setTick(t => t + 1);
    }
  };
  const discard = () => {
    if (dirty && !window.confirm('Bỏ hết thay đổi chưa lưu và tải lại bản trong DB?')) return;
    void reload(species);
  };
  const changeSpecies = (id: SpeciesId) => {
    if (dirty && !window.confirm('Con này còn thay đổi chưa lưu, đổi rồng sẽ BỎ các thay đổi đó. Vẫn đổi?')) return;
    setSpecies(id);
  };

  // Ctrl / Cmd + S: save
  const saveRef = useRef(save);
  useEffect(() => { saveRef.current = save; });
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') { e.preventDefault(); void saveRef.current(); }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, []);

  const all = tweaksFor(species);
  return (
    <div className={styles.wrap}>
      <aside className={styles.side}>
        <h1>Chỉnh rồng</h1>
        <label className={styles.row}>Rồng
          <select value={species} onChange={e => changeSpecies(e.target.value as SpeciesId)}>
            {SPECIES.map(id => <option key={id} value={id}>{SPECIES_INFO[id].name} ({id})</option>)}
          </select>
        </label>
        <label className={styles.row}>Kích thước cả con: <b>{Math.round(size * 100)}%</b>
          <span className={styles.size}>
            <input type="range" min={0.5} max={1.6} step={0.01} value={size} onChange={e => setSize(+e.target.value)} />
            <input type="number" min={0.3} max={3} step={0.01} value={size} onChange={e => setSize(+e.target.value)} />
          </span>
        </label>
        <div className={styles.modes}>
          {([['move', '✋ Kéo'], ['skin', '🎨 Tô màu da'], ['paint', '🖌 Tô'], ['pick', '💧 Hút màu'], ['erase', '🧽 Gôm'], ['restore', '↩︎ Khôi phục']] as [EditorTool, string][]).map(([m, label]) => (
            <button key={m} data-on={tool === m || undefined} onClick={() => setTool(m)}>{label}</button>
          ))}
        </div>
        {(tool === 'paint' || tool === 'pick') && (
          <label className={styles.row}>Màu tô (💧 Hút màu: bấm lên rồng để lấy màu)
            <input type="color" value={colour} onChange={e => setColour(e.target.value)} />
          </label>
        )}
        {tool !== 'move' && tool !== 'pick' && (
          <label className={styles.row}>Cỡ cọ: {brush}px <small>(bấm lên mảnh nào thì tô mảnh đó)</small>
            <input type="range" min={3} max={60} step={1} value={brush} onChange={e => setBrush(+e.target.value)} />
          </label>
        )}
        <label className={styles.check}><input type="checkbox" checked={flipView} onChange={e => setFlipView(e.target.checked)} /> Lật cả con (chỉ để xem)</label>
        <div className={styles.modes}>
          {([['pause', 'Dừng'], ['idle', 'Đứng thở'], ['walk', 'Đi bộ']] as [EditorMode, string][]).map(([m, label]) => (
            <button key={m} data-on={mode === m || undefined} onClick={() => setMode(m)}>{label}</button>
          ))}
        </div>
        <div className={styles.modes}>
          {([['attack', '⚔️ Đánh'], ['cast', '✨ Kỹ năng'], ['ultimate', '💥 Tuyệt kỹ']] as const).map(([k, label]) => (
            <button key={k} onClick={() => { if (mode === 'pause') setMode('idle'); scene.current?.playStrike(k); }}>{label}</button>
          ))}
        </div>

        <h2>Mảnh {picked ? <b>{picked}</b> : <small>(bấm vào rồng để chọn)</small>}</h2>
        {picked && (
          <div className={styles.fields}>
            <label>Dời ngang (px)<input type="number" step={1} value={tw?.dx ?? 0} onChange={e => edit('dx', +e.target.value)} /></label>
            <label>Dời dọc (px)<input type="number" step={1} value={tw?.dy ?? 0} onChange={e => edit('dy', +e.target.value)} /></label>
            <label>Xoay (độ)<input type="number" step={1} value={Math.round((tw?.rot ?? 0) * DEG * 10) / 10} onChange={e => edit('rot', +e.target.value)} /></label>
            <label className={styles.wide}>Kích thước mảnh: {Math.round((tw?.scale ?? 1) * 100)}% <small>(kéo theo các mảnh gắn vào nó)</small>
              <span className={styles.size}>
                <input type="range" min={0.4} max={2} step={0.01} value={tw?.scale ?? 1} onChange={e => edit('scale', +e.target.value)} />
                <input type="number" step={0.01} min={0.2} max={4} value={tw?.scale ?? 1} onChange={e => edit('scale', +e.target.value)} />
              </span>
            </label>
            <label className={styles.check}><input type="checkbox" checked={!!tw?.flipX} onChange={e => flipPiece(e.target.checked)} /> Lật mảnh này</label>
            <button onClick={() => { if (picked) { scene.current?.clearMask(picked); setDirty(true); setTick(t => t + 1); } }}>Bỏ hết chỗ đã tô / gôm</button>
            <button onClick={resetPiece}>Đặt lại mảnh này</button>
          </div>
        )}

        <h2>Các mảnh</h2>
        <ul className={styles.list}>
          {pieces.map(name => (
            <li key={name}>
              <button data-on={name === picked || undefined} onClick={() => scene.current?.pick(name)}>
                {name}{isSet(all[name]) && <i>●</i>}
              </button>
            </li>
          ))}
        </ul>

        <div className={styles.actions}>
          <button className={styles.save} onClick={() => void save()} disabled={saving || load !== 'ok'}>
            {saving ? 'Đang lưu…' : `💾 Lưu vào DB${dirty ? ' *' : ''}`} <small>(Ctrl/⌘ + S)</small>
          </button>
          <button onClick={discard} disabled={saving}>Bỏ thay đổi (tải lại từ DB)</button>
          <button onClick={resetAll} disabled={saving || load !== 'ok'}>Đặt lại cả con</button>
        </div>
        {load !== 'ok' && load !== 'loading' && (
          <div className={styles.error}>
            <b>Không tải được con này từ DB</b>: {load}<br />
            Chưa thể lưu (lưu lúc này sẽ xoá các chỉnh sửa đã có trong DB).
            <button onClick={() => void reload(species)}>Thử tải lại</button>
          </div>
        )}
        {conflict && (
          <div className={styles.error}>
            <b>Con này vừa được lưu ở nơi khác</b> (tab khác?) sau khi bạn mở nó.
            <button onClick={() => void reload(species)}>Lấy bản mới (bỏ thay đổi của tôi)</button>
            <button onClick={() => void save(true)}>Ghi đè bằng bản của tôi</button>
          </div>
        )}
        {status && <p className={styles.status}>{status}</p>}
        <p className={styles.help}>
          🎨 Tô màu da: tô lên viền muốn xoá, cọ tự lấy màu da ngay quanh chỗ tô (bỏ qua viền tối) và đổi màu theo da khi kéo, mép cọ mềm — không cần hút màu.
          Tô màu: chọn mảnh, 💧 Hút màu rồi bấm lên chỗ da để lấy đúng màu, sau đó 🖌 Tô lên đường viền muốn xoá (chỉ tô trên mảnh đang chọn, giữ nguyên dáng; viền ngoài còn nguyên nếu không tô lên nó).
          🧽 Gôm: tự lấp viền tối bằng màu kế bên; ↩︎ Khôi phục: xoá cả phần tô lẫn phần gôm dưới cọ.
          Như xếp hình: mảnh nào cũng kéo theo các mảnh gắn vào nó (đùi kéo theo ống chân và bàn chân; thân kéo theo đầu, cánh, đuôi, còn chân vẫn đứng trên đất). Vạch nâu là mặt đất.
          Kéo: dời mảnh · Chuột phải kéo hoặc Shift + kéo: xoay quanh khớp (dấu xanh) · Lăn chuột: xoay 1° · Ctrl + lăn: phóng to/nhỏ ·
          Phím mũi tên: dời 1px (Shift: 10px) · Q / E: xoay 1° (Shift: 10°). Lưu xong, tải lại trang game là thấy.
        </p>
      </aside>
      <div ref={stage} className={styles.stage} />
    </div>
  );
}
