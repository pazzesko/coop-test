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
  const context = await browser.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  await page.route('**/src/config.js', offlineConfig);
  await page.goto('/');
  await page.locator('#name-input').fill('Touch player');
  await page.locator('#name-form button').click();
  await page.locator('#practice').click();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 150, y: 250 }] });
  await expect(page.locator('#joystick')).toBeVisible();
  const left = await page.locator('#joystick').evaluate(element => element.style.left);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 350, y: 180 }] });
  await expect(page.locator('#joystick')).toHaveCSS('left', left);
  await expect(page.locator('#joystick-knob')).not.toHaveCSS('transform', 'none');
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect(page.locator('#joystick')).toBeHidden();
  await context.close();
});
