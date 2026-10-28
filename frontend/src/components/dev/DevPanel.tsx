'use client';
// Test panel: pick a dragon, give it a command, fire its skills. A stand-in for the real HUD.
import { useEffect, useState } from 'react';
import { gameEvents, island, type DragonAction, type DragonCommand } from '@/game/bridge';
import { ISLANDS, RESOURCE_NAME, type Resource } from '@/game/config';
import { SKILLS, skillIconUrl, type SkillSlot } from '@/game/skills';
import { SPECIES, SPECIES_INFO, portraitUrl, type SpeciesId } from '@/game/config';
import { assetUrl } from '@/game/config/assets';
import styles from './DevPanel.module.css';

const COMMANDS: [DragonCommand, string][] = [['idle', 'Đứng'], ['walk', 'Đi'], ['fly', 'Bay'], ['sleep', 'Ngủ']];
const ACTION_LABEL: Record<DragonAction, string> = { idle: 'đứng', walk: 'đi', fly: 'bay', sleep: 'ngủ', strike: 'ra đòn' };

export default function DevPanel() {
  const [ready, setReady] = useState(() => island() !== null);
  const [selected, setSelected] = useState<SpeciesId>(SPECIES[0]);
  const [actions, setActions] = useState<Partial<Record<SpeciesId, DragonAction>>>({});
  const [auto, setAuto] = useState(true);
  const [focused, setFocused] = useState(0);
  const [wallet, setWallet] = useState<Record<Resource, number>>({ gold: 0, exp: 0, stone: 0 });

  useEffect(() => {
    const offs = [
      gameEvents.on('ready', () => setReady(true)),
      gameEvents.on('select', setSelected),
      gameEvents.on('action', ({ id, action }) => setActions(a => ({ ...a, [id]: action }))),
      gameEvents.on('island', setFocused),
      gameEvents.on('collect', ({ resource, amount }) => setWallet(w => ({ ...w, [resource]: w[resource] + amount }))),
    ];
    return () => offs.forEach(off => off());
  }, []);

  const api = island();
  return (
    <div className={styles.panel}>
      <div className={styles.group}>
        {ISLANDS.map((isl, i) => (
          <button key={isl.id} className={`${styles.btn} ${i === focused ? styles.on : ''}`}
            disabled={!ready} onClick={() => api?.focusIsland(i)}>{isl.name}</button>
        ))}
        {(Object.keys(wallet) as Resource[]).map(r => (
          <span key={r} className={styles.res} title={RESOURCE_NAME[r]}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={assetUrl(`ui/res_${r}.png`)} alt="" />{wallet[r].toLocaleString('vi-VN')}
          </span>
        ))}
      </div>

      <div className={styles.group}>
        {SPECIES.map(id => (
          <button key={id} className={`${styles.dragon} ${id === selected ? styles.on : ''}`}
            onClick={() => api?.select(id)} disabled={!ready}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={portraitUrl(id)} alt="" />
            <span>{SPECIES_INFO[id].name}<small>{ACTION_LABEL[actions[id] ?? 'idle']}</small></span>
          </button>
        ))}
      </div>

      <div className={styles.group}>
        {COMMANDS.map(([cmd, label]) => (
          <button key={cmd} className={styles.btn} disabled={!ready} onClick={() => api?.command(selected, cmd)}>{label}</button>
        ))}
        <label className={styles.auto}>
          <input type="checkbox" checked={auto} disabled={!ready}
            onChange={e => { setAuto(e.target.checked); api?.setAutoWander(e.target.checked); }} />
          Các rồng khác tự đi
        </label>
      </div>

      <div className={styles.group}>
        {SKILLS[selected].map(s => (
          <button key={s.type} className={styles.skill} disabled={!ready || s.type === 'passive'}
            title={`${s.name}: ${s.desc}`} onClick={() => api?.useSkill(selected, s.type as SkillSlot)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={skillIconUrl(selected, s.type)} alt="" />
            <span>{s.name}</span>
          </button>
        ))}
      </div>
      <p className={styles.hint}>Kéo ngang để sang đảo khác · bấm vào rồng để chọn · bấm lên đất để rồng đi tới (Shift+bấm: bay tới) · bấm công trình khi có biểu tượng tài nguyên để thu · rê chuột lên kỹ năng để xem mô tả</p>
    </div>
  );
}
