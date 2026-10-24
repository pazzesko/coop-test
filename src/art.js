// Every world asset is authored on this same grid: 1 art pixel = 2 world units.
// Sprites are never individually resized, rotated, or drawn at fractional pixels.
import { WIDTH, HEIGHT, WALLS } from './world.js';

export const ART_UNIT = 2;
const PALETTE = { outline: '#121727', skin: '#c88e78', skinLight: '#f1c6a0', leather: '#584252', gold: '#d3ac79', steel: '#c7d5dc' };

function surface(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  return canvas;
}

function painter(canvas) {
  const ctx = canvas.getContext('2d');
  return (x, y, w, h, color) => { ctx.fillStyle = color; ctx.fillRect(x, y, w, h); };
}

export function heroSprite(id, frame = 0, pose = 'idle') {
  const canvas = surface(32, 40), paint = painter(canvas);
  const { outline: o, skin: s, skinLight: l, leather: b, gold: g, steel: st } = PALETTE;
  const attack = pose === 'attack', strike = attack && frame === 1, prep = attack && frame === 0;
  const crouch = pose === 'dodge' ? 7 : pose === 'hurt' ? 2 : 0;
  const bob = pose === 'walk' ? [0, -1, 0, 1][frame % 4] : pose === 'idle' ? -frame : 0;
  const lean = strike ? 2 : prep || pose === 'hurt' ? -1 : 0;
  const p = (x, y, w, h, color) => paint(x + lean, y + bob + crouch, w, h, color);
  const cloth = id === 'mage' ? '#45436c' : id === 'archer' ? '#315752' : '#793f54';
  const edge = id === 'mage' ? '#9b99c6' : id === 'archer' ? '#82a59a' : '#c57879';
  // Split cloak, weighted legs, and asymmetric armor replace the old paper-doll.
  p(7, 14, 17, 16 - crouch, o); p(8, 15, 14, 14 - crouch, cloth);
  p(8, 16, 2, 11 - crouch, edge); p(10, 28 - crouch, 3, 4, cloth); p(19, 27 - crouch, 4, 4, cloth);
  const stride = pose === 'walk' ? [0, 2, 0, -2][frame % 4] : strike ? -1 : 0;
  paint(11 + lean, 29 + stride, 5, 8 - stride, o); paint(20 + lean, 29 - stride, 5, 8 + stride, o);
  paint(12 + lean, 30 + stride, 3, 5 - stride, '#596576'); paint(21 + lean, 30 - stride, 3, 5 + stride, '#343e55');
  paint(10 + lean, 36, 7, 3, '#20283a'); paint(20 + lean, 36, 7, 3, '#20283a');
  paint(10 + lean, 36, 5, 1, '#7b899a'); paint(21 + lean, 36, 4, 1, '#606e83');
  p(11, 14, 12, 16 - crouch, o); p(12, 15, 10, 12 - crouch, '#364354'); p(12, 16, 3, 9 - crouch, '#728593');
  p(12, 27 - crouch, 11, 3, b); p(17, 27 - crouch, 3, 2, g);
  p(12, 5, 11, 10, o); p(13, 6, 9, 8, s); p(14, 6, 5, 4, l); p(19, 10, 2, 1, '#171b2e');
  p(14, 12, 6, 2, '#704252');
  if (id === 'barbarian') {
    p(11, 4, 13, 4, o); p(12, 4, 11, 3, '#71818e'); p(13, 4, 6, 1, st);
    p(10, 3, 3, 3, g); p(8, 1, 3, 3, '#e1cf9c'); p(22, 3, 3, 3, g); p(25, 1, 2, 3, '#e1cf9c');
    p(14, 13, 7, 3, '#67434a'); p(15, 14, 5, 3, '#8d5e4e');
    p(8, 15, 5, 5, '#9aa8ac'); p(9, 15, 4, 1, '#e0ded0'); p(22, 15, 5, 5, '#697585');
    for (let row = 18; row < 26 - crouch; row += 2) for (let x = 15; x < 21; x += 2) p(x, row, 1, 1, '#a1a6a3');
    if (prep) {
      p(5, 7, 3, 16, '#261d31'); p(6, 8, 1, 14, '#ae7c5e');
      p(1, 3, 12, 7, o); p(2, 4, 10, 5, '#859cad'); p(2, 4, 3, 4, '#e3e2ce'); p(7, 16, 5, 4, l);
    } else if (strike) {
      p(22, 17, 7, 4, '#b4bec0'); p(24, 18, 4, 3, l); p(27, 10, 2, 19, '#b98761');
      p(25, 8, 7, 10, o); p(26, 9, 6, 8, '#93b5c2'); p(29, 9, 3, 8, '#f2e9ca');
    } else {
      p(23, 19, 5, 6, '#87949b'); p(24, 22, 3, 3, s); p(27, 19, 2, 17, '#ad7d60');
      p(23, 14, 9, 8, o); p(24, 15, 8, 6, '#87a1af'); p(29, 15, 3, 6, '#e4dfc4');
    }
  } else if (id === 'mage') {
    p(10, 15, 15, 15 - crouch, '#363650'); p(11, 16, 3, 12 - crouch, '#7878ac'); p(19, 16, 3, 13 - crouch, '#515882');
    p(16, 18, 2, 8 - crouch, '#c7b38d'); p(14, 23 - crouch, 6, 1, '#8994b9');
    p(11, 5, 13, 4, o); p(12, 3, 11, 4, '#5e6390'); p(14, 1, 7, 4, '#8b8ab2'); p(17, 0, 4, 3, '#b6aec8');
    p(9, 8, 17, 2, '#b9a3b6'); p(14, 12, 7, 4, '#aeb8bc'); p(16, 14, 3, 4, '#dbd7c7');
    const sx = prep ? 23 : strike ? 29 : 27, sy = prep ? 0 : strike ? 11 : 9;
    p(sx, sy + 7, 2, 23 - sy, '#ad8a72'); p(sx - 3, sy, 8, 8, '#222d48'); p(sx - 2, sy + 1, 6, 6, '#5fa9b4');
    p(sx - 1, sy + 2, 4, 3, '#a8e6d8'); p(sx, sy + 2, 2, 2, '#f3f5d3');
    p(strike ? 22 : 8, strike ? 17 : 20, strike ? 9 : 5, 4, '#a9b4ce'); p(strike ? 28 : 8, strike ? 17 : 23, 3, 3, l);
  } else {
    p(11, 3, 13, 8, o); p(12, 3, 11, 5, '#385a59'); p(14, 2, 6, 3, '#78948b'); p(10, 8, 4, 8, '#426c66');
    p(13, 15, 10, 13 - crouch, '#3d5b5b'); p(14, 16, 3, 10 - crouch, '#7b9990'); p(19, 15, 2, 13 - crouch, '#ad8a71');
    p(12, 14, 11, 3, '#8e4a5c'); p(9, 15, 5, 3, '#bf7c83');
    const bx = strike ? 29 : 27;
    p(bx - 2, 9, 2, 3, g); p(bx, 12, 1, 3, g); p(bx + 1, 15, 1, 8, '#d4c69e'); p(bx, 23, 1, 3, g); p(bx - 2, 26, 2, 3, g);
    const pull = prep ? 20 : bx - 1;
    for (let i = 0; i < 8; i++) { p(Math.round(pull + (bx - 1 - pull) * i / 8), 18 - i, 1, 1, '#d7d7c7'); p(Math.round(pull + (bx - 1 - pull) * i / 8), 18 + i, 1, 1, '#d7d7c7'); }
    p(prep ? 17 : 21, 18, prep ? 6 : 7, 3, '#a1b7b3'); p(prep ? 18 : 26, 18, 3, 2, l);
    if (!strike) { p(18, 19, 13, 1, '#d8d7bc'); p(29, 18, 2, 3, '#efdfbd'); }
  }
  if (pose === 'dodge') {
    // Low, compressed silhouette; no arbitrary rotation of pixel artwork.
    paint(7 + frame * 2, 33, 17, 4, '#a9b5bf'); paint(8 + frame * 2, 34, 13, 2, cloth);
  }
  return canvas;
}

function orcSprite(pose = 'idle', frame = 0) {
  const canvas = surface(80, 88), paint = painter(canvas);
  const o = '#101525', dark = '#284c4a', green = '#527c68', light = '#9bb18b', armor = '#303044', iron = '#8b9aa6';
  const crouch = pose === 'slam' ? 7 : pose === 'recover' ? 4 : pose === 'dead' ? 9 : 0;
  const bob = pose === 'idle' ? -frame : pose === 'windup' ? -frame - 2 : pose === 'overhead' ? -3 - frame : 0;
  const p = (x, y, w, h, color) => paint(x, y + bob + crouch, w, h, color);
  paint(16, 67, 13, 14, o); paint(42, 67, 13, 14, o); paint(18, 68, 9, 8, dark); paint(44, 68, 9, 8, dark);
  paint(13, 77, 18, 7, '#262b3d'); paint(40, 77, 18, 7, '#262b3d'); paint(14, 77, 16, 2, '#7c8490'); paint(41, 77, 15, 2, '#626c7f');
  p(12, 30, 47, 39 - crouch, o); p(14, 32, 43, 33 - crouch, dark); p(17, 33, 36, 26 - crouch, green);
  p(18, 33, 9, 22 - crouch, light); p(29, 36, 16, 5, '#759881'); p(31, 44, 14, 3, dark);
  p(7, 33, 11, 23 - crouch, o); p(9, 35, 8, 19 - crouch, green); p(10, 36, 3, 12, '#8ca989');
  p(51, 32, 12, 24 - crouch, o); p(53, 34, 9, 21 - crouch, green); p(54, 34, 4, 13, '#8ca989');
  p(7, 30, 15, 10, armor); p(8, 29, 14, 4, iron); p(9, 29, 8, 1, '#d6d8c4');
  p(48, 28, 15, 13, armor); p(49, 28, 13, 4, iron); p(54, 24, 4, 6, '#d8d5b6'); p(60, 29, 5, 4, '#b9c1b3');
  p(14, 56 - crouch, 43, 13, armor); p(16, 57 - crouch, 39, 4, '#625365'); p(27, 57 - crouch, 12, 8, '#c6a77d'); p(30, 59 - crouch, 6, 4, '#514151');
  p(20, 65 - crouch, 8, 8, '#794353'); p(43, 65 - crouch, 9, 7, '#794353');
  for (let i = 0; i < 7; i++) p(16 + i * 6, 60 - crouch, 1, 1, '#d2c9a4');
  p(21, 9, 29, 24, o); p(23, 11, 25, 21, dark); p(24, 12, 22, 16, green); p(25, 12, 8, 10, light);
  p(16, 16, 9, 9, o); p(17, 17, 7, 6, '#708a6d'); p(47, 15, 9, 9, o); p(48, 16, 7, 5, '#708a6d');
  p(22, 7, 27, 6, '#353044'); p(27, 4, 17, 5, '#171b2b'); p(31, 2, 4, 6, '#774455');
  p(24, 18, 9, 3, '#1b343c'); p(39, 17, 8, 3, '#1b343c');
  p(26, 21, 5, 2, pose === 'dead' ? '#22313c' : '#eac381'); p(40, 20, 5, 2, pose === 'dead' ? '#22313c' : '#eac381');
  p(29, 21, 1, 2, '#321e31'); p(40, 20, 1, 2, '#321e31');
  p(31, 25, 10, 3, '#2b4947'); p(27, 29, 18, 5, '#171b2b'); p(28, 27, 4, 7, '#e7d9ac'); p(41, 26, 4, 7, '#e7d9ac'); p(34, 31, 3, 2, '#b99a88');
  // Authored mace poses: lift → hold overhead → drive down → recover.
  const mx = pose === 'slam' ? 63 : pose === 'overhead' ? 61 : 66;
  const my = pose === 'slam' ? 65 : pose === 'overhead' ? 5 + frame : pose === 'windup' ? 19 : pose === 'recover' ? 51 : 35;
  if (pose === 'slam') for (let i = 0; i < 17; i++) paint(46 + i, 48 + i, 3, 3, i % 3 === 0 ? '#c5ae8b' : '#6c5763');
  else { paint(mx - 2, my + 10, 4, 30, o); paint(mx - 1, my + 11, 2, 28, '#b29a7e'); paint(mx - 1, my + 14, 1, 23, '#dfc398'); }
  paint(mx - 10, my - 2, 21, 20, o); paint(mx - 9, my - 1, 19, 16, '#5b6c80'); paint(mx - 8, my, 7, 13, '#a4b8be');
  paint(mx - 8, my, 4, 2, '#e2e0c5'); paint(mx + 4, my + 3, 5, 8, '#334158'); paint(mx - 2, my + 5, 4, 4, '#be9c79');
  paint(mx - 13, my + 4, 4, 6, '#bec9c7'); paint(mx - 3, my - 6, 6, 5, '#d8dcc9'); paint(mx + 10, my + 4, 4, 6, '#a7b9c1'); paint(mx - 3, my + 17, 6, 4, '#a7b9c1');
  if (pose === 'overhead' || pose === 'windup') p(53, 35, 10, 8, '#8eaa8b');
  else p(52, 49 - crouch, 10, 7, '#8eaa8b');
  return canvas;
}

function variants(canvas) {
  const left = surface(canvas.width, canvas.height), lc = left.getContext('2d');
  lc.translate(canvas.width, 0); lc.scale(-1, 1); lc.drawImage(canvas, 0, 0);
  const tint = source => {
    const result = surface(source.width, source.height), ctx = result.getContext('2d');
    // Brighten the original shading rather than obscuring an attack pose with a
    // solid white silhouette. Alpha stays on the authored pixel mask.
    ctx.drawImage(source, 0, 0); ctx.globalCompositeOperation = 'source-atop'; ctx.globalAlpha = 0.5;
    ctx.fillStyle = '#fff0d3'; ctx.fillRect(0, 0, result.width, result.height);
    return result;
  };
  return { right: canvas, left, flashRight: tint(canvas), flashLeft: tint(left) };
}

function flameSprite(frame) {
  const canvas = surface(16, 28), p = painter(canvas);
  p(3, 23, 11, 4, '#151a2b'); p(5, 19, 7, 6, '#586277'); p(3, 17, 11, 3, '#9f8b7c'); p(4, 19, 9, 1, '#d5b28d');
  p(4, 9, 8, 8, '#a14551'); p(5, 6 + frame % 2, 6, 10, '#df7652'); p(7, 3 + frame, 3, 11 - frame, '#eeb66d');
  p(6, 10, 5, 6, '#f3d99b'); p(8, 12, 2, 4, '#fff2bf'); p(frame % 2 ? 3 : 12, 6 + frame * 2, 1, 2, '#edb67a');
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
      p(x, y, 16, 16, '#1d2335'); p(x + 1, y + 1, 14, 14, ['#2b3147', '#2d3349', '#2a3044', '#2c3247', '#2e3449'][tone]);
      p(x + 2, y + 1, 12, 1, '#3d455a'); p(x + 2, y + 14, 12, 1, '#23293d');
      if (tone === 0) { p(x + 8, y + 5, 1, 4, '#1e2638'); p(x + 6, y + 8, 3, 1, '#1e2638'); }
      if (tone === 3) { p(x + 2, y + 11, 3, 2, '#3e5151'); p(x + 3, y + 10, 1, 1, '#526663'); }
      if (tone === 2) { p(x + 11, y + 3, 1, 1, '#465065'); p(x + 4, y + 10, 2, 1, '#343e52'); }
    }
  }
  // An etched central fighting ring, in the same source pixels as the tiles.
  pixelRing(floor.getContext('2d'), 280, 180, 113, '#65536b', 1);
  pixelRing(floor.getContext('2d'), 280, 180, 108, '#45405c', 1);
  for (let i = 0; i < 12; i++) {
    const angle = i * Math.PI / 6, x = Math.round(280 + Math.cos(angle) * 110), y = Math.round(180 + Math.sin(angle) * 110);
    p(x - 1, y - 2, 1, 5, '#9b7b84'); p(x - 2, y - 1, 5, 1, '#9b7b84'); p(x + 1, y, 1, 2, '#9b7b84');
  }
  for (const wall of WALLS) {
    const x = Math.floor(wall.x / 2), y = Math.floor(wall.y / 2), w = Math.floor(wall.w / 2), h = Math.floor(wall.h / 2);
    p(x, y, w, h, '#121a2c'); p(x + 1, y + 1, w - 2, h - 3, '#434c64'); p(x + 1, y + 1, w - 2, 2, '#8290a1');
    p(x + 2, y + 3, w - 4, 1, '#626e86');
    for (let by = y + 4; by < y + h - 2; by += 8) {
      for (let bx = x + 2; bx < x + w - 2; bx += 16) {
        p(bx, by, Math.min(14, x + w - 2 - bx), 1, '#242b42');
        p(bx + 3, by + 1, 1, Math.min(6, y + h - 2 - by), '#2d364d');
      }
    }
  }
  // Original gothic courtyard details: scattered bones, thorn roots and runes.
  for (const [x, y] of [[58, 65], [488, 245], [64, 300], [476, 61]]) {
    p(x, y, 5, 4, '#9a97a2'); p(x + 1, y + 1, 1, 1, '#20263c'); p(x + 3, y + 1, 1, 1, '#20263c'); p(x + 1, y + 4, 3, 1, '#706a80');
    p(x - 4, y + 7, 13, 1, '#706a80'); p(x - 3, y + 6, 2, 3, '#9a97a2'); p(x + 6, y + 6, 2, 3, '#9a97a2');
  }
  const grave = surface(20, 20), g = painter(grave);
  g(2, 15, 16, 3, '#171e32'); g(7, 2, 7, 15, '#626a83'); g(5, 5, 11, 3, '#a3a4b2'); g(9, 4, 2, 10, '#272e46'); g(8, 2, 2, 1, '#cdc8b9');
  const poses = { idle: 2, walk: 4, attack: 3, dodge: 2, hurt: 1 };
  const heroes = Object.fromEntries(['barbarian', 'mage', 'archer'].map(id => [id,
    Object.fromEntries(Object.entries(poses).map(([pose, count]) => [pose, Array.from({ length: count }, (_, frame) => variants(heroSprite(id, frame, pose)))]))]));
  const orc = Object.fromEntries(Object.entries({ idle: 2, windup: 2, overhead: 2, slam: 1, recover: 1, dead: 1 })
    .map(([pose, count]) => [pose, Array.from({ length: count }, (_, frame) => variants(orcSprite(pose, frame)))]));
  const glow = surface(81, 81), gc = glow.getContext('2d');
  for (let radius = 39; radius >= 7; radius -= 8) {
    gc.globalAlpha = 0.04; gc.fillStyle = '#edae70';
    for (let y = -radius; y <= radius; y++) { const extent = Math.floor(Math.sqrt(radius * radius - y * y)); gc.fillRect(40 - extent, 40 + y, extent * 2 + 1, 1); }
  }
  return { floor, heroes, orc, grave, glow, flames: Array.from({ length: 4 }, (_, frame) => flameSprite(frame)),
    torches: [{ x: 180, y: 76 }, { x: 380, y: 76 }, { x: 180, y: 284 }, { x: 380, y: 284 }] };
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

export function pixelLine(ctx, x0, y0, x1, y1, color) {
  if (![x0, y0, x1, y1].every(Number.isFinite) || Math.abs(x1 - x0) + Math.abs(y1 - y0) > 2048) return;
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
  const dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
  let error = dx + dy;
  ctx.fillStyle = color;
  while (true) {
    ctx.fillRect(x0, y0, 1, 1);
    if (x0 === x1 && y0 === y1) break;
    const twice = 2 * error;
    if (twice >= dy) { error += dy; x0 += sx; }
    if (twice <= dx) { error += dx; y0 += sy; }
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
