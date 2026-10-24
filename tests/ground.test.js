import test from 'node:test';
import assert from 'node:assert/strict';
import { groundLayout, drawGround } from '../src/ground.js';
import { Effects } from '../src/effects.js';
import { pixelPolygon } from '../src/pixel.js';

test('ground layouts are deterministic and the rubble stays inside the damage area', () => {
  const layout = groundLayout(12, 104);
  assert.deepEqual(groundLayout(12, 104), layout);
  assert.notDeepEqual(groundLayout(13, 104), layout);
  assert.ok(layout.stones.every(stone => Math.hypot(stone.x, stone.y) <= 52));
  assert.ok(layout.patch.every(([x, y]) => Number.isInteger(x) && Number.isInteger(y)));
  assert.ok(new Set(layout.patch.map(([x, y]) => Math.round(Math.hypot(x, y)))).size > 1);
});

test('ground warnings draw native pixel cracks, stones and dust without text or vector circles', () => {
  const coordinates = [];
  const ctx = { save() {}, restore() {}, fillRect: (...args) => coordinates.push(args), drawImage: (_, x, y) => coordinates.push([x, y, 1, 1]) };
  const art = { rocks: [1, 2, 3, 4], smoke: [1, 2, 3, 4, 5, 6] };
  // No arc(), ellipse(), stroke(), or fillText() APIs are provided at all.
  drawGround(ctx, art, { id: 12, x: 400, y: 400, r: 104, hitAt: 2 }, 1.8);
  assert.ok(coordinates.length > 100);
  assert.ok(coordinates.every(rect => rect.every(Number.isInteger)));
});

test('slams create bounded smoke and thrown rocks, then clean themselves up', () => {
  const effects = new Effects();
  effects.ingest(Array.from({ length: 20 }, (_, i) => ({ id: i + 1, source: i + 100, kind: 'slam', x: 400, y: 400, t: 1, value: 104 })), 1, 10);
  assert.ok(effects.smoke.length > 0 && effects.smoke.length <= 36);
  assert.ok(effects.scars.length <= 8);
  assert.ok(effects.particles.length <= 180 && effects.particles.every(p => p.kind === 'rock'));
  assert.equal(effects.scars.at(-1).source, 119);
  effects.update(12);
  assert.equal(effects.smoke.length, 0);
  assert.equal(effects.scars.length, 0);
});

test('polygon silhouettes use integer scanlines and reject malformed geometry', () => {
  const cells = [];
  const ctx = { fillRect: (...args) => cells.push(args) };
  pixelPolygon(ctx, [[0.1, 0.2], [8, 2], [5, 10], [1, 8]], '#fff', '#000');
  assert.ok(cells.length > 0 && cells.every(rect => rect.every(Number.isInteger)));
  const count = cells.length;
  pixelPolygon(ctx, [[NaN, 0], [3, 4], [0, 4]], '#fff');
  assert.equal(cells.length, count);
});
