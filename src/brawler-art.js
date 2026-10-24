import { pixelLine, pixelPolygon, pixelOval } from './pixel.js';

export const HERO_SIZE = { width: 56, height: 60, x: 28, y: 57 };
export const BOSS_SIZE = { width: 100, height: 108, x: 45, y: 102 };
const INK = '#11182a';

function canvasFor(size) {
  const canvas = document.createElement('canvas');
  canvas.width = size.width; canvas.height = size.height;
  return canvas;
}

export function heroSprite(id, frame = 0, pose = 'idle') {
  const canvas = canvasFor(HERO_SIZE), ctx = canvas.getContext('2d');
  ctx.translate(4, 4);
  const prep = pose === 'attack' && frame === 0, hit = pose === 'attack' && frame === 1;
  const low = pose === 'dodge' ? 8 : pose === 'hurt' ? 2 : 0;
  const bob = pose === 'walk' ? [0, -1, 0, 1][frame % 4] : pose === 'idle' ? -frame : 0;
  const lean = hit ? 3 : prep || pose === 'hurt' ? -2 : 0;
  const stride = pose === 'walk' ? [0, 3, 0, -3][frame % 4] : hit ? 2 : 0;
  const poly = (points, color, edge = INK) => pixelPolygon(ctx, points.map(([x, y]) => [x + lean, y + low + bob]), color, edge);
  const oval = (x, y, rx, ry, color, edge = INK) => pixelOval(ctx, x + lean, y + low + bob, rx, ry, color, edge);
  const line = (a, b, color) => pixelLine(ctx, a[0] + lean, a[1] + low + bob, b[0] + lean, b[1] + low + bob, color);
  const patch = (x, y, w, h, color) => { ctx.fillStyle = color; ctx.fillRect(x + lean, y + low + bob, w, h); };
  const skin = id === 'archer' ? '#d99055' : '#f1ab69', shade = '#b76849', light = '#ffe1a3';
  // Weighted, bent legs and large planted boots, not rectangle limbs.
  pixelPolygon(ctx, [[17, 35], [25, 38], [22 + stride, 46], [22 + stride, 51], [12 + stride, 52], [12 + stride, 49], [16, 44]], '#4476aa', INK);
  pixelPolygon(ctx, [[27, 36], [33, 35], [35 - stride, 46], [40 - stride, 49], [40 - stride, 53], [29 - stride, 53], [27, 47]], '#315385', INK);
  pixelPolygon(ctx, [[13 + stride, 47], [22 + stride, 47], [22 + stride, 51], [25 + stride, 52], [24 + stride, 54], [10 + stride, 54], [10 + stride, 51]], '#884b39', INK);
  pixelPolygon(ctx, [[29 - stride, 47], [35 - stride, 46], [37 - stride, 50], [41 - stride, 51], [41 - stride, 54], [28 - stride, 54]], '#773b35', INK);
  pixelLine(ctx, 12 + stride, 49, 20 + stride, 48, '#db985c'); pixelLine(ctx, 29 - stride, 49, 34 - stride, 48, '#c9814f');
  if (id === 'mage') {
    poly([[15, 20], [30, 20], [36, 33 - low], [39, 48 - low], [31, 52 - low], [26, 49 - low], [17, 52 - low], [10, 47 - low], [13, 33 - low]], '#9845bd');
    poly([[16, 23], [21, 24], [19, 44 - low], [15, 48 - low], [12, 45 - low]], '#d37ce0', null);
    poly([[26, 25], [32, 27], [34, 46 - low], [29, 49 - low]], '#65348f', null);
    poly([[19, 25], [28, 24], [30, 37 - low], [17, 38 - low]], '#643b9d');
    line([23, 25], [23, 45 - low], '#f3cf6b');
  } else if (id === 'archer') {
    poly([[15, 20], [27, 20], [30, 33 - low], [21, 42 - low], [11, 36 - low], [9, 26]], '#238d71');
    poly([[12, 24], [17, 24], [18, 34 - low], [12, 36 - low]], '#65ca8a', null);
    poly([[18, 22], [30, 21], [35, 29], [30, 38 - low], [19, 38 - low], [15, 31]], '#327694');
    poly([[18, 23], [22, 24], [25, 33 - low], [21, 36 - low], [17, 30]], '#6fb0ba', null);
    poly([[27, 20], [30, 21], [22, 38 - low], [19, 37 - low]], '#b77b48');
  } else {
    poly([[16, 20], [25, 18], [32, 21], [35, 29], [30, 37 - low], [18, 38 - low], [13, 29]], skin);
    poly([[15, 24], [20, 23], [23, 29], [18, 34 - low], [15, 29]], '#c97b4f', null);
    poly([[26, 23], [31, 24], [32, 29], [27, 28]], '#ffd18c', null);
    line([23, 24], [23, 29], shade); line([23, 30], [28, 31], shade);
    poly([[12, 20], [18, 19], [21, 23], [19, 27], [12, 26], [10, 23]], '#d9923f');
    poly([[12, 21], [17, 20], [19, 22], [14, 23]], '#ffe091', null);
    poly([[17, 21], [20, 20], [28, 36 - low], [25, 38 - low]], '#7c4e40');
  }
  // Big, shaded fist and rounded forearm.
  poly([[12, 24], [17, 25], [17, 31], [13, 37 - low], [8, 36 - low], [7, 31]], skin);
  poly([[9, 27], [12, 25], [14, 28], [11, 33 - low], [9, 32]], light, null);
  oval(10, 35 - low, 4, 4, skin); line([8, 34 - low], [11, 35 - low], shade);
  poly([[16, 36 - low], [31, 35 - low], [32, 40 - low], [18, 41 - low]], '#824933');
  patch(23, 36 - low, 5, 4, '#f6c85e'); patch(24, 37 - low, 3, 2, '#744938');
  // Expressive face in three-quarter view: eyes, brow, nose and grin.
  poly([[18, 7], [23, 4], [30, 5], [34, 10], [34, 15], [30, 20], [23, 20], [17, 15]], skin);
  poly([[18, 11], [22, 9], [23, 16], [27, 20], [22, 19], [18, 15]], shade, null);
  poly([[22, 6], [28, 6], [31, 9], [27, 10], [22, 9]], light, null);
  poly([[32, 11], [36, 12], [35, 15], [32, 15]], skin);
  patch(24, 11, 3, 2, '#fff2d0'); patch(30, 10, 3, 2, '#fff2d0'); patch(26, 11, 1, 2, INK); patch(32, 10, 1, 2, INK);
  line([23, 9], [27, 10], INK); line([30, 8], [33, 9], INK);
  line([28, 17], [32, 16], INK); patch(29, 17, 2, 1, '#fff2d0');
  if (id === 'barbarian') {
    poly([[16, 11], [17, 6], [20, 2], [25, 3], [29, 1], [32, 5], [34, 8], [29, 8], [26, 6], [22, 10]], '#a5532d');
    poly([[19, 5], [22, 3], [24, 4], [22, 7]], '#e9a54d', null);
    poly([[17, 9], [22, 8], [32, 6], [34, 8], [22, 11], [17, 12]], '#df414f');
    poly([[18, 10], [13, 13], [10, 10], [15, 9]], '#ec675a');
    const hand = prep ? [20, 14] : hit ? [39, 27] : [35, 31];
    poly([[29, 22], [34, 22], [hand[0] + 2, hand[1] - 3], [hand[0] + 4, hand[1] + 3], [hand[0] - 1, hand[1] + 5], [30, 30]], skin);
    oval(hand[0], hand[1], 4, 4, skin); patch(hand[0] - 2, hand[1] - 2, 2, 2, light);
    if (prep) {
      poly([[8, 4], [11, 3], [24, 25], [22, 27]], '#b67b42');
      poly([[2, 2], [9, 1], [14, 5], [13, 9], [9, 12], [3, 10], [1, 6]], '#c4e5eb');
      poly([[2, 2], [5, 2], [4, 8], [8, 11], [3, 10], [1, 6]], '#fff5d7', null);
    } else if (hit) {
      poly([[31, 39], [33, 40], [43, 20], [41, 19]], '#b67b42');
      poly([[39, 14], [45, 17], [47, 23], [45, 29], [39, 30], [36, 27], [38, 22]], '#b6dce6');
      poly([[44, 17], [47, 23], [45, 29], [42, 30], [44, 23]], '#fff5d7', null);
    } else {
      poly([[34, 49], [36, 49], [40, 20], [38, 20]], '#b67b42');
      poly([[35, 18], [43, 18], [47, 23], [46, 29], [41, 32], [35, 28], [37, 24]], '#abd4de');
      poly([[43, 18], [47, 23], [46, 29], [42, 32], [44, 25]], '#f5f4d6', null);
    }
  } else if (id === 'mage') {
    poly([[15, 8], [20, 1], [28, 0], [29, 4], [34, 7], [38, 10], [32, 13], [20, 13], [12, 11]], '#a453ce');
    poly([[18, 8], [21, 2], [26, 1], [26, 6], [29, 9]], '#de91ea', null);
    line([15, 10], [34, 10], '#f6d36b');
    const sx = prep ? 32 : hit ? 43 : 40, sy = prep ? 3 : hit ? 18 : 14;
    poly([[sx - 1, sy + 2], [sx + 1, sy + 2], [sx - 2, 49], [sx - 4, 49]], '#b77d4f');
    oval(sx, sy, 5, 5, '#2ed0d2'); oval(sx - 1, sy - 1, 2, 2, '#d8ffe0', null);
    poly([[29, 23], [33, 23], [hit ? 42 : 35, hit ? 26 : 33], [hit ? 39 : 31, hit ? 30 : 36], [28, 30]], '#b257ce');
    oval(hit ? 41 : 34, hit ? 27 : 34, 4, 3, skin);
    patch(23, 30, 2, 4, '#f6d36b'); patch(22, 31, 4, 2, '#f6d36b');
  } else {
    poly([[16, 13], [16, 7], [20, 2], [28, 2], [33, 6], [35, 10], [29, 9], [23, 8], [20, 14]], '#27865f');
    poly([[18, 7], [22, 3], [27, 3], [29, 6], [22, 6]], '#70d16d', null);
    poly([[17, 18], [25, 18], [32, 17], [33, 21], [22, 23], [15, 21]], '#f1bd40');
    poly([[17, 20], [12, 27], [8, 25], [12, 19]], '#e67e35');
    const bx = hit ? 43 : 40, pull = prep ? 25 : bx - 1;
    poly([[bx - 3, 14], [bx, 16], [bx + 3, 23], [bx + 3, 32], [bx, 40], [bx - 4, 43], [bx - 2, 38], [bx + 1, 31], [bx + 1, 23], [bx - 1, 18]], '#e7a74c');
    line([bx - 2, 16], [pull, 28], '#f5e9c2'); line([pull, 28], [bx - 3, 41], '#f5e9c2');
    poly([[29, 24], [33, 23], [prep ? 28 : 40, 26], [prep ? 26 : 39, 31], [29, 31]], skin);
    oval(prep ? 27 : 39, 28, 3, 3, skin);
    if (!hit) { line([23, 28], [46, 28], '#efefcd'); poly([[43, 26], [47, 28], [43, 30]], '#fff6d3'); }
  }
  return canvas;
}

export function orcSprite(pose = 'idle', frame = 0) {
  const canvas = canvasFor(BOSS_SIZE), ctx = canvas.getContext('2d');
  ctx.translate(2, 2);
  const low = pose === 'slam' ? 7 : pose === 'recover' ? 3 : pose === 'dead' ? 9 : 0;
  const bob = pose === 'idle' ? -frame : pose === 'windup' ? -frame - 2 : pose === 'overhead' ? -3 - frame : 0;
  const lean = pose === 'slam' ? 3 : pose === 'windup' ? -2 : 0;
  const poly = (points, color, edge = INK) => pixelPolygon(ctx, points.map(([x, y]) => [x + lean, y + low + bob]), color, edge);
  const oval = (x, y, rx, ry, color, edge = INK) => pixelOval(ctx, x + lean, y + low + bob, rx, ry, color, edge);
  const line = (a, b, color) => pixelLine(ctx, a[0] + lean, a[1] + low + bob, b[0] + lean, b[1] + low + bob, color);
  const patch = (x, y, w, h, color) => { ctx.fillStyle = color; ctx.fillRect(x + lean, y + low + bob, w, h); };
  const green = '#65b940', dark = '#2b743d', light = '#abe563';
  pixelPolygon(ctx, [[23, 74], [39, 74], [36, 88], [33, 97], [14, 98], [12, 94], [21, 89]], '#7d4b59', INK);
  pixelPolygon(ctx, [[45, 73], [60, 72], [66, 89], [75, 94], [74, 98], [53, 99], [48, 91]], '#69374f', INK);
  pixelPolygon(ctx, [[15, 90], [32, 90], [34, 96], [31, 100], [9, 100], [9, 96]], '#394a68', INK);
  pixelPolygon(ctx, [[51, 90], [65, 89], [68, 94], [76, 96], [76, 100], [52, 100]], '#30405f', INK);
  pixelLine(ctx, 14, 92, 28, 92, '#8ca7ba'); pixelLine(ctx, 56, 92, 65, 93, '#7895b1');
  poly([[22, 35], [35, 31], [51, 34], [63, 44], [65, 62 - low], [58, 77 - low], [32, 80 - low], [19, 71 - low], [14, 54]], green);
  poly([[17, 48], [27, 44], [30, 60 - low], [36, 72 - low], [28, 75 - low], [20, 67 - low]], dark, null);
  poly([[29, 38], [39, 35], [45, 40], [43, 50], [31, 50], [26, 46]], light, null);
  poly([[47, 40], [55, 43], [58, 50], [49, 51], [44, 47]], '#9ed756', null);
  line([41, 39], [42, 53], '#397b3d'); line([31, 53], [52, 54], '#397b3d'); line([37, 60 - low], [52, 61 - low], '#3e8740');
  // Heavy rounded upper arms with cel-shaded muscle planes.
  poly([[17, 39], [25, 42], [23, 57 - low], [16, 66 - low], [7, 62 - low], [5, 51], [10, 43]], green);
  oval(11, 58 - low, 7, 8, green); poly([[8, 47], [14, 42], [18, 46], [13, 56 - low], [8, 54]], light, null);
  poly([[7, 62 - low], [17, 64 - low], [18, 70 - low], [7, 70 - low], [3, 66 - low]], '#495777');
  poly([[15, 36], [24, 33], [31, 38], [29, 44], [20, 47], [12, 43]], '#bd7337');
  poly([[15, 37], [23, 35], [27, 38], [21, 40]], '#f8ca71', null);
  patch(17, 41, 2, 2, '#ffe6a1'); patch(25, 40, 2, 2, '#ffe6a1');
  poly([[53, 39], [64, 39], [73, 50], [70, 63 - low], [61, 67 - low], [54, 57]], green);
  poly([[60, 41], [65, 44], [69, 52], [64, 55], [58, 48]], light, null);
  poly([[20, 71 - low], [61, 69 - low], [64, 77 - low], [58, 81 - low], [27, 82 - low], [18, 77 - low]], '#393b58');
  poly([[25, 79 - low], [37, 80 - low], [35, 89 - low], [25, 87 - low]], '#b44c58');
  poly([[46, 79 - low], [58, 78 - low], [63, 87 - low], [49, 88 - low]], '#cc5b59');
  poly([[34, 71 - low], [47, 70 - low], [51, 76 - low], [47, 81 - low], [34, 81 - low]], '#e6b84d');
  patch(38, 73 - low, 7, 5, '#73543c'); patch(40, 74 - low, 3, 3, '#ffdc73');
  // Broad brow, pointed ears and an unmistakable toothy expression.
  poly([[25, 16], [35, 11], [48, 13], [57, 22], [58, 35], [52, 44], [32, 45], [23, 36], [20, 25]], green);
  poly([[22, 24], [29, 22], [32, 34], [37, 41], [30, 41], [23, 34]], dark, null);
  poly([[27, 18], [35, 14], [43, 15], [46, 21], [36, 22]], light, null);
  poly([[23, 24], [14, 19], [16, 31], [24, 34]], green); poly([[54, 24], [65, 20], [62, 32], [55, 33]], green);
  poly([[16, 22], [22, 26], [18, 28]], '#b9db69', null);
  poly([[25, 20], [27, 12], [33, 13], [36, 8], [41, 12], [46, 11], [51, 17], [54, 21], [43, 18], [34, 19]], '#363044');
  poly([[34, 12], [36, 4], [42, 12], [42, 6], [47, 15]], '#de4d47');
  poly([[27, 25], [36, 24], [38, 27], [28, 29]], '#265b37'); poly([[44, 25], [54, 23], [53, 28], [44, 29]], '#265b37');
  patch(29, 28, 7, 3, pose === 'dead' ? dark : '#fff0ba'); patch(45, 27, 7, 3, pose === 'dead' ? dark : '#fff0ba');
  patch(33, 28, 2, 3, '#aa3c38'); patch(46, 27, 2, 3, '#aa3c38');
  poly([[36, 29], [43, 28], [48, 33], [44, 35], [36, 35], [33, 32]], '#82c44e'); patch(36, 32, 2, 1, dark); patch(42, 32, 2, 1, dark);
  poly([[30, 36], [37, 38], [49, 35], [53, 38], [48, 43], [35, 44], [29, 40]], '#3b273a');
  poly([[31, 34], [35, 36], [36, 41], [32, 40]], '#fff1c6'); poly([[48, 34], [52, 33], [50, 40], [47, 41]], '#fff1c6');
  patch(37, 39, 3, 2, '#f3d59e'); patch(42, 38, 3, 2, '#f3d59e');
  const mx = pose === 'slam' ? 78 : 80, my = pose === 'slam' ? 82 : pose === 'overhead' ? 12 + frame : pose === 'windup' ? 26 : pose === 'recover' ? 65 : 45;
  if (pose === 'slam') pixelPolygon(ctx, [[63, 61], [66, 59], [80, 80], [77, 83]], '#c7904a', INK);
  else pixelPolygon(ctx, [[mx - 2, my + 6], [mx + 2, my + 6], [mx - 5, my + 35], [mx - 8, my + 35]], '#b77d48', INK);
  pixelPolygon(ctx, [[mx - 11, my - 4], [mx - 6, my - 11], [mx + 5, my - 12], [mx + 12, my - 5], [mx + 13, my + 5], [mx + 6, my + 12], [mx - 5, my + 12], [mx - 12, my + 5]], '#719bb8', INK);
  pixelPolygon(ctx, [[mx - 10, my - 4], [mx - 5, my - 9], [mx + 3, my - 10], [mx + 5, my - 6], [mx - 2, my - 4], [mx - 4, my + 7], [mx - 9, my + 5]], '#c4e3e5', null);
  pixelPolygon(ctx, [[mx + 4, my - 4], [mx + 11, my - 5], [mx + 11, my + 4], [mx + 5, my + 10], [mx + 1, my + 7]], '#41688e', null);
  for (const [dx, dy] of [[-13, 0], [0, -13], [13, 0], [0, 13]]) pixelPolygon(ctx, [[mx + dx - 3, my + dy + 2], [mx + dx, my + dy - 4], [mx + dx + 3, my + dy + 2]], '#e7efcf', INK);
  pixelOval(ctx, mx, my, 3, 3, '#edb454', INK);
  oval(pose === 'slam' ? 66 : 72, pose === 'overhead' ? 45 : 59 - low, 7, 6, '#8bc94c');
  line([68, pose === 'overhead' ? 43 : 56 - low], [72, pose === 'overhead' ? 45 : 59 - low], '#c8e982');
  return canvas;
}
