import { pixelLine, pixelPolygon } from './pixel.js';

const cache = new Map();
export function groundLayout(id, radius) {
  const key = `${id}:${radius}`;
  if (cache.has(key)) return cache.get(key);
  let seed = (id * 1103515245 + 12345) >>> 0;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const r = radius / 2;
  const patch = Array.from({ length: 16 }, (_, i) => {
    const angle = i * Math.PI / 8, reach = r * (0.94 + random() * 0.09);
    return [Math.round(Math.cos(angle) * reach), Math.round(Math.sin(angle) * reach)];
  });
  const count = Math.min(44, Math.max(22, Math.round(r * 0.52)));
  const stones = Array.from({ length: count }, (_, i) => {
    const angle = i * 2.39996 + random() * 0.25;
    const reach = Math.sqrt((i + 0.5) / count) * (r - 3);
    return { x: Math.round(Math.cos(angle) * reach), y: Math.round(Math.sin(angle) * reach), phase: random() * Math.PI * 2, frame: i % 4 };
  });
  const cracks = Array.from({ length: 9 }, (_, i) => {
    const angle = i * Math.PI * 2 / 9 + random() * 0.25;
    return Array.from({ length: 5 }, (_, step) => {
      const reach = r * step / 4 * (step === 4 ? 0.93 : 1);
      const bend = step === 0 ? 0 : (random() - 0.5) * 9;
      return [Math.round(Math.cos(angle) * reach - Math.sin(angle) * bend), Math.round(Math.sin(angle) * reach + Math.cos(angle) * bend)];
    });
  });
  const result = { patch, stones, cracks, radius: r };
  if (cache.size >= 32) cache.delete(cache.keys().next().value);
  cache.set(key, result);
  return result;
}

export function drawGround(ctx, art, zone, time, reduced = false, scar = false) {
  const layout = groundLayout(zone.source || zone.id, zone.r);
  const x = Math.round(zone.x / 2), y = Math.round(zone.y / 2);
  const remaining = zone.hitAt - time;
  const age = Math.max(0, time - zone.hitAt);
  if (scar && age > 1.2) return;
  const urgency = Math.max(0, Math.min(1, 1 - remaining / 1.5));
  const impacted = remaining <= 0;
  const fade = scar ? Math.max(0, 1 - age / 1.2) : 1;
  ctx.save();
  const phase = impacted ? 2 : remaining < 0.35 ? 1 : 0;
  // Cache the crack/patch pixel raster; only stones and dust animate each frame.
  // The fallback also keeps the renderer testable without a browser DOM.
  if (typeof document !== 'undefined') {
    layout.layers ||= {};
    if (!layout.layers[phase]) {
      const offset = Math.ceil(layout.radius) + 5;
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = offset * 2;
      paintBase(canvas.getContext('2d'), layout, offset, offset, phase);
      layout.layers[phase] = { canvas, offset };
    }
    const layer = layout.layers[phase];
    ctx.globalAlpha = fade;
    ctx.drawImage(layer.canvas, x - layer.offset, y - layer.offset);
  } else {
    paintBase(ctx, layout, x, y, phase, fade);
  }
  ctx.globalAlpha = fade;
  for (const stone of layout.stones) {
    const tremor = reduced || impacted ? 0 : Math.round(Math.sin(time * (14 + urgency * 12) + stone.phase) * urgency);
    const lift = impacted ? Math.max(0, Math.round((1 - age / 0.4) * 5)) : Math.round(urgency * (1 + (Math.sin(stone.phase) + 1)));
    const sx = x + stone.x, sy = y + stone.y;
    ctx.fillStyle = '#202c3c'; ctx.globalAlpha = 0.5 * fade;
    ctx.fillRect(sx - 3, sy + 2, 7, 2);
    ctx.globalAlpha = fade;
    ctx.drawImage(art.rocks[stone.frame], sx - 4 + tremor, sy - 4 - lift);
    // Tiny dust leaks before impact; urgency stays readable with reduced motion.
    if (!scar && (stone.frame === 0 || remaining < 0.25) && remaining > 0) {
      ctx.globalAlpha = 0.22;
      ctx.drawImage(art.smoke[remaining < 0.3 ? 2 : 0], sx - 12, sy - 15 - lift);
      ctx.globalAlpha = fade;
    }
  }
  ctx.restore();
}

function paintBase(ctx, layout, x, y, phase, fade = 1) {
  // A low-contrast, jagged patch of disturbed paving, not a circle outline.
  ctx.globalAlpha = [0.17, 0.26, 0.38][phase] * fade;
  pixelPolygon(ctx, layout.patch.map(([dx, dy]) => [x + dx, y + dy]), phase === 2 ? '#242a3e' : '#a56c43');
  ctx.globalAlpha = fade;
  for (const crack of layout.cracks) for (let i = 1; i < crack.length; i++) {
    const a = crack[i - 1], b = crack[i];
    pixelLine(ctx, x + a[0], y + a[1], x + b[0], y + b[1], '#26303e');
    pixelLine(ctx, x + a[0] + 1, y + a[1], x + b[0] + 1, y + b[1], phase === 2 ? '#aaa38e' : phase === 1 ? '#ffc176' : '#b9a17e');
  }
}
