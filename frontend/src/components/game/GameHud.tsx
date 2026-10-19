'use client';
// In-game HUD over the island: resources, islands, dragons, skills and the menu buttons.
// Menu buttons open a placeholder panel for now — replace PANELS entries with real screens.
import { useEffect, useState } from 'react';
import { gameEvents, island, type DragonAction, type DragonCommand } from '@/game/bridge';
import { ISLANDS, RESOURCE_NAME, type Resource } from '@/game/config';
import { COMBOS, SKILLS, skillIconUrl, type SkillSlot } from '@/game/skills';
import { SPECIES, SPECIES_INFO, portraitUrl, type SpeciesId } from '@/game/config';
import BattleScreen from './BattleScreen';
import BreedPanel from './BreedPanel';
import styles from './GameHud.module.css';

type MenuId = 'breed' | 'quest' | 'achievement' | 'ranking' | 'mail' | 'gift' | 'bag' | 'shop' | 'cards' | 'battle' | 'map' | 'friends' | 'settings' | 'profile';
const SIDE: [MenuId, string][] = [['quest', 'Nhiệm vụ'], ['achievement', 'Thành tựu'], ['ranking', 'Xếp hạng'], ['mail', 'Thư'], ['gift', 'Quà']];
const BOTTOM: [MenuId, string][] = [['breed', 'Lai rồng'], ['bag', 'Túi'], ['shop', 'Cửa hàng'], ['cards', 'Từ điển'], ['battle', 'Chiến đấu'], ['map', 'Bản đồ'], ['friends', 'Bạn bè'], ['settings', 'Cài đặt']];
const LABEL = Object.fromEntries([...SIDE, ...BOTTOM, ['profile', 'Hồ sơ']]) as Record<MenuId, string>;
const COMMANDS: [DragonCommand, string][] = [['walk', '🚶'], ['fly', '🪽'], ['sleep', '💤']];
const ACTION_LABEL: Record<DragonAction, string> = { idle: 'đứng', walk: 'đi dạo', fly: 'bay', sleep: 'ngủ', strike: 'ra đòn' };

// menus without their own icon art yet borrow one (breed -> egg icon when drawn: public/ui/breed.png)
const ICON_ALIAS: Record<string, string> = { breed: 'chest' };
const Icon = ({ name }: { name: string }) => (
  // eslint-disable-next-line @next/next/no-img-element
  <img src={`/ui/${ICON_ALIAS[name] ?? name}.png`} alt="" draggable={false} />
);

export default function GameHud({ dev = false }: { dev?: boolean }) {
  const [ready, setReady] = useState(() => island() !== null);
  const [selected, setSelected] = useState<SpeciesId>(SPECIES[0]);
  const [actions, setActions] = useState<Partial<Record<SpeciesId, DragonAction>>>({});
  const [focused, setFocused] = useState(0);
  const [wallet, setWallet] = useState<Record<Resource, number>>({ gold: 1500, exp: 0, stone: 3 });
  const [panel, setPanel] = useState<MenuId | null>(null);
  const [bump, setBump] = useState<Resource | null>(null);
  const [full, setFull] = useState(false);
  const [sky, setSky] = useState<{ hour: number; night: number; weather: 'clear' | 'cloudy' | 'rain' } | null>(null);
  const [hunger, setHunger] = useState<Partial<Record<SpeciesId, number>>>({});

  useEffect(() => {
    const offs = [
      gameEvents.on('ready', () => setReady(true)),
      gameEvents.on('select', setSelected),
      gameEvents.on('island', setFocused),
      gameEvents.on('open', setPanel),
      gameEvents.on('sky', setSky),
      gameEvents.on('hunger', ({ id, hunger: h }) => setHunger(m => ({ ...m, [id]: h }))),
      gameEvents.on('action', ({ id, action }) => setActions(a => ({ ...a, [id]: action }))),
      gameEvents.on('collect', ({ resource, amount }) => {
        setWallet(w => ({ ...w, [resource]: w[resource] + amount }));
        setBump(resource);
      }),
    ];
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setPanel(null); };
    // hunger falls slowly: refresh the bars every 10 s
    const poll = window.setInterval(() => { const h = island()?.hunger(); if (h) setHunger(h); }, 10000);
    const fs = () => setFull(document.fullscreenElement !== null);
    window.addEventListener('keydown', esc);
    document.addEventListener('fullscreenchange', fs);
    return () => { window.clearInterval(poll); offs.forEach(off => off()); window.removeEventListener('keydown', esc); document.removeEventListener('fullscreenchange', fs); };
  }, []);

  useEffect(() => {
    if (!bump) return;
    const t = setTimeout(() => setBump(null), 400);
    return () => clearTimeout(t);
  }, [bump]);

  if (!ready) return null;
  const api = island();
  const info = SPECIES_INFO[selected];
  // fullscreen the whole game screen (canvas + HUD); Phaser's FIT scaling follows the new size
  const toggleFull = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.querySelector<HTMLElement>('[data-game-screen]')?.requestFullscreen();
  };
  const go = (d: number) => api?.focusIsland((focused + d + ISLANDS.length) % ISLANDS.length);

  return (
    <div className={styles.hud}>
      {/* top: player, island, resources */}
      <div className={styles.top}>
        <button className={styles.player} onClick={() => setPanel('profile')}>
          <Icon name="profile" />
          <span><b>Người chơi</b><small>Cấp 12</small></span>
        </button>
        <div className={styles.islandNav}>
          <button onClick={() => go(-1)} aria-label="Đảo trước">◀</button>
          <span>{ISLANDS[focused].name}
            {sky && <small className={styles.clock} title="Giờ trên đảo (giờ TP.HCM)">
              {sky.weather === 'rain' ? '🌧️' : sky.weather === 'cloudy' ? '☁️' : sky.night > 0.5 ? '🌙' : sky.hour >= 16.5 || sky.hour < 7 ? '🌇' : '☀️'} {String(Math.floor(sky.hour)).padStart(2, '0')}:{String(Math.round((sky.hour % 1) * 60) % 60).padStart(2, '0')}
            </small>}
          </span>
          <button onClick={() => go(1)} aria-label="Đảo sau">▶</button>
        </div>
        <div className={styles.wallet}>
          <button className={styles.fullBtn} onClick={toggleFull} title={full ? 'Thoát toàn màn hình' : 'Toàn màn hình'}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              {full
                ? <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" />
                : <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />}
            </svg>
          </button>
          {(Object.keys(wallet) as Resource[]).map(r => (
            <span key={r} className={`${styles.pill} ${bump === r ? styles.bump : ''}`} title={RESOURCE_NAME[r]}>
              <Icon name={`res_${r}`} />
              <b>{wallet[r].toLocaleString('vi-VN')}</b>
            </span>
          ))}
        </div>
      </div>

      {/* left: dragons */}
      <div className={styles.dragons}>
        {SPECIES.map(id => (
          <button key={id} className={`${styles.dragon} ${id === selected ? styles.on : ''}`} onClick={() => api?.select(id)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={portraitUrl(id)} alt="" />
            <span>{SPECIES_INFO[id].name}<small>{(hunger[id] ?? 100) < 35 ? '🍖 đói' : ACTION_LABEL[actions[id] ?? 'idle']}</small>
              <i className={styles.hungerBar}><b style={{ width: `${Math.round(hunger[id] ?? 100)}%` }} data-low={(hunger[id] ?? 100) < 35 || undefined} /></i>
            </span>
          </button>
        ))}
      </div>

      {/* right: event menus */}
      <div className={styles.side}>
        {SIDE.map(([id, label]) => (
          <button key={id} className={styles.menuBtn} onClick={() => setPanel(id)}>
            <Icon name={id} /><span>{label}</span>
          </button>
        ))}
      </div>

      {/* bottom-left: selected dragon's skills and commands */}
      <div className={styles.skills}>
        <div className={styles.skillHead}>
          <b>{info.name}</b><small>{info.element} · {info.rarity}</small>
          <span className={styles.cmds}>
            <button title="Gọi thuyền thức ăn" onClick={() => api?.callBoat(selected)}>⛵</button>
            {COMMANDS.filter(([cmd]) => cmd !== 'fly' || api?.canFly(selected) !== false).map(([cmd, emoji]) => (
              <button key={cmd} title={cmd} onClick={() => api?.command(selected, cmd)}>{emoji}</button>
            ))}
          </span>
        </div>
        <div className={styles.skillRow}>
          {SKILLS[selected].map(s => (
            <button key={s.type} className={`${styles.skill} ${s.type === 'passive' ? styles.passive : ''}`}
              disabled={s.type === 'passive'} title={`${s.name}: ${s.desc}`}
              onClick={() => api?.useSkill(selected, s.type as SkillSlot)}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={skillIconUrl(selected, s.type)} alt="" />
              <span>{s.name}</span>
            </button>
          ))}
        </div>
        {/* Hợp Kích: shown while the partner dragon is on the same island */}
        {(api?.combos(selected) ?? []).map(id => COMBOS.find(c => c.id === id)!).map(c => (
          <button key={c.id} className={styles.combo} title={c.desc} onClick={() => api?.useCombo(c.id)}>
            <span className={styles.comboIcon}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {c.pair.map(p => <img key={p} src={portraitUrl(p)} alt="" />)}
            </span>
            <small>Hợp Kích</small><b>{c.name}</b>
          </button>
        ))}
      </div>

      {/* bottom: main menu */}
      <div className={styles.bottom}>
        {BOTTOM.map(([id, label]) => (
          <button key={id} className={styles.menuBtn} onClick={() => setPanel(id)}>
            <Icon name={id} /><span>{label}</span>
          </button>
        ))}
      </div>

      {dev && <p className={styles.devHint}>dev: kéo ngang đổi đảo · Shift+bấm để bay · bấm công trình để thu</p>}

      {panel === 'breed' && <BreedPanel onClose={() => setPanel(null)} />}
      {panel === 'battle' && <BattleScreen onClose={() => setPanel(null)} />}

      {panel && panel !== 'breed' && panel !== 'battle' && (
        <div className={styles.modal} onClick={e => { if (e.target === e.currentTarget) setPanel(null); }}>
          <div className={styles.sheet}>
            <header>
              <Icon name={panel} />
              <h2>{LABEL[panel]}</h2>
              <button onClick={() => setPanel(null)} aria-label="Đóng">✕</button>
            </header>
            <p>Tính năng đang được phát triển.</p>
          </div>
        </div>
      )}
    </div>
  );
}
