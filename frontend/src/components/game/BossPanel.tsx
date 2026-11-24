'use client';
// Đánh Boss: the list of bosses (BOSSES, apart from the player's dragons). Pick one to see its moves,
// then Khiêu chiến opens the battle field in boss mode (BattleScreen `boss`) with the active team.
// Same gold-framed sheet as Đội hình, in red for the bosses.
import { useState } from 'react';
import { BOSSES, BOSS_INFO, SPECIES_INFO, portraitUrl, type BossId } from '@/game/config';
import { SKILLS, skillIconUrl } from '@/game/skills';
import { STATS } from '@/game/battle/constants';
import { activeTeam } from '@/game/config/team';
import { fmt } from './battleScreenData';
import ElementIcon from './ElementIcon';
import styles from './BossPanel.module.css';

export default function BossPanel({ onClose, onFight }: { onClose: () => void; onFight: (id: BossId) => void }) {
  const [picked, setPicked] = useState<BossId>(BOSSES[0]);
  const info = SPECIES_INFO[picked], fight = BOSS_INFO[picked];
  const team = activeTeam().length;

  return (
    <div className={styles.backdrop} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={styles.panel}>
        <header className={styles.title}>
          <h2>Đánh Boss</h2>
          <button className={styles.close} onClick={onClose} aria-label="Đóng">✕</button>
        </header>

        <div className={styles.body}>
          <div className={styles.list}>
            {BOSSES.map(id => (
              <button key={id} className={`${styles.item} ${id === picked ? styles.itemOn : ''}`} onClick={() => setPicked(id)}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={portraitUrl(id)} alt="" />
                <span><b>{SPECIES_INFO[id].name}</b><small>{BOSS_INFO[id].title}</small></span>
              </button>
            ))}
          </div>

          <section className={styles.detail}>
            <div className={styles.art}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={portraitUrl(picked)} alt={info.name} />
            </div>
            <div className={styles.info}>
              <h3>{info.name} <small>{fight.title}</small></h3>
              <div className={styles.tags}>
                <span><ElementIcon element={info.element} /> Hệ {info.element}</span>
                <span>❤️ {(STATS[info.rarity] ?? 0).toLocaleString('vi-VN')}</span>
                <span>⏱ {fmt(fight.time)}</span>
                <span>⚔️ Đề xuất {fight.power.toLocaleString('vi-VN')}</span>
              </div>
              <p>{fight.blurb}</p>
              <ul className={styles.skills}>
                {SKILLS[picked].map(s => (
                  <li key={s.type}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={skillIconUrl(picked, s.type)} alt="" />
                    <div><b>{s.name}</b><p>{s.desc}</p></div>
                  </li>
                ))}
              </ul>
              <p className={styles.escort}>
                Hộ vệ đi cùng:
                {fight.escort.map(id => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={id} src={portraitUrl(id)} alt="" title={SPECIES_INFO[id].name} />
                ))}
              </p>
              <div className={styles.actions}>
                <small>Ra trận với đội đang chọn ({team} rồng)</small>
                <button className={styles.fight} onClick={() => onFight(picked)}>⚔️ Khiêu chiến</button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
