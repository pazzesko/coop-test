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
