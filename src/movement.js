// Movement stays local and immediate. Only remote rendering is delayed.
export const MOVE_INTERVAL = 50;
export const IDLE_INTERVAL = 1000;
export const INTERPOLATION_DELAY = 100;
const STOP_REPEATS = 3;

export class MovementSender {
  constructor() {
    this.sequence = 0;
    this.last = null;
    this.lastAt = -Infinity;
    this.wasMoving = false;
    this.repeats = 0;
  }

  update(position, moving, now, send) {
    const x = Math.round(position.x * 10) / 10;
    const y = Math.round(position.y * 10) / 10;
    const changed = !this.last || x !== this.last.x || y !== this.last.y;
    const started = moving && !this.wasMoving;
    if (!moving && this.wasMoving) this.repeats = STOP_REPEATS;
    this.wasMoving = moving;
    const interval = moving || changed || this.repeats ? MOVE_INTERVAL : IDLE_INTERVAL;
    if (this.last && !started && now - this.lastAt < interval) return;
    const packet = { type: 'position', seq: this.sequence, x, y, t: Math.round(now), moving };
    // Don't advance scheduling when the channel is closed/backpressured.
    if (!send(packet)) return;
    this.sequence++;
    this.lastAt = now;
    this.last = { x, y };
    if (!moving && this.repeats) this.repeats--;
  }
}

export class RemoteMovement {
  constructor() {
    this.samples = [];
    this.offset = null;
    this.lastReceived = null;
  }

  receive(packet, receivedAt) {
    // Timestamped packets use a sender-relative clock; no clock synchronization
    // or wall-clock agreement is required. Legacy packets use arrival time.
    const timestamped = Number.isFinite(packet.t) && packet.t >= 0;
    const time = timestamped ? packet.t : receivedAt;
    const previous = this.samples.at(-1);
    if (previous && time <= previous.time) return;
    const gap = this.lastReceived !== null && receivedAt - this.lastReceived > 2000;
    if (gap) { this.samples = []; this.offset = null; }
    const offset = timestamped ? receivedAt - time : 0;
    this.offset = this.offset === null ? offset : Math.min(this.offset, offset);
    this.lastReceived = receivedAt;
    const last = this.samples.at(-1);
    if (last && Math.hypot(packet.x - last.x, packet.y - last.y) > 160) this.samples = [];
    else if (last && last.moving === false && packet.moving === true && time - last.time > MOVE_INTERVAL) {
      // Don't spread a movement restart over the one-second idle heartbeat gap.
      this.samples.push({ ...last, time: time - MOVE_INTERVAL });
    }
    this.samples.push({ x: packet.x, y: packet.y, time, moving: packet.moving });
    if (this.samples.length > 64) this.samples.splice(0, this.samples.length - 64);
  }

  sample(now) {
    if (!this.samples.length) return null;
    const time = now - this.offset - INTERPOLATION_DELAY;
    while (this.samples.length > 2 && this.samples[1].time <= time) this.samples.shift();
    const [a, b] = this.samples;
    if (!b || time <= a.time) return { x: a.x, y: a.y };
    const alpha = Math.max(0, Math.min(1, (time - a.time) / (b.time - a.time)));
    // Hold the newest position if the buffer runs dry. Do not extrapolate through
    // walls or let a stopped player drift during packet loss/backgrounding.
    return { x: a.x + (b.x - a.x) * alpha, y: a.y + (b.y - a.y) * alpha };
  }
}
