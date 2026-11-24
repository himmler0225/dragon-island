'use client';
// Chiến trường (battle screen) UI: the field (Phaser: two guardian statues, dragons, a wide ground that
// scrolls sideways), the player's dragon cards on top, ally /
// enemy buff badges, mana bar + 2 skill buttons, the enemy wave list on the right and a countdown.
// UI prototype: each press of the SUMMON button (with enough mana) sends ONE dragon out - the next one of
// the team, in card order - walking toward the enemy just like on the islands (the field is a Phaser
// canvas with the real rigs, game/battle/createBattle.ts); enemy waves walk the other way; a dragon that
// reaches a statue attacks it. Tapping a card picks which dragon comes out next. No real battle
// rules yet (damage, waves and mana numbers are placeholders). Art: public/battle (tools/slice_battle.py).
// Đánh Boss (the `boss` prop): no waves; the boss comes out alone, its escorts follow every few seconds,
// a boss bar replaces the wave list and bringing the boss down wins the fight.
import { useEffect, useRef, useState } from 'react';
import type { BattleApi } from '@/game/battle/createBattle';
import { island } from '@/game/bridge';
import { BOSS_INFO, SPECIES_INFO, portraitUrl, type BossId, type SpeciesId } from '@/game/config';
import { activeTeam } from '@/game/config/team';
import {
  ALLY_BUFFS, ENEMY_BUFFS, fmt, MANA_MAX, MANA_PER_S, SUMMON_COST, STARS, TIPS, TIME, WAVES,
} from './battleScreenData';
import { assetUrl } from '@/game/config/assets';
import { starTier } from './Stars';
import styles from './BattleScreen.module.css';
/** Seconds into a boss fight when the boss comes out (once the field is up). */
const BOSS_IN = 1.5;
/** Seconds the enemy wave list stays on screen after the fight starts. */
const WAVES_SHOWN = 15;
/** Seconds between enemies coming out in a normal fight. */
const ENEMY_EVERY = 1.4;

export default function BattleScreen({ onClose, boss }: { onClose: () => void; boss?: BossId }) {
  const fight = boss ? BOSS_INFO[boss] : null;
  const total = fight?.time ?? TIME;
  // the active team from Đội hình (TeamPanel), in its summon order
  const [team] = useState(activeTeam);
  // the row of dragon cards pages with its arrows (no scrollbar)
  const cardsRef = useRef<HTMLDivElement>(null);
  const [cardsAt, setCardsAt] = useState({ left: false, right: false });
  const syncCards = () => {
    const el = cardsRef.current;
    if (el) setCardsAt({ left: el.scrollLeft > 2, right: el.scrollLeft + el.clientWidth < el.scrollWidth - 2 });
  };
  const pageCards = (dir: 1 | -1) => cardsRef.current?.scrollBy({ left: dir * cardsRef.current.clientWidth * 0.8, behavior: 'smooth' });
  useEffect(() => {
    syncCards();
    window.addEventListener('resize', syncCards);
    return () => window.removeEventListener('resize', syncCards);
  }, []);
  const [mana, setMana] = useState(MANA_MAX);   // starts full so the first dragons come out at once
  const [left, setLeft] = useState(total);
  const [bossHp, setBossHp] = useState<[number, number] | null>(null);   // [hp, max] once the boss is out
  const [allyHp, setAllyHp] = useState(100);
  const [enemyHp, setEnemyHp] = useState(100);
  const [view, setView] = useState<[number, number]>([0, 1]);   // part of the field in view (0..1)
  const [selected, setSelected] = useState<SpeciesId>(team[0]);
  // dragons that fell in this battle (greyed card with a skull); nothing kills them yet
  const [dead] = useState<Set<SpeciesId>>(new Set());
  const [wave, setWave] = useState(0);
  const waveRef = useRef(0);
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);
  const field = useRef<HTMLDivElement>(null);
  const api = useRef<BattleApi | null>(null);
  const [loaded, setLoaded] = useState(0);   // field assets 0..1
  const [fieldReady, setFieldReady] = useState(false);
  const [loadGone, setLoadGone] = useState(false);   // the loading screen fades out, then unmounts
  const [tip] = useState(() => TIPS[Math.floor(Math.random() * TIPS.length)]);
  useEffect(() => {
    if (!fieldReady) return;
    const t = window.setTimeout(() => setLoadGone(true), 550);
    return () => window.clearTimeout(t);
  }, [fieldReady]);

  // the island behind is hidden: stop its loop so the battle field gets the whole GPU
  useEffect(() => {
    island()?.setPaused(true);
    return () => island()?.setPaused(false);
  }, []);

  // the Phaser field (browser only): hits on a statue come back here
  useEffect(() => {
    let alive = true, made: BattleApi | null = null;
    import('@/game/battle/createBattle').then(({ createBattle }) => createBattle(field.current!, {
      progress: p => { if (alive) setLoaded(p); },
      // a blow on a statue (the field shows the damage number)
      hit: side => {
        if (side === 'ally') setEnemyHp(h => Math.max(0, h - 4));
        else setAllyHp(h => Math.max(0, h - 3));
      },
      view: (a, b) => { if (alive) setView([a, b]); },
      boss: (hp, max) => { if (alive) setBossHp([hp, max]); },
    })).then(a => { if (alive) { made = a; api.current = a; setFieldReady(true); } else a.destroy(); });
    return () => { alive = false; made?.destroy(); api.current = null; };
  }, []);

  // game loop (10 fps is plenty for a UI prototype): mana, clock, marching, statue hits, enemy waves
  useEffect(() => {
    if (!fieldReady) return;   // the clock, mana and enemy waves start once the field is up
    const step = 0.1;
    const timer = window.setInterval(() => {
      setMana(m => Math.min(MANA_MAX, m + MANA_PER_S * step));
      setLeft(t => Math.max(0, t - step));
    }, step * 1000);
    // a boss fight: the boss comes out alone, then its escorts one by one; otherwise an enemy unit
    // every few seconds from the current wave
    // (the first enemy at once, not after a whole interval)
    const out = window.setTimeout(() => api.current?.enemy(boss ?? WAVES[0][0]), boss ? BOSS_IN * 1000 : 300);
    const spawn = fight
      ? window.setInterval(() => api.current?.enemy(fight.escort[waveRef.current++ % fight.escort.length]), fight.escortEvery * 1000)
      : window.setInterval(() => {
        const [id] = WAVES[waveRef.current % WAVES.length];
        api.current?.enemy(id);
        if (Math.random() < 0.3) setWave(++waveRef.current);
      }, ENEMY_EVERY * 1000);
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') closeRef.current(); };
    window.addEventListener('keydown', esc);
    return () => { window.clearInterval(timer); window.clearInterval(spawn); window.clearTimeout(out); window.removeEventListener('keydown', esc); };
  }, [fieldReady]);   // eslint-disable-line react-hooks/exhaustive-deps -- once (when ready): boss / fight never change, onClose goes through closeRef

  // the statues' HP bars are drawn on the field
  useEffect(() => { api.current?.setHp(allyHp / 100, enemyHp / 100); }, [allyHp, enemyHp, fieldReady]);

  /** Scroll bar: press / drag on it to centre the view there. */
  const scrollTo = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.type === 'pointermove' && !e.buttons) return;
    const r = e.currentTarget.getBoundingClientRect();
    api.current?.scrollTo((e.clientX - r.left) / r.width);
  };

  /** Summon: one dragon - the selected one - walks out; the selection moves on to the next card. */
  const summon = () => {
    if (mana < SUMMON_COST || !api.current || dead.has(selected)) return;
    setMana(m => m - SUMMON_COST);
    api.current.summon(selected);
    const alive = team.filter(id => !dead.has(id));
    setSelected(alive[(alive.indexOf(selected) + 1) % alive.length]);
  };
  const ready = mana >= SUMMON_COST;

  const bossDown = !!bossHp && bossHp[0] <= 0;
  const over = allyHp <= 0 ? 'Thua cuộc' : bossDown ? 'Hạ Boss thành công!' : enemyHp <= 0 ? 'Chiến thắng!' : left <= 0 ? 'Hết giờ' : null;

  return (
    <div className={styles.screen}>
      <div className={styles.stage}>
        {/* the field: real dragon rigs walking (Phaser canvas) */}
        <div ref={field} className={`${styles.field} ${fieldReady ? styles.fieldOn : ''}`} />
        {!loadGone && (
          <div className={`${styles.loading} ${fieldReady ? styles.loadingOut : ''}`}>
            <div className={styles.loadRing}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={portraitUrl(team[0])} alt="" />
            </div>
            <b className={styles.loadTitle}>{fight ? `ĐÁNH BOSS · ${fight.title.toUpperCase()}` : 'CHIẾN TRƯỜNG'}</b>
            <span className={styles.loadText}>Đang tải… {Math.round(loaded * 100)}%</span>
            <div className={styles.loadBar}><i style={{ width: `${Math.round(loaded * 92)}%` }} /></div>
            <span className={styles.loadTip}>Mẹo: {tip}</span>
          </div>
        )}
        {/* the field is wider than the screen: drag it, use the wheel, or this bar */}
        <div className={styles.scroll} onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); scrollTo(e); }} onPointerMove={scrollTo}>
          <i style={{ left: `${view[0] * 100}%`, width: `${Math.max(4, (view[1] - view[0]) * 100)}%` }} />
        </div>

        {/* top: clock, dragon cards, progress + buffs */}
        <div className={styles.timer}>{fmt(left)}</div>
        <div className={styles.cardsBox}>
          <button className={styles.cardsArrow} disabled={!cardsAt.left} onClick={() => pageCards(-1)} aria-label="Rồng trước">◀</button>
          <div className={styles.cards} ref={cardsRef} onScroll={syncCards}>
          {team.map(id => (
            <button key={id} className={`${styles.card} ${id === selected ? styles.cardOn : ''} ${dead.has(id) ? styles.cardDead : ''}`}
              onClick={() => setSelected(id)} title={SPECIES_INFO[id].name}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={portraitUrl(id)} alt="" />
              <span className={styles.cardStars}><i style={{ backgroundImage: `url(${assetUrl(`ui/star_${starTier(STARS(id))}.png`)})` }} />{STARS(id)}</span>
            </button>
          ))}
          </div>
          <button className={styles.cardsArrow} disabled={!cardsAt.right} onClick={() => pageCards(1)} aria-label="Rồng sau">▶</button>
        </div>
        <div className={styles.track}><i style={{ width: `${Math.round(100 * (1 - left / total))}%` }} /></div>
        <div className={`${styles.buffs} ${styles.allyBuffs}`}>
          {ALLY_BUFFS.map(([e, t]) => <span key={t} title={t}>{e}</span>)}
        </div>
        <div className={`${styles.buffs} ${styles.enemyBuffs}`}>
          {ENEMY_BUFFS.map(([e, t]) => <span key={t} title={t}>{e}</span>)}
        </div>

        {/* right: the boss and its HP (boss fight) */}
        {boss && (
          <div className={`${styles.boss} ${bossDown ? styles.bossDown : ''}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={portraitUrl(boss)} alt="" />
            <b>{SPECIES_INFO[boss].name}</b>
            <div className={styles.bossBar}><i style={{ width: `${bossHp ? (100 * bossHp[0]) / bossHp[1] : 100}%` }} /></div>
            <small>{bossHp ? `${Math.ceil(bossHp[0]).toLocaleString('vi-VN')} / ${bossHp[1].toLocaleString('vi-VN')}` : 'Đang tới…'}</small>
          </div>
        )}
        {/* right: enemy waves, shown for the first WAVES_SHOWN s of the fight */}
        {!boss && <div className={`${styles.waves} ${total - left > WAVES_SHOWN ? styles.wavesGone : ''}`}>
          {WAVES.map(([id, n], k) => (
            <div key={k} className={`${styles.wave} ${k === wave % WAVES.length ? styles.waveNow : ''}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={portraitUrl(id)} alt="" /><b>x{n}</b>
            </div>
          ))}
        </div>}

        {/* bottom: mana + skills */}
        <div className={styles.mana}>
          <i style={{ width: `${(mana / MANA_MAX) * 100}%` }} />
          <b>{Math.floor(mana)} / {MANA_MAX}</b>
        </div>
        <div className={styles.skills}>
          <button className={`${styles.skill} ${ready ? styles.skillReady : ''}`} disabled={!ready} onClick={summon}
            title={`Triệu hồi ${SPECIES_INFO[selected].name} (${SUMMON_COST} mana)`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={portraitUrl(selected)} alt="" />
            <small>Triệu hồi</small>
          </button>
          <button className={styles.skill} title="Bảo vật (chưa mở)" disabled>
            <span>👑</span>
          </button>
        </div>

        <button className={styles.close} onClick={onClose} aria-label="Rời trận">✕</button>
        {over && <div className={styles.over}><b>{over}</b><button onClick={onClose}>Về đảo</button></div>}
      </div>
    </div>
  );
}
