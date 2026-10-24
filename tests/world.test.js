import test from 'node:test';
import assert from 'node:assert/strict';
import { move, spawn, blocked, validPosition, SPEED, WIDTH } from '../src/world.js';

test('spawns are clear and separated', () => {
  assert.equal(blocked(spawn().x, spawn().y), false);
  assert.equal(blocked(spawn(false).x, spawn(false).y), false);
  assert.notDeepEqual(spawn(), spawn(false));
});

test('WASD diagonal speed is normalized', () => {
  const player = { x: 100, y: 100 };
  move(player, 1, 1, 0.1);
  assert.ok(Math.abs(Math.hypot(player.x - 100, player.y - 100) - SPEED * 0.1) < 0.001);
});

test('walls stop movement even across long frames', () => {
  const player = { x: 180, y: 200 };
  move(player, 1, 0, 2);
  assert.ok(player.x < 230);
  assert.equal(blocked(player.x, player.y), false);
});

test('world boundaries and invalid input cannot move a player out of bounds', () => {
  const player = spawn();
  move(player, NaN, 0, 0.05);
  assert.deepEqual(player, spawn());
  for (let i = 0; i < 300; i++) move(player, -1, 0, 0.05);
  assert.ok(player.x >= 39);
});

test('network positions must be finite, bounded, and sequenced', () => {
  assert.equal(validPosition({ type: 'position', seq: 0, ...spawn() }), true);
  for (const patch of [{ x: NaN }, { y: Infinity }, { x: WIDTH + 1 }, { seq: -1 }, { seq: '2' }, { type: 'other' }, { t: Infinity }, { t: -1 }, { moving: 'yes' }]) {
    assert.equal(validPosition({ type: 'position', seq: 1, ...spawn(), ...patch }), false);
  }
});
