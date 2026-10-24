// Every asset shares one native grid: 1 source pixel = 1 world unit.
import { WIDTH, HEIGHT, WALLS } from './world.js';
import { heroSprite, orcSprite } from './brawler-art.js';
import { pixelPolygon, pixelOval } from './pixel.js';
export { heroSprite, HERO_SIZE, BOSS_SIZE } from './brawler-art.js';
export { pixelLine } from './pixel.js';

import { ART_UNIT } from './scale.js';
export { ART_UNIT } from './scale.js';

function surface(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  return canvas;
}

function painter(canvas) {
  const ctx = canvas.getContext('2d');
  return (x, y, w, h, color) => { ctx.fillStyle = color; ctx.fillRect(x, y, w, h); };
}

function variants(canvas) {
  const left = surface(canvas.width, canvas.height), lc = left.getContext('2d');
  lc.translate(canvas.width, 0); lc.scale(-1, 1); lc.drawImage(canvas, 0, 0);
  const tint = source => {
    const result = surface(source.width, source.height), ctx = result.getContext('2d');
    ctx.drawImage(source, 0, 0); ctx.globalCompositeOperation = 'source-atop'; ctx.globalAlpha = 0.4;
    ctx.fillStyle = '#fff2c6'; ctx.fillRect(0, 0, result.width, result.height);
    return result;
  };
  return { right: canvas, left, flashRight: tint(canvas), flashLeft: tint(left) };
}

function flameSprite(frame) {
  const canvas = surface(16, 28), ctx = canvas.getContext('2d');
  pixelPolygon(ctx, [[3, 22], [12, 22], [14, 27], [2, 27]], '#34475e', '#151e31');
  pixelPolygon(ctx, [[1, 16], [14, 16], [12, 23], [4, 23]], '#9a7049', '#151e31');
  pixelPolygon(ctx, [[4, 17], [2, 11], [6, 12], [8 + frame % 2, 1 + frame], [12, 9], [14, 12], [12, 18]], '#ed6f31', '#522c3b');
  pixelPolygon(ctx, [[5, 16], [6, 9], [8, 12], [10, 6 + frame], [12, 16], [9, 19]], '#ffc14f');
  pixelPolygon(ctx, [[7, 17], [8, 12], [10, 16], [9, 19]], '#fff4b1');
  return canvas;
}

function rockSprite(frame) {
  const canvas = surface(8, 8), ctx = canvas.getContext('2d');
  const shades = ['#9b9c91', '#8b9297', '#b5aa8a', '#8b8b91'];
  const size = frame % 2;
  pixelPolygon(ctx, [[1, 3], [3, 1 + size], [6, 2], [7, 5], [5, 7], [1, 6]], shades[frame], '#333d4c');
  pixelPolygon(ctx, [[2, 3], [3, 2 + size], [5, 2], [5, 4], [2, 4]], '#ddd0a7');
  return canvas;
}

function smokeSprite(frame) {
  const canvas = surface(24, 20), ctx = canvas.getContext('2d');
  const radius = 2 + frame;
  pixelOval(ctx, 12, 14, radius + 3, Math.max(2, radius - 1), '#8b8d96');
  pixelOval(ctx, 8, 11, radius, Math.max(2, radius - 1), '#a9a7a1');
  pixelOval(ctx, 15, 9, radius, Math.max(2, radius - 1), '#b9b5a6');
  pixelOval(ctx, 11, 7, Math.max(1, radius - 1), Math.max(1, radius - 2), '#d9d0b7');
  return canvas;
}

// TMNT-style impact stars: chunky four-point bursts with a bright core.
function starSprite(big) {
  const R = big ? 10 : 6, r = big ? 3 : 2, c = R + 1;
  const canvas = surface(c * 2 + 1, c * 2 + 1), ctx = canvas.getContext('2d');
  pixelPolygon(ctx, [[c, c - R], [c + r, c - r], [c + R, c], [c + r, c + r], [c, c + R], [c - r, c + r], [c - R, c], [c - r, c - r]], '#ffd23e', '#7a3b17', true);
  pixelPolygon(ctx, [[c, c - R + 3], [c + r - 1, c - r + 1], [c + R - 3, c], [c + r - 1, c + r - 1], [c, c + R - 3], [c - r + 1, c + r - 1], [c - R + 3, c], [c - r + 1, c - r + 1]], '#fff6d8', null);
  return canvas;
}

export function actionIcon(kind) {
  const canvas = surface(20, 20), ctx = canvas.getContext('2d'), p = painter(canvas);
  if (kind === 'dodge') {
    pixelPolygon(ctx, [[3, 7], [11, 7], [11, 3], [18, 10], [11, 17], [11, 12], [3, 12]], '#d0f2ee', '#1b3849');
    p(0, 4, 5, 2, '#69a9ba'); p(0, 15, 5, 2, '#69a9ba');
  } else if (kind === 'mage') {
    pixelPolygon(ctx, [[3, 14], [5, 5], [8, 8], [11, 1], [16, 8], [17, 14], [12, 18], [7, 18]], '#ff8b34', '#913b50');
    pixelPolygon(ctx, [[6, 14], [9, 8], [11, 12], [13, 7], [14, 15], [10, 17]], '#fff1a2');
  } else if (kind === 'archer') {
    pixelPolygon(ctx, [[11, 1], [17, 6], [18, 13], [12, 19], [13, 14], [15, 10], [13, 5]], '#edbc5b', '#66483d');
    p(2, 9, 15, 2, '#f5e8bc'); pixelPolygon(ctx, [[14, 7], [19, 10], [14, 13]], '#fff6cf');
  } else {
    pixelPolygon(ctx, [[3, 18], [1, 16], [12, 3], [15, 5]], '#c78b49', '#553b38');
    pixelPolygon(ctx, [[10, 1], [17, 2], [19, 8], [15, 13], [10, 11], [13, 7]], '#badce8', '#283c58');
    pixelPolygon(ctx, [[17, 2], [19, 8], [15, 13], [14, 10], [17, 7]], '#fff4cf');
  }
  return canvas;
}

export function createArt() {
  const floor = surface(WIDTH / ART_UNIT, HEIGHT / ART_UNIT), p = painter(floor), ctx = floor.getContext('2d');
  // Warm cobblestone with bold grout lines and per-stone wear.
  p(0, 0, floor.width, floor.height, '#3d3330');
  const stones = ['#6e6055', '#75665a', '#675a4e', '#736257', '#6a5d53', '#77695c'];
  for (let y = 0; y < floor.height; y += 18) {
    for (let x = -40; x < floor.width; x += 40) {
      const at = x + (y / 18 % 2) * 20;
      const tone = stones[((x + 40) / 40 * 5 + y / 18 * 3) % stones.length];
      p(at, y, 37, 16, tone);
      p(at, y, 37, 2, '#8d7d6d');
      p(at, y + 13, 37, 3, '#514539');
      p(at + 35, y, 2, 16, '#4a3f36');
      if (tone === stones[1]) { p(at + 6, y + 6, 3, 1, '#4f443a'); p(at + 7, y + 7, 2, 1, '#4f443a'); }
      if (tone === stones[3]) { p(at + 22, y + 4, 5, 2, '#57674a'); p(at + 24, y + 6, 2, 1, '#57674a'); }
      if (tone === stones[5]) { p(at + 14, y + 9, 5, 1, '#8a7a68'); p(at + 18, y + 10, 2, 1, '#8a7a68'); }
    }
  }
  // Worn central medallion where the boss makes its stand.
  const cx = floor.width / 2, cy = floor.height / 2;
  pixelOval(ctx, cx, cy, 212, 132, '#5c4f45', '#453a33');
  pixelOval(ctx, cx, cy, 198, 120, '#6e6055', null);
  pixelOval(ctx, cx, cy, 180, 103, '#c9973f');
  pixelOval(ctx, cx, cy, 174, 97, '#6a5d52');
  pixelOval(ctx, cx, cy, 150, 76, '#76685b', null);
  pixelOval(ctx, cx, cy, 120, 52, '#5c4f45', null);
  for (const [gx, gy] of [[cx, cy - 100], [cx, cy + 100], [cx - 158, cy], [cx + 158, cy]]) {
    pixelPolygon(ctx, [[gx, gy - 5], [gx + 5, gy], [gx, gy + 5], [gx - 5, gy]], '#a34536', '#453a33', false);
    pixelPolygon(ctx, [[gx, gy - 2], [gx + 2, gy], [gx, gy + 2], [gx - 2, gy]], '#d97a5a', null);
  }
  for (const wall of WALLS) {
    const x = Math.floor(wall.x / ART_UNIT), y = Math.floor(wall.y / ART_UNIT), w = Math.floor(wall.w / ART_UNIT), h = Math.floor(wall.h / ART_UNIT);
    p(x, y, w, h, '#241a20'); p(x + 1, y + 1, w - 2, h - 3, '#6f6157'); p(x + 1, y + 1, w - 2, 2, '#a4947f');
    p(x + 2, y + 3, w - 4, 1, '#8d7d6d');
    for (let by = y + 5; by < y + h - 2; by += 8) for (let bx = x + 2; bx < x + w - 2; bx += 16) {
      p(bx, by, Math.min(14, x + w - 2 - bx), 1, '#3a2f33');
      p(bx + 3, by + 1, 1, Math.min(6, y + h - 2 - by), '#574a42');
    }
  }
  // Hanging battle banners dress the north wall above the boss's stand.
  for (const bx of [180, 560, 940]) {
    pixelPolygon(ctx, [[bx - 14, 24], [bx + 14, 24], [bx + 14, 60], [bx, 72], [bx - 14, 60]], '#a83a3c', '#20141a', true);
    pixelPolygon(ctx, [[bx - 10, 28], [bx + 10, 28], [bx + 10, 56], [bx - 10, 56]], '#c14f47', null);
    pixelPolygon(ctx, [[bx - 4, 34], [bx + 4, 34], [bx + 4, 48], [bx - 4, 48]], '#e8c95e', '#20141a', false);
  }
  // Wooden barrels and rubble piles keep the arena corners lively.
  for (const [x, y] of [[76, 96], [1046, 648], [1044, 96], [78, 648]]) {
    pixelPolygon(ctx, [[x - 11, y - 14], [x + 11, y - 14], [x + 13, y + 8], [x - 13, y + 8]], '#8a5a34', '#221812', true);
    pixelPolygon(ctx, [[x - 11, y - 14], [x + 11, y - 14], [x + 11, y - 11], [x - 11, y - 11]], '#a8743f', null);
    pixelPolygon(ctx, [[x - 13, y - 6], [x + 13, y - 6], [x + 13, y - 2], [x - 13, y - 2]], '#5c4226', '#221812', false);
    pixelPolygon(ctx, [[x - 13, y + 2], [x + 13, y + 2], [x + 13, y + 6], [x - 13, y + 6]], '#5c4226', '#221812', false);
    pixelPolygon(ctx, [[x - 9, y - 12], [x - 6, y - 12], [x - 6, y + 7], [x - 9, y + 7]], '#b8854a', null);
  }
  for (const [x, y] of [[488, 247], [300, 420], [476, 58], [860, 300]]) {
    pixelPolygon(ctx, [[x - 5, y], [x + 5, y - 3], [x + 9, y + 2], [x + 4, y + 7], [x - 7, y + 5]], '#8e8173', '#354359');
    pixelPolygon(ctx, [[x - 3, y], [x + 2, y - 2], [x + 5, y], [x + 1, y + 3]], '#c9b389');
  }
  const grave = surface(20, 20), gc = grave.getContext('2d');
  pixelPolygon(gc, [[5, 17], [6, 5], [9, 2], [13, 3], [16, 7], [15, 17]], '#98a7b5', '#263951');
  pixelOval(gc, 11, 9, 4, 4, '#e7dfb9', '#465366');
  gc.fillStyle = '#263951'; gc.fillRect(9, 8, 1, 2); gc.fillRect(12, 8, 1, 2); gc.fillRect(10, 11, 2, 1);
  const poses = { idle: 2, walk: 4, attack: 3, dodge: 2, hurt: 1 };
  const heroes = Object.fromEntries(['barbarian', 'mage', 'archer'].map(id => [id,
    Object.fromEntries(Object.entries(poses).map(([pose, count]) => [pose, Array.from({ length: count }, (_, frame) => variants(heroSprite(id, frame, pose)))]))]));
  const orc = Object.fromEntries(Object.entries({ idle: 2, windup: 2, overhead: 2, slam: 1, recover: 1, dead: 1 })
    .map(([pose, count]) => [pose, Array.from({ length: count }, (_, frame) => variants(orcSprite(pose, frame)))]));
  const glow = surface(81, 81), glowCtx = glow.getContext('2d');
  for (let r = 39; r >= 7; r -= 8) { glowCtx.globalAlpha = 0.045; pixelOval(glowCtx, 40, 40, r, r, '#ffc566'); }
  glowCtx.globalAlpha = 1;
  return { floor, heroes, orc, grave, glow, flames: Array.from({ length: 4 }, (_, frame) => flameSprite(frame)),
    rocks: Array.from({ length: 4 }, (_, frame) => rockSprite(frame)), smoke: Array.from({ length: 6 }, (_, frame) => smokeSprite(frame)),
    stars: [starSprite(false), starSprite(true)],
    torches: [{ x: 360, y: 152 }, { x: 760, y: 152 }, { x: 360, y: 568 }, { x: 760, y: 568 }] };
}

const GLYPHS = {
  A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110', E: '111100110100111', F: '111100110100100',
  G: '011100101101011', H: '101101111101101', I: '111010010010111', J: '001001001101010', K: '101101110101101', L: '100100100100111',
  M: '101111111101101', N: '101111111111101', O: '010101101101010', P: '110101110100100', Q: '010101101111011', R: '110101110101101',
  S: '011100010001110', T: '111010010010010', U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101',
  Y: '101101010010010', Z: '111001010100111', '0': '111101101101111', '1': '010110010010111', '2': '110001010100111', '3': '110001010001110',
  '4': '101101111001001', '5': '111100110001110', '6': '011100111101111', '7': '111001010010010', '8': '111101111101111', '9': '111101111001110',
  '?': '110001010000010', '-': '000000111000000', '.': '000000000000010', ' ': '000000000000000',
};
export function pixelText(ctx, text, x, y, color = '#f4e9c9') {
  const value = String(text).toUpperCase().slice(0, 20);
  let at = Math.round(x - (value.length * 4 - 1) / 2);
  ctx.fillStyle = color;
  for (const letter of value) {
    const glyph = GLYPHS[letter] || GLYPHS['?'];
    for (let i = 0; i < 15; i++) if (glyph[i] === '1') ctx.fillRect(at + i % 3, Math.round(y) + Math.floor(i / 3), 1, 1);
    at += 4;
  }
}

export function pixelViewport(width, height) {
  const scale = Math.max(1, Math.ceil(width / (WIDTH / ART_UNIT)), Math.ceil(height / (HEIGHT / ART_UNIT)));
  return { scale, width: Math.ceil(width / scale), height: Math.ceil(height / scale) };
}
