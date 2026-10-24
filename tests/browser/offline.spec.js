import { test, expect } from '@playwright/test';

const offlineConfig = route => route.fulfill({ contentType: 'text/javascript', body: 'export const firebaseConfig = {}; export const iceServers = []; export const emulatorConfig = null;' });

test.beforeEach(async ({ page }) => { await page.route('**/src/config.js', offlineConfig); });

test('name is saved, practice renders, FPS updates, keyboard moves, and leave works', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('#name-form')).toBeVisible();
  await page.locator('#name-input').fill('Alice');
  await page.locator('#name-form button').click();
  await expect(page.locator('#player-name')).toHaveText('Alice');
  await page.reload();
  await expect(page.locator('#name-form')).toBeHidden();
  await expect(page.locator('#player-name')).toHaveText('Alice');
  await page.locator('#practice').click();
  await expect(page.locator('#game')).toBeVisible();
  await expect(page.locator('#fps')).toHaveText(/FPS \d+/);
  const before = await page.locator('#arena').screenshot();
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(350);
  await page.keyboard.up('KeyW');
  const after = await page.locator('#arena').screenshot();
  expect(before.equals(after)).toBe(false);
  await page.locator('#leave').click();
  await expect(page.locator('#menu')).toBeVisible();
  expect(errors).toEqual([]);
});

test('touch joystick base stays anchored and resets on release', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  await page.route('**/src/config.js', offlineConfig);
  await page.goto('/');
  await page.locator('#name-input').fill('Touch player');
  await page.locator('#name-form button').click();
  await page.locator('#practice').click();
  const arena = await page.locator('#arena').boundingBox();
  expect(arena.height).toBeGreaterThan(arena.width * 1.5);
  for (const id of ['leave', 'fullscreen']) {
    const box = await page.locator(`#${id}`).boundingBox();
    expect(box.y).toBeLessThan(60);
    expect(box.x).toBeGreaterThan(390 / 2);
    expect(box.x + box.width).toBeLessThanOrEqual(390);
  }
  await expect(page.locator('#fps')).toHaveCSS('font-size', '10px');
  const cdp = await context.newCDPSession(page);
  // Touches on the play area don't create a stick over the game.
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 150, y: 250 }] });
  await expect(page.locator('#joystick')).toBeHidden();
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  const pad = await page.locator('#movement-pad').boundingBox();
  const origin = { x: pad.x + pad.width / 2, y: pad.y + pad.height / 2 };
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [origin] });
  await expect(page.locator('#joystick')).toBeVisible();
  const left = await page.locator('#joystick').evaluate(element => element.style.left);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: origin.x + 100, y: origin.y - 80 }] });
  await expect(page.locator('#joystick')).toHaveCSS('left', left);
  await expect(page.locator('#joystick-knob')).not.toHaveCSS('transform', 'none');
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect(page.locator('#joystick')).toBeHidden();
  // Rotation reflows the controls and resizes the canvas without scrolling.
  await page.setViewportSize({ width: 844, height: 390 });
  await expect.poll(async () => (await page.locator('#arena').boundingBox()).width).toBe(844);
  const landscape = await page.locator('#arena').boundingBox();
  expect(landscape.width).toBe(844);
  expect(landscape.height).toBeGreaterThan(200);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await context.close();
});

test('fullscreen toggles, preserves gameplay, and exits when leaving', async ({ page }) => {
  await page.goto('/');
  await page.locator('#name-input').fill('Fullscreen player');
  await page.locator('#name-form button').click();
  await page.locator('#practice').click();
  await page.locator('#fullscreen').click();
  await expect(page.locator('#fullscreen')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#fullscreen')).toHaveAttribute('aria-label', 'Exit fullscreen');
  await expect(page.locator('#fullscreen .collapse-icon')).toBeVisible();
  expect(await page.evaluate(() => document.fullscreenElement?.id)).toBe('game');
  await expect(page.locator('#fps')).toHaveText(/FPS \d+/);
  await page.locator('#fullscreen').click();
  await expect(page.locator('#fullscreen')).toHaveAttribute('aria-pressed', 'false');
  await page.locator('#fullscreen').click();
  await expect(page.locator('#fullscreen')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#leave').click();
  await expect(page.locator('#menu')).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.fullscreenElement === null)).toBe(true);
});

test('unsupported fullscreen is disabled, and a rejected request gives feedback', async ({ browser }) => {
  for (const supported of [false, true]) {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.route('**/src/config.js', offlineConfig);
    await page.addInitScript(supported => {
      Object.defineProperty(document, 'fullscreenEnabled', { value: supported });
      HTMLElement.prototype.requestFullscreen = () => Promise.reject(new Error('Not allowed'));
    }, supported);
    await page.goto('/');
    await page.locator('#name-input').fill('Player');
    await page.locator('#name-form button').click();
    await page.locator('#practice').click();
    if (supported) {
      await page.locator('#fullscreen').click();
      await expect(page.locator('#game-notice')).toContainText('Fullscreen could not open');
    } else {
      await expect(page.locator('#fullscreen')).toBeDisabled();
    }
    await expect(page.locator('#game')).toBeVisible();
    await context.close();
  }
});

test('class selection persists, ranged attacks hurt the boss, and dodge has a cooldown', async ({ page }) => {
  await page.goto('/');
  await page.locator('#name-input').fill('Mage player');
  await page.locator('#name-form button').click();
  await page.locator('.class-card').filter({ hasText: 'Mage' }).click();
  await page.reload();
  await expect(page.locator('input[value="mage"]')).toBeChecked();
  await page.locator('#practice').click();
  await expect(page.locator('#hero-status')).toContainText('MAGE');
  const hp = await page.locator('#boss-health').evaluate(element => element.value);
  await page.keyboard.down('Space');
  await expect.poll(() => page.locator('#boss-health').evaluate(element => element.value), { timeout: 5000 }).toBeLessThan(hp);
  await page.keyboard.up('Space');
  await page.locator('#dodge').click();
  await expect(page.locator('#dodge-label')).toHaveText(/\d\.\ds/);
  await expect(page.locator('#dodge-label')).toHaveText('DODGE', { timeout: 3000 });
  const scale = await page.locator('#arena').evaluate(element => ({ x: parseFloat(element.style.width) / element.width, y: parseFloat(element.style.height) / element.height }));
  expect(Number.isInteger(scale.x)).toBe(true);
  expect(scale.x).toBe(scale.y);
  await expect(page.locator('#arena')).toHaveCSS('image-rendering', 'pixelated');
});

test('two thumbs can move and hold attack independently', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  await page.route('**/src/config.js', offlineConfig);
  await page.goto('/');
  await page.locator('#name-input').fill('Touch mage');
  await page.locator('#name-form button').click();
  await page.locator('.class-card').filter({ hasText: 'Mage' }).click();
  await page.locator('#practice').click();
  const pad = await page.locator('#movement-pad').boundingBox();
  const attack = await page.locator('#attack').boundingBox();
  const dodge = await page.locator('#dodge').boundingBox();
  expect(attack.x).toBeGreaterThan(195);
  expect(attack.y).toBeGreaterThan(650);
  expect(dodge.width).toBeGreaterThanOrEqual(60);
  const left = { id: 1, x: pad.x + pad.width / 2, y: pad.y + pad.height / 2 };
  const right = { id: 2, x: attack.x + attack.width / 2, y: attack.y + attack.height / 2 };
  const cdp = await context.newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [left] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [left, right] });
  await expect(page.locator('#joystick')).toBeVisible();
  // Lift the movement thumb; the attack thumb must remain held.
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [left] });
  await expect(page.locator('#joystick')).toBeHidden();
  await expect.poll(() => page.locator('#boss-health').evaluate(element => element.value), { timeout: 4000 }).toBeLessThan(760);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await context.close();
});

test('attack sheets contain distinct poses on a shared native pixel grid', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const { createArt } = await import('/src/art.js');
    const art = createArt();
    const heroes = Object.values(art.heroes).map(hero => ({
      distinct: new Set(hero.attack.map(frame => frame.right.toDataURL())).size,
      dimensions: Object.values(hero).flat().every(frame => frame.right.width === 32 && frame.right.height === 40),
    }));
    const boss = ['windup', 'overhead', 'slam', 'recover'].map(pose => art.orc[pose][0].right.toDataURL());
    const flash = art.orc.idle[0].flashRight;
    const rgba = flash.getContext('2d').getImageData(0, 0, flash.width, flash.height).data;
    const colors = new Set();
    for (let i = 0; i < rgba.length; i += 4) if (rgba[i + 3]) colors.add(`${rgba[i]},${rgba[i + 1]},${rgba[i + 2]}`);
    return { heroes, bossPoses: new Set(boss).size, flashColors: colors.size };
  });
  expect(result.heroes.every(hero => hero.distinct === 3 && hero.dimensions)).toBe(true);
  expect(result.bossPoses).toBe(4);
  expect(result.flashColors).toBeGreaterThan(8);
});
