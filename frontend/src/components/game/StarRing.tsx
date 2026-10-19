// Star ring: 29 stars on an arc around the egg; lit up to the cap.
import { MAX_STARS } from '@/game/config/breeding';
import styles from './BreedPanel.module.css';

const STAR_COLORS = [
  '#7dd87d', '#5ec8f2', '#6f8cff', '#b06dff',
  '#ff6fb5', '#ffb347', '#ffe066',
];

export function StarRing({ lit, cap }: { lit: number; cap: number }) {
  return (
    <div className={styles.ring}>
      {Array.from({ length: MAX_STARS }, (_, i) => {
        const a = (-200 + (i / (MAX_STARS - 1)) * 220) * (Math.PI / 180);
        const on = i < lit, avail = i < cap;
        return (
          <span key={i} className={styles.star}
            style={{
              left: `${50 + 47 * Math.cos(a)}%`, top: `${50 + 47 * Math.sin(a)}%`,
              color: on ? STAR_COLORS[Math.floor((i / MAX_STARS) * STAR_COLORS.length)] : avail ? '#6d6040' : '#2d3135',
            }}>★</span>
        );
      })}
    </div>
  );
}
