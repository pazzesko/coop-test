import { pixelLine, pixelPolygon, pixelOval } from './pixel.js';

// Authored at the final resolution, not enlarged versions of the old sprites.
export const HERO_SIZE = { width: 96, height: 104, x: 44, y: 99 };
export const BOSS_SIZE = { width: 160, height: 164, x: 70, y: 156 };
const INK = '#171422';

function studio(size, dx = 0, dy = 0) {
  const canvas = document.createElement('canvas');
  canvas.width = size.width; canvas.height = size.height;
  const ctx = canvas.getContext('2d');
  // Edged silhouettes get bold 2px cartoon contours by default; thin straps and
  // small details opt out with `false`. Shading (null edge) stays soft.
  const p = (points, color, edge = INK, bold = true) => pixelPolygon(ctx, points.map(([x, y]) => [x + dx, y + dy]), color, edge, edge ? bold : false);
  const l = (a, b, color = INK, width = 1) => pixelLine(ctx, a[0] + dx, a[1] + dy, b[0] + dx, b[1] + dy, color, width);
  const r = (x, y, w, h, color) => { ctx.fillStyle = color; ctx.fillRect(Math.round(x + dx), Math.round(y + dy), w, h); };
  return { canvas, p, l, r };
}

export function heroSprite(id, frame = 0, pose = 'idle') {
  const prep = pose === 'attack' && frame === 0, hit = pose === 'attack' && frame === 1;
  const crouch = pose === 'dodge' ? 10 : pose === 'hurt' ? 3 : 0;
  const bob = pose === 'walk' ? [0, -2, 0, -1][frame % 4] : pose === 'idle' ? -frame : 0;
  const lean = hit ? 4 : prep ? -3 : 0;
  const { canvas, p, l, r } = studio(HERO_SIZE, lean, bob);
  const skin = '#e09a62', shadow = '#93503a', mid = '#c07349', light = '#f7c795', shine = '#ffe9c0';
  const cloth = id === 'mage' ? ['#5a2d84', '#8244c2', '#a86fd8', '#d3a9f2'] : id === 'archer' ? ['#1f5c3a', '#2f8a54', '#4fb678', '#a3e6b8'] : ['#27488c', '#3a67c4', '#6b95ea', '#aecdff'];
  const c = y => y + crouch * Math.max(0, (80 - y) / 70);
  const body = (points, color, edge = INK) => p(points.map(([x, y]) => [x, c(y)]), color, edge);
  const stride = pose === 'walk' ? [0, 5, 0, -5][frame % 4] : hit ? 3 : 0;
  // Long bent legs, narrow ankles, asymmetric planted stance (not chibi).
  p([[34, 60], [45, 63], [40, 74], [31 + stride, 82], [29 + stride, 94], [20 + stride, 94], [21 + stride, 79], [28, 69]], cloth[1]);
  p([[45, 62], [56, 59], [60, 73], [69 - stride, 87], [67 - stride, 94], [59 - stride, 95], [54 - stride, 82], [46, 76]], cloth[0]);
  p([[31, 67], [37, 65], [36, 72], [26 + stride, 81], [24 + stride, 89], [23 + stride, 79]], cloth[2], null);
  p([[50, 66], [54, 64], [57, 75], [63 - stride, 85], [60 - stride, 86], [53, 77]], cloth[1], null);
  l([29, 73], [35, 74], cloth[0]); l([55, 76], [60, 78], cloth[2]);
  for (const [x, y, flip] of [[20 + stride, 86, -1], [59 - stride, 88, 1]]) {
    p([[x, y], [x + 8, y - 1], [x + 9, 95], [x + 13 + flip * 3, 98], [x + 12 + flip * 3, 100], [x - 4, 100], [x - 3, 96]], '#654133');
    p([[x + 1, y + 1], [x + 5, y], [x + 5, 96], [x - 1, 97]], '#a36d43', null);
    l([x, y + 3], [x + 7, y + 2], '#d5a168'); l([x - 2, 98], [x + 10, 98], '#b88352');
  }
  if (id === 'mage') {
    body([[30, 28], [48, 28], [56, 43], [54, 58], [64, 81], [55, 88], [45, 80], [36, 85], [21, 84], [26, 59], [23, 43]], cloth[1]);
    body([[29, 36], [35, 35], [33, 60], [26, 79], [24, 80], [29, 57]], cloth[2], null);
    body([[45, 40], [50, 43], [46, 59], [56, 82], [49, 78], [40, 61]], cloth[0], null);
    body([[37, 58], [40, 58], [38, 76], [32, 81]], cloth[3], null);
    l([27, 81], [36, 82], '#e6bd62'); l([48, 79], [55, 85], '#e6bd62');
  } else {
    body([[30, 29], [43, 27], [55, 33], [57, 45], [52, 60], [36, 63], [27, 53], [24, 39]], id === 'barbarian' ? skin : cloth[1]);
    body([[26, 38], [31, 34], [35, 40], [33, 50], [40, 58], [35, 60], [28, 51]], id === 'barbarian' ? mid : cloth[0], null);
    body([[35, 31], [41, 30], [46, 34], [43, 39], [35, 39]], id === 'barbarian' ? light : cloth[3], null);
    body([[46, 34], [51, 35], [54, 40], [46, 42], [43, 39]], id === 'barbarian' ? light : cloth[2], null);
    if (id === 'barbarian') {
      l([42, 35], [42, 42], mid); l([34, 43], [42, 45], shadow); l([45, 44], [51, 43], shadow);
      l([40, 48], [48, 49], mid); l([40, 54], [46, 54], mid);
      body([[29, 29], [32, 28], [49, 57], [46, 61]], '#5d3531', INK, false);
      body([[23, 31], [30, 28], [35, 32], [34, 38], [25, 40], [20, 36]], '#77758a');
      l([23, 32], [30, 30], '#d2ced0'); r(26, c(34), 2, 2, '#e9b75e');
    } else {
      body([[24, 31], [30, 28], [28, 48], [24, 65], [14, 74], [21, 48]], cloth[0]);
      body([[24, 34], [27, 33], [24, 55], [18, 66]], cloth[2], null);
      body([[48, 30], [52, 32], [35, 62], [32, 61]], '#9e6c3c', INK, false);
      l([49, 33], [35, 57], '#d4a365');
      body([[21, 26], [25, 25], [29, 43], [25, 45]], '#754837');
      for (let i = 0; i < 3; i++) l([19 + i * 3, 22], [25 + i * 2, 36], '#d9ce9c');
    }
  }
  // Rear arm: tapered biceps, elbow, wrist wrap and curled fist.
  body([[25, 35], [30, 36], [30, 43], [25, 51], [26, 57], [21, 60], [17, 55], [18, 46], [20, 39]], skin);
  body([[21, 40], [24, 37], [27, 39], [24, 45], [21, 48], [20, 46]], light, null);
  body([[18, 49], [22, 51], [24, 55], [21, 57], [18, 54]], mid, null);
  body([[18, 53], [25, 52], [27, 57], [20, 60], [17, 57]], '#5a3c39');
  l([19, c(54)], [24, c(54)], '#b68a64');
  body([[19, 58], [25, 56], [29, 58], [29, 64], [24, 67], [18, 64]], skin);
  l([22, c(60)], [26, c(60)], light); l([23, c(63)], [26, c(63)], mid);
  body([[33, 59], [52, 57], [54, 62], [35, 66], [30, 63]], '#59382f');
  body([[41, 58], [50, 57], [51, 64], [42, 65]], '#ffd23e', INK, false);
  r(44, c(60), 3, 2, '#5a3a30');
  // Compact three-quarter head with big arcade eyes, dark pupils, bold angry brows.
  body([[35, 13], [43, 11], [50, 14], [52, 20], [55, 23], [52, 25], [51, 30], [45, 33], [38, 30], [33, 24], [32, 18]], skin);
  body([[33, 19], [37, 18], [39, 25], [45, 30], [44, 32], [38, 29], [34, 25]], mid, null);
  body([[39, 15], [45, 14], [48, 17], [46, 20], [39, 19]], light, null);
  body([[48, 21], [50, 21], [52, 23], [49, 24]], light, null);
  l([37, c(20)], [43, c(22)], INK, 2);
  l([44, c(22)], [54, c(20)], INK, 2);
  r(38, c(22), 5, 4, '#fdfdf0'); r(45, c(21), 8, 5, '#fdfdf0');
  r(38, c(21), 5, 1, INK); r(38, c(26), 5, 1, INK); r(37, c(22), 1, 4, INK); r(43, c(22), 1, 4, INK);
  r(45, c(20), 8, 1, INK); r(45, c(26), 8, 1, INK); r(44, c(21), 1, 5, INK); r(53, c(21), 1, 5, INK);
  r(41, c(23), 2, 3, INK); r(50, c(22), 2, 3, INK); r(42, c(23), 1, 1, '#ffffff');
  r(45, c(29), 7, 2, '#fdfdf0');
  l([44, c(28)], [53, c(28)], INK); l([44, c(31)], [52, c(30)], shadow);
  if (id === 'barbarian') {
    body([[32, 23], [29, 18], [31, 12], [35, 9], [34, 6], [41, 8], [46, 7], [51, 11], [53, 16], [46, 14], [41, 16], [37, 14], [35, 23]], '#63362e');
    body([[32, 16], [34, 11], [38, 10], [37, 14]], '#c38344', null);
    body([[40, 10], [45, 9], [49, 12], [45, 12]], '#a56337', null);
    body([[33, 15], [39, 14], [50, 13], [51, 15], [39, 19], [33, 20]], '#bb363b', INK, false);
    body([[34, 16], [25, 20], [21, 17], [28, 14]], '#da5145', INK, false);
  } else if (id === 'mage') {
    body([[29, 16], [34, 10], [37, 2], [44, 0], [45, 7], [50, 12], [58, 16], [52, 19], [38, 18]], cloth[1]);
    body([[35, 13], [39, 4], [42, 2], [41, 10], [46, 15]], cloth[3], null);
    l([32, c(17)], [53, c(18)], '#e4bf60');
    body([[34, 25], [38, 28], [43, 30], [47, 29], [45, 35], [40, 38], [38, 33]], '#ddd4ba');
    l([37, c(28)], [41, c(34)], '#9b94a6');
  } else {
    body([[30, 25], [29, 17], [32, 10], [40, 6], [47, 8], [52, 13], [53, 17], [46, 14], [40, 14], [35, 19], [35, 28]], cloth[1]);
    body([[32, 16], [35, 11], [40, 9], [46, 11], [39, 12]], cloth[3], null);
    body([[35, 28], [41, 31], [49, 29], [50, 33], [40, 36], [34, 33]], '#d9a03c');
    body([[35, 32], [29, 39], [23, 42], [26, 35]], '#ba6938');
  }
  // Front arm changes its entire silhouette during anticipation/release.
  const hx = prep ? 39 : hit ? 72 : 60, hy = prep ? 28 : hit ? 43 : 50;
  body([[51, 34], [56, 34], [60, 40], [hx + 3, hy - 3], [hx + 5, hy + 3], [hx, hy + 7], [54, 49], [50, 44]], id === 'mage' ? cloth[1] : skin);
  body([[53, 36], [56, 37], [58, 42], [hx, hy], [hx - 2, hy + 3], [53, 44]], id === 'mage' ? cloth[2] : light, null);
  body([[hx - 5, hy - 4], [hx + 4, hy - 5], [hx + 7, hy - 1], [hx + 6, hy + 5], [hx, hy + 7], [hx - 6, hy + 2]], skin);
  l([hx - 2, c(hy - 2)], [hx + 2, c(hy - 3)], shine); l([hx - 3, c(hy + 1)], [hx + 3, c(hy + 1)], mid); l([hx - 1, c(hy + 4)], [hx + 4, c(hy + 3)], mid);
  if (id === 'barbarian') {
    const ax = prep ? 22 : hit ? 82 : 66, ay = prep ? 9 : hit ? 33 : 31;
    p([[ax - 2, ay], [ax + 1, ay], [hx + 2, c(hy + 21)], [hx - 1, c(hy + 21)]], '#9a653c', INK, false);
    l([ax - 1, ay + 4], [hx, c(hy + 18)], '#d1a064');
    p([[ax - 10, ay - 5], [ax - 3, ay - 8], [ax + 5, ay - 6], [ax + 9, ay - 1], [ax + 9, ay + 8], [ax + 3, ay + 15], [ax - 5, ay + 12], [ax - 3, ay + 5], [ax - 8, ay + 3]], '#8296ac');
    p([[ax + 5, ay - 5], [ax + 8, ay], [ax + 8, ay + 7], [ax + 3, ay + 13], [ax, ay + 12], [ax + 4, ay + 6]], '#edf0dc', null);
    p([[ax - 8, ay - 4], [ax - 3, ay - 6], [ax + 2, ay - 4], [ax - 2, ay]], '#b7ccd0', null);
    l([ax - 2, ay - 4], [ax, ay + 10], '#52617a');
  } else if (id === 'mage') {
    const sx = hit ? 78 : prep ? 48 : 70, sy = hit ? 24 : prep ? 5 : 16;
    p([[sx, sy + 4], [sx + 3, sy + 4], [sx - 3, 96], [sx - 6, 97]], '#7f5439', INK, false);
    l([sx + 1, sy + 10], [sx - 4, 92], '#c1995b');
    p([[sx - 7, sy + 2], [sx - 5, sy - 5], [sx + 1, sy - 9], [sx + 6, sy - 4], [sx + 7, sy + 2], [sx + 2, sy + 8], [sx - 3, sy + 7]], '#277e9c');
    p([[sx - 4, sy], [sx - 3, sy - 4], [sx + 1, sy - 6], [sx + 3, sy - 2], [sx, sy + 4]], '#79e4db', null);
    r(sx - 2, sy - 3, 2, 3, '#e4ffe5');
    l([sx - 5, sy + 5], [sx + 3, sy + 5], '#d9b35e');
  } else {
    const bx = hit ? 79 : 70, pull = prep ? 42 : bx - 2;
    p([[bx - 5, 22], [bx - 1, 24], [bx + 5, 36], [bx + 6, 52], [bx + 2, 67], [bx - 5, 76], [bx - 3, 69], [bx + 2, 53], [bx + 1, 37], [bx - 4, 27]], '#b57c3f');
    l([bx - 2, 27], [bx + 3, 38], '#ebc178'); l([bx + 3, 54], [bx, 66], '#e2b774');
    l([bx - 4, 24], [pull, 49], '#dcd8b2'); l([pull, 49], [bx - 4, 73], '#dcd8b2');
    if (!hit) { l([pull - 8, 49], [bx + 12, 49], '#e6d4a0'); p([[bx + 9, 47], [bx + 14, 49], [bx + 9, 51]], '#cadbd8', INK, false); }
  }
  return canvas;
}

export function orcSprite(pose = 'idle', frame = 0) {
  const slam = pose === 'slam', overhead = pose === 'overhead', windup = pose === 'windup';
  const low = slam ? 8 : pose === 'recover' ? 4 : pose === 'dead' ? 12 : 0;
  const { canvas, p, l, r } = studio(BOSS_SIZE, slam ? 3 : 0, pose === 'idle' ? -frame : windup || overhead ? -frame : 0);
  const green = '#74b13e', dark = '#2c6335', shade = '#4a8a3c', light = '#b4dc59', glint = '#dff287';
  p([[48, 98], [67, 101], [62, 119], [46, 133], [42, 151], [26, 153], [28, 131], [37, 114]], '#6d4547');
  p([[72, 101], [90, 96], [97, 116], [111, 140], [108, 151], [93, 151], [84, 131], [72, 122]], '#513749');
  p([[42, 114], [53, 108], [49, 120], [35, 135], [33, 146], [30, 146], [33, 132]], '#a76a54', null);
  p([[83, 109], [88, 107], [93, 122], [103, 139], [98, 141], [88, 128]], '#80515a', null);
  for (const [x, y] of [[25, 140], [93, 141]]) {
    p([[x, y], [x + 15, y - 2], [x + 18, 151], [x + 25, 155], [x + 24, 158], [x - 5, 158], [x - 5, 153]], '#3d3e52');
    p([[x + 2, y + 1], [x + 12, y], [x + 13, 150], [x - 1, 152]], '#697184', null);
    l([x + 1, y + 3], [x + 12, y + 1], '#a8b4bb'); l([x - 2, 156], [x + 21, 156], '#89929c');
  }
  const b = (points, color, edge = INK) => p(points.map(([x, y]) => [x, y + low * Math.max(0, (122 - y) / 100)]), color, edge);
  b([[43, 47], [60, 40], [80, 43], [97, 54], [100, 74], [91, 99], [73, 108], [47, 105], [32, 89], [30, 65]], green);
  b([[34, 62], [43, 54], [48, 69], [45, 82], [55, 98], [48, 101], [36, 88], [32, 75]], dark, null);
  b([[46, 51], [59, 46], [68, 51], [66, 62], [52, 65], [44, 60]], light, null);
  b([[71, 49], [81, 49], [91, 57], [90, 65], [78, 66], [69, 60]], light, null);
  b([[51, 52], [58, 49], [63, 51], [59, 54]], glint, null);
  b([[56, 71], [65, 69], [67, 76], [57, 77]], '#8bb943', null);
  b([[71, 71], [80, 70], [82, 77], [72, 78]], '#8bb943', null);
  l([68, 53 + low], [68, 65 + low], shade); l([51, 67 + low], [64, 67 + low], dark);
  l([74, 67 + low], [88, 67 + low], dark); l([60, 83 + low], [78, 84 + low], shade);
  b([[31, 53], [42, 55], [43, 68], [35, 80], [31, 91], [20, 93], [13, 86], [16, 71], [22, 58]], green);
  b([[23, 61], [31, 57], [36, 61], [34, 69], [24, 75], [20, 72]], light, null);
  b([[18, 77], [23, 75], [29, 81], [27, 87], [20, 88], [16, 84]], shade, null);
  b([[16, 86], [30, 87], [33, 94], [28, 100], [16, 97], [12, 92]], '#575268');
  l([17, 89 + low], [28, 90 + low], '#a39b9d');
  b([[18, 97], [28, 98], [32, 103], [28, 110], [19, 109], [14, 103]], green);
  l([19, 101 + low], [27, 102 + low], light); l([20, 106 + low], [28, 106 + low], dark);
  b([[27, 49], [38, 44], [48, 49], [49, 57], [39, 63], [27, 61], [22, 55]], '#8c6351');
  b([[27, 50], [37, 47], [44, 51], [37, 54], [27, 54]], '#cc9b65', null);
  for (const [x, y] of [[29, 57], [40, 57]]) r(x, y + low, 2, 2, '#f2c878');
  b([[39, 98], [89, 95], [93, 104], [82, 112], [45, 114], [35, 107]], '#493548');
  b([[44, 108], [58, 109], [56, 124], [40, 120]], '#ad5147');
  b([[76, 108], [88, 105], [94, 120], [79, 124]], '#8c3a42');
  b([[59, 98], [75, 97], [79, 104], [74, 112], [59, 112], [55, 106]], '#b68c3c');
  r(61, 101, 11, 7, '#e5c467'); r(64, 103, 5, 3, '#654a35');
  // Compact snarling head, cheek planes, broken brow and small tusks.
  b([[49, 20], [62, 15], [76, 18], [85, 26], [87, 39], [81, 49], [70, 54], [55, 50], [45, 40], [43, 29]], green);
  b([[45, 30], [52, 27], [55, 38], [64, 47], [60, 50], [50, 43], [46, 37]], dark, null);
  b([[52, 23], [61, 19], [71, 20], [75, 25], [64, 27], [54, 26]], light, null);
  b([[46, 29], [33, 22], [36, 34], [47, 38]], green); b([[83, 28], [99, 22], [93, 37], [85, 39]], green);
  b([[37, 27], [44, 30], [44, 34]], '#91b653', null); b([[88, 30], [95, 26], [91, 33]], light, null);
  b([[45, 27], [44, 20], [48, 15], [54, 15], [57, 10], [63, 13], [70, 11], [77, 16], [82, 15], [86, 23], [75, 22], [66, 18], [56, 21], [51, 27]], '#30303b');
  l([49, 19], [54, 18], '#68616a'); l([61, 15], [69, 16], '#67606a');
  b([[53, 30], [61, 29], [65, 32], [54, 34]], dark); b([[72, 30], [82, 28], [82, 32], [73, 34]], dark);
  // Big furious arcade eyes with red pupils and heavy bolted brows.
  l([49, 27 + low], [64, 30 + low], INK, 2);
  l([70, 30 + low], [85, 26 + low], INK, 2);
  r(51, 30 + low, 12, 8, '#fdfdf0'); r(70, 28 + low, 14, 9, '#fdfdf0');
  r(51, 29 + low, 12, 1, INK); r(51, 38 + low, 12, 1, INK); r(50, 30 + low, 1, 8, INK); r(63, 30 + low, 1, 8, INK);
  r(70, 27 + low, 14, 1, INK); r(70, 37 + low, 14, 1, INK); r(69, 28 + low, 1, 9, INK); r(84, 28 + low, 1, 9, INK);
  r(59, 32 + low, 3, 4, '#c8352e'); r(78, 30 + low, 3, 4, '#c8352e');
  r(60, 32 + low, 1, 1, '#ffffff'); r(79, 30 + low, 1, 1, '#ffffff');
  b([[64, 33], [70, 32], [76, 37], [73, 40], [63, 40], [60, 37]], '#8fb64a');
  l([64, 38 + low], [66, 38 + low], dark); l([71, 37 + low], [73, 37 + low], dark);
  b([[56, 41], [64, 43], [77, 40], [81, 43], [76, 49], [64, 50], [56, 46]], '#402a32');
  b([[57, 39], [61, 42], [62, 47], [58, 46]], '#e8dbac'); b([[76, 40], [80, 37], [79, 45], [75, 47]], '#e8dbac');
  r(65, 44 + low, 3, 2, '#d7c38c'); r(70, 43 + low, 3, 2, '#d7c38c');
  const hx = slam ? 110 : overhead ? 105 : 112, hy = slam ? 105 : overhead ? 51 : windup ? 66 : 83;
  b([[90, 53], [101, 55], [105, 68], [hx, hy - 5], [hx + 5, hy], [hx + 2, hy + 8], [102, hy + 10], [92, 76]], green);
  b([[94, 57], [99, 58], [101, 67], [hx, hy], [hx - 4, hy + 3], [95, 70]], light, null);
  const mx = slam ? 134 : overhead ? 119 : 133, my = slam ? 134 : overhead ? 20 + frame : windup ? 40 : 63;
  p([[mx - 2, my + 7], [mx + 2, my + 8], [hx + 2, hy + 22], [hx - 2, hy + 21]], '#986b3e', INK, false);
  l([mx, my + 12], [hx, hy + 17], '#c9a363');
  p([[mx - 15, my - 7], [mx - 7, my - 15], [mx + 7, my - 14], [mx + 15, my - 6], [mx + 16, my + 7], [mx + 7, my + 16], [mx - 7, my + 15], [mx - 16, my + 6]], '#65778b');
  p([[mx - 13, my - 6], [mx - 6, my - 12], [mx + 4, my - 12], [mx + 2, my - 6], [mx - 6, my - 3], [mx - 8, my + 9], [mx - 13, my + 4]], '#adbfc3', null);
  p([[mx + 5, my - 3], [mx + 13, my - 5], [mx + 14, my + 6], [mx + 6, my + 13], [mx + 2, my + 8]], '#3f4b63', null);
  for (const [dx, dy] of [[-16, 0], [0, -16], [16, 0], [0, 16]]) p([[mx + dx - 3, my + dy + 2], [mx + dx, my + dy - 5], [mx + dx + 3, my + dy + 2]], '#d9d8b7', INK, false);
  r(mx - 2, my - 2, 5, 5, '#c39c52'); r(mx - 1, my - 1, 2, 2, '#f5d88a');
  b([[hx - 5, hy - 3], [hx + 3, hy - 4], [hx + 7, hy + 1], [hx + 5, hy + 8], [hx - 2, hy + 9], [hx - 7, hy + 3]], green);
  l([hx - 3, hy], [hx + 3, hy], light); l([hx, hy + 5], [hx + 5, hy + 4], dark);
  return canvas;
}
