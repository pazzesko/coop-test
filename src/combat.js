import { WIDTH, HEIGHT, RADIUS, move, spawn } from './world.js';

export const CLASSES = {
  barbarian: { name: 'Barbarian', hp: 150, damage: 28, cooldown: 0.55, range: 112, speed: 0, color: '#e5a167', description: 'Axe cleave · tough & close-range' },
  mage: { name: 'Mage', hp: 95, damage: 26, cooldown: 0.7, range: 580, speed: 420, color: '#b7a1ee', description: 'Fireball · powerful ranged magic' },
  archer: { name: 'Archer', hp: 110, damage: 13, cooldown: 0.3, range: 700, speed: 680, color: '#9fca87', description: 'Quick arrows · fast ranged shots' },
};
export const classOf = id => Object.hasOwn(CLASSES, id) ? id : 'barbarian';
export const DODGE_COOLDOWN = 1.8;
export const DODGE_DURATION = 0.28;
export const DODGE_SPEED = 660;
export const PROTOCOL = 3;
export const ATTACK_ANIMATION = { barbarian: 0.42, mage: 0.48, archer: 0.27 };
export const ATTACK_WINDUP = { barbarian: 0.09, mage: 0.11, archer: 0.06 };

export function createHero(classId, index) {
  const id = classOf(classId);
  return { ...spawn(index === 0), index, classId: id, hp: CLASSES[id].hp, maxHp: CLASSES[id].hp,
    attackAt: 0, attackUntil: 0, dodgeAt: 0, dodgeUntil: 0, invulnerableUntil: 0, dx: 0, dy: -1, hurtUntil: 0, lastAction: -1 };
}

export function heroAction(player, kind, direction, time) {
  if (player.hp <= 0) return false;
  if (kind === 'attack') {
    if (time < player.attackAt) return false;
    player.attackAt = time + CLASSES[player.classId].cooldown;
    player.attackUntil = time + 0.2;
    return true;
  }
  if (kind !== 'dodge' || time < player.dodgeAt) return false;
  let dx = Number.isFinite(direction.x) ? direction.x : 0;
  let dy = Number.isFinite(direction.y) ? direction.y : 0;
  const length = Math.hypot(dx, dy);
  if (length < 0.1) { dx = player.dx; dy = player.dy; }
  else { dx /= length; dy /= length; }
  player.dx = dx; player.dy = dy;
  player.dodgeUntil = time + DODGE_DURATION;
  player.invulnerableUntil = time + DODGE_DURATION + 0.08;
  player.dodgeAt = time + DODGE_COOLDOWN;
  return true;
}

export class Fight {
  constructor(classes) {
    this.players = classes.map(createHero);
    this.boss = { x: WIDTH / 2, y: 300, hp: classes.length === 1 ? 760 : 1280, maxHp: classes.length === 1 ? 760 : 1280, phase: 'idle', attackNumber: 0 };
    this.t = 0;
    this.nextAttack = 3;
    this.circles = [];
    this.shots = [];
    this.attacks = [];
    this.effects = [];
    this.outcome = null;
    this.id = 0;
    this.sequence = 0;
  }

  action(index, kind, direction = {}) {
    const player = this.players[index];
    if (!player || this.outcome || !heroAction(player, kind, direction, this.t)) return false;
    if (kind === 'dodge') { this.effect('dodge', player.x, player.y, 0, index); return true; }
    this.attacks.push({ index, fireAt: this.t + ATTACK_WINDUP[player.classId] });
    return true;
  }

  effect(kind, x, y, value = 0, owner = -1, source = 0) {
    this.effects.push({ id: ++this.id, kind, x, y, t: this.t, value, owner, source });
    if (this.effects.length > 24) this.effects.shift();
  }

  damageBoss(amount, kind, owner) {
    this.boss.hp = Math.max(0, this.boss.hp - amount);
    this.effect(kind, this.boss.x, this.boss.y - 40, amount, owner);
  }

  fire(index) {
    const player = this.players[index];
    if (!player || player.hp <= 0) return;
    const stats = CLASSES[player.classId];
    const distance = Math.hypot(this.boss.x - player.x, this.boss.y - player.y);
    if (!stats.speed) {
      this.effect('cleave', player.x, player.y - 16, 0, index);
      if (distance <= stats.range + 32) this.damageBoss(stats.damage, 'hit', index);
    } else if (this.shots.length < 24) {
      this.effect(player.classId === 'mage' ? 'cast' : 'bow', player.x, player.y - 22, 0, index);
      const dx = (this.boss.x - player.x) / (distance || 1);
      const dy = (this.boss.y - player.y) / (distance || 1);
      this.shots.push({ id: ++this.id, owner: index, kind: player.classId, x: player.x, y: player.y - 10,
        vx: dx * stats.speed, vy: dy * stats.speed, ttl: stats.range / stats.speed, damage: stats.damage });
    }
  }

  setPosition(index, position) {
    const player = this.players[index];
    if (!player || player.hp <= 0 || this.outcome) return;
    player.x = Math.max(39, Math.min(WIDTH - 39, position.x));
    player.y = Math.max(39, Math.min(HEIGHT - 39, position.y));
  }

  warn(x, y, r, delay = 1.25) {
    this.circles.push({ id: ++this.id, x: Math.max(44, Math.min(WIDTH - 44, x)), y: Math.max(44, Math.min(HEIGHT - 44, y)), r,
      hitAt: this.t + delay, expiresAt: this.t + delay + 0.38, hit: false });
  }

  step(dt) {
    if (this.outcome) return;
    this.t += dt;
    this.effects = this.effects.filter(effect => this.t - effect.t < 1.2);
    for (const attack of this.attacks) if (attack.fireAt <= this.t) this.fire(attack.index);
    this.attacks = this.attacks.filter(attack => attack.fireAt > this.t);
    // A killing strike ends the run before any later damage in this tick.
    this.checkOutcome();
    if (this.outcome) return;
    const alive = this.players.filter(player => player.hp > 0);
    if (!alive.length) { this.checkOutcome(); return; }
    const target = [...alive].sort((a, b) => Math.hypot(a.x - this.boss.x, a.y - this.boss.y) - Math.hypot(b.x - this.boss.x, b.y - this.boss.y))[0];
    const winding = this.circles.some(circle => this.t < circle.hitAt);
    const recovering = this.circles.some(circle => this.t >= circle.hitAt && this.t < circle.expiresAt);
    this.boss.phase = winding ? 'windup' : 'idle';
    if (!winding && !recovering && this.t > 1.5) {
      const distance = Math.hypot(target.x - this.boss.x, target.y - this.boss.y);
      if (distance > 82) {
        move(this.boss, (target.x - this.boss.x) / distance, (target.y - this.boss.y) / distance, dt, 48);
      }
    }
    if (this.t >= this.nextAttack) {
      const pattern = this.boss.attackNumber++ % 3;
      if (pattern === 0) this.warn(target.x, target.y, 104);
      else if (pattern === 1) this.warn(this.boss.x, this.boss.y, 165, 1.4);
      else {
        alive.forEach((player, i) => this.warn(player.x, player.y, 84, 1.15 + i * 0.15));
        this.warn(target.x - 125, target.y + 60, 76, 1.55);
        this.warn(target.x + 125, target.y - 60, 76, 1.75);
      }
      this.nextAttack = this.t + (this.boss.hp < this.boss.maxHp * 0.45 ? 2.4 : 3.1);
    }
    for (const circle of this.circles) {
      if (circle.hit || this.t < circle.hitAt) continue;
      circle.hit = true;
      this.effect('slam', circle.x, circle.y, circle.r, -1, circle.id);
      for (const player of alive) {
        if (this.t <= player.invulnerableUntil || Math.hypot(player.x - circle.x, player.y - circle.y) > circle.r + RADIUS / 2) continue;
        player.hp = Math.max(0, player.hp - (circle.r > 150 ? 52 : 42));
        player.hurtUntil = this.t + 0.3;
        this.effect(player.hp <= 0 ? 'death' : 'hurt', player.x, player.y - 16, circle.r > 150 ? 52 : 42, player.index);
      }
    }
    this.circles = this.circles.filter(circle => circle.expiresAt > this.t);
    for (const shot of this.shots) {
      const previous = { x: shot.x, y: shot.y };
      shot.x += shot.vx * dt; shot.y += shot.vy * dt; shot.ttl -= dt;
      // Segment distance avoids fast arrows tunneling through the boss.
      const dx = shot.x - previous.x, dy = shot.y - previous.y;
      const fraction = Math.max(0, Math.min(1, ((this.boss.x - previous.x) * dx + (this.boss.y - previous.y) * dy) / (dx * dx + dy * dy || 1)));
      if (Math.hypot(previous.x + dx * fraction - this.boss.x, previous.y + dy * fraction - this.boss.y) < 36) {
        this.damageBoss(shot.damage, shot.kind === 'mage' ? 'fire-hit' : 'hit', shot.owner);
        shot.ttl = 0;
      }
    }
    this.shots = this.shots.filter(shot => shot.ttl > 0);
    this.checkOutcome();
  }

  checkOutcome() {
    if (this.boss.hp <= 0) this.outcome = 'victory';
    else if (this.players.every(player => player.hp <= 0)) this.outcome = 'defeat';
  }

  snapshot() {
    return { type: 'fight', seq: this.sequence++, t: this.t, boss: { ...this.boss }, players: this.players.map(player => ({ ...player })),
      circles: this.circles.map(circle => ({ ...circle })), shots: this.shots.map(shot => ({ ...shot })), effects: this.effects.map(effect => ({ ...effect })), outcome: this.outcome };
  }
}

const finite = value => typeof value === 'number' && Number.isFinite(value) && Math.abs(value) < 1e7;
export function validFight(state, count = 2) {
  if (!state || state.type !== 'fight' || !Number.isSafeInteger(state.seq) || state.seq < 0 || !finite(state.t) || state.t < 0
      || ![null, 'victory', 'defeat'].includes(state.outcome) || !Array.isArray(state.players) || state.players.length !== count
      || !Array.isArray(state.circles) || state.circles.length > 8 || !Array.isArray(state.shots) || state.shots.length > 24
      || !Array.isArray(state.effects) || state.effects.length > 24) return false;
  const boss = state.boss;
  if (!boss || !['x', 'y', 'hp', 'maxHp', 'attackNumber'].every(key => finite(boss[key])) || boss.hp < 0 || boss.hp > boss.maxHp || boss.maxHp > 2000 || !['idle', 'windup'].includes(boss.phase)) return false;
  if (!state.players.every((player, i) => player && player.index === i && Object.hasOwn(CLASSES, player.classId)
      && ['x', 'y', 'hp', 'maxHp', 'attackAt', 'attackUntil', 'dodgeAt', 'dodgeUntil', 'invulnerableUntil', 'dx', 'dy', 'hurtUntil', 'lastAction'].every(key => finite(player[key]))
      && player.maxHp === CLASSES[player.classId].hp && player.hp >= 0 && player.hp <= player.maxHp && player.x >= 0 && player.x <= WIDTH && player.y >= 0 && player.y <= HEIGHT)) return false;
  return state.circles.every(circle => circle && ['id', 'x', 'y', 'r', 'hitAt', 'expiresAt'].every(key => finite(circle[key])) && circle.r > 0 && circle.r <= 180)
    && state.shots.every(shot => shot && ['id', 'owner', 'x', 'y', 'vx', 'vy', 'ttl', 'damage'].every(key => finite(shot[key])) && ['mage', 'archer'].includes(shot.kind)
      && Math.abs(shot.vx) <= 1000 && Math.abs(shot.vy) <= 1000 && shot.ttl >= 0 && shot.ttl <= 3
      && Number.isInteger(shot.owner) && shot.owner >= 0 && shot.owner < count && shot.damage > 0 && shot.damage <= 100)
    && state.effects.every(effect => effect && ['id', 'x', 'y', 't', 'value', 'owner'].every(key => finite(effect[key]))
      && Number.isSafeInteger(effect.id) && effect.id > 0 && effect.value >= 0 && effect.value <= 200
      && (effect.source === undefined || (Number.isSafeInteger(effect.source) && effect.source >= 0 && effect.source < 1e7))
      && ['dodge', 'cleave', 'cast', 'bow', 'hit', 'fire-hit', 'slam', 'hurt', 'death'].includes(effect.kind));
}

export function moveHero(player, axis, dt, time) {
  if (player.hp <= 0) return;
  if (player.dodgeUntil > time) move(player, player.dx, player.dy, dt, DODGE_SPEED);
  else {
    move(player, axis.x, axis.y, dt);
    const length = Math.hypot(axis.x, axis.y);
    if (length > 0.1) { player.dx = axis.x / length; player.dy = axis.y / length; }
  }
}
