'use client';
// Lai Rồng (dragon breeding) screen: pick two parent dragons, upgrade the egg, bless it, hatch.
// UI only: the owned-dragon list and the stone count are mock data and the hatch is rolled here;
// move both to the backend when it exists. Egg art: public/eggs/egg_<level>.png (falls back to a
// CSS egg until it is drawn).
import { useEffect, useMemo, useState } from 'react';
import { getEggLevel, setEggLevel as syncEggLevel } from '@/game/bridge';
import { BLESS_COST, EGG_LEVELS, STAR_BONUS, bracketOdds, rollStars } from '@/game/config/breeding';
import { SPECIES, SPECIES_INFO, portraitUrl, type SpeciesId } from '@/game/config';
import { assetUrl } from '@/game/config/assets';
import { Egg } from './Egg';
import { StarRing } from './StarRing';
import styles from './BreedPanel.module.css';

interface OwnedDragon { uid: number; species: SpeciesId; stars: number }

// mock collection: a few of each species with different star counts
const OWNED: OwnedDragon[] = Array.from({ length: 21 }, (_, i) => ({
  uid: i + 1, species: SPECIES[i % SPECIES.length], stars: ((i * 7) % 25) + 1,
}));
const PAGE = 5;
const RARE_LABEL: Record<string, string> = { SSR: 'Cực hiếm', SR: 'Hiếm', R: 'Thường' };

export default function BreedPanel({ onClose }: { onClose: () => void }) {
  const [stone, setStone] = useState(37034);
  const [eggLevel, setEggLevel] = useState(getEggLevel);   // shared with the nest on the island
  const [parents, setParents] = useState<[OwnedDragon | null, OwnedDragon | null]>([OWNED[0], OWNED[3]]);
  const [blessed, setBlessed] = useState(false);
  const [child, setChild] = useState<{ species: SpeciesId; stars: number } | null>(null);
  const [page, setPage] = useState(0);
  const [msg, setMsg] = useState('');

  // messages float over the panel and fade out, so they never push the layout around
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(''), 1800);
    return () => clearTimeout(t);
  }, [msg]);

  const egg = EGG_LEVELS[eggLevel - 1];
  const odds = useMemo(() => bracketOdds(egg, blessed), [egg, blessed]);
  const pages = Math.ceil(OWNED.length / PAGE);
  const list = OWNED.slice(page * PAGE, page * PAGE + PAGE);
  const ready = parents[0] && parents[1];

  const pick = (d: OwnedDragon) => {
    if (parents.some(p => p?.uid === d.uid)) return;
    setChild(null);
    setParents(([a, b]) => (!a ? [d, b] : !b ? [a, d] : [a, d]));   // fills the empty slot, else swaps the 2nd
  };
  const upgrade = () => {
    if (!egg.upgradeCost) return;
    if (stone < egg.upgradeCost) return setMsg('Không đủ đá thăng cấp');
    setStone(s => s - egg.upgradeCost); setEggLevel(eggLevel + 1); syncEggLevel(eggLevel + 1); setMsg(`Trứng lên cấp ${eggLevel + 1}!`);
  };
  const bless = () => {
    if (blessed) return;
    if (stone < BLESS_COST) return setMsg('Không đủ đá thăng cấp');
    setStone(s => s - BLESS_COST); setBlessed(true); setMsg('Đã chúc phúc: tỉ lệ sao cao tăng');
  };
  const hatch = () => {
    if (!ready) return setMsg('Chọn đủ 2 rồng để lai');
    const species = Math.random() < 0.5 ? parents[0]!.species : parents[1]!.species;
    setChild({ species, stars: rollStars(egg, blessed) });
    setBlessed(false); setMsg('');
  };
  const done = (text: string) => { setChild(null); setMsg(text); };

  const shown = child ?? (parents[0] ? { species: parents[0].species, stars: 0 } : null);
  const stars = child?.stars ?? 0;

  return (
    <div className={styles.backdrop} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={styles.panel}>
        <header className={styles.title}>
          <h2>Lai Rồng</h2>
          <button className={styles.close} onClick={onClose} aria-label="Đóng">✕</button>
        </header>

        {msg && <p className={styles.msg} key={msg}>{msg}</p>}
        <div className={styles.body}>
          {/* left: parents, egg, actions, owned dragons */}
          <section className={styles.left}>
            <div className={styles.breedRow}>
              {[0, 1].map(k => {
                const p = parents[k];
                return (
                  <div key={k} className={styles.parentCol}>
                    <button className={styles.slot} onClick={() => { setParents(ps => (k ? [ps[0], null] : [null, ps[1]])); setChild(null); }}
                      title={p ? 'Bấm để bỏ chọn' : 'Chọn rồng ở danh sách bên dưới'}>
                      {p ? <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={portraitUrl(p.species)} alt="" />
                        <span className={styles.slotStars}>{p.stars}★</span>
                      </> : <span className={styles.plus}>+</span>}
                    </button>
                    <small>{p ? SPECIES_INFO[p.species].name : k ? 'Rồng mẹ' : 'Rồng bố'}</small>
                  </div>
                );
              })}
              <div className={styles.medal}>
                <StarRing lit={child ? stars : 0} cap={egg.maxStars} />
                <div className={styles.medalCore}>
                  {child
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img className={styles.childImg} src={portraitUrl(child.species)} alt="" />
                    : <Egg level={eggLevel} />}
                </div>
                {blessed && <span className={styles.blessTag}>Chúc phúc</span>}
                <span className={styles.eggName}>{egg.name} · Cấp {eggLevel}</span>
              </div>
            </div>

            <div className={styles.actions}>
              {child ? <>
                <button className={`${styles.btn} ${styles.orange}`} onClick={() => done('Đã bán rồng, nhận vàng')}>Bán rồng</button>
                <button className={`${styles.btn} ${styles.orange}`} onClick={() => done('Đã cất rồng vào túi')}>Cất rồng</button>
              </> : <>
                <button className={`${styles.btn} ${styles.blue}`} onClick={upgrade} disabled={!egg.upgradeCost}>
                  {egg.upgradeCost ? `Nâng trứng (${egg.upgradeCost.toLocaleString('vi-VN')})` : 'Trứng tối đa'}
                </button>
                <button className={`${styles.btn} ${styles.orange}`} onClick={hatch} disabled={!ready}>Ấp trứng</button>
              </>}
            </div>

            <div className={styles.costRow}>
              <span>Cần:</span>
              <div className={styles.costBar}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={assetUrl('ui/res_stone.png')} alt="" />
                <b>{stone.toLocaleString('vi-VN')}</b> / {BLESS_COST.toLocaleString('vi-VN')}
              </div>
              <button className={`${styles.btn} ${styles.green}`} onClick={bless} disabled={blessed || !!child}>Chúc phúc</button>
            </div>

            <div className={styles.owned}>
              {list.map(d => {
                const on = parents.some(p => p?.uid === d.uid);
                const rarity = SPECIES_INFO[d.species].rarity;
                return (
                  <button key={d.uid} className={`${styles.card} ${on ? styles.cardOn : ''}`} onClick={() => pick(d)}>
                    {rarity === 'SSR' && <span className={styles.rare}>{RARE_LABEL[rarity]}</span>}
                    <span className={styles.cardStars}>{d.stars}<i>★</i></span>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={portraitUrl(d.species)} alt="" />
                  </button>
                );
              })}
            </div>
            <div className={styles.pager}>
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>◀</button>
              <span>{page + 1} / {pages}</span>
              <button onClick={() => setPage(p => Math.min(pages - 1, p + 1))} disabled={page === pages - 1}>▶</button>
            </div>
          </section>

          {/* right: result / prediction and the odds of this egg */}
          <section className={styles.right}>
            <div className={styles.info}>
              {shown ? <>
                <h3>{child ? SPECIES_INFO[shown.species].name : 'Rồng con'} <em>({child ? `${stars} sao` : `tối đa ${egg.maxStars} sao`})</em></h3>
                <ul className={styles.stats}>
                  {[
                    ['💰', `+${(STAR_BONUS.gold * (stars || egg.maxStars)).toFixed(0)}%`, 'Vàng'],
                    ['🍀', `+${(STAR_BONUS.luck * (stars || egg.maxStars)).toFixed(0)}%`, 'May mắn'],
                    ['⭐', `+${(STAR_BONUS.exp * (stars || egg.maxStars)).toFixed(0)}%`, 'Kinh nghiệm'],
                    ['🗡️', `+${STAR_BONUS.attack * (stars || egg.maxStars)}`, 'Tấn công'],
                    ['⏳', `${STAR_BONUS.time * (stars || egg.maxStars)}s`, 'Thời gian sản xuất'],
                  ].map(([icon, v, label]) => <li key={label} title={label}><span>{icon}</span>{v}</li>)}
                </ul>
                <small className={styles.hint}>{child ? 'Bán hoặc cất rồng để lai tiếp.' : 'Chỉ số ở mức sao tối đa của trứng. Con lai thuộc loài của bố hoặc mẹ.'}</small>
              </> : <p className={styles.hint}>Chọn 2 rồng để xem rồng con.</p>}
            </div>

            <div className={styles.odds}>
              <h4>Tỉ lệ sao · {egg.name}{blessed ? ' (chúc phúc)' : ''}</h4>
              {odds.map(o => (
                <div key={o.from} className={styles.oddRow}>
                  <span>{o.from}–{o.to}★</span>
                  <div className={styles.oddBar}><i style={{ width: `${Math.round(o.p * 100)}%` }} /></div>
                  <b>{o.p < 0.005 ? '—' : `${Math.round(o.p * 100)}%`}</b>
                </div>
              ))}
              <div className={styles.levels}>
                {EGG_LEVELS.map(l => <span key={l.level} className={l.level <= eggLevel ? styles.lvOn : ''} title={`${l.name}: tối đa ${l.maxStars} sao`}>{l.level}</span>)}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
