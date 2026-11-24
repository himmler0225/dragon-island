'use client';
// Từ điển: every dragon of the game. A row of portraits on top; the picked one as a big card (name banner,
// art on its element's colour, the passive) beside its attributes as bars of small cells, and its skills.
import { useState } from 'react';
import { DRAGON_STATS, SPECIES, SPECIES_INFO, STAT_INFO, STAT_KEYS, STAT_MAX, THUMB_ZOOM, portraitUrl } from '@/game/config';
import { SKILLS, skillIconUrl } from '@/game/skills';
import ElementIcon from './ElementIcon';
import styles from './LibraryPanel.module.css';

type DragonId = (typeof SPECIES)[number];
const ELEMENT_HUE: Record<string, string> = {
  'Hỏa': '#ff7a3a', 'Băng': '#7fd6ff', 'Thủy': '#3fa0ff', 'Ám': '#a46bff', 'Quang': '#fff0a0', 'Kim': '#ffcf4a',
  'Nguyệt': '#c9c4ff', 'Thiên': '#ffe6a8', 'Thổ': '#d9a45a', 'Mộc': '#6fdc7a',
};

export default function LibraryPanel({ onClose }: { onClose: () => void }) {
  const [picked, setPicked] = useState<DragonId>(SPECIES[0]);
  const info = SPECIES_INFO[picked], stats = DRAGON_STATS[picked];
  const passive = SKILLS[picked].find(s => s.type === 'passive');
  const moves = SKILLS[picked].filter(s => s.type !== 'passive');

  return (
    <div className={styles.backdrop} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={styles.panel}>
        <header className={styles.title}>
          <h2>Từ điển rồng</h2>
          <button className={styles.close} onClick={onClose} aria-label="Đóng">✕</button>
        </header>

        <div className={styles.list}>
          {SPECIES.map(id => (
            <button key={id} className={`${styles.thumb} ${id === picked ? styles.thumbOn : ''}`} onClick={() => setPicked(id)}
              title={SPECIES_INFO[id].name}
              style={{ '--el': ELEMENT_HUE[SPECIES_INFO[id].element] ?? '#7fd6ff', '--z': THUMB_ZOOM[id] ?? 1.15 } as React.CSSProperties}>
              <span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={portraitUrl(id)} alt="" />
              </span>
              <small>{SPECIES_INFO[id].name}</small>
            </button>
          ))}
        </div>

        <div className={styles.body}>
          <section className={styles.card} style={{ '--el': ELEMENT_HUE[info.element] ?? '#7fd6ff' } as React.CSSProperties}>
            <h3 className={styles.banner}>{info.name}</h3>
            <div className={styles.art}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={portraitUrl(picked)} alt={info.name} />
              <span className={styles.badges}><i><ElementIcon element={info.element} /> Hệ {info.element}</i><i className={styles.rarity}>{info.rarity}</i></span>
            </div>
            {passive && <p className={styles.desc}><b>{passive.name}:</b> {passive.desc}</p>}
          </section>

          <section className={styles.side}>
            <ul className={styles.stats}>
              {STAT_KEYS.map(k => (
                <li key={k} title={`${STAT_INFO[k].name}: ${stats[k]}/${STAT_MAX}`}>
                  <span className={styles.icon}>{STAT_INFO[k].icon}</span>
                  <small>{STAT_INFO[k].name}</small>
                  <span className={styles.bar}>
                    {Array.from({ length: STAT_MAX }, (_, i) => <i key={i} className={i < stats[k] ? styles.on : ''} />)}
                  </span>
                </li>
              ))}
            </ul>
            <ul className={styles.moves}>
              {moves.map(s => (
                <li key={s.type}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={skillIconUrl(picked, s.type)} alt="" />
                  <div><b>{s.name}</b><p>{s.desc}</p></div>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
