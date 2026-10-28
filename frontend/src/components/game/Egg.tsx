// Egg image with graceful CSS fallback if the art asset is missing.
import { useState } from 'react';
import { assetUrl } from '@/game/config/assets';
import styles from './BreedPanel.module.css';

export function Egg({ level }: { level: number }) {
  const [broken, setBroken] = useState(false);
  if (broken) return <div className={styles.cssEgg} data-level={level} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img className={styles.eggImg} src={assetUrl(`eggs/egg_${level}.png`)} alt="" onError={() => setBroken(true)} />;
}
