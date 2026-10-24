// Scanline polygons and integer lines: shaped silhouettes without antialiasing.
export function pixelLine(ctx, x0, y0, x1, y1, color) {
  if (![x0, y0, x1, y1].every(Number.isFinite) || Math.abs(x1 - x0) + Math.abs(y1 - y0) > 2048) return;
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
  const dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
  let error = dx + dy;
  ctx.fillStyle = color;
  while (true) {
    ctx.fillRect(x0, y0, 1, 1);
    if (x0 === x1 && y0 === y1) break;
    const twice = 2 * error;
    if (twice >= dy) { error += dy; x0 += sx; }
    if (twice <= dx) { error += dx; y0 += sy; }
  }
}

export function pixelPolygon(ctx, points, color, outline = null) {
  const vertices = points.map(([x, y]) => [Math.round(x), Math.round(y)]);
  if (vertices.length < 3 || vertices.length > 64 || vertices.some(point => point.some(value => !Number.isFinite(value)))) return;
  const top = Math.min(...vertices.map(p => p[1])), bottom = Math.max(...vertices.map(p => p[1]));
  if (bottom - top > 512) return;
  ctx.fillStyle = color;
  for (let y = top; y <= bottom; y++) {
    const hits = [];
    for (let i = 0; i < vertices.length; i++) {
      const [ax, ay] = vertices[i], [bx, by] = vertices[(i + 1) % vertices.length];
      if ((ay <= y && by > y) || (by <= y && ay > y)) hits.push(ax + (y - ay) / (by - ay) * (bx - ax));
    }
    hits.sort((a, b) => a - b);
    for (let i = 0; i + 1 < hits.length; i += 2) {
      const left = Math.ceil(hits[i]), right = Math.floor(hits[i + 1]);
      ctx.fillRect(left, y, Math.max(0, right - left + 1), 1);
    }
  }
  if (outline) for (let i = 0; i < vertices.length; i++) {
    const a = vertices[i], b = vertices[(i + 1) % vertices.length];
    pixelLine(ctx, ...a, ...b, outline);
  }
}

export function pixelOval(ctx, x, y, rx, ry, color, outline = null) {
  const points = Array.from({ length: 16 }, (_, i) => [x + Math.cos(i * Math.PI / 8) * rx, y + Math.sin(i * Math.PI / 8) * ry]);
  pixelPolygon(ctx, points, color, outline);
}
