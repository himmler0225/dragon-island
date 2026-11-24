'use client';
// Đội hình (team formation): three teams of up to TEAM_SIZE (50) dragons; the slot order is the summon order in battle.
// Pick a slot, then a dragon below to put it there; tap a filled slot again to take the dragon out; tap
// two slots in turn to swap them. Same gold-framed teal sheet as Lai Rồng (BreedPanel), all CSS.
// The owned collection, stars and levels are placeholders until the backend has them.
import { useEffect, useMemo, useState } from 'react';
import { SPECIES, SPECIES_INFO, portraitUrl, type SpeciesId } from '@/game/config';
import { TEAM_COUNT, TEAM_SIZE, loadTeams, saveTeams, type Team } from '@/game/config/team';
import { STARS } from './battleScreenData';
import ElementIcon from './ElementIcon';
import Stars from './Stars';
import styles from './TeamPanel.module.css';

/** Element badge per SPECIES_INFO element. */
const RARITIES = ['R', 'SR', 'SSR', 'UR'] as const;
const RARITY_RANK: Record<string, number> = { R: 0, SR: 1, SSR: 2, UR: 3 };
const SORTS = [['power', 'Lực chiến cao nhất'], ['stars', 'Sao cao nhất'], ['name', 'Tên A-Z']] as const;
type SortKey = (typeof SORTS)[number][0];

// placeholder progression until the backend has it
const LEVEL = (id: SpeciesId) => 15 + (id.length * 3) % 14;
const POWER = (id: SpeciesId) => STARS(id) * 900 + LEVEL(id) * 650 + RARITY_RANK[SPECIES_INFO[id].rarity] * 4000;
const fmt = (n: number) => n.toLocaleString('vi-VN');

/** Team bonus: 3+ dragons of one element. */
function bonus(team: Team): string {
  const count = new Map<string, number>();
  for (const id of team) if (id) count.set(SPECIES_INFO[id].element, (count.get(SPECIES_INFO[id].element) ?? 0) + 1);
  const [el, n] = [...count].sort((a, b) => b[1] - a[1])[0] ?? ['', 0];
  if (n >= 5) return `5 rồng hệ ${el}: +20% Công cho toàn đội`;
  if (n >= 3) return `3 rồng hệ ${el}: +12% Sinh lực cho toàn đội`;
  return 'Xếp 3 rồng cùng hệ để kích hoạt hiệu ứng';
}

export default function TeamPanel({ onClose }: { onClose: () => void }) {
  const [saved, setSaved] = useState(loadTeams);
  const [tab, setTab] = useState(saved.active);
  const [teams, setTeams] = useState<Team[]>(saved.teams);
  const [slot, setSlot] = useState<number | null>(null);   // the selected slot
  const [element, setElement] = useState<string | null>(null);
  const [rarity, setRarity] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>('power');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(''), 1800);
    return () => clearTimeout(t);
  }, [msg]);

  const team = teams[tab];
  const setTeam = (next: Team) => setTeams(ts => ts.map((t, k) => (k === tab ? next : t)));
  const dirty = JSON.stringify(teams) !== JSON.stringify(saved.teams) || tab !== saved.active;

  const owned = useMemo(() => SPECIES
    .filter(id => (!element || SPECIES_INFO[id].element === element) && (!rarity || SPECIES_INFO[id].rarity === rarity))
    .sort((a, b) => sort === 'name' ? SPECIES_INFO[a].name.localeCompare(SPECIES_INFO[b].name, 'vi')
      : sort === 'stars' ? STARS(b) - STARS(a) : POWER(b) - POWER(a)), [element, rarity, sort]);
  const elements = useMemo(() => [...new Set(SPECIES.map(id => SPECIES_INFO[id].element))], []);
  const power = team.reduce((s, id) => s + (id ? POWER(id) : 0), 0);
  const counts = elements.map(el => [el, team.filter(id => id && SPECIES_INFO[id].element === el).length] as const);

  const tapSlot = (k: number) => {
    if (slot === null) return setSlot(k);
    if (slot === k) {   // tapped twice: take the dragon out
      if (team[k]) { const next = [...team]; next[k] = null; setTeam(next); }
      return setSlot(null);
    }
    const next = [...team]; [next[slot], next[k]] = [next[k], next[slot]];   // swap the two slots
    setTeam(next); setSlot(null);
  };

  const pick = (id: SpeciesId) => {
    const next = [...team];
    const at = next.indexOf(id);
    const k = slot ?? (at >= 0 ? at : next.indexOf(null));
    if (k < 0) return setMsg(`Đội đã đủ ${TEAM_SIZE} rồng, chọn một ô để thay`);
    if (at >= 0 && at !== k) next[at] = next[k];   // already in the team: move it (swap with what was there)
    next[k] = id;
    setTeam(next); setSlot(null);
  };

  const auto = () => {
    setTeam(Array.from({ length: TEAM_SIZE }, (_, k) => [...SPECIES].sort((a, b) => POWER(b) - POWER(a))[k] ?? null));
    setSlot(null); setMsg('Đã xếp các rồng mạnh nhất');
  };

  const save = () => {
    if (!team.some(Boolean)) return setMsg('Đội cần ít nhất 1 rồng');
    const next = { teams, active: tab };
    saveTeams(next); setSaved(next); setMsg(`Đã lưu Đội ${tab + 1} và chọn ra trận`);
  };

  return (
    <div className={styles.backdrop} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={styles.panel}>
        <header className={styles.title}>
          <h2>Đội Hình</h2>
          <button className={styles.close} onClick={onClose} aria-label="Đóng">✕</button>
        </header>
        {msg && <p className={styles.msg} key={msg}>{msg}</p>}

        <div className={styles.body}>
          <div className={styles.tabs}>
            {Array.from({ length: TEAM_COUNT }, (_, k) => (
              <button key={k} className={`${styles.tab} ${k === tab ? styles.tabOn : ''}`} onClick={() => { setTab(k); setSlot(null); }}>
                Đội {k + 1}{k === saved.active && <i title="Đang ra trận">⚔</i>}
              </button>
            ))}
          </div>

          <div className={styles.top}>
            <section className={styles.slots}>
              {team.map((id, k) => (
                <button key={k} className={`${styles.slot} ${slot === k ? styles.slotOn : ''} ${id ? '' : styles.slotEmpty}`}
                  onClick={() => tapSlot(k)} title={id ? `${SPECIES_INFO[id].name} · bấm lần nữa để bỏ ra` : 'Chọn ô rồi chọn rồng bên dưới'}>
                  <span className={styles.num}>{k + 1}</span>
                  {id ? <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={portraitUrl(id)} alt="" />
                    <span className={styles.el}><ElementIcon element={SPECIES_INFO[id].element} size="100%" /></span>
                    <Stars n={STARS(id)} className={styles.stars} />
                    <span className={styles.lv}>Lv.{LEVEL(id)}</span>
                  </> : <span className={styles.plus}>+</span>}
                </button>
              ))}
            </section>

            <section className={styles.summary}>
              <h4>Tổng lực chiến</h4>
              <p className={styles.power}>⚔️ {fmt(power)}</p>
              <h4>Thành phần hệ</h4>
              <div className={styles.counts}>
                {counts.filter(([, n]) => n > 0).map(([el, n]) => (
                  <span key={el} title={el}><b><ElementIcon element={el} size="100%" /></b>{n}</span>
                ))}
              </div>
              <h4>Hiệu ứng đội hình</h4>
              <p className={styles.bonus}>{bonus(team)}</p>
            </section>
          </div>

          <section className={styles.collection}>
            <div className={styles.filters}>
              <span className={styles.label}>Rồng của tôi</span>
              <button className={`${styles.chip} ${!element ? styles.chipOn : ''}`} onClick={() => setElement(null)}>Tất cả</button>
              {elements.map(el => (
                <button key={el} className={`${styles.dot} ${element === el ? styles.chipOn : ''}`} 
                  onClick={() => setElement(element === el ? null : el)} title={el}><ElementIcon element={el} size="100%" /></button>
              ))}
              <span className={styles.sep} />
              {RARITIES.map(r => (
                <button key={r} className={`${styles.chip} ${styles['r' + r]} ${rarity === r ? styles.chipOn : ''}`} onClick={() => setRarity(rarity === r ? null : r)}>{r}</button>
              ))}
              <select className={styles.sort} value={sort} onChange={e => setSort(e.target.value as SortKey)}>
                {SORTS.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
              </select>
            </div>
            <div className={styles.owned}>
              {owned.map(id => (
                <button key={id} className={`${styles.card} ${styles['c' + SPECIES_INFO[id].rarity]} ${team.includes(id) ? styles.cardIn : ''}`}
                  onClick={() => pick(id)} title={`${SPECIES_INFO[id].name} · ${SPECIES_INFO[id].element} · ${SPECIES_INFO[id].rarity}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={portraitUrl(id)} alt="" />
                  <span className={styles.el}><ElementIcon element={SPECIES_INFO[id].element} size="100%" /></span>
                  <Stars n={STARS(id)} className={styles.stars} />
                  <span className={styles.lv}>Lv.{LEVEL(id)}</span>
                  {team.includes(id) && <span className={styles.inTeam}>{team.indexOf(id) + 1}</span>}
                </button>
              ))}
              {!owned.length && <p className={styles.empty}>Không có rồng nào khớp bộ lọc.</p>}
            </div>
          </section>

          <div className={styles.actions}>
            <button className={`${styles.btn} ${styles.blue}`} onClick={auto}>⟳ Tự động xếp</button>
            <button className={`${styles.btn} ${styles.orange}`} onClick={save} disabled={!dirty}>💾 Lưu đội hình</button>
          </div>
        </div>
      </div>
    </div>
  );
}
