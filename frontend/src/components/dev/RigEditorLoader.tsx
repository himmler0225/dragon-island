'use client';
// Phaser touches window/WebGL, so the rig editor is only rendered in the browser.
import dynamic from 'next/dynamic';

const RigEditor = dynamic(() => import('./RigEditor'), { ssr: false, loading: () => <p style={{ padding: 16 }}>Đang tải trình chỉnh…</p> });

export default function RigEditorLoader() {
  return <RigEditor />;
}
