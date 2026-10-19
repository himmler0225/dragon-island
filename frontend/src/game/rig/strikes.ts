// STRIKES: per-species attack poses (attack / cast / ultimate), plus the keyframe helpers.
import type { SpeciesId } from '../config/species';
import type { Strike, StrikeSet } from './types';

const CHIBI: StrikeSet = {
  attack: {
    dur: 0.7, hit: 0.5, t: [0, 0.3, 0.5, 0.75, 1],
    rear: [0, 0.15, -0.12, -0.04, 0], lunge: [0, 10, -36, -12, 0], head: [0, 0.3, -0.3, -0.1, 0],
    jaw: [0, 0.6, 0.2, 0.1, 0], wings: [0, 0.4, 0.2, 0.1, 0],
  },
  cast: {
    dur: 1.1, hit: 0.5, t: [0, 0.35, 0.55, 0.8, 1],
    rear: [0, 0.3, -0.1, -0.05, 0], head: [0, 0.5, -0.25, -0.1, 0], lunge: [0, 6, -18, -8, 0],
    wings: [0, 1, 0.6, 0.3, 0], spread: [0, 0.8, 0.6, 0.3, 0], stretch: [0, 0, 0.4, 0.2, 0],
  },
  ultimate: {
    dur: 1.6, hit: 0.62, t: [0, 0.3, 0.5, 0.62, 0.8, 1],
    air: [0, 30, 45, -6, 0, 0], rear: [0, 0.3, 0.35, -0.2, -0.05, 0], head: [0, 0.5, 0.55, -0.25, -0.05, 0],
    wings: [0, 1, 1, 0.4, 0.2, 0], spread: [0, 0.8, 1, 0.5, 0.2, 0], lunge: [0, 6, 8, -24, -8, 0], lift: [0, 0, 0, 8, 4, 0],
  },
};

// Rồng Vàng / Rồng Bạc: the same upright dragon - claws, a light breath, and a diving stamp
const TWIN_DRAGON: StrikeSet = {
  // Song Trảo: lean in and rake the claws down, jaws snapping
  attack: {
    dur: 0.85, hit: 0.5, t: [0, 0.3, 0.5, 0.75, 1],
    rear: [0, 0.2, -0.15, -0.05, 0], lunge: [0, 12, -40, -14, 0], head: [0, 0.25, -0.25, -0.08, 0],
    jaw: [0, 0.7, 0.4, 0.15, 0], claw: [0, 0.6, 1, 0.3, 0], wings: [0, 0.4, 0.2, 0.1, 0],
  },
  // Long Quang: stand tall with the wings thrown wide, head back, then thrust forward and breathe
  cast: {
    dur: 1.3, hit: 0.55, t: [0, 0.35, 0.55, 0.8, 1],
    rear: [0, 0.3, -0.12, -0.06, 0], spread: [0, 1, 0.8, 0.4, 0], wings: [0, 1.1, 0.6, 0.3, 0],
    head: [0, 0.5, -0.3, -0.15, 0], jaw: [0, 0.5, 1.2, 0.8, 0], lunge: [0, 8, -20, -10, 0], stretch: [0, 0, 0.5, 0.3, 0],
  },
  // Thiên Long Giáng: beat up high, hang a beat, dive and stamp both feet
  ultimate: {
    dur: 2.1, hit: 0.72, t: [0, 0.3, 0.55, 0.72, 0.86, 1],
    air: [0, 60, 75, -10, 0, 0], flap: [0, 1, 1, 0.4, 0, 0], spread: [0, 0.8, 1, 0.6, 0.2, 0],
    rear: [0, 0.3, 0.35, -0.25, -0.1, 0], head: [0, 0.5, 0.55, -0.3, -0.1, 0], jaw: [0, 0.4, 1, 1, 0.3, 0],
    lunge: [0, 10, 12, -40, -16, 0], stretch: [0, 0.3, 0.2, 0, 0.4, 0], lift: [0, 0, 0, 10, 6, 0],
  },
};

// Phượng Hoàng Lửa / Băng main skill (ultimate), step by step:
//   0.00-0.14 thu cánh: crouch low, wings folded in (spread < 0)
//   0.14-0.30 ngước đầu: head up to the sky, chest out (rear), wings start to open
//   0.30-0.46 vỗ cánh: wings raised high (wings, spread) ...
//   0.46-0.56 ... and beaten down hard, lifting it off the ground (air) - the hit: objects are summoned
//   0.56-0.85 mưa tấn công: it hangs in the air, wings half open, while the objects rain down
//   0.85-1.00 kết thúc: lands and folds back to rest
// attack / cast reuse Hắc Long's until the phoenix gets its own basic moves.
const PHOENIX: StrikeSet = {
  // Phượng Trảo: from the hover it pulls up, then dives with the talons out and pulls back up
  attack: {
    dur: 1.0, hit: 0.5, t: [0, 0.3, 0.5, 0.7, 1],
    air: [0, 25, -40, -10, 0], flap: [0, 1, 0.3, 0.8, 0], lunge: [0, 12, -55, -20, 0],
    rear: [0, 0.25, -0.35, -0.1, 0], head: [0, 0.3, -0.4, -0.1, 0], claw: [0, 0.3, 1, 0.4, 0],
    stretch: [0, 0, 1, 0.5, 0], wings: [0, 0.8, -0.6, 0.2, 0],
  },
  // Phượng Dực Phong: both wings thrown wide behind, then one huge sweep forward
  cast: {
    dur: 1.4, hit: 0.55, t: [0, 0.35, 0.5, 0.58, 0.8, 1],
    spread: [0, 1, 1, 0.3, 0.2, 0], wings: [0, 1.3, 1.4, -1.2, -0.5, 0], rear: [0, 0.3, 0.32, -0.2, -0.1, 0],
    head: [0, 0.35, 0.4, -0.2, -0.1, 0], lunge: [0, 14, 16, -24, -10, 0], air: [0, 10, 14, 4, 0, 0],
  },
  ultimate: {
    dur: 3.2, hit: 0.52, t: [0, 0.14, 0.3, 0.46, 0.56, 0.72, 0.85, 1],
    lift:   [0, -14, 4, 6, 0, 0, 0, 0],
    rear:   [0, -0.12, 0.4, 0.35, -0.05, 0.05, 0, 0],
    head:   [0, -0.15, 0.6, 0.5, 0.05, 0.15, 0, 0],
    wings:  [0, -0.5, 0.5, 1.4, -1.1, 0.3, 0.2, 0],
    spread: [0, -0.8, 0.3, 1, 0.6, 0.5, 0.2, 0],
    air:    [0, 0, 0, 10, 45, 50, 30, 0],
    flap:   [0, 0, 0, 0, 0.6, 0.8, 0.4, 0],
  },
};

export const STRIKES: Record<SpeciesId, StrikeSet> = {
  // Kì Lân: sturdy beast — claw swipes, and a head-thrust that spits a golden dragon head
  ki_lan: {
    // rear a little, swipe the front claw down
    attack: {
      dur: 0.8, hit: 0.5, t: [0, 0.3, 0.5, 0.75, 1],
      rear: [0, 0.18, -0.12, -0.04, 0], lunge: [0, 10, -32, -12, 0], head: [0, 0.25, -0.2, -0.05, 0],
      jaw: [0, 0.5, 0.3, 0.1, 0], claw: [0, 0.4, 1, 0.3, 0],
    },
    // Long Thủ Xuyên Trận: rear back, head up with the jaw wide, then thrust the head forward and spit
    cast: {
      dur: 1.2, hit: 0.55, t: [0, 0.35, 0.55, 0.75, 1],
      rear: [0, 0.22, -0.18, -0.1, 0], lunge: [0, 14, -26, -14, 0], head: [0, 0.45, -0.3, -0.15, 0],
      jaw: [0, 0.6, 1.2, 0.8, 0], stretch: [0, 0, 0.7, 0.4, 0],
    },
    // Kim Long Liên Châu: three spits in a row, bracing harder each time
    ultimate: {
      dur: 2.0, hit: 0.3, t: [0, 0.2, 0.3, 0.45, 0.55, 0.7, 0.8, 1],
      rear: [0, 0.2, -0.15, 0.15, -0.18, 0.18, -0.22, 0], lunge: [0, 10, -20, 6, -24, 6, -30, 0],
      head: [0, 0.35, -0.25, 0.3, -0.28, 0.35, -0.32, 0], jaw: [0, 0.6, 1.2, 0.5, 1.2, 0.5, 1.2, 0],
      stretch: [0, 0, 0.5, 0.2, 0.6, 0.2, 0.8, 0],
    },
  },
  // Hải Long: wingless serpent — rears its head, snaps, whips the body (used once it has skills)
  hai_long: {
    // Thủy Châu: a quick water orb
    attack: {
      dur: 0.85, hit: 0.5, t: [0, 0.3, 0.5, 0.75, 1],
      rear: [0, 0.12, -0.14, -0.06, 0], head: [0, 0.3, -0.22, -0.1, 0], lunge: [0, 8, -24, -10, 0], jaw: [0, 0.3, 1.1, 0.4, 0],
    },
    // Hải Triều Thủy Tiễn: a longer wind-up, three jets in a row with the head thrust forward
    cast: {
      dur: 1.5, hit: 0.4, t: [0, 0.28, 0.4, 0.55, 0.7, 1],
      rear: [0, 0.2, -0.16, -0.12, -0.16, 0], head: [0, 0.4, -0.25, -0.18, -0.25, 0],
      lunge: [0, 12, -30, -24, -30, 0], jaw: [0, 0.4, 1.2, 1, 1.2, 0], stretch: [0, 0, 0.5, 0.5, 0.5, 0],
    },
    // Long Châu Hải Thần: rise up, rear back, then dive the head forward and spit the great pearl
    ultimate: {
      dur: 1.9, hit: 0.6, t: [0, 0.3, 0.5, 0.6, 0.8, 1],
      air: [0, 40, 60, 50, 20, 0], rear: [0, 0.25, 0.32, -0.2, -0.08, 0], head: [0, 0.45, 0.55, -0.3, -0.12, 0],
      jaw: [0, 0.4, 0.8, 1.3, 0.5, 0], lunge: [0, 10, 14, -34, -14, 0],
    },
  },
  // Hắc Long: fights from the air (COMBAT_HOVER) — every move starts and ends hovering
  hac_long: {
    // rise a little, then swoop down and rake with the claws
    attack: {
      dur: 1.1, hit: 0.62, t: [0, 0.3, 0.5, 0.62, 0.8, 1],
      air: [0, 20, 25, -55, -20, 0], flap: [0, 1, 1, 1, 0.6, 0], lunge: [0, 14, 10, -46, -20, 0],
      rear: [0, 0.18, 0.2, -0.22, -0.05, 0], head: [0, 0.45, 0.35, -0.42, -0.12, 0],
      jaw: [0, 0.2, 0.3, 0.8, 0.2, 0], claw: [0, 0.2, 0.4, 1, 0.3, 0],
    },
    // Hấp Huyết: hovers high, wings wide, a long roar that drains the enemies
    cast: {
      dur: 1.6, hit: 0.5, t: [0, 0.3, 0.5, 0.8, 1],
      air: [0, 15, 22, 15, 0], flap: [0, 1, 1, 1, 0], rear: [0, 0.2, 0.28, 0.2, 0],
      head: [0, 0.45, 0.65, 0.4, 0], jaw: [0, 0.5, 1, 0.8, 0],
      wings: [0, 1, 1, 1, 0], lunge: [0, 6, 6, 6, 0],
    },
    // Đoạt Mệnh: climbs very high, hangs, then a plunging dive that slams into the target
    ultimate: {
      dur: 2.2, hit: 0.72, t: [0, 0.35, 0.58, 0.72, 0.86, 1],
      air: [0, 70, 80, -85, -40, 0], flap: [0, 1, 1, 0.3, 0, 0], lunge: [0, 18, 20, -60, -30, 0],
      rear: [0, 0.25, 0.3, -0.35, -0.1, 0], head: [0, 0.55, 0.6, -0.48, -0.15, 0],
      jaw: [0, 0.4, 1, 1, 0.3, 0], claw: [0, 0, 0.3, 1, 0.4, 0], wings: [0, 0.2, 0.4, 1, 0.5, 0], lift: [0, 0, 0, 10, 4, 0],
    },
  },
  // Rồng Xương: two-legged bone wyvern — its wings are its weapons
  rong_xuong: {
    // Cắn Xương: half-open the wings, lunge low with the head thrust out, snap the jaws; legs push off
    attack: {
      dur: 0.9, hit: 0.5, t: [0, 0.3, 0.5, 0.72, 1],
      wings: [0, 0.6, 0.3, 0.2, 0], rear: [0, 0.15, -0.28, -0.1, 0], lunge: [0, 14, -46, -18, 0],
      head: [0, 0.3, -0.35, -0.1, 0], jaw: [0, 1, 0.05, 0.4, 0], stretch: [0, 0, 1, 0.4, 0], lift: [0, -6, 4, 2, 0],
    },
    // Cốt Dực Cuồng Phong: throw the wings wide open, then pitch forward in one huge beat —
    // mouth gaping, legs stretched out behind — and the gust blasts the enemies back
    cast: {
      dur: 1.5, hit: 0.55, t: [0, 0.35, 0.5, 0.58, 0.8, 1],
      wings: [0, 1.3, 1.4, -1.1, -0.6, 0], spread: [0, 1, 1, 0.4, 0.2, 0],
      rear: [0, 0.25, 0.28, -0.32, -0.25, 0], lunge: [0, 18, 20, -38, -30, 0], lift: [0, -10, -12, 6, 4, 0],
      head: [0, 0.4, 0.45, -0.25, -0.2, 0], jaw: [0, 0.4, 0.6, 1, 0.9, 0], stretch: [0, 0, 0.1, 1, 0.9, 0],
    },
    // Mưa Cốt Long: leap up with wings spread wide, roar to the sky, then crash down as bones rain
    ultimate: {
      dur: 2.0, hit: 0.62, t: [0, 0.2, 0.45, 0.62, 0.8, 1],
      air: [0, 0, 60, 70, 0, 0], flap: [0, 0, 1, 1, 0, 0], spread: [0, 0.6, 1, 1, 0.3, 0],
      rear: [0, -0.1, 0.45, 0.5, -0.2, 0], head: [0, -0.1, 0.6, 0.65, -0.25, 0], jaw: [0, 0.2, 1, 1, 0.4, 0],
      lunge: [0, 8, 0, 0, -24, 0], stretch: [0, 0.4, 0.8, 0.8, 0.3, 0], lift: [0, 8, 0, 0, 8, 0],
    },
  },
  // Tuấn Long: nimble support — antler charges, graceful rises, glowing hovers
  tuan_long: {
    // lower the antlers and charge forward
    attack: {
      dur: 0.8, hit: 0.48, t: [0, 0.3, 0.48, 0.7, 1],
      lunge: [0, 18, -54, -24, 0], head: [0, -0.3, -0.38, -0.1, 0], rear: [0, -0.08, -0.12, 0, 0],
      lift: [0, 4, 0, 0, 0], jaw: [0, 0, 0.2, 0, 0],
    },
    // Hào Quang Tuyết: rise gracefully, head high, wings open, a short hover
    cast: {
      dur: 1.4, hit: 0.5, t: [0, 0.35, 0.5, 0.8, 1],
      air: [0, 30, 36, 30, 0], flap: [0, 0.5, 0.6, 0.5, 0], head: [0, 0.4, 0.45, 0.4, 0],
      rear: [0, 0.15, 0.18, 0.15, 0], wings: [0, 1, 1, 1, 0],
    },
    // Sừng Thiêng Phục Sinh: leaps up spinning its wings, hangs in a glow, lands softly
    ultimate: {
      dur: 2.0, hit: 0.55, t: [0, 0.3, 0.55, 0.8, 1],
      air: [0, 70, 90, 70, 0], flap: [0, 1, 1, 1, 0], head: [0, 0.35, 0.5, 0.35, 0],
      rear: [0, 0.2, 0.25, 0.2, 0], jaw: [0, 0.2, 0.6, 0.2, 0], wings: [0, 1, 1, 1, 0],
    },
  },
  // Thần Long moves exactly like Hắc Long (same rig)
  get than_long() { return STRIKES.hac_long; },
  phuong_hoang_lua: PHOENIX,
  phuong_hoang_bang: PHOENIX,
  // Tử Xà Long: stays back; it rears up, head high, while its rift does the work
  tu_xa_long: {
    attack: { dur: 0.9, hit: 0.35, t: [0, 0.35, 0.7, 1], rear: [0, 0.18, 0.12, 0], head: [0, 0.35, 0.25, 0], jaw: [0, 0.6, 0.3, 0] },
    cast: { dur: 1.2, hit: 0.3, t: [0, 0.3, 0.75, 1], rear: [0, 0.25, 0.2, 0], head: [0, 0.5, 0.4, 0], jaw: [0, 1, 0.7, 0] },
    ultimate: { dur: 1.6, hit: 0.3, t: [0, 0.3, 0.8, 1], rear: [0, 0.32, 0.28, 0], head: [0, 0.6, 0.5, 0], jaw: [0, 1.2, 0.9, 0] },
  },
  rong_vang: TWIN_DRAGON,
  rong_bac: TWIN_DRAGON,
  // Rồng Lửa / Rồng Đất (chibi): a headlong lunge-bite, a rear-up roar, and a hop that stamps down
  rong_lua_do: CHIBI,
  rong_dat_nau: CHIBI,
  rong_cay_xanh_la: CHIBI,
  rong_bang_xanh_bien: CHIBI,
};

export const smoothstep = (u: number) => u * u * (3 - 2 * u);

/** Value of keyframe track `ch` of strike `s` at u (0..1): a Catmull-Rom curve through the keys, so
 *  the motion flows through each pose instead of stopping at it (first and last keys are at rest). */
export function track(s: Strike, ch: string, u: number) {
  const t = s.t, v = s[ch] as number[] | undefined;
  if (!v) return 0;
  const n = t.length;
  // tangent at key i (value per unit u); zero at both ends
  const tan = (i: number) => (i <= 0 || i >= n - 1 ? 0 : (v[i + 1] - v[i - 1]) / (t[i + 1] - t[i - 1]));
  for (let k = 1; k < n; k++) {
    if (u <= t[k]) {
      const h = t[k] - t[k - 1], f = (u - t[k - 1]) / h, f2 = f * f, f3 = f2 * f;
      return (2 * f3 - 3 * f2 + 1) * v[k - 1] + (f3 - 2 * f2 + f) * h * tan(k - 1)
        + (-2 * f3 + 3 * f2) * v[k] + (f3 - f2) * h * tan(k);
    }
  }
  return v[n - 1];
}
