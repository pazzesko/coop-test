export class Input {
  constructor(surface, stick, knob) {
    this.keys = new Set();
    this.vector = { x: 0, y: 0 };
    this.pointer = null;
    this.enabled = false;
    this.stick = stick;
    this.knob = knob;
    window.addEventListener('keydown', event => {
      if (!this.enabled || !['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight'].includes(event.code)) return;
      event.preventDefault();
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
      surface.addEventListener(type, event => { if (event.pointerId === this.pointer) this.reset(); });
    }
  }

  axis() {
    const has = (...keys) => keys.some(key => this.keys.has(key));
    const x = Number(has('KeyD', 'ArrowRight')) - Number(has('KeyA', 'ArrowLeft'));
    const y = Number(has('KeyS', 'ArrowDown')) - Number(has('KeyW', 'ArrowUp'));
    return x || y ? { x, y } : this.vector;
  }

  reset() {
    this.keys.clear();
    this.pointer = null;
    this.vector = { x: 0, y: 0 };
    this.stick.hidden = true;
    this.knob.style.transform = '';
  }
}
