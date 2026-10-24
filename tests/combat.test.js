import test from 'node:test';
import assert from 'node:assert/strict';
import { Fight, CLASSES, createHero, heroAction, moveHero, validFight } from '../src/combat.js';
import { pixelViewport, ART_UNIT } from '../src/art.js';

function advance(fight, seconds) {
  for (let i = 0; i < Math.ceil(seconds * 60); i++) fight.step(1 / 60);
}

test('three distinct classes have different health and attack styles', () => {
  assert.equal(Object.keys(CLASSES).length, 3);
  assert.ok(CLASSES.barbarian.hp > CLASSES.archer.hp && CLASSES.archer.hp > CLASSES.mage.hp);
  assert.equal(CLASSES.barbarian.speed, 0);
  assert.ok(CLASSES.archer.cooldown < CLASSES.mage.cooldown);
});

test('barbarian melee only damages a nearby boss and respects cooldown', () => {
  const fight = new Fight(['barbarian']);
  fight.players[0].y = 650;
  fight.action(0, 'attack');
  assert.equal(fight.boss.hp, fight.boss.maxHp);
  advance(fight, 0.6);
  Object.assign(fight.players[0], { x: fight.boss.x, y: fight.boss.y + 80 });
  assert.equal(fight.action(0, 'attack'), true);
  assert.equal(fight.boss.hp, fight.boss.maxHp - CLASSES.barbarian.damage);
  assert.equal(fight.action(0, 'attack'), false);
});

test('mage and archer create projectiles that hit once without friendly fire', () => {
  for (const id of ['mage', 'archer']) {
    const fight = new Fight([id, 'barbarian']);
    assert.equal(fight.action(0, 'attack'), true);
    assert.equal(fight.shots[0].kind, id);
    advance(fight, 0.6);
    assert.equal(fight.boss.hp, fight.boss.maxHp - CLASSES[id].damage);
    assert.equal(fight.players[1].hp, fight.players[1].maxHp);
  }
});

test('warning circles do not deal damage until their deadline, and hit only once', () => {
  const fight = new Fight(['barbarian']);
  fight.nextAttack = Infinity;
  const hero = fight.players[0];
  fight.warn(hero.x, hero.y, 100, 1);
  advance(fight, 0.8);
  assert.equal(hero.hp, hero.maxHp);
  advance(fight, 0.3);
  assert.equal(hero.hp, hero.maxHp - 42);
  advance(fight, 0.2);
  assert.equal(hero.hp, hero.maxHp - 42);
});

test('dodging grants timed invulnerability, has a cooldown, and moves farther', () => {
  const fight = new Fight(['mage']);
  fight.nextAttack = Infinity;
  const hero = fight.players[0];
  fight.warn(hero.x, hero.y, 100, 0.2);
  assert.equal(fight.action(0, 'dodge', { x: 1, y: 0 }), true);
  assert.equal(fight.action(0, 'dodge', { x: 1, y: 0 }), false);
  advance(fight, 0.22);
  assert.equal(hero.hp, hero.maxHp);
  const copy = createHero('mage', 0);
  heroAction(copy, 'dodge', { x: 1, y: 0 }, 0);
  const x = copy.x;
  moveHero(copy, { x: 0, y: 0 }, 0.1, 0.1);
  assert.ok(copy.x - x > 60);
});

test('moving out of a warning avoids damage without a dodge', () => {
  const fight = new Fight(['archer']);
  fight.nextAttack = Infinity;
  const hero = fight.players[0];
  fight.warn(hero.x, hero.y, 80, 1);
  hero.x += 180;
  advance(fight, 1.1);
  assert.equal(hero.hp, hero.maxHp);
});

test('one fallen ally does not end the fight, and neither hero ever respawns', () => {
  const fight = new Fight(['mage', 'archer']);
  fight.players[0].hp = 0;
  advance(fight, 1);
  assert.equal(fight.outcome, null);
  assert.equal(fight.action(0, 'attack'), false);
  const position = { x: fight.players[0].x, y: fight.players[0].y };
  fight.setPosition(0, { x: 800, y: 400 });
  moveHero(fight.players[0], { x: 1, y: 0 }, 1, fight.t);
  assert.equal(fight.players[0].x, position.x);
  fight.players[1].hp = 0;
  fight.step(0.1);
  assert.equal(fight.outcome, 'defeat');
  advance(fight, 10);
  assert.ok(fight.players.every(p => p.hp === 0));
});

test('slaying the orc wins and prevents any subsequent damage', () => {
  const fight = new Fight(['barbarian']);
  Object.assign(fight.players[0], { x: fight.boss.x, y: fight.boss.y + 40 });
  fight.boss.hp = 1;
  fight.action(0, 'attack');
  assert.equal(fight.outcome, 'victory');
  assert.equal(fight.boss.hp, 0);
  const hp = fight.players[0].hp;
  advance(fight, 10);
  assert.equal(fight.players[0].hp, hp);
});

test('boss cycles through single slam, area slam, and a multi-circle barrage', () => {
  const fight = new Fight(['barbarian', 'mage']);
  for (let i = 0; i < 3; i++) {
    fight.nextAttack = fight.t;
    fight.step(0.01);
    assert.ok(fight.circles.length >= (i === 2 ? 3 : 1));
    fight.circles = [];
  }
  assert.equal(fight.boss.attackNumber, 3);
});

test('fight snapshots are bounded, validated and include authoritative health', () => {
  const fight = new Fight(['mage', 'archer']);
  fight.action(0, 'attack'); fight.warn(300, 300, 100);
  const snapshot = fight.snapshot();
  assert.equal(validFight(snapshot), true);
  assert.equal(validFight({ ...snapshot, circles: Array(30).fill(snapshot.circles[0]) }), false);
  assert.equal(validFight({ ...snapshot, t: Infinity }), false);
  snapshot.players[0].hp = -100;
  assert.equal(validFight(snapshot), false);
});

test('world pixels have an integer display scale on phone, landscape and desktop', () => {
  assert.equal(ART_UNIT, 2);
  for (const [w, h] of [[390, 660], [393, 667], [844, 242], [1280, 672]]) {
    const viewport = pixelViewport(w, h);
    assert.ok(Number.isInteger(viewport.scale) && viewport.scale >= 2);
    assert.ok(viewport.width * viewport.scale >= w);
    assert.ok(viewport.height * viewport.scale >= h);
    assert.ok(viewport.width * viewport.scale - w < viewport.scale);
  }
});
