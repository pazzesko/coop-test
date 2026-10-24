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

async function player(browser, name) {
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
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
  await expect(page.locator('#play'), JSON.stringify(errors)).toBeEnabled({ timeout: 20000 });
  return { page, context, errors };
}

test('two players are counted, randomly paired, exchange movement and ping, then leave', async ({ browser }) => {
  const alice = await player(browser, 'Alice');
  const bob = await player(browser, 'Bob');
  try {
    await expect(alice.page.locator('#online-count')).toHaveText('2 players online');
    await expect(bob.page.locator('#online-count')).toHaveText('2 players online');
    await Promise.all([alice.page.locator('#play').click(), bob.page.locator('#play').click()]);
    await expect(alice.page.locator('#game'), JSON.stringify(alice.errors)).toBeVisible({ timeout: 25000 });
    await expect(bob.page.locator('#game'), JSON.stringify(bob.errors)).toBeVisible({ timeout: 25000 });
    await expect(alice.page.locator('#connection-label')).toHaveText('Online with Bob');
    await expect(bob.page.locator('#connection-label')).toHaveText('Online with Alice');
    await expect(alice.page.locator('#ping')).toHaveText(/PING \d+ ms/);
    await expect(bob.page.locator('#ping')).toHaveText(/PING \d+ ms/);
    const before = await bob.page.locator('#arena').screenshot();
    await alice.page.keyboard.down('KeyW');
    await alice.page.waitForTimeout(400);
    await alice.page.keyboard.up('KeyW');
    await bob.page.waitForTimeout(200);
    const after = await bob.page.locator('#arena').screenshot();
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
    await second.close();
    await expect(alice.page.locator('#online-count')).toHaveText('1 player online');
  } finally { await alice.context.close(); }
});
