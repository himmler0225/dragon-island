'use client';
// Chiến trường (battle screen) UI: the field (Phaser: two guardian statues, dragons, a wide ground that
// scrolls sideways), the player's dragon cards on top, ally /
// enemy buff badges, mana bar + 2 skill buttons, the enemy wave list on the right and a countdown.
// UI prototype: each press of the SUMMON button (with enough mana) sends ONE dragon out - the next one of
// the team, in card order - walking toward the enemy just like on the islands (the field is a Phaser
// canvas with the real rigs, game/battle/createBattle.ts); enemy waves walk the other way; a dragon that
// reaches a statue attacks it. Tapping a card picks which dragon comes out next. No real battle
// rules yet (damage, waves and mana numbers are placeholders). Art: public/battle (tools/slice_battle.py).
import { useEffect, useRef, useState } from 'react';
import type { BattleApi } from '@/game/battle/createBattle';
import { island } from '@/game/bridge';
import { SPECIES_INFO, portraitUrl, type SpeciesId } from '@/game/config';
import { activeTeam } from '@/game/config/team';
import {
  ALLY_BUFFS, ENEMY_BUFFS, fmt, MANA_MAX, MANA_PER_S, SUMMON_COST, STARS, TIPS, TIME, WAVES,
} from './battleScreenData';
import styles from './BattleScreen.module.css';
/** Seconds the enemy wave list stays on screen after the fight starts. */
const WAVES_SHOWN = 15;

export default function BattleScreen({ onClose }: { onClose: () => void }) {
  // the active team from Đội hình (TeamPanel), in its summon order
  const [team] = useState(activeTeam);
  const [mana, setMana] = useState(MANA_MAX);   // starts full so the first dragons come out at once
  const [left, setLeft] = useState(TIME);
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
    // an enemy unit every few seconds from the current wave
    const spawn = window.setInterval(() => {
      const [id] = WAVES[waveRef.current % WAVES.length];
      api.current?.enemy(id);
      if (Math.random() < 0.3) setWave(++waveRef.current);
    }, 2600);
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') closeRef.current(); };
    window.addEventListener('keydown', esc);
    return () => { window.clearInterval(timer); window.clearInterval(spawn); window.removeEventListener('keydown', esc); };
  }, [fieldReady]);   // once (when ready): onClose is a new function on every HUD render (it went through closeRef)

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

  const over = allyHp <= 0 ? 'Thua cuộc' : enemyHp <= 0 ? 'Chiến thắng!' : left <= 0 ? 'Hết giờ' : null;

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
            <b className={styles.loadTitle}>CHIẾN TRƯỜNG</b>
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
        <div className={styles.cards}>
          {team.map(id => (
            <button key={id} className={`${styles.card} ${id === selected ? styles.cardOn : ''} ${dead.has(id) ? styles.cardDead : ''}`}
              onClick={() => setSelected(id)} title={SPECIES_INFO[id].name}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={portraitUrl(id)} alt="" />
              <span className={styles.cardStars}><i />{STARS(id)}</span>
            </button>
          ))}
        </div>
        <div className={styles.track}><i style={{ width: `${Math.round(100 * (1 - left / TIME))}%` }} /></div>
        <div className={`${styles.buffs} ${styles.allyBuffs}`}>
          {ALLY_BUFFS.map(([e, t]) => <span key={t} title={t}>{e}</span>)}
        </div>
        <div className={`${styles.buffs} ${styles.enemyBuffs}`}>
          {ENEMY_BUFFS.map(([e, t]) => <span key={t} title={t}>{e}</span>)}
        </div>

        {/* right: enemy waves, shown for the first WAVES_SHOWN s of the fight */}
        <div className={`${styles.waves} ${TIME - left > WAVES_SHOWN ? styles.wavesGone : ''}`}>
          {WAVES.map(([id, n], k) => (
            <div key={k} className={`${styles.wave} ${k === wave % WAVES.length ? styles.waveNow : ''}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={portraitUrl(id)} alt="" /><b>x{n}</b>
            </div>
          ))}
        </div>

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
