// Every asset shares one native grid: 1 source pixel = 2 world units.
import { WIDTH, HEIGHT, WALLS } from './world.js';
import { heroSprite, orcSprite } from './brawler-art.js';
import { pixelPolygon, pixelOval } from './pixel.js';
export { heroSprite, HERO_SIZE, BOSS_SIZE } from './brawler-art.js';
export { pixelLine } from './pixel.js';

export const ART_UNIT = 2;

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
  p(0, 0, floor.width, floor.height, '#354359');
  for (let y = 0; y < floor.height; y += 16) {
    for (let x = -16; x < floor.width; x += 32) {
      const at = x + (y / 16 % 2) * 16;
      const tone = ((x + 16) / 32 * 7 + y / 16 * 3) % 4;
      p(at, y, 31, 15, ['#4d6074', '#506477', '#4b5f74', '#536677'][tone]);
      p(at + 1, y + 1, 28, 1, '#788a94'); p(at + 29, y + 2, 1, 11, '#3a4b62'); p(at + 2, y + 13, 27, 1, '#40536b');
      if (tone === 1) { p(at + 8, y + 5, 3, 1, '#657b89'); p(at + 10, y + 6, 1, 3, '#3a4b62'); }
      if (tone === 3) { p(at + 22, y + 10, 4, 1, '#859398'); p(at + 23, y + 11, 2, 1, '#657985'); }
    }
  }
  // Low-contrast scuffed paving, rather than a decorative targeting ring.
  for (let i = 0; i < 38; i++) {
    const x = 40 + i * 83 % 480, y = 30 + i * 47 % 300;
    p(x, y, 2 + i % 3, 1, i % 2 ? '#78858b' : '#3f5269');
  }
  for (const wall of WALLS) {
    const x = Math.floor(wall.x / 2), y = Math.floor(wall.y / 2), w = Math.floor(wall.w / 2), h = Math.floor(wall.h / 2);
    p(x, y, w, h, '#1b293e'); p(x + 1, y + 1, w - 2, h - 3, '#6a778a'); p(x + 1, y + 1, w - 2, 2, '#bac0b3');
    p(x + 2, y + 3, w - 4, 1, '#8d9aa4');
    for (let by = y + 5; by < y + h - 2; by += 8) for (let bx = x + 2; bx < x + w - 2; bx += 16) {
      p(bx, by, Math.min(14, x + w - 2 - bx), 1, '#35465e');
      p(bx + 3, by + 1, 1, Math.min(6, y + h - 2 - by), '#41546b');
    }
  }
  // Small rubble piles and discarded shields keep the fantasy setting playful.
  for (const [x, y] of [[56, 68], [488, 247], [64, 301], [476, 58]]) {
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
  for (let r = 39; r >= 7; r -= 8) { glowCtx.globalAlpha = 0.035; pixelOval(glowCtx, 40, 40, r, r, '#ffc566'); }
  return { floor, heroes, orc, grave, glow, flames: Array.from({ length: 4 }, (_, frame) => flameSprite(frame)),
    rocks: Array.from({ length: 4 }, (_, frame) => rockSprite(frame)), smoke: Array.from({ length: 6 }, (_, frame) => smokeSprite(frame)),
    torches: [{ x: 180, y: 76 }, { x: 380, y: 76 }, { x: 180, y: 284 }, { x: 380, y: 284 }] };
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
  const scale = Math.max(2, Math.ceil(width / (WIDTH / ART_UNIT)), Math.ceil(height / (HEIGHT / ART_UNIT)));
  return { scale, width: Math.ceil(width / scale), height: Math.ceil(height / scale) };
}
