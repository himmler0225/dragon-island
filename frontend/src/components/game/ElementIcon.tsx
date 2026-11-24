// An element's round badge (config/elements.ts), sized by the caller (default 1.2em, in line with text).
import { elementIconUrl } from '@/game/config/elements';

export default function ElementIcon({ element, size = '1.2em', className }: { element: string; size?: number | string; className?: string }) {
  const url = elementIconUrl(element);
  if (!url) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt={element} title={`Hệ ${element}`} className={className} draggable={false}
      style={{ width: size, height: size, verticalAlign: 'middle', flex: 'none' }} />
  );
}
