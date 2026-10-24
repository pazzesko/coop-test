import { Input } from './input.js';
import { WIDTH, HEIGHT, RADIUS, WALLS, move, spawn } from './world.js';
import { MovementSender, RemoteMovement } from './movement.js';
import { cameraFor } from './camera.js';

const COLORS = ['#70e3bb', '#93afff'];

export class Game {
  constructor(elements) {
    this.elements = elements;
    this.canvas = elements.arena;
    this.ctx = this.canvas.getContext('2d');
    this.input = new Input(elements.movementPad, elements.joystick, elements.knob);
    this.running = false;
    window.addEventListener('resize', () => this.resize());
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.canvas);
  }

  start({ name, peerName, host = true, connection = null }) {
    this.stop();
    this.running = true;
    this.connection = connection;
    this.local = { ...spawn(host), name, color: COLORS[host ? 0 : 1] };
    this.remote = connection ? { ...spawn(!host), name: peerName, color: COLORS[host ? 1 : 0] } : null;
    this.remoteMovement = new RemoteMovement();
    this.movementSender = new MovementSender();
    this.input.enabled = true;
    this.last = performance.now();
    this.fpsAt = this.last;
    this.frames = 0;
    this.resize();
    this.frameId = requestAnimationFrame(now => this.frame(now));
  }

  receive(position) {
    if (this.remote) this.remoteMovement.receive(position, performance.now());
  }

  resize() {
    const { width, height } = this.canvas.getBoundingClientRect();
    if (!width || !height) return;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(width * dpr);
    this.canvas.height = Math.round(height * dpr);
    this.width = width;
    this.height = height;
    this.dpr = dpr;
    this.input.reset();
  }

  frame(now) {
    if (!this.running) return;
    const dt = Math.min((now - this.last) / 1000, 0.05);
    this.last = now;
    const axis = this.input.axis();
    const before = { x: this.local.x, y: this.local.y };
    move(this.local, axis.x, axis.y, dt);
    const moving = Math.hypot(this.local.x - before.x, this.local.y - before.y) > 0.0001;
    if (this.remote) {
      const position = this.remoteMovement.sample(now);
      if (position) Object.assign(this.remote, position);
    }
    if (this.connection) {
      this.movementSender.update(this.local, moving, now, packet => this.connection.sendPosition(packet));
    }
    this.frames++;
    if (now - this.fpsAt >= 750) {
      this.elements.fps.textContent = `FPS ${Math.round(this.frames * 1000 / (now - this.fpsAt))}`;
      this.fpsAt = now;
      this.frames = 0;
    }
    this.draw();
    this.frameId = requestAnimationFrame(time => this.frame(time));
  }

  draw() {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    const camera = cameraFor(w, h, this.local);
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.fillStyle = '#0b1020';
    ctx.fillRect(0, 0, w, h);
    ctx.scale(camera.scale, camera.scale);
    ctx.translate(-camera.x, -camera.y);
    ctx.fillStyle = '#142237';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.strokeStyle = '#1b2c43';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= WIDTH; x += 40) { ctx.moveTo(x, 0); ctx.lineTo(x, HEIGHT); }
    for (let y = 0; y <= HEIGHT; y += 40) { ctx.moveTo(0, y); ctx.lineTo(WIDTH, y); }
    ctx.stroke();
    for (const wall of WALLS) {
      ctx.fillStyle = '#293b55';
      ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
      ctx.fillStyle = '#3b526f';
      ctx.fillRect(wall.x, wall.y, wall.w, Math.min(3, wall.h));
    }
    ctx.textAlign = 'center';
    ctx.font = '11px system-ui';
    ctx.fillStyle = '#59728f';
    ctx.fillText('MOVEMENT SANDBOX', WIDTH / 2, 100);
    if (this.remote) this.drawPlayer(this.remote, false);
    this.drawPlayer(this.local, true);
  }

  drawPlayer(player, local) {
    const ctx = this.ctx;
    ctx.fillStyle = '#0005';
    ctx.beginPath(); ctx.ellipse(player.x, player.y + 15, 19, 7, 0, 0, Math.PI * 2); ctx.fill();
    if (local) {
      ctx.strokeStyle = `${player.color}55`;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(player.x, player.y, RADIUS + 6, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.fillStyle = player.color;
    ctx.beginPath(); ctx.arc(player.x, player.y, RADIUS, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#152139';
    ctx.fillRect(player.x - 7, player.y - 3, 4, 5);
    ctx.fillRect(player.x + 3, player.y - 3, 4, 5);
    ctx.font = 'bold 13px system-ui';
    ctx.fillStyle = '#ecf4ff';
    ctx.fillText(`${player.name}${local ? ' · you' : ''}`, player.x, player.y - 31);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.frameId);
    this.input.enabled = false;
    this.input.reset();
  }
}
