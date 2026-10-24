import { Input } from './input.js';
import { MovementSender, RemoteMovement } from './movement.js';
import { Fight, CLASSES, classOf, heroAction, moveHero, validFight, DODGE_COOLDOWN } from './combat.js';
import { createArt, pixelViewport, pixelRing, pixelText } from './art.js';
import { pixelCameraFor } from './camera.js';

const PREDICTED_FIELDS = ['attackAt', 'attackUntil', 'dodgeAt', 'dodgeUntil', 'invulnerableUntil', 'dx', 'dy'];

export class Game {
  constructor(elements) {
    this.elements = elements;
    this.canvas = elements.arena;
    this.ctx = this.canvas.getContext('2d');
    this.art = createArt();
    this.input = new Input(elements.movementPad, elements.joystick, elements.knob, { attack: elements.attack, dodge: elements.dodge });
    this.running = false;
    window.addEventListener('resize', () => this.resize());
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(elements.playfield);
  }

  start({ name, peerName, host = true, connection = null, classId = 'barbarian', peerClass = 'barbarian' }) {
    this.stop();
    this.running = true;
    this.connection = connection;
    this.host = host || !connection;
    this.localIndex = this.host ? 0 : 1;
    const classes = connection ? (this.host ? [classOf(classId), classOf(peerClass)] : [classOf(peerClass), classOf(classId)]) : [classOf(classId)];
    this.fight = new Fight(classes);
    this.bossRender = { x: this.fight.boss.x, y: this.fight.boss.y };
    this.snapshotTime = 0;
    this.local = this.fight.players[this.localIndex];
    this.remote = connection ? this.fight.players[1 - this.localIndex] : null;
    this.names = this.host ? [name, peerName] : [peerName, name];
    this.remoteMovement = new RemoteMovement();
    this.remoteRender = this.remote ? { x: this.remote.x, y: this.remote.y } : null;
    this.remoteWalking = false;
    this.movementSender = new MovementSender();
    this.pendingActions = [];
    this.actionSequence = 0;
    this.peerActionSequence = -1;
    this.fightSequence = -1;
    this.sendAt = 0;
    this.hudAt = 0;
    this.lastFightAt = performance.now();
    this.last = performance.now();
    this.fpsAt = this.last;
    this.frames = 0;
    this.input.enabled = true;
    this.elements.outcome.hidden = true;
    this.resize();
    this.frameId = requestAnimationFrame(now => this.frame(now));
  }

  receive(position) {
    if (!this.running || !this.remote || this.remote.hp <= 0) return;
    this.remoteMovement.receive(position, performance.now());
    this.remoteWalking = Boolean(position.moving);
    if (this.host) this.fight.setPosition(1, position);
  }

  receiveGame(message) {
    if (!this.running || !this.connection) return;
    if (this.host) {
      if (message.type !== 'action' || !Number.isSafeInteger(message.seq) || message.seq <= this.peerActionSequence || message.seq > 1e9
          || !['attack', 'dodge'].includes(message.kind) || !Number.isFinite(message.x) || !Number.isFinite(message.y)
          || Math.abs(message.x) > 1 || Math.abs(message.y) > 1) return;
      this.peerActionSequence = message.seq;
      this.remote.lastAction = message.seq;
      this.fight.action(1, message.kind, { x: message.x, y: message.y });
      this.sendAt = 0;
      return;
    }
    if (!validFight(message) || message.seq <= this.fightSequence || message.players[this.localIndex].classId !== this.local.classId) return;
    this.fightSequence = message.seq;
    this.lastFightAt = performance.now();
    this.pendingActions = this.pendingActions.filter(action => action.seq > message.players[this.localIndex].lastAction);
    this.fight.t = message.t;
    this.snapshotTime = message.t;
    this.fight.boss = message.boss;
    this.fight.circles = message.circles;
    this.fight.shots = message.shots;
    this.fight.outcome = message.outcome;
    message.players.forEach((state, index) => {
      const player = this.fight.players[index];
      const position = { x: player.x, y: player.y };
      Object.assign(player, state);
      // Owners keep immediate movement; health, cooldowns and death belong to host.
      if (index === this.localIndex && player.hp > 0) Object.assign(player, position);
    });
    if (this.local.hp > 0) for (const action of this.pendingActions) Object.assign(this.local, action.predicted);
    this.updateHud();
  }

  action(kind, axis) {
    if (this.fight.outcome || this.local.hp <= 0) return;
    if (this.host) this.fight.action(this.localIndex, kind, axis);
    else if (heroAction(this.local, kind, axis, this.fight.t)) {
      const seq = this.actionSequence++;
      const predicted = Object.fromEntries(PREDICTED_FIELDS.map(key => [key, this.local[key]]));
      this.pendingActions.push({ seq, predicted });
      if (this.pendingActions.length > 12) this.pendingActions.shift();
      const length = Math.max(1, Math.hypot(axis.x, axis.y));
      this.connection.sendControl({ type: 'action', seq, kind, x: axis.x / length, y: axis.y / length });
    }
  }

  resize() {
    const { width, height } = this.elements.playfield.getBoundingClientRect();
    if (!width || !height) return;
    this.viewport = pixelViewport(width, height);
    this.canvas.width = this.viewport.width;
    this.canvas.height = this.viewport.height;
    this.canvas.style.width = `${this.viewport.width * this.viewport.scale}px`;
    this.canvas.style.height = `${this.viewport.height * this.viewport.scale}px`;
    this.ctx.imageSmoothingEnabled = false;
    this.input.reset();
  }

  frame(now) {
    if (!this.running) return;
    // rAF's frame timestamp can precede performance.now() recorded at start.
    const dt = Math.max(0, Math.min((now - this.last) / 1000, 0.05));
    this.last = now;
    const axis = this.input.axis();
    const before = { x: this.local.x, y: this.local.y };
    const stalled = !this.host && now - this.lastFightAt > 1500;
    if (!stalled && !this.fight.outcome) {
      if (!this.host) this.fight.t += dt;
      if (this.input.dodging()) this.action('dodge', axis);
      if (this.input.attacking()) this.action('attack', axis);
      moveHero(this.local, axis, dt, this.fight.t);
      if (this.host) this.fight.step(dt);
    }
    const moving = Math.hypot(this.local.x - before.x, this.local.y - before.y) > 0.0001;
    this.walking = moving;
    if (this.remote) {
      const position = this.remoteMovement.sample(now);
      if (position) Object.assign(this.remoteRender, position);
      if (this.remote.hp <= 0) Object.assign(this.remoteRender, { x: this.remote.x, y: this.remote.y });
    }
    const bossAlpha = this.host ? 1 : 1 - Math.exp(-16 * dt);
    this.bossRender.x += (this.fight.boss.x - this.bossRender.x) * bossAlpha;
    this.bossRender.y += (this.fight.boss.y - this.bossRender.y) * bossAlpha;
    if (this.connection) {
      this.movementSender.update(this.local, moving, now, packet => this.connection.sendPosition(packet));
      if (this.host && now >= this.sendAt) {
        this.sendAt = now + (this.fight.outcome ? 500 : 100);
        this.connection.sendControl(this.fight.snapshot());
      }
    }
    this.frames++;
    if (now - this.fpsAt >= 750) {
      this.elements.fps.textContent = `FPS ${Math.round(this.frames * 1000 / (now - this.fpsAt))}`;
      this.fpsAt = now; this.frames = 0;
    }
    if (now >= this.hudAt) { this.updateHud(stalled); this.hudAt = now + 100; }
    this.draw();
    this.frameId = requestAnimationFrame(time => this.frame(time));
  }

  updateHud(stalled = false) {
    const boss = this.fight.boss, player = this.local;
    this.elements.bossHealth.value = boss.hp;
    this.elements.bossHealth.max = boss.maxHp;
    this.elements.bossNumber.textContent = `${boss.hp} / ${boss.maxHp}`;
    this.elements.bossName.textContent = boss.hp < boss.maxHp * 0.45 ? 'GROKK · ENRAGED' : 'GROKK, THE IRON MAW';
    this.elements.heroStatus.textContent = player.hp <= 0 ? 'FALLEN · NO RESPAWNS' : `${CLASSES[player.classId].name.toUpperCase()} · ${player.hp} / ${player.maxHp} HP`;
    this.elements.fightStatus.textContent = stalled ? 'Waiting for host…' : player.hp <= 0 && !this.fight.outcome ? 'Watch your ally. The fight is not over.' : 'Hold attack · dodge the marked circles';
    const dodge = Math.max(0, player.dodgeAt - this.fight.t);
    this.elements.dodgeLabel.textContent = dodge > 0 ? `${dodge.toFixed(1)}s` : 'DODGE';
    this.elements.dodge.style.setProperty('--ready', `${Math.max(0, 100 - dodge / DODGE_COOLDOWN * 100)}%`);
    this.elements.attack.disabled = this.elements.dodge.disabled = player.hp <= 0 || Boolean(this.fight.outcome) || stalled;
    this.elements.outcome.hidden = !this.fight.outcome;
    if (this.fight.outcome) {
      this.elements.outcomeTitle.textContent = this.fight.outcome === 'victory' ? 'ORC SLAIN' : 'PARTY FALLEN';
      this.elements.outcomeText.textContent = this.fight.outcome === 'victory' ? 'The Iron Maw is defeated. You survived.' : 'No respawns. Return to camp for a new run.';
    }
  }

  draw() {
    const ctx = this.ctx;
    const { width, height } = this.viewport;
    const target = this.local.hp <= 0 && this.remote?.hp > 0 ? this.remoteRender : this.local;
    const focus = { ...target };
    if (Math.hypot(target.x - this.fight.boss.x, target.y - this.fight.boss.y) < 400) focus.y = Math.min(target.y, this.fight.boss.y + 40);
    const camera = pixelCameraFor(width, height, focus);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#232e2c'; ctx.fillRect(0, 0, width, height);
    ctx.save(); ctx.translate(-camera.x, -camera.y);
    ctx.drawImage(this.art.floor, 0, 0);
    for (const circle of this.fight.circles) {
      const remaining = circle.hitAt - this.fight.t;
      const x = Math.round(circle.x / 2), y = Math.round(circle.y / 2), r = Math.round(circle.r / 2);
      if (remaining > 0) {
        ctx.fillStyle = remaining < 0.35 ? '#ad503b55' : '#ba8c4133';
        for (let row = -r; row <= r; row += 2) {
          const extent = Math.floor(Math.sqrt(r * r - row * row));
          ctx.fillRect(x - extent, y + row, extent * 2 + 1, 1);
        }
        pixelRing(ctx, x, y, r, remaining < 0.35 ? '#f0a075' : '#d7ac5f', 2);
        pixelRing(ctx, x, y, Math.max(1, r * (1 - remaining / 1.8)), '#d7ac5f', 1);
        pixelText(ctx, 'DODGE', x, y - 2, '#fff0b6');
      } else {
        pixelRing(ctx, x, y, r, '#ecd4a5', 4);
        pixelRing(ctx, x, y, r - 5, '#bc7957', 2);
      }
    }
    const entities = this.fight.players.map((player, index) => ({ y: index === this.localIndex ? player.y : this.remoteRender.y, player, index }));
    entities.push({ y: this.bossRender.y, boss: true });
    entities.sort((a, b) => a.y - b.y);
    for (const entity of entities) {
      if (entity.boss) this.drawBoss(ctx);
      else this.drawHero(ctx, entity.player, entity.index);
    }
    for (const shot of this.fight.shots) {
      const elapsed = this.host ? 0 : Math.max(0, Math.min(this.fight.t - this.snapshotTime, 0.12));
      const x = Math.round((shot.x + shot.vx * elapsed) / 2), y = Math.round((shot.y + shot.vy * elapsed) / 2);
      ctx.fillStyle = shot.kind === 'mage' ? '#e49162' : '#e5d2a4';
      if (shot.kind === 'mage') {
        ctx.fillRect(x - 2, y - 3, 5, 7); ctx.fillRect(x - 3, y - 2, 7, 5);
        ctx.fillStyle = '#ffe8ad'; ctx.fillRect(x - 1, y - 1, 3, 3);
      } else {
        const vertical = Math.abs(shot.vy) > Math.abs(shot.vx);
        ctx.fillRect(x - (vertical ? 0 : 3), y - (vertical ? 3 : 0), vertical ? 1 : 7, vertical ? 7 : 1);
        ctx.fillRect(x - 1, y - 1, 3, 3);
      }
    }
    ctx.restore();
  }

  drawBoss(ctx) {
    const boss = this.fight.boss;
    const x = Math.round(this.bossRender.x / 2), y = Math.round(this.bossRender.y / 2);
    ctx.fillStyle = '#1d2825'; ctx.fillRect(x - 17, y - 3, 36, 7); ctx.fillRect(x - 14, y - 5, 30, 11);
    ctx.globalAlpha = boss.hp <= 0 ? 0.4 : 1;
    ctx.drawImage(this.art.orc[boss.phase === 'windup' ? 1 : 0], x - 26, y - 54);
    ctx.globalAlpha = 1;
  }

  drawHero(ctx, player, index) {
    const position = index === this.localIndex ? player : this.remoteRender;
    const x = Math.round(position.x / 2), y = Math.round(position.y / 2);
    if (player.hp <= 0) {
      ctx.drawImage(this.art.grave, x - 10, y - 12);
      pixelText(ctx, this.names[index], x, y - 19, '#b0b4a8');
      return;
    }
    ctx.fillStyle = '#202b26'; ctx.fillRect(x - 8, y - 2, 16, 4);
    if (player.dodgeUntil > this.fight.t) pixelRing(ctx, x, y - 7, 15, '#b7d8d3', 1);
    const frame = (index === this.localIndex ? this.walking : this.remoteWalking) ? Math.floor(this.fight.t * 8) % 2 : 0;
    if (player.hurtUntil <= this.fight.t || Math.floor(this.fight.t * 20) % 2) ctx.drawImage(this.art.heroes[player.classId][Number(frame)], x - 12, y - 26);
    if (player.classId === 'barbarian' && player.attackUntil > this.fight.t) {
      pixelRing(ctx, x, y - 5, 25, '#eedab1', 2);
      pixelRing(ctx, x, y - 5, 27, '#aab7b1', 1);
    }
    ctx.fillStyle = '#1a2321'; ctx.fillRect(x - 12, y - 34, 24, 4);
    ctx.fillStyle = index === this.localIndex ? '#a6c58c' : '#92b4c0';
    ctx.fillRect(x - 11, y - 33, Math.round(22 * player.hp / player.maxHp), 2);
    pixelText(ctx, this.names[index], x, y - 42, index === this.localIndex ? '#efe4bc' : '#c7dde2');
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.frameId);
    this.input.enabled = false;
    this.input.reset();
  }
}
