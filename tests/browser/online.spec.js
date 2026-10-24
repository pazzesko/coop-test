import { test, expect } from '@playwright/test';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { readFileSync } from 'node:fs';

test.skip(process.env.COOP_EMULATOR_TESTS !== '1', 'Requires local Firebase auth/database emulators.');

let env;
test.beforeAll(async () => {
  env = await initializeTestEnvironment({ projectId: 'demo-coop-test', database: { host: '127.0.0.1', port: 9000, rules: readFileSync('database.rules.json', 'utf8') } });
});
test.beforeEach(async () => env.withSecurityRulesDisabled(context => context.database().ref().remove()));
test.afterAll(async () => env?.cleanup());

async function player(browser, name, simulateJitter = false, classId = 'barbarian') {
  const context = await browser.newContext();
  await context.addInitScript(simulateJitter => {
    window.movementStats = { sent: [], received: [], droppedStops: 0 };
    window.fightStats = { sent: [], received: [], actions: [] };
    const original = RTCDataChannel.prototype.send;
    let sawMovement = false;
    RTCDataChannel.prototype.send = function (data) {
      if (this.label !== 'movement') {
        const packet = JSON.parse(data);
        if (packet.type === 'fight') window.fightStats.sent.push(packet);
        if (packet.type === 'action') window.fightStats.actions.push(packet);
        if (!this.observingFight) {
          this.observingFight = true;
          this.addEventListener('message', event => {
            const packet = JSON.parse(event.data);
            if (packet.type === 'fight') window.fightStats.received.push(packet);
          });
        }
        window.testControl = this;
        return original.call(this, data);
      }
      const packet = JSON.parse(data);
      if (!this.observingMovement) {
        this.observingMovement = true;
        this.addEventListener('message', event => window.movementStats.received.push(JSON.parse(event.data)));
      }
      window.movementStats.sent.push(packet);
      if (packet.moving) sawMovement = true;
      if (simulateJitter && !packet.moving && sawMovement && !window.movementStats.droppedStops) {
        window.movementStats.droppedStops++;
        return;
      }
      if (simulateJitter) {
        const delay = [20, 95, 40, 65][packet.seq % 4];
        setTimeout(() => { if (this.readyState === 'open') original.call(this, data); }, delay);
      } else return original.call(this, data);
    };
  }, simulateJitter);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.stack || error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.route('**/src/config.js', route => route.fulfill({
    contentType: 'text/javascript',
    body: `export const firebaseConfig = {
      apiKey: 'demo-key', authDomain: 'demo-coop-test.firebaseapp.com',
      projectId: 'demo-coop-test', databaseURL: 'https://demo-coop-test.firebaseio.com', appId: 'demo-app'
    }; export const iceServers = []; export const emulatorConfig = { auth: 9099, database: 9000 };`,
  }));
  await page.goto('/');
  await page.locator('#name-input').fill(name);
  await page.locator('#name-form button').click();
  await page.locator(`.class-card:has(input[value="${classId}"])`).click();
  await expect(page.locator('#play'), JSON.stringify(errors)).toBeEnabled({ timeout: 20000 });
  return { page, context, errors };
}

test('two players are counted, randomly paired, exchange movement and ping, then leave', async ({ browser }) => {
  const alice = await player(browser, 'Alice');
  const bob = await player(browser, 'Bob');
  try {
    await expect(alice.page.locator('#online-count')).toHaveText('2 players online');
    await expect(bob.page.locator('#online-count')).toHaveText('2 players online');
    await expect(alice.page.locator('#online-list')).toContainText('Bob');
    await expect(bob.page.locator('#online-list')).toContainText('Alice');
    await expect(alice.page.locator('#online-list li')).toHaveCount(2);
    await expect(alice.page.locator('#presence-note')).toBeHidden();
    await Promise.all([alice.page.locator('#play').click(), bob.page.locator('#play').click()]);
    await expect(alice.page.locator('#game'), JSON.stringify(alice.errors)).toBeVisible({ timeout: 25000 });
    await expect(bob.page.locator('#game'), JSON.stringify(bob.errors)).toBeVisible({ timeout: 25000 });
    await expect(alice.page.locator('#connection-label')).toHaveText('Online with Bob');
    await expect(bob.page.locator('#connection-label')).toHaveText('Online with Alice');
    await expect(alice.page.locator('#ping')).toHaveText(/PING \d+ ms/);
    await expect(bob.page.locator('#ping')).toHaveText(/PING \d+ ms/);
    const before = await bob.page.locator('#arena').screenshot({ mask: [bob.page.locator('.metrics')] });
    await alice.page.keyboard.down('KeyW');
    await alice.page.waitForTimeout(400);
    await alice.page.keyboard.up('KeyW');
    await bob.page.waitForTimeout(200);
    const after = await bob.page.locator('#arena').screenshot({ mask: [bob.page.locator('.metrics')] });
    expect(before.equals(after)).toBe(false);
    await alice.page.locator('#leave').click();
    await expect(bob.page.locator('#menu')).toBeVisible();
    await expect(bob.page.locator('#status')).toContainText(/left|disconnected/);
    expect(alice.errors).toEqual([]);
    expect(bob.errors).toEqual([]);
    await bob.context.close();
    await expect(alice.page.locator('#online-count')).toHaveText('1 player online', { timeout: 15000 });
  } finally {
    await alice.context.close(); await bob.context.close();
  }
});

test('cancel removes a waiting ticket and another search still pairs', async ({ browser }) => {
  const alice = await player(browser, 'Alice');
  const bob = await player(browser, 'Bob');
  try {
    await alice.page.locator('#play').click();
    await expect(alice.page.locator('#cancel')).toBeVisible();
    await alice.page.locator('#cancel').click();
    await expect(alice.page.locator('#play')).toBeEnabled();
    await bob.page.locator('#play').click();
    await expect(bob.page.locator('#status')).toContainText('Looking');
    await alice.page.locator('#play').click();
    await expect(alice.page.locator('#game')).toBeVisible({ timeout: 25000 });
    await expect(bob.page.locator('#game')).toBeVisible({ timeout: 25000 });
    expect(alice.errors).toEqual([]);
    expect(bob.errors).toEqual([]);
  } finally {
    await alice.context.close(); await bob.context.close();
  }
});

test('four simultaneous searches form two separate pairs', async ({ browser }) => {
  const names = ['Alice', 'Bob', 'Charlie', 'Dora'];
  const players = [];
  try {
    for (const name of names) players.push(await player(browser, name));
    await expect(players[0].page.locator('#online-count')).toHaveText('4 players online');
    await Promise.all(players.map(p => p.page.locator('#play').click()));
    for (const p of players) await expect(p.page.locator('#game')).toBeVisible({ timeout: 25000 });
    const partners = await Promise.all(players.map(p => p.page.locator('#connection-label').textContent()));
    for (let i = 0; i < players.length; i++) {
      const other = partners[i].replace('Online with ', '');
      expect(other).not.toBe(names[i]);
      expect(partners[names.indexOf(other)]).toBe(`Online with ${names[i]}`);
      expect(players[i].errors).toEqual([]);
    }
  } finally { await Promise.all(players.map(p => p.context.close())); }
});

test('multiple tabs share one online identity', async ({ browser }) => {
  const alice = await player(browser, 'Alice');
  try {
    const second = await alice.context.newPage();
    await second.route('**/src/config.js', route => route.fulfill({
      contentType: 'text/javascript',
      body: `export const firebaseConfig = { apiKey: 'demo-key', authDomain: 'demo-coop-test.firebaseapp.com', projectId: 'demo-coop-test', databaseURL: 'https://demo-coop-test.firebaseio.com', appId: 'demo-app' }; export const iceServers = []; export const emulatorConfig = { auth: 9099, database: 9000 };`,
    }));
    await second.goto('/');
    await expect(second.locator('#play')).toBeEnabled();
    await expect(second.locator('#online-count')).toHaveText('1 player online');
    await expect(second.locator('#online-list li')).toHaveCount(1);
    await second.close();
    await expect(alice.page.locator('#online-count')).toHaveText('1 player online');
  } finally { await alice.context.close(); }
});

test('adaptive movement survives jitter and a lost stop packet, then stays still', async ({ browser }) => {
  const alice = await player(browser, 'Alice', true);
  const bob = await player(browser, 'Bob');
  try {
    await Promise.all([alice.page.locator('#play').click(), bob.page.locator('#play').click()]);
    for (const p of [alice, bob]) await expect(p.page.locator('#game')).toBeVisible({ timeout: 25000 });
    const initial = await alice.page.evaluate(() => window.movementStats.sent.length);
    await alice.page.waitForTimeout(3200);
    const idleCount = await alice.page.evaluate(() => window.movementStats.sent.length) - initial;
    expect(idleCount).toBeGreaterThanOrEqual(3);
    expect(idleCount).toBeLessThanOrEqual(4);
    await alice.page.keyboard.down('KeyW');
    await alice.page.waitForTimeout(600);
    await alice.page.keyboard.up('KeyW');
    await alice.page.waitForTimeout(700);
    const stats = await alice.page.evaluate(() => window.movementStats);
    expect(stats.sent.filter(p => p.moving).length).toBeGreaterThanOrEqual(8);
    expect(stats.droppedStops).toBe(1);
    const finalPosition = stats.sent.at(-1);
    expect(finalPosition.moving).toBe(false);
    await expect.poll(async () => bob.page.evaluate(() => window.movementStats.received.at(-1)?.x)).toBe(finalPosition.x);
    await expect.poll(async () => bob.page.evaluate(() => window.movementStats.received.at(-1)?.y)).toBe(finalPosition.y);
    await bob.page.waitForTimeout(500);
    // Boss animation continues while a hero is idle; inspect received movement,
    // not the entire animated arena, to verify there is no position drift.
    const stopped = await bob.page.evaluate(() => window.movementStats.received.at(-1));
    expect(stopped.x).toBe(finalPosition.x);
    expect(stopped.y).toBe(finalPosition.y);
    expect(alice.errors).toEqual([]);
    expect(bob.errors).toEqual([]);
  } finally { await alice.context.close(); await bob.context.close(); }
});

test('online names update live, render safely, and disappear on disconnect', async ({ browser }) => {
  const alice = await player(browser, '<b>Alice</b>');
  const bob = await player(browser, 'Bob');
  try {
    await expect(bob.page.locator('#online-list')).toContainText('<b>Alice</b>');
    await expect(bob.page.locator('#online-list b')).toHaveCount(0);
    await alice.page.locator('#edit-name').click();
    await alice.page.locator('#name-input').fill('Alicia');
    await alice.page.locator('#name-form button').click();
    await expect(bob.page.locator('#online-list')).toContainText('Alicia');
    await alice.context.close();
    await expect(bob.page.locator('#online-count')).toHaveText('1 player online', { timeout: 15000 });
    await expect(bob.page.locator('#online-list')).not.toContainText('Alicia');
  } finally { await alice.context.close(); await bob.context.close(); }
});

test('co-op classes and boss damage agree, and guests cannot declare victory', async ({ browser }) => {
  const alice = await player(browser, 'Mage', false, 'mage');
  const bob = await player(browser, 'Archer', false, 'archer');
  try {
    await Promise.all([alice.page.locator('#play').click(), bob.page.locator('#play').click()]);
    for (const p of [alice, bob]) await expect(p.page.locator('#game')).toBeVisible({ timeout: 25000 });
    await expect(alice.page.locator('#hero-status')).toContainText('MAGE');
    await expect(bob.page.locator('#hero-status')).toContainText('ARCHER');
    await alice.page.keyboard.down('Space');
    await bob.page.keyboard.down('Space');
    await alice.page.waitForTimeout(900);
    await alice.page.keyboard.up('Space');
    await bob.page.keyboard.up('Space');
    await expect.poll(() => alice.page.locator('#boss-health').evaluate(e => e.value)).toBeLessThan(1280);
    await alice.page.waitForTimeout(900);
    const hp = await alice.page.locator('#boss-health').evaluate(e => e.value);
    await expect.poll(() => bob.page.locator('#boss-health').evaluate(e => e.value)).toBe(hp);
    const aliceHost = await alice.page.evaluate(() => window.fightStats.sent.length > 0);
    const guest = aliceHost ? bob : alice;
    await guest.page.evaluate(() => {
      const state = structuredClone(window.fightStats.received.at(-1));
      state.boss.hp = 0; state.outcome = 'victory'; state.seq += 10000;
      window.testControl.send(JSON.stringify(state));
    });
    await alice.page.waitForTimeout(200);
    for (const p of [alice, bob]) {
      await expect(p.page.locator('#outcome')).toBeHidden();
      expect(p.errors).toEqual([]);
    }
  } finally { await alice.context.close(); await bob.context.close(); }
});

test('a fallen ally stays dead, and the fight ends only when both fall', async ({ browser }) => {
  const alice = await player(browser, 'Mage A', false, 'mage');
  const bob = await player(browser, 'Mage B', false, 'mage');
  try {
    await Promise.all([alice.page.locator('#play').click(), bob.page.locator('#play').click()]);
    for (const p of [alice, bob]) await expect(p.page.locator('#game')).toBeVisible({ timeout: 25000 });
    const oneFallen = async () => {
      const states = await Promise.all([alice, bob].map(p => p.page.evaluate(() => [...window.fightStats.sent, ...window.fightStats.received])));
      return states.flat().some(state => state.players.filter(p => p.hp <= 0).length === 1 && state.outcome === null);
    };
    await expect.poll(oneFallen, { timeout: 20000 }).toBe(true);
    for (const p of [alice, bob]) {
      await expect(p.page.locator('#outcome')).toBeVisible({ timeout: 20000 });
      await expect(p.page.locator('#outcome-title')).toHaveText('PARTY FALLEN');
      await expect(p.page.locator('#attack')).toBeDisabled();
    }
    await alice.page.waitForTimeout(300);
    for (const p of [alice, bob]) await expect(p.page.locator('#hero-status')).toContainText('FALLEN');
  } finally { await alice.context.close(); await bob.context.close(); }
});
