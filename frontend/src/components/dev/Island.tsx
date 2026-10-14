'use client';
import { useEffect, useRef } from 'react';
import DevPanel from './DevPanel';
import styles from './Island.module.css';

export default function Island() {
  const stage = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let game: { destroy(removeCanvas: boolean): void } | null = null;
    let cancelled = false;
    import('@/game/createGame')
      .then(({ createGame }) => createGame(stage.current!))
      .then(g => { if (cancelled) g.destroy(true); else game = g; });
    // React dev mode mounts twice: tear the first game down cleanly
    return () => { cancelled = true; game?.destroy(true); };
  }, []);

  return (
    <div className={styles.wrap}>
      <DevPanel />
      <div ref={stage} className={styles.stage} />
    </div>
  );
}
