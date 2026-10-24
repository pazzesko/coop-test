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
