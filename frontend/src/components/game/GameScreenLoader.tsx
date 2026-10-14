'use client';
// Phaser touches window/WebGL, so the game is only rendered in the browser.
import dynamic from 'next/dynamic';

const GameScreen = dynamic(() => import('./GameScreen'), { ssr: false });

export default function GameScreenLoader({ dev = false }: { dev?: boolean }) {
  return <GameScreen dev={dev} />;
}
