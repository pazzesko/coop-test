// Cosmetic only: no collision, game-clock pauses, or extra network messages.
const COLORS = {
  hit: ['#fff0c7', '#e4af69', '#98634c'], 'fire-hit': ['#fff3bd', '#eeaa58', '#c45345'],
  slam: ['#e8c59a', '#92767c', '#57516c'], hurt: ['#efbfab', '#d76e68', '#8d465a'],
  death: ['#e9d5ae', '#af7e79', '#5a536c'], cast: ['#e5f6e3', '#91d4ce', '#6793bd'],
  cleave: ['#fff0c7', '#c1d1d4', '#738ca7'], dodge: ['#becad7', '#75899b', '#4a526d'], bow: ['#dfd5b3', '#95b4a5', '#647b80'],
};

export class Effects {
  constructor(reduced = false) {
    this.reduced = reduced;
    this.particles = [];
    this.numbers = [];
    this.smoke = [];
    this.scars = [];
    this.lastId = 0;
    this.shakeUntil = 0;
    this.shakePower = 0;
    this.bossFlashUntil = 0;
  }

  ingest(events, simulationTime, now) {
    for (const event of events) {
      if (event.id <= this.lastId) continue;
      this.lastId = event.id;
      const age = Math.max(0, simulationTime - event.t);
      if (age > 0.8) continue;
      const start = now - age;
      const count = this.reduced ? 3 : event.kind === 'slam' ? 20 : event.kind === 'fire-hit' ? 15 : 8;
      const colors = COLORS[event.kind] || COLORS.hit;
      for (let i = 0; i < count; i++) {
        const seed = ((event.id * 97 + i * 137) % 997) / 997;
        const angle = seed * Math.PI * 2;
        const speed = (event.kind === 'slam' ? 30 : 15) + ((i * 17) % 33);
        const rock = event.kind === 'slam';
        const spread = rock ? event.value * 0.13 : 0;
        this.particles.push({ x: event.x / 2 + Math.cos(angle) * spread, y: event.y / 2 + Math.sin(angle) * spread,
          vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - (rock ? 35 : 12), kind: rock ? 'rock' : 'spark', frame: i % 4,
          start, life: rock ? 0.55 + seed * 0.25 : 0.25 + seed * 0.35, color: colors[i % colors.length], size: i % 5 === 0 ? 2 : 1 });
      }
      if (event.kind === 'slam') {
        this.scars.push({ id: event.id, source: event.source || event.id, x: event.x, y: event.y, r: event.value, hitAt: start, start });
        const puffs = this.reduced ? 3 : 12;
        for (let i = 0; i < puffs; i++) {
          const angle = i * 2.39996 + event.id;
          const reach = event.value / 2 * Math.sqrt((i + 0.5) / puffs) * 0.75;
          this.smoke.push({ x: event.x / 2 + Math.cos(angle) * reach, y: event.y / 2 + Math.sin(angle) * reach,
            vx: Math.cos(angle) * 9, vy: -10 - i % 5, start, life: 0.7 + (i % 4) * 0.1 });
        }
      }
      if (event.value > 0 && ['hit', 'fire-hit', 'hurt'].includes(event.kind)) {
        this.numbers.push({ x: event.x / 2, y: event.y / 2 - 25, value: event.value, color: event.kind === 'hurt' ? '#eea49b' : '#ffe2a6', start });
      }
      if (['hit', 'fire-hit'].includes(event.kind)) this.bossFlashUntil = Math.max(this.bossFlashUntil, start + 0.09);
      if (!this.reduced && ['slam', 'fire-hit', 'hurt'].includes(event.kind) && age < 0.15) {
        this.shakeUntil = Math.max(this.shakeUntil, start + 0.14);
        this.shakePower = event.kind === 'slam' ? 2 : 1;
      }
    }
    if (this.particles.length > 180) this.particles.splice(0, this.particles.length - 180);
    if (this.numbers.length > 12) this.numbers.splice(0, this.numbers.length - 12);
    if (this.smoke.length > 36) this.smoke.splice(0, this.smoke.length - 36);
    if (this.scars.length > 8) this.scars.splice(0, this.scars.length - 8);
  }

  update(now) {
    this.particles = this.particles.filter(p => now - p.start < p.life);
    this.numbers = this.numbers.filter(p => now - p.start < 0.65);
    this.smoke = this.smoke.filter(p => now - p.start < p.life);
    this.scars = this.scars.filter(p => now - p.start < 1.2);
  }

  shake(now) {
    if (this.reduced || now >= this.shakeUntil) return { x: 0, y: 0 };
    return { x: Math.sin(now * 143) > 0 ? this.shakePower : -this.shakePower, y: Math.sin(now * 113) > 0 ? 1 : -1 };
  }
}
