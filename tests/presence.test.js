import test from 'node:test';
import assert from 'node:assert/strict';
import { onlinePlayers } from '../src/presence.js';
import { Backend } from '../src/backend.js';

test('online roster deduplicates tabs, puts you first, and sorts others by name', () => {
  const players = onlinePlayers({ a: { tab1: { name: 'Alice' }, tab2: { name: 'Alice' } }, b: { tab1: { name: 'Bob' } }, c: { tab1: { name: 'Carl' } } }, 'c', 'Carl');
  assert.equal(players.length, 3);
  assert.deepEqual(players.map(p => p.name), ['Carl', 'Alice', 'Bob']);
  assert.equal(players[0].self, true);
});

test('legacy connections appear as guests while your local name is retained', () => {
  assert.deepEqual(onlinePlayers({ a: { tab1: true }, b: { tab1: true } }, 'a', 'Alice').map(p => p.name), ['Alice', 'Guest']);
  assert.deepEqual(onlinePlayers(null, 'a', ''), []);
});

test('named connections take precedence over unnamed tabs', () => {
  assert.equal(onlinePlayers({ a: { oldTab: true, guest: { name: 'Guest' }, newTab: { name: 'Alice' } } }, 'b', '')[0].name, 'Alice');
});

test('old database rules fall back to boolean presence without disabling co-op', async () => {
  const writes = [];
  const notices = [];
  const backend = new Backend({ presenceNamesUnavailable: value => notices.push(value) });
  backend.name = 'Alice';
  backend.ref = path => path;
  backend.sdk = { set: async (path, value) => {
    writes.push(value);
    if (value !== true) throw new Error('PERMISSION_DENIED');
  } };
  await backend.writePresence();
  assert.deepEqual(writes, [{ name: 'Alice' }, true]);
  assert.deepEqual(notices, [true]);
});
