import test from 'node:test';
import assert from 'node:assert/strict';
import { Connection } from '../src/network.js';

test('legacy visibility messages neither show a tab banner nor clear connection warnings', () => {
  const statuses = [];
  const connection = new Connection({ status: value => statuses.push(value) });
  const channel = { label: 'control' };
  connection.wire(channel);
  for (const value of [true, false]) channel.onmessage({ data: JSON.stringify({ type: 'hidden', value }) });
  assert.deepEqual(statuses, []);
});

test('movement-only clients must refresh before joining the boss fight protocol', () => {
  const errors = [];
  const connection = new Connection({ status() {}, error: value => errors.push(value.message) });
  const channel = { label: 'control', readyState: 'open', bufferedAmount: 0, send() {}, close() {} };
  connection.wire(channel);
  channel.onmessage({ data: JSON.stringify({ type: 'ready' }) });
  assert.equal(connection.closed, true);
  assert.match(errors[0], /refresh/i);
});
