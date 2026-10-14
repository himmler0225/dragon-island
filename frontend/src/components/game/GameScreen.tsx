'use client';
// The playable game: Phaser island + loading screen + HUD. Browser only — load it with
// next/dynamic(..., { ssr: false }) (see GameScreenLoader).
import { useEffect, useRef } from 'react';
import GameHud from './GameHud';
import LoadingScreen from './LoadingScreen';
import styles from './GameScreen.module.css';

export default function GameScreen({ dev = false }: { dev?: boolean }) {
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
    <div className={styles.screen} data-game-screen>
      <div ref={stage} className={styles.stage} />
      <GameHud dev={dev} />
      <LoadingScreen />
    </div>
  );
}
