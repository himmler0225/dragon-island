'use client';
// Loading screen over the game until the island scene is ready. The bar fill sits in the frame's
// opening, measured by tools/slice_ui.py (public/ui/loading_bar.json): hole = [x, y, w, h] shares.
import { useEffect, useState } from 'react';
import { gameEvents, island } from '@/game/bridge';
import { assetUrl } from '@/game/config/assets';
import styles from './LoadingScreen.module.css';

const HOLE = { x: 0.1977, y: 0.3966, w: 0.6865, h: 0.342 };

const TIPS = [
  'Bấm vào công trình khi có biểu tượng tài nguyên để thu hoạch.',
  'Kéo ngang màn hình để sang đảo khác.',
  'Hắc Long luôn chiến đấu trên không — kẻ địch dưới đất khó né đòn bổ nhào.',
  'Rồng Xương hồi sinh một lần mỗi trận nhờ Bất Tử Cốt.',
  'Tuấn Long giải mọi hiệu ứng xấu cho cả đội.',
  'Shift + bấm lên đất để rồng bay thẳng tới đó.',
];

export default function LoadingScreen() {
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(() => island() !== null);
  const [gone, setGone] = useState(done);
  const [tip, setTip] = useState(0);

  useEffect(() => {
    const offs = [
      gameEvents.on('progress', setProgress),
      gameEvents.on('ready', () => { setProgress(1); setDone(true); }),
    ];
    const timer = setInterval(() => setTip(t => (t + 1) % TIPS.length), 3500);
    return () => { offs.forEach(off => off()); clearInterval(timer); };
  }, []);

  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => setGone(true), 700);   // after the fade-out
    return () => clearTimeout(t);
  }, [done]);

  if (gone) return null;
  return (
    <div className={`${styles.screen} ${done ? styles.fade : ''}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className={styles.logo} src={assetUrl("ui/logo.png")} alt="Dragon Island" />
      <div className={styles.bottom}>
        <div className={styles.bar}>
          <div className={styles.track}
            style={{ left: `${HOLE.x * 100}%`, top: `${HOLE.y * 100}%`, width: `${HOLE.w * 100}%`, height: `${HOLE.h * 100}%` }}>
            <div className={styles.fill} style={{ width: `${Math.max(4, progress * 100)}%` }} />
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className={styles.frame} src={assetUrl("ui/loading_frame.png")} alt="" />
        </div>
        <p className={styles.percent}>Đang tải đảo… {Math.round(progress * 100)}%</p>
        <p className={styles.tip}>💡 {TIPS[tip]}</p>
      </div>
    </div>
  );
}
