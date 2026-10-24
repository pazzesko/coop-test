import test from 'node:test';
import assert from 'node:assert/strict';
import { pixelCameraFor } from '../src/camera.js';
import { pixelViewport, ART_UNIT } from '../src/art.js';
import { WIDTH, HEIGHT, spawn } from '../src/world.js';

test('portrait camera follows a hero on an integer art-pixel grid', () => {
  const viewport = pixelViewport(390, 660);
  const camera = pixelCameraFor(viewport.width, viewport.height, spawn());
  assert.ok(Number.isInteger(camera.x) && Number.isInteger(camera.y));
  assert.ok(Math.abs(spawn().x / ART_UNIT - camera.x - viewport.width / 2) <= 0.5);
});

test('pixel camera stays within map bounds across portrait, landscape, and desktop', () => {
  for (const [w, h] of [[390, 660], [844, 242], [1280, 672]]) {
    const viewport = pixelViewport(w, h);
    for (const focus of [{ x: 0, y: 0 }, spawn(), { x: WIDTH, y: HEIGHT }]) {
      const camera = pixelCameraFor(viewport.width, viewport.height, focus);
      assert.ok(camera.x >= 0 && camera.y >= 0);
      assert.ok(camera.x + viewport.width <= WIDTH / ART_UNIT);
      assert.ok(camera.y + viewport.height <= HEIGHT / ART_UNIT);
    }
  }
});
