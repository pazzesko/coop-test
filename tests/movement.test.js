import test from 'node:test';
import assert from 'node:assert/strict';
import { MovementSender, RemoteMovement, INTERPOLATION_DELAY } from '../src/movement.js';

function sender() {
  const instance = new MovementSender();
  const packets = [];
  return { instance, packets, tick: (x, moving, now) => instance.update({ x, y: 100 }, moving, now, packet => { packets.push(packet); return true; }) };
}

test('idle positions send once a second rather than twenty times a second', () => {
  const { tick, packets } = sender();
  for (let now = 0; now < 5000; now += 10) tick(100, false, now);
  assert.equal(packets.length, 5);
  assert.deepEqual(packets.map(p => p.t), [0, 1000, 2000, 3000, 4000]);
});

test('movement starts immediately and sends at most twenty times per second', () => {
  const { tick, packets } = sender();
  tick(100, false, 0);
  for (let now = 10; now < 1010; now += 10) tick(100 + now / 5, true, now);
  assert.equal(packets[1].t, 10);
  assert.equal(packets.length, 21);
  assert.deepEqual(packets.map(p => p.seq), packets.map((_, i) => i));
});

test('stopping repeats the final position three times, then returns to idle', () => {
  const { tick, packets } = sender();
  tick(100, true, 0);
  tick(110, true, 50);
  for (let now = 60; now <= 1300; now += 10) tick(110, false, now);
  const stops = packets.filter(p => !p.moving);
  assert.deepEqual(stops.map(p => p.t), [100, 150, 200, 1200]);
  assert.ok(stops.every(p => p.x === 110));
});

test('backpressure does not consume a packet sequence or stop repeat', () => {
  const { instance, packets, tick } = sender();
  tick(100, true, 0);
  instance.update({ x: 110, y: 100 }, false, 50, () => false);
  tick(110, false, 60);
  assert.equal(packets[1].seq, 1);
  assert.equal(instance.repeats, 2);
});

test('buffer interpolates by send time despite jitter and different browser clocks', () => {
  const remote = new RemoteMovement();
  remote.receive({ x: 100, y: 100, t: 5000, moving: true }, 100);
  remote.receive({ x: 110, y: 100, t: 5050, moving: true }, 170);
  remote.receive({ x: 120, y: 100, t: 5100, moving: true }, 200);
  assert.deepEqual(remote.sample(100 + INTERPOLATION_DELAY + 25), { x: 105, y: 100 });
  assert.deepEqual(remote.sample(100 + INTERPOLATION_DELAY + 75), { x: 115, y: 100 });
});

test('buffer never extrapolates or drifts after packets stop arriving', () => {
  const remote = new RemoteMovement();
  remote.receive({ x: 100, y: 100, t: 0, moving: true }, 10);
  remote.receive({ x: 110, y: 100, t: 50, moving: false }, 60);
  assert.deepEqual(remote.sample(5000), { x: 110, y: 100 });
});

test('idle-to-moving transition does not interpolate across the idle heartbeat gap', () => {
  const remote = new RemoteMovement();
  remote.receive({ x: 100, y: 100, t: 0, moving: false }, 10);
  remote.receive({ x: 110, y: 100, t: 800, moving: true }, 810);
  assert.deepEqual(remote.sample(710), { x: 100, y: 100 });
  assert.deepEqual(remote.sample(885), { x: 105, y: 100 });
});

test('a lost stop packet is recovered by a repeated final position', () => {
  const { tick, packets } = sender();
  tick(100, true, 0);
  tick(110, true, 50);
  tick(120, false, 100);
  tick(120, false, 150);
  const remote = new RemoteMovement();
  // Simulate losing the first stop packet on the unreliable channel.
  for (const p of packets.filter(p => p.t !== 100)) remote.receive(p, p.t + 20);
  assert.deepEqual(remote.sample(500), { x: 120, y: 100 });
});

test('out-of-order timestamps are ignored and buffers remain bounded', () => {
  const remote = new RemoteMovement();
  for (let i = 0; i < 100; i++) remote.receive({ x: 100 + i, y: 100, t: i * 50 }, i * 50 + 10);
  remote.receive({ x: 100, y: 100, t: 0 }, 5010);
  assert.ok(remote.samples.length <= 64);
  assert.deepEqual(remote.sample(6000), { x: 199, y: 100 });
});

test('legacy packets and resuming after a long suspension remain supported', () => {
  const remote = new RemoteMovement();
  remote.receive({ x: 100, y: 100 }, 10);
  remote.receive({ x: 110, y: 100 }, 60);
  assert.deepEqual(remote.sample(145), { x: 107, y: 100 });
  remote.receive({ x: 200, y: 100 }, 5000);
  assert.deepEqual(remote.sample(5100), { x: 200, y: 100 });
});
