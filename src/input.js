export class Input {
  constructor(surface, stick, knob, buttons = {}) {
    this.keys = new Set();
    this.vector = { x: 0, y: 0 };
    this.pointer = null;
    this.enabled = false;
    this.stick = stick;
    this.knob = knob;
    this.attackHeld = false;
    this.attackQueued = false;
    this.dodgeQueued = false;
    window.addEventListener('keydown', event => {
      if (!this.enabled || !['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight', 'Space', 'KeyJ', 'KeyK', 'ShiftLeft', 'ShiftRight'].includes(event.code)) return;
      event.preventDefault();
      if (!event.repeat && ['KeyK', 'ShiftLeft', 'ShiftRight'].includes(event.code)) this.dodgeQueued = true;
      if (!event.repeat && ['KeyJ', 'Space'].includes(event.code)) this.attackQueued = true;
      this.keys.add(event.code);
    });
    window.addEventListener('keyup', event => this.keys.delete(event.code));
    window.addEventListener('blur', () => this.reset());
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.reset(); });
    surface.addEventListener('pointerdown', event => {
      if (!this.enabled || event.pointerType === 'mouse' || this.pointer !== null) return;
      event.preventDefault();
      const bounds = surface.getBoundingClientRect();
      this.pointer = event.pointerId;
      this.origin = {
        x: Math.max(bounds.left + 55, Math.min(bounds.right - 55, event.clientX)),
        y: Math.max(bounds.top + 55, Math.min(bounds.bottom - 55, event.clientY)),
      };
      surface.setPointerCapture(event.pointerId);
      stick.style.left = `${this.origin.x - bounds.left}px`;
      stick.style.top = `${this.origin.y - bounds.top}px`;
      stick.hidden = false;
    });
    surface.addEventListener('pointermove', event => {
      if (event.pointerId !== this.pointer) return;
      const dx = event.clientX - this.origin.x;
      const dy = event.clientY - this.origin.y;
      const distance = Math.hypot(dx, dy);
      const scale = distance > 38 ? 38 / distance : 1;
      this.knob.style.transform = `translate(${dx * scale}px, ${dy * scale}px)`;
      const amount = Math.max(0, Math.min(1, (distance - 6) / 32));
      this.vector = distance ? { x: dx / distance * amount, y: dy / distance * amount } : { x: 0, y: 0 };
    });
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
      surface.addEventListener(type, event => { if (event.pointerId === this.pointer) this.clearStick(); });
    }
    for (const [kind, button] of Object.entries(buttons)) {
      let pointer = null;
      button.addEventListener('pointerdown', event => {
        if (!this.enabled || pointer !== null) return;
        event.preventDefault();
        pointer = event.pointerId;
        button.setPointerCapture(pointer);
        if (kind === 'attack') { this.attackHeld = true; this.attackQueued = true; }
        else this.dodgeQueued = true;
      });
      for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(type, event => {
        if (event.pointerId !== pointer) return;
        pointer = null;
        if (kind === 'attack') this.attackHeld = false;
      });
    }
  }

  axis() {
    const has = (...keys) => keys.some(key => this.keys.has(key));
    const x = Number(has('KeyD', 'ArrowRight')) - Number(has('KeyA', 'ArrowLeft'));
    const y = Number(has('KeyS', 'ArrowDown')) - Number(has('KeyW', 'ArrowUp'));
    return x || y ? { x, y } : this.vector;
  }

  attacking() {
    const active = this.attackQueued || this.attackHeld || this.keys.has('Space') || this.keys.has('KeyJ');
    this.attackQueued = false;
    return active;
  }

  dodging() {
    const queued = this.dodgeQueued;
    this.dodgeQueued = false;
    return queued;
  }

  clearStick() {
    this.pointer = null;
    this.vector = { x: 0, y: 0 };
    this.stick.hidden = true;
    this.knob.style.transform = '';
  }

  reset() {
    this.keys.clear();
    this.clearStick();
    this.attackHeld = false;
    this.attackQueued = false;
    this.dodgeQueued = false;
  }
}
