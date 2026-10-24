export const WIDTH = 1120;
export const HEIGHT = 720;
export const RADIUS = 15;
export const SPEED = 220;
export const WALLS = [
  { x: 0, y: 0, w: WIDTH, h: 24 },
  { x: 0, y: HEIGHT - 24, w: WIDTH, h: 24 },
  { x: 0, y: 0, w: 24, h: HEIGHT },
  { x: WIDTH - 24, y: 0, w: 24, h: HEIGHT },
  { x: 230, y: 180, w: 180, h: 48 },
  { x: 710, y: 180, w: 180, h: 48 },
  { x: 230, y: 492, w: 180, h: 48 },
  { x: 710, y: 492, w: 180, h: 48 },
  { x: 536, y: 292, w: 48, h: 136 },
];

export function spawn(host = true) {
  return { x: host ? 460 : 660, y: 360 };
}

export function blocked(x, y) {
  return WALLS.some(w => {
    const cx = Math.max(w.x, Math.min(x, w.x + w.w));
    const cy = Math.max(w.y, Math.min(y, w.y + w.h));
    return (x - cx) ** 2 + (y - cy) ** 2 < RADIUS ** 2;
  });
}

export function move(player, dx, dy, dt) {
  const length = Math.hypot(dx, dy);
  if (!length || !Number.isFinite(length)) return;
  dx /= Math.max(1, length);
  dy /= Math.max(1, length);
  // Short substeps prevent passing through walls during slow frames.
  const steps = Math.max(1, Math.ceil(SPEED * dt / 6));
  for (let i = 0; i < steps; i++) {
    const x = Math.max(24 + RADIUS, Math.min(WIDTH - 24 - RADIUS, player.x + dx * SPEED * dt / steps));
    if (!blocked(x, player.y)) player.x = x;
    const y = Math.max(24 + RADIUS, Math.min(HEIGHT - 24 - RADIUS, player.y + dy * SPEED * dt / steps));
    if (!blocked(player.x, y)) player.y = y;
  }
}

export function validPosition(message) {
  return message?.type === 'position' && Number.isSafeInteger(message.seq) && message.seq >= 0
    && (message.t === undefined || (Number.isSafeInteger(message.t) && message.t >= 0))
    && (message.moving === undefined || typeof message.moving === 'boolean')
    && Number.isFinite(message.x) && Number.isFinite(message.y)
    && message.x >= 24 + RADIUS && message.x <= WIDTH - 24 - RADIUS
    && message.y >= 24 + RADIUS && message.y <= HEIGHT - 24 - RADIUS;
}
