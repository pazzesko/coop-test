import { WIDTH, HEIGHT } from './world.js';

export function cameraFor(width, height, focus) {
  // Cover the play area, not the whole map: portrait gets a close, tall view.
  const scale = Math.max(width / WIDTH, height / HEIGHT);
  const viewWidth = width / scale;
  const viewHeight = height / scale;
  return {
    scale,
    x: Math.max(0, Math.min(WIDTH - viewWidth, focus.x - viewWidth / 2)),
    y: Math.max(0, Math.min(HEIGHT - viewHeight, focus.y - viewHeight / 2)),
  };
}
