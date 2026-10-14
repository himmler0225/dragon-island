'use client';
// Phaser touches window/WebGL, so the island is only rendered in the browser.
import dynamic from 'next/dynamic';

const Island = dynamic(() => import('./Island'), {
  ssr: false,
  loading: () => <p style={{ padding: 16 }}>Đang tải đảo…</p>,
});

export default function IslandLoader() {
  return <Island />;
}
