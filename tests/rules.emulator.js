import { before, after, beforeEach, test } from 'node:test';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';

let env;
const token = '11111111-1111-4111-8111-111111111111';
const ticket = () => ({ token, name: 'Alice', state: 'waiting', createdAt: Date.now(), expiresAt: Date.now() + 90000 });
const db = uid => env.authenticatedContext(uid).database();
const claim = uid => ({ uid, name: uid, token });

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-coop-test',
    database: { host: '127.0.0.1', port: 9000, rules: readFileSync('database.rules.json', 'utf8') },
  });
});
beforeEach(async () => env.withSecurityRulesDisabled(context => context.database().ref().remove()));
after(async () => env?.cleanup());

test('presence requires auth and only its owner may write', async () => {
  await assertSucceeds(db('alice').ref('v1/presence/alice/tab-1').set(true));
  await assertSucceeds(db('bob').ref('v1/presence').once('value'));
  await assertFails(db('bob').ref('v1/presence/alice/tab-1').remove());
  await assertFails(env.unauthenticatedContext().database().ref('v1/presence').once('value'));
});

test('presence accepts bounded names, rejects extra data, and prevents impersonation', async () => {
  await assertSucceeds(db('alice').ref('v1/presence/alice/tab-1').set({ name: 'Alice' }));
  await assertFails(db('bob').ref('v1/presence/alice/tab-1/name').set('Forged'));
  await assertFails(db('alice').ref('v1/presence/alice/tab-1').set({ name: '' }));
  await assertFails(db('alice').ref('v1/presence/alice/tab-1').set({ name: 'x'.repeat(21) }));
  await assertFails(db('alice').ref('v1/presence/alice/tab-1').set({ name: 'Alice', secret: 'no' }));
});

test('queue listing is bounded and ticket updates are owner-only', async () => {
  await assertSucceeds(db('alice').ref('v1/tickets/alice').set(ticket()));
  await assertSucceeds(db('bob').ref('v1/tickets').orderByChild('createdAt').limitToLast(30).once('value'));
  await assertFails(db('bob').ref('v1/tickets').once('value'));
  await assertFails(db('bob').ref('v1/tickets/alice/name').set('forged'));
  await assertFails(db('bob').ref('v1/tickets/alice').remove());
});

test('a guest can claim once, cannot replace another guest, and can cancel', async () => {
  await db('alice').ref('v1/tickets/alice').set(ticket());
  await assertSucceeds(db('bob').ref('v1/tickets/alice/claim').set(claim('bob')));
  await assertFails(db('charlie').ref('v1/tickets/alice/claim').set(claim('charlie')));
  await assertSucceeds(db('bob').ref('v1/tickets/alice/claim').remove());
});

test('locked, expired, missing, and wrong-token tickets cannot be claimed', async () => {
  await db('alice').ref('v1/tickets/alice').set({ ...ticket(), state: 'claiming' });
  await assertFails(db('bob').ref('v1/tickets/alice/claim').set(claim('bob')));
  await env.withSecurityRulesDisabled(context => context.database().ref('v1/tickets/alice').set({ ...ticket(), expiresAt: Date.now() - 1000 }));
  await assertFails(db('bob').ref('v1/tickets/alice/claim').set(claim('bob')));
  await db('alice').ref('v1/tickets/alice').remove();
  await assertFails(db('bob').ref('v1/tickets/alice/claim').set(claim('bob')));
  await db('alice').ref('v1/tickets/alice').set(ticket());
  await assertFails(db('bob').ref('v1/tickets/alice/claim').set({ ...claim('bob'), token: '22222222-2222-4222-8222-222222222222' }));
});

test('only matched participants can read signaling or send under their own UID', async () => {
  await db('alice').ref('v1/tickets/alice').set(ticket());
  await db('bob').ref('v1/tickets/alice/claim').set(claim('bob'));
  const path = `v1/signals/alice/${token}`;
  await assertSucceeds(db('alice').ref(`${path}/alice/message`).set('{"type":"offer"}'));
  await assertSucceeds(db('bob').ref(`${path}/alice`).once('value'));
  await assertFails(db('charlie').ref(path).once('value'));
  await assertFails(db('charlie').ref(`${path}/charlie/message`).set('malicious'));
  await assertFails(db('bob').ref(`${path}/alice/message`).set('forged'));
  await assertSucceeds(db('bob').ref(`${path}/bob/message`).set('{"type":"answer"}'));
});

test('invalid shapes and oversized payloads are rejected', async () => {
  await assertFails(db('alice').ref('v1/tickets/alice').set({ ...ticket(), secret: true }));
  await assertFails(db('alice').ref('v1/tickets/alice').set({ ...ticket(), name: 'x'.repeat(21) }));
  await db('alice').ref('v1/tickets/alice').set(ticket());
  await db('bob').ref('v1/tickets/alice/claim').set(claim('bob'));
  await assertFails(db('bob').ref(`v1/signals/alice/${token}/bob/message`).set('x'.repeat(32769)));
});
