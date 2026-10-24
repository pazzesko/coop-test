// Every world asset is authored on this same grid: 1 art pixel = 2 world units.
// Sprites are never individually resized, rotated, or drawn at fractional pixels.
import { WIDTH, HEIGHT, WALLS } from './world.js';

export const ART_UNIT = 2;
const PALETTE = { outline: '#181a22', skin: '#e2b58c', skinLight: '#f2d1a1', leather: '#76513a', gold: '#d8b36b', steel: '#c5d4d2' };

function surface(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  return canvas;
}

function painter(canvas) {
  const ctx = canvas.getContext('2d');
  return (x, y, w, h, color) => { ctx.fillStyle = color; ctx.fillRect(x, y, w, h); };
}

export function heroSprite(id, frame = 0) {
  const canvas = surface(24, 28);
  const p = painter(canvas);
  const { outline: o, skin: s, skinLight: l, leather: b, gold: g, steel: st } = PALETTE;
  const leg = frame ? 1 : 0;
  p(7, 22, 5, 5 - leg, o); p(13, 22 + leg, 5, 5 - leg, o);
  p(8, 22, 3, 3 - leg, b); p(14, 22 + leg, 3, 3 - leg, b);
  p(6, 12, 13, 11, o); p(7, 13, 11, 9, b);
  p(7, 5, 11, 9, o); p(8, 6, 9, 7, s); p(8, 6, 3, 4, l);
  p(10, 9, 1, 2, o); p(15, 9, 1, 2, o);
  if (id === 'barbarian') {
    p(8, 3, 9, 4, o); p(8, 4, 9, 3, '#895843'); p(10, 3, 5, 2, '#c08b57');
    p(5, 4, 3, 3, g); p(4, 2, 2, 3, '#ecd6a0'); p(17, 4, 3, 3, g); p(19, 2, 2, 3, '#ecd6a0');
    p(4, 12, 4, 8, o); p(5, 13, 3, 6, s); p(17, 12, 4, 8, o); p(18, 13, 2, 6, s);
    p(7, 14, 11, 4, s); p(10, 13, 2, 8, '#a86d49'); p(8, 20, 9, 3, '#a47948'); p(11, 21, 3, 2, g);
    p(2, 11, 2, 14, o); p(3, 12, 1, 12, b); p(0, 8, 7, 6, o); p(1, 8, 5, 4, st); p(1, 8, 2, 3, '#f1e9d3');
  } else if (id === 'mage') {
    p(5, 13, 14, 11, o); p(6, 14, 12, 9, '#655194'); p(8, 15, 2, 7, '#9981c5'); p(11, 14, 2, 10, '#c0a3e8');
    p(7, 5, 11, 3, o); p(8, 3, 9, 4, '#7662a4'); p(10, 1, 5, 3, '#9981c5'); p(11, 0, 3, 2, '#c0a3e8');
    p(5, 7, 15, 2, o); p(6, 7, 13, 1, '#c0a3e8'); p(10, 12, 5, 3, '#e0dbcc');
    p(3, 13, 4, 6, '#9981c5'); p(4, 18, 3, 2, s); p(19, 9, 2, 17, o); p(20, 10, 1, 15, b);
    p(17, 5, 6, 6, o); p(18, 5, 4, 5, '#ed8e6e'); p(19, 6, 2, 2, '#ffe4a6');
  } else {
    p(6, 12, 13, 11, o); p(7, 13, 11, 9, '#577a4f'); p(8, 14, 3, 6, '#8fa66a'); p(13, 13, 2, 9, b);
    p(7, 3, 11, 6, o); p(8, 3, 9, 4, '#577a4f'); p(10, 2, 5, 3, '#8fa66a'); p(6, 7, 3, 6, '#577a4f');
    p(4, 13, 4, 7, '#577a4f'); p(5, 18, 3, 2, s); p(16, 16, 4, 3, s); p(8, 21, 9, 2, b); p(11, 21, 2, 2, g);
    p(19, 7, 2, 3, g); p(21, 10, 1, 4, g); p(22, 14, 1, 5, g); p(21, 19, 1, 4, g); p(19, 23, 2, 2, g);
    p(19, 9, 1, 15, '#d9c9a4'); p(17, 16, 7, 1, st); p(22, 15, 2, 3, '#e8dfbd');
  }
  return canvas;
}

function orcSprite(raised) {
  const canvas = surface(52, 58);
  const p = painter(canvas);
  const o = '#172020', dark = '#344c37', green = '#78945c', light = '#a5b96d', armor = '#604b43', iron = '#a3aaa1';
  p(12, 45, 11, 11, o); p(28, 45, 10, 11, o); p(13, 46, 9, 6, dark); p(29, 46, 8, 6, dark);
  p(10, 52, 14, 5, '#463a36'); p(27, 52, 14, 5, '#463a36'); p(10, 55, 14, 2, o); p(27, 55, 14, 2, o);
  p(9, 23, 31, 25, o); p(11, 24, 27, 22, dark); p(13, 25, 23, 18, green); p(13, 26, 7, 13, light);
  p(5, 22, 10, 16, o); p(6, 24, 8, 12, green); p(6, 25, 3, 8, light);
  p(35, 22, 10, 16, o); p(37, 23, 7, 12, green); p(38, 24, 3, 6, light);
  p(9, 23, 8, 7, armor); p(8, 22, 10, 3, iron); p(32, 22, 10, 7, armor); p(32, 22, 10, 3, iron);
  p(11, 39, 27, 8, armor); p(13, 40, 23, 3, '#91715a'); p(21, 40, 8, 5, '#c0a66d'); p(23, 41, 4, 3, '#5c4b38');
  p(15, 4, 19, 20, o); p(17, 6, 15, 16, green); p(18, 7, 6, 8, light);
  p(11, 10, 7, 7, o); p(12, 11, 5, 4, dark); p(32, 10, 6, 7, o); p(33, 11, 4, 4, dark);
  p(17, 3, 15, 5, '#463a36'); p(20, 2, 11, 3, o); p(18, 10, 5, 2, dark); p(27, 10, 5, 2, dark);
  p(19, 12, 3, 2, '#efbc65'); p(28, 12, 3, 2, '#efbc65'); p(20, 12, 1, 2, o); p(28, 12, 1, 2, o);
  p(21, 16, 9, 3, dark); p(19, 19, 13, 3, o); p(19, 17, 3, 5, '#e5dfbe'); p(29, 17, 3, 5, '#e5dfbe');
  // The mace is drawn on the same grid as the orc, never a scaled-up icon.
  const y = raised ? 0 : 11;
  p(42, y + 13, 3, 29, o); p(43, y + 14, 1, 26, '#b99a68');
  p(36, y + 3, 15, 14, o); p(37, y + 4, 13, 11, '#79847f'); p(38, y + 5, 5, 8, '#b3b9ad');
  p(35, y + 7, 3, 5, '#c3c6b5'); p(41, y, 5, 4, '#c3c6b5'); p(48, y + 7, 4, 5, '#c3c6b5'); p(41, y + 15, 5, 3, '#c3c6b5');
  p(40, 33, 6, 5, green);
  return canvas;
}

export function actionIcon(kind) {
  const canvas = surface(20, 20), p = painter(canvas);
  if (kind === 'dodge') {
    p(3, 8, 11, 4, '#c5dcdd'); p(10, 4, 4, 12, '#c5dcdd'); p(14, 6, 2, 8, '#c5dcdd'); p(16, 8, 2, 4, '#c5dcdd');
    p(1, 4, 4, 2, '#6c92a0'); p(0, 14, 5, 2, '#6c92a0');
  } else if (kind === 'mage') {
    p(7, 2, 5, 3, '#ffe7ae'); p(4, 5, 11, 10, '#e68b62'); p(2, 8, 15, 5, '#e68b62'); p(6, 7, 7, 7, '#ffd38d'); p(8, 9, 3, 3, '#fff1c5'); p(4, 15, 3, 3, '#a85a53');
  } else if (kind === 'archer') {
    p(11, 2, 3, 3, '#dab77e'); p(14, 5, 2, 10, '#dab77e'); p(11, 15, 3, 3, '#dab77e'); p(11, 4, 1, 12, '#c5dcdd'); p(1, 9, 17, 2, '#c5dcdd'); p(15, 7, 2, 6, '#c5dcdd');
  } else {
    for (let i = 0; i < 10; i++) p(5 + i, 13 - i, 3, 3, '#d3dfd7');
    p(3, 12, 8, 3, '#d5b57b'); p(5, 13, 3, 6, '#a97d58'); p(3, 17, 3, 3, '#d5b57b');
  }
  return canvas;
}

export function createArt() {
  const floor = surface(WIDTH / ART_UNIT, HEIGHT / ART_UNIT);
  const p = painter(floor);
  for (let y = 0; y < floor.height; y += 16) {
    for (let x = 0; x < floor.width; x += 16) {
      const tone = ((x / 16 * 7 + y / 16 * 11) % 5);
      p(x, y, 16, 16, '#333a3b'); p(x + 1, y + 1, 14, 14, ['#424a48', '#454c49', '#3e4745', '#414947', '#474d49'][tone]);
      p(x + 2, y + 1, 12, 1, '#515951'); p(x + 2, y + 14, 12, 1, '#303936');
      if (tone === 0) { p(x + 8, y + 5, 1, 4, '#353f39'); p(x + 6, y + 8, 3, 1, '#353f39'); }
      if (tone === 3) { p(x + 2, y + 11, 3, 2, '#53614b'); p(x + 3, y + 10, 1, 1, '#697457'); }
    }
  }
  // An etched central fighting ring, in the same source pixels as the tiles.
  pixelRing(floor.getContext('2d'), 280, 180, 113, '#6c6550', 1);
  pixelRing(floor.getContext('2d'), 280, 180, 109, '#514f41', 1);
  for (const wall of WALLS) {
    const x = Math.floor(wall.x / 2), y = Math.floor(wall.y / 2), w = Math.floor(wall.w / 2), h = Math.floor(wall.h / 2);
    p(x, y, w, h, '#1f2929'); p(x + 1, y + 1, w - 2, h - 3, '#58615a'); p(x + 1, y + 1, w - 2, 2, '#859080');
    for (let by = y + 4; by < y + h - 2; by += 8) {
      for (let bx = x + 2; bx < x + w - 2; bx += 16) {
        p(bx, by, Math.min(14, x + w - 2 - bx), 1, '#3e4943');
        p(bx + 3, by + 1, 1, Math.min(6, y + h - 2 - by), '#404a43');
      }
    }
  }
  const grave = surface(20, 16), g = painter(grave);
  g(3, 10, 14, 4, '#272f30'); g(7, 2, 7, 11, '#899085'); g(6, 4, 9, 2, '#a3aa97'); g(9, 4, 2, 7, '#4c5852');
  return { floor, heroes: Object.fromEntries(['barbarian', 'mage', 'archer'].map(id => [id, [heroSprite(id, 0), heroSprite(id, 1)]])),
    orc: [orcSprite(false), orcSprite(true)], grave };
}

export function pixelRing(ctx, x, y, radius, color, thickness = 2) {
  x = Math.round(x); y = Math.round(y); radius = Math.round(radius);
  ctx.fillStyle = color;
  for (let dy = -radius; dy <= radius; dy++) {
    const outer = Math.floor(Math.sqrt(Math.max(0, radius * radius - dy * dy)));
    const innerRadius = radius - thickness;
    const inner = Math.abs(dy) <= innerRadius ? Math.floor(Math.sqrt(Math.max(0, innerRadius * innerRadius - dy * dy))) : -1;
    if (inner < 0) ctx.fillRect(x - outer, y + dy, outer * 2 + 1, 1);
    else {
      ctx.fillRect(x - outer, y + dy, outer - inner, 1);
      ctx.fillRect(x + inner + 1, y + dy, outer - inner, 1);
    }
  }
}

// Tiny bitmap lettering: labels are source pixels too, not antialiased fonts.
const GLYPHS = {
  A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110', E: '111100110100111', F: '111100110100100',
  G: '011100101101011', H: '101101111101101', I: '111010010010111', J: '001001001101010', K: '101101110101101', L: '100100100100111',
  M: '101111111101101', N: '101111111111101', O: '010101101101010', P: '110101110100100', Q: '010101101111011', R: '110101110101101',
  S: '011100010001110', T: '111010010010010', U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101',
  Y: '101101010010010', Z: '111001010100111', '0': '111101101101111', '1': '010110010010111', '2': '110001010100111', '3': '110001010001110',
  '4': '101101111001001', '5': '111100110001110', '6': '011100111101111', '7': '111001010010010', '8': '111101111101111', '9': '111101111001110',
  '?': '110001010000010', '-': '000000111000000', '.': '000000000000010', ' ': '000000000000000',
};
export function pixelText(ctx, text, x, y, color = '#e4dfc8') {
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
