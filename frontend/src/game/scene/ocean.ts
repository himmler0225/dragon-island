// Stylised ocean: two drifting noise layers + bright caustic bands, lighter near each island.
import type { Point } from '../config/world';

/** Fragment shader for a `width` x `height` ocean with shallow water around `centres` (world px). */
export function oceanFrag(width: number, height: number, centres: Point[]) {
  // fragCoord has y up and is local to the shader object, which covers the whole world
  const near = centres
    .map(([x, y]) => `r = min(r, length((fragCoord - vec2(${x.toFixed(1)}, ${(height - y).toFixed(1)})) / vec2(560.0, 400.0)));`)
    .join('\n  ');
  return `
precision mediump float;
uniform float time;
uniform float night;   // 0 day .. 1 night (dayNight.ts)
uniform vec2 resolution;
varying vec2 fragCoord;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}
void main() {
  float t = time * 0.5;
  vec2 p = fragCoord * vec2(1.0, 1.7) / 150.0;
  float n = noise(p + vec2(t * 0.35, t * 0.12)) * 0.6 + noise(p * 2.3 - vec2(t * 0.25, -t * 0.3)) * 0.4;
  float bands = smoothstep(0.9, 0.995, 1.0 - abs(n * 2.0 - 1.0));
  float sparkle = pow(noise(p * 5.0 + vec2(-t, t * 0.7)), 14.0) * 2.0;
  float r = 99.0;
  ${near}
  vec3 deep = vec3(0.05, 0.33, 0.58), mid = vec3(0.10, 0.55, 0.78), shallow = vec3(0.22, 0.78, 0.90);
  vec3 col = mix(shallow, mid, smoothstep(0.75, 1.05, r));
  col = mix(col, deep, smoothstep(1.05, 1.9, r));
  col += bands * mix(0.22, 0.1, smoothstep(0.8, 1.6, r)) + sparkle * 0.3;
  // night: deep navy water, caustics fade, a few moonlit glints stay
  col = mix(col, col * vec3(0.4, 0.52, 0.8) + vec3(0.0, 0.03, 0.08), night) + sparkle * 0.15 * night;
  gl_FragColor = vec4(col, 1.0);
}`;
}
