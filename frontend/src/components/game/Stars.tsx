// A dragon's star count: the number and a star coloured by tier (public/ui/star_<k>.png, tools/slice_stars.py):
// 1-9★ gold -> red, 10-19★ violet -> blue, 20-29★ cyan, 30★ rainbow. `badge`: the milestone badge instead
// (star_badge_<n>.png for 1, 3, 5, 9, 10, 15, 20, 30★: the highest one reached).
import { assetUrl } from '@/game/config/assets';

const BADGES = [1, 3, 5, 9, 10, 15, 20, 30];

/** Which single star (1..9) a star count shows. */
export function starTier(n: number) {
  if (n >= 30) return 9;
  if (n >= 20) return 8;
  if (n >= 17) return 7;
  if (n >= 14) return 6;
  if (n >= 10) return 5;
  if (n >= 9) return 4;
  if (n >= 6) return 3;
  if (n >= 3) return 2;
  return 1;
}

export default function Stars({ n, badge = false, size = '1.1em', className }: { n: number; badge?: boolean; size?: number | string; className?: string }) {
  const src = badge
    ? assetUrl(`ui/star_badge_${[...BADGES].reverse().find(b => n >= b) ?? 1}.png`)
    : assetUrl(`ui/star_${starTier(n)}.png`);
  return (
    <span className={className} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.15em', whiteSpace: 'nowrap' }} title={`${n} sao`}>
      {n}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="★" draggable={false} style={{ width: size, height: size }} />
    </span>
  );
}
