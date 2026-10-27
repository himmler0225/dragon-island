'use client';
// Túi Chứa Rồng (dragon bag): the player's dragons as cards, filtered by tab (Tất cả, Hiếm, Cực Hiếm, Event,
// Huyền Thoại), 12 a page. Tapping a card opens its options: Xem thông tin, Khảm ngọc, Cất rồng, Tẩy rồng.
// Same gold-framed teal sheet as Lai Rồng. The collection is mock data until the backend has it.
// Icons: public/ui/bag/<name>.png when drawn (see the prompt in the chat); an emoji stands in until then.
import { useEffect, useMemo, useState } from 'react';
import { SPECIES, SPECIES_INFO, portraitUrl, type SpeciesId } from '@/game/config';
import { SKILLS, skillIconUrl } from '@/game/skills';
import styles from './BagPanel.module.css';

interface OwnedDragon { uid: number; species: SpeciesId; stars: number; level: number; event: boolean; gems: (string | null)[] }

/** Dragons from limited-time events (shown with the Event ribbon). */
const EVENT_SPECIES = new Set<SpeciesId>(['east_sea_dragon', 'west_sea_dragon', 'north_sea_dragon', 'south_sea_dragon', 'peacock']);
// mock collection: a few of each species with different stars and levels
const MOCK: OwnedDragon[] = Array.from({ length: 40 }, (_, i) => {
  const species = SPECIES[(i * 7) % SPECIES.length];
  return { uid: i + 1, species, stars: ((i * 11) % 24) + 6, level: ((i * 5) % 30) + 1, event: EVENT_SPECIES.has(species), gems: [null, null, null] };
});

type Tab = 'all' | 'rare' | 'epic' | 'event' | 'legend';
const TABS: [Tab, string, string][] = [
  ['all', 'Tất cả', '🐉'], ['rare', 'Hiếm', '💎'], ['epic', 'Cực Hiếm', '🔮'], ['event', 'Event', '🎉'], ['legend', 'Huyền Thoại', '👑'],
];
const inTab = (d: OwnedDragon, tab: Tab) => {
  const r = SPECIES_INFO[d.species].rarity;
  return tab === 'all' || (tab === 'event' ? d.event : tab === 'rare' ? r === 'SR' : tab === 'epic' ? r === 'SSR' : tab === 'legend' ? r === 'UR' : true);
};
type Action = 'info' | 'gem' | 'store' | 'wipe';
const ACTIONS: [Action, string, string][] = [['info', 'Xem thông tin', '📜'], ['gem', 'Khảm ngọc', '💠'], ['store', 'Cất rồng', '📦'], ['wipe', 'Tẩy rồng', '🧹']];
const GEMS = ['🔴', '🔵', '🟢', '🟡'];
const PAGE = 12;

/** A bag icon: public/ui/bag/<name>.png, or the emoji until that art exists. */
function BagIcon({ name, emoji }: { name: string; emoji: string }) {
  const [missing, setMissing] = useState(false);
  // eslint-disable-next-line @next/next/no-img-element
  return missing ? <span className={styles.emoji}>{emoji}</span> : <img className={styles.icon} src={`/ui/bag/${name}.png`} alt="" onError={() => setMissing(true)} />;
}

export default function BagPanel({ onClose }: { onClose: () => void }) {
  const [owned, setOwned] = useState(MOCK);
  const [tab, setTab] = useState<Tab>('all');
  const [page, setPage] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);   // uid with its options menu open
  const [dialog, setDialog] = useState<{ action: Action; uid: number } | null>(null);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(''), 1800);
    return () => clearTimeout(t);
  }, [msg]);

  const list = useMemo(() => owned.filter(d => inTab(d, tab)), [owned, tab]);
  const pages = Math.max(1, Math.ceil(list.length / PAGE));
  const shown = list.slice(page * PAGE, page * PAGE + PAGE);
  const dragon = dialog ? owned.find(d => d.uid === dialog.uid) : null;
  const pick = (t: Tab) => { setTab(t); setPage(0); setPicked(null); };

  const act = (action: Action, uid: number) => {
    setPicked(null);
    if (action === 'store') {
      setOwned(o => o.filter(d => d.uid !== uid));
      return setMsg('Đã cất rồng vào kho');
    }
    setDialog({ action, uid });
  };
  const wipe = (uid: number) => {
    setOwned(o => o.map(d => (d.uid === uid ? { ...d, level: 1, gems: [null, null, null] } : d)));
    setDialog(null); setMsg('Đã tẩy rồng: về cấp 1, gỡ hết ngọc');
  };
  const socket = (uid: number, k: number) => {
    setOwned(o => o.map(d => (d.uid !== uid ? d : { ...d, gems: d.gems.map((g, i) => (i !== k ? g : g ? null : GEMS[(uid + k) % GEMS.length])) })));
  };

  return (
    <div className={styles.backdrop} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={styles.panel}>
        <header className={styles.title}>
          <h2>Túi Chứa Rồng</h2>
          <button className={styles.close} onClick={onClose} aria-label="Đóng">✕</button>
        </header>
        {msg && <p className={styles.msg} key={msg}>{msg}</p>}

        <div className={styles.body} onClick={() => setPicked(null)}>
          <div className={styles.tabs}>
            {TABS.map(([id, label, emoji]) => (
              <button key={id} className={`${styles.tab} ${tab === id ? styles.tabOn : ''}`} onClick={e => { e.stopPropagation(); pick(id); }} title={label}>
                <BagIcon name={`tab_${id}`} emoji={emoji} /><span>{label}</span>
              </button>
            ))}
          </div>

          <div className={styles.grid}>
            {shown.map(d => (
              <div key={d.uid} className={styles.cell}>
                <button className={`${styles.card} ${picked === d.uid ? styles.cardOn : ''}`}
                  onClick={e => { e.stopPropagation(); setPicked(picked === d.uid ? null : d.uid); }} title={SPECIES_INFO[d.species].name}>
                  {d.event && <span className={styles.ribbon}>Event</span>}
                  <span className={styles.stars}>{d.stars}<i>★</i></span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={portraitUrl(d.species)} alt="" />
                  <span className={styles.lv}>Lv.{d.level}</span>
                  {d.gems.some(Boolean) && <span className={styles.gemDots}>{d.gems.filter(Boolean).join('')}</span>}
                </button>
                {picked === d.uid && (
                  <div className={styles.menu} onClick={e => e.stopPropagation()}>
                    {ACTIONS.map(([id, label, emoji]) => (
                      <button key={id} className={`${styles.option} ${id === 'wipe' ? styles.danger : ''}`} onClick={() => act(id, d.uid)}>
                        <BagIcon name={id} emoji={emoji} /><span>{label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {!shown.length && <p className={styles.empty}>Không có rồng nào ở mục này.</p>}
          </div>

          <div className={styles.pager}>
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>◀</button>
            <span>{page + 1} / {pages}</span>
            <button onClick={() => setPage(p => Math.min(pages - 1, p + 1))} disabled={page >= pages - 1}>▶</button>
          </div>
        </div>

        {dialog && dragon && (
          <div className={styles.dialogBack} onClick={() => setDialog(null)}>
            <div className={styles.dialog} onClick={e => e.stopPropagation()}>
              <header>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={portraitUrl(dragon.species)} alt="" />
                <div>
                  <h3>{SPECIES_INFO[dragon.species].name}</h3>
                  <small>{SPECIES_INFO[dragon.species].element} · {SPECIES_INFO[dragon.species].rarity} · {dragon.stars}★ · Lv.{dragon.level}{dragon.event ? ' · Event' : ''}</small>
                </div>
              </header>

              {dialog.action === 'info' && (
                <ul className={styles.skills}>
                  {SKILLS[dragon.species].map(s => (
                    <li key={s.type}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={skillIconUrl(dragon.species, s.type)} alt="" />
                      <div><b>{s.name}</b><p>{s.desc}</p></div>
                    </li>
                  ))}
                </ul>
              )}

              {dialog.action === 'gem' && <>
                <p className={styles.hint}>Bấm vào ô để khảm ngọc (bấm lần nữa để gỡ). Mỗi viên ngọc tăng chỉ số của rồng.</p>
                <div className={styles.sockets}>
                  {dragon.gems.map((g, k) => (
                    <button key={k} className={`${styles.socket} ${g ? styles.socketOn : ''}`} onClick={() => socket(dragon.uid, k)}>{g ?? '+'}</button>
                  ))}
                </div>
              </>}

              {dialog.action === 'wipe' && <>
                <p className={styles.hint}>Tẩy rồng đưa rồng về <b>cấp 1</b> và gỡ hết ngọc đã khảm. Không thể hoàn tác.</p>
                <div className={styles.actions}>
                  <button className={`${styles.btn} ${styles.blue}`} onClick={() => setDialog(null)}>Huỷ</button>
                  <button className={`${styles.btn} ${styles.red}`} onClick={() => wipe(dragon.uid)}>Tẩy rồng</button>
                </div>
              </>}

              {dialog.action !== 'wipe' && (
                <div className={styles.actions}><button className={`${styles.btn} ${styles.orange}`} onClick={() => setDialog(null)}>Đóng</button></div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
