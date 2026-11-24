'use client';
// Sự kiện Giáng Sinh: decorate the island's Christmas tree. Every day the player gets a gift of ornament balls; each
// one tapped is hung on the next free spot of the tree. The tree grows through 4 stages as it fills (STAGES), and
// reaching a stage pays gold (into the HUD wallet via the 'collect' event). The rare dragon-egg ornament pays a
// bonus. Progress is kept in this browser (localStorage).
// Art: public/events/christmas (tools/slice_event.py): tree_1..4, orn_1..8, banner, icon.
import { useState } from 'react';
import { gameEvents } from '@/game/bridge';
import { assetUrl } from '@/game/config/assets';
import styles from './ChristmasPanel.module.css';

const art = (name: string) => assetUrl(`events/christmas/${name}.png`);
const KEY = 'christmas_event_v1';
const ORNAMENTS = ['Châu Đỏ', 'Châu Vàng', 'Châu Băng', 'Châu Lục', 'Châu Trăng', 'Châu Anh Đào', 'Châu Kẹo', 'Châu Trứng Rồng'];
const RARE = 7;   // the dragon-egg ornament (index): rare in the gift, pays a bonus when hung
const RARE_BONUS = 300;
const GIFT = 5;   // ornaments in the daily gift
/** Ornaments hung to reach stages 2, 3, 4, and the gold each stage pays. */
const STAGES = [{ at: 6, gold: 300 }, { at: 14, gold: 800 }, { at: 24, gold: 2000 }];
const SLOTS = STAGES[STAGES.length - 1].at;

/** Where the ornaments hang: rows down the cone of the tree (share of the tree box, top-left 0..1). */
const SPOTS: [number, number][] = [2, 3, 4, 4, 5, 6].flatMap((n, row) => {
  const y = 0.3 + row * 0.085, half = 0.07 + row * 0.045;
  return Array.from({ length: n }, (_, k) => [0.5 - half + (2 * half * (k + 0.5)) / n + (row % 2 ? 0.015 : -0.015), y] as [number, number]);
});

interface State { bag: number[]; hung: number[]; day: string; paid: number }
const today = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' });
const fresh = (): State => ({ bag: Array(ORNAMENTS.length).fill(0), hung: [], day: '', paid: 0 });
function load(): State {
  try { return { ...fresh(), ...JSON.parse(localStorage.getItem(KEY) ?? '{}') }; } catch { return fresh(); }
}

export default function ChristmasPanel({ onClose }: { onClose: () => void }) {
  // opened by a click, so only ever rendered in the browser
  const [s, setS] = useState<State>(() => (typeof window === 'undefined' ? fresh() : load()));
  const [popped, setPopped] = useState<number | null>(null);   // the slot just hung (it pops in)
  const [note, setNote] = useState('');
  const save = (next: State) => { setS(next); try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* private mode */ } };

  const stage = 1 + STAGES.filter(t => s.hung.length >= t.at).length;
  const next = STAGES.find(t => s.hung.length < t.at);
  const claimed = s.day === today();

  const claim = () => {
    if (claimed) return;
    const bag = [...s.bag], got: number[] = [];
    for (let k = 0; k < GIFT; k++) {
      const o = Math.random() < 0.06 ? RARE : Math.floor(Math.random() * RARE);
      bag[o]++; got.push(o);
    }
    save({ ...s, bag, day: today() });
    setNote(`Nhận ${GIFT} quả châu${got.includes(RARE) ? ', có cả Châu Trứng Rồng!' : '!'}`);
  };

  const hang = (o: number) => {
    if (!s.bag[o] || s.hung.length >= SLOTS) return;
    const bag = [...s.bag]; bag[o]--;
    const hung = [...s.hung, o];
    let paid = s.paid, gold = o === RARE ? RARE_BONUS : 0;
    while (paid < STAGES.length && hung.length >= STAGES[paid].at) gold += STAGES[paid++].gold;
    save({ ...s, bag, hung, paid });
    setPopped(hung.length - 1);
    if (gold) {
      gameEvents.emit('collect', { resource: 'gold', amount: gold });
      setNote(paid > s.paid ? `Cây lớn lên! +${gold.toLocaleString('vi-VN')} vàng` : `Châu Trứng Rồng: +${gold} vàng`);
    } else setNote('');
  };

  return (
    <div className={styles.backdrop} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={styles.panel}>
        <header className={styles.title} style={{ backgroundImage: `url(${art('banner')})` }}>
          <h2>Lễ Hội Cây Thông</h2>
          <button className={styles.close} onClick={onClose} aria-label="Đóng">✕</button>
        </header>
        <div className={styles.body}>
          <div className={styles.tree}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className={styles.treeArt} src={art(`tree_${stage}`)} alt={`Cây thông giai đoạn ${stage}`} />
            {s.hung.map((o, k) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={k} className={`${styles.ball} ${k === popped ? styles.pop : ''}`} src={art(`orn_${o + 1}`)} alt=""
                style={{ left: `${SPOTS[k][0] * 100}%`, top: `${SPOTS[k][1] * 100}%` }} />
            ))}
          </div>
          <section className={styles.side}>
            <p className={styles.blurb}>Treo quả châu lên cây thông của đảo. Cây lớn dần qua 4 giai đoạn, mỗi giai đoạn nhận thưởng vàng.
              Mỗi ngày nhận {GIFT} quả châu miễn phí.</p>
            <div className={styles.progress}>
              <div className={styles.bar}><b style={{ width: `${(s.hung.length / SLOTS) * 100}%` }} />
                {STAGES.map(t => <i key={t.at} style={{ left: `${(t.at / SLOTS) * 100}%` }} data-on={s.hung.length >= t.at || undefined} />)}
              </div>
              <span>Giai đoạn {stage}/4 · {s.hung.length}/{SLOTS} quả châu
                {next ? ` · còn ${next.at - s.hung.length} quả: +${next.gold.toLocaleString('vi-VN')} vàng` : ' · cây đã trang trí xong!'}</span>
            </div>
            <button className={styles.claim} onClick={claim} disabled={claimed}>
              {claimed ? 'Đã nhận quà hôm nay' : `🎁 Nhận ${GIFT} quả châu hôm nay`}
            </button>
            <div className={styles.bag}>
              {ORNAMENTS.map((name, o) => (
                <button key={o} className={styles.orn} onClick={() => hang(o)} disabled={!s.bag[o] || s.hung.length >= SLOTS}
                  title={o === RARE ? `${name}: hiếm, treo lên nhận thêm ${RARE_BONUS} vàng` : `${name}: bấm để treo lên cây`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={art(`orn_${o + 1}`)} alt={name} />
                  <b>{s.bag[o]}</b>
                </button>
              ))}
            </div>
            {note && <p className={styles.note}>{note}</p>}
          </section>
        </div>
      </div>
    </div>
  );
}

/** The event's icon (the HUD button). */
export const christmasIcon = art('icon');
