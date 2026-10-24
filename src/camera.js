import { WIDTH, HEIGHT } from './world.js';
import { ART_UNIT } from './art.js';

// Inputs are native art-pixel viewport dimensions and world-unit focus.
// Integer camera origins keep scenery, actors and effects on one pixel grid.
export function pixelCameraFor(width, height, focus) {
  return {
    x: Math.round(Math.max(0, Math.min(WIDTH / ART_UNIT - width, focus.x / ART_UNIT - width / 2))),
    y: Math.round(Math.max(0, Math.min(HEIGHT / ART_UNIT - height, focus.y / ART_UNIT - height / 2))),
  };
}

export function battleCameraFor(width, height, player, boss) {
  const focus = { ...player };
  if (Math.hypot(player.x - boss.x, player.y - boss.y) < 400) focus.y = Math.min(player.y, boss.y - 100);
  const camera = pixelCameraFor(width, height, focus);
  // Leave headroom for the larger boss and its HUD, but never frame the local
  // hero out of view when retreating. Both constraints remain integer native
  // pixels; the hero sits low in the frame like classic brawler camera work.
  const followFloor = Math.max(0, Math.min(HEIGHT / ART_UNIT - height, player.y / ART_UNIT - height * 0.9));
  camera.y = Math.max(camera.y, Math.ceil(followFloor));
  return camera;
}
