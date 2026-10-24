import test from 'node:test';
import assert from 'node:assert/strict';
import { heroAnimation, bossAnimation } from '../src/animation.js';
import { createHero, heroAction, Fight } from '../src/combat.js';
import { Effects } from '../src/effects.js';
import { pixelLine } from '../src/art.js';

test('hero attacks advance through anticipation, release and recovery', () => {
  const hero = createHero('barbarian', 0);
  heroAction(hero, 'attack', {}, 1);
  assert.deepEqual(heroAnimation(hero, 1.03), { pose: 'attack', frame: 0 });
  assert.deepEqual(heroAnimation(hero, 1.12), { pose: 'attack', frame: 1 });
  assert.deepEqual(heroAnimation(hero, 1.3), { pose: 'attack', frame: 2 });
  assert.equal(heroAnimation(hero, 1.5).pose, 'idle');
});

test('each class has release frames and dodging takes priority over attacking', () => {
  for (const id of ['barbarian', 'mage', 'archer']) {
    const hero = createHero(id, 0);
    assert.equal(heroAnimation(hero, 0).pose, 'idle');
    heroAction(hero, 'attack', {}, 1);
    assert.equal(heroAnimation(hero, 1.14).frame, 1);
    heroAction(hero, 'dodge', { x: 1, y: 0 }, 1.15);
    assert.equal(heroAnimation(hero, 1.2).pose, 'dodge');
    hero.hp = 0;
    assert.equal(heroAnimation(hero, 1.2).pose, 'dead');
  }
});

test('boss lifts, holds, slams and recovers on the ground-circle deadline', () => {
  const circles = [{ hitAt: 2 }];
  assert.equal(bossAnimation(circles, 1).pose, 'windup');
  assert.equal(bossAnimation(circles, 1.8).pose, 'overhead');
  assert.equal(bossAnimation(circles, 2.05).pose, 'slam');
  assert.equal(bossAnimation(circles, 2.2).pose, 'recover');
  assert.equal(bossAnimation(circles, 2.5).pose, 'idle');
  assert.equal(bossAnimation(circles, 2, true).pose, 'dead');
});

test('a queued attack cannot deal damage after its owner falls', () => {
  const fight = new Fight(['barbarian', 'mage']);
  Object.assign(fight.players[0], { x: fight.boss.x, y: fight.boss.y + 30 });
  fight.action(0, 'attack');
  fight.players[0].hp = 0;
  fight.step(0.15);
  assert.equal(fight.boss.hp, fight.boss.maxHp);
});

test('the boss plants its feet during impact and recovery', () => {
  const fight = new Fight(['mage']);
  fight.t = 2;
  fight.nextAttack = 20;
  fight.warn(100, 100, 80, 0.1);
  fight.step(0.11);
  const position = { x: fight.boss.x, y: fight.boss.y };
  fight.step(0.1);
  assert.deepEqual({ x: fight.boss.x, y: fight.boss.y }, position);
});

test('effect ids deduplicate repeated snapshots and effects are bounded', () => {
  const effects = new Effects();
  const event = { id: 1, kind: 'hit', x: 200, y: 200, t: 1, value: 28 };
  effects.ingest([event], 1, 10);
  const count = effects.particles.length;
  effects.ingest([event], 1.1, 10.1);
  assert.equal(effects.particles.length, count);
  assert.equal(effects.numbers.length, 1);
  effects.ingest(Array.from({ length: 100 }, (_, i) => ({ ...event, id: i + 2 })), 1.1, 10.1);
  assert.ok(effects.particles.length <= 180);
  assert.ok(effects.numbers.length <= 12);
  effects.update(12);
  assert.equal(effects.particles.length, 0);
});

test('late effect snapshots catch up rather than replaying expired impacts', () => {
  const effects = new Effects();
  effects.ingest([{ id: 1, kind: 'slam', x: 0, y: 0, t: 1, value: 100 }], 3, 10);
  assert.equal(effects.particles.length, 0);
  assert.deepEqual(effects.shake(10), { x: 0, y: 0 });
});

test('reduced motion removes shake and reduces particles, without changing combat', () => {
  const effects = new Effects(true);
  effects.ingest([{ id: 1, kind: 'slam', x: 0, y: 0, t: 1, value: 100 }], 1, 10);
  assert.equal(effects.particles.length, 3);
  assert.deepEqual(effects.shake(10.05), { x: 0, y: 0 });
});

test('pixel lines only draw integer single-pixel cells and ignore invalid input', () => {
  const cells = [];
  const ctx = { fillRect: (...args) => cells.push(args) };
  pixelLine(ctx, 0.2, 0.3, 4.4, 3.7, '#fff');
  assert.ok(cells.length > 0);
  assert.ok(cells.every(([x, y, w, h]) => Number.isInteger(x) && Number.isInteger(y) && w === 1 && h === 1));
  const count = cells.length;
  pixelLine(ctx, NaN, 0, 4, 4, '#fff');
  assert.equal(cells.length, count);
});
