import test from 'node:test';
import assert from 'node:assert/strict';
import { cameraFor } from '../src/camera.js';
import { WIDTH, HEIGHT, spawn } from '../src/world.js';

test('portrait camera fills the tall viewport instead of fitting the wide map', () => {
  const camera = cameraFor(390, 674, spawn());
  assert.ok(WIDTH * camera.scale >= 390);
  assert.ok(HEIGHT * camera.scale >= 674);
  assert.ok(camera.scale > 0.9);
  assert.ok(Math.abs((spawn().x - camera.x) * camera.scale - 195) < 0.001);
});

test('camera stays within map bounds across portrait, landscape, and desktop', () => {
  for (const [w, h] of [[390, 674], [844, 264], [1280, 720]]) {
    for (const focus of [{ x: 0, y: 0 }, spawn(), { x: WIDTH, y: HEIGHT }]) {
      const camera = cameraFor(w, h, focus);
      assert.ok(camera.x >= 0 && camera.y >= 0);
      assert.ok(camera.x + w / camera.scale <= WIDTH + 0.001);
      assert.ok(camera.y + h / camera.scale <= HEIGHT + 0.001);
    }
  }
});
