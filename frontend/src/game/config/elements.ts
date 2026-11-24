// The elements (hệ) the dragons have, and their badge icons (public/ui/element_<icon>.png, tools/slice_elements.py).
// The sheet has 9 badges for 10 elements: Ám shares Nguyệt's moon, Kim takes the thunder bolt (until they get their own).
import { assetUrl } from './assets';

const ICON: Record<string, string> = {
  'Hỏa': 'fire', 'Thổ': 'earth', 'Băng': 'ice', 'Thủy': 'water', 'Mộc': 'leaf',
  'Nguyệt': 'moon', 'Ám': 'moon', 'Quang': 'light', 'Thiên': 'wing', 'Kim': 'thunder', 'Hư Không': 'moon',
};

/** The badge of an element (null: none drawn for it). */
export const elementIconUrl = (element: string) => (ICON[element] ? assetUrl(`ui/element_${ICON[element]}.png`) : null);
