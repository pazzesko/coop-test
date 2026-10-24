import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';

test('Pages stages the complete module graph under one deterministic version', () => {
  const dir = mkdtempSync(join(existsSync('/tmp/opencode') ? '/tmp/opencode' : tmpdir(), 'coop-build-'));
  try {
    execFileSync('python3', ['tools/build_site.py', '--output', dir]);
    const html = readFileSync(join(dir, 'index.html'), 'utf8');
    const version = html.match(/assets\/([a-f0-9]{12})\/src\/main\.js/)[1];
    assert.ok(html.includes(`assets/${version}/style.css`));
    for (const name of ['main', 'backend', 'network', 'game', 'config', 'presence', 'fullscreen']) {
      assert.ok(existsSync(join(dir, `assets/${version}/src/${name}.js`)));
    }
    assert.equal(existsSync(join(dir, 'database.rules.json')), false);
    assert.equal(existsSync(join(dir, 'tests')), false);
    execFileSync('python3', ['tools/build_site.py', '--output', dir]);
    assert.equal(readFileSync(join(dir, 'index.html'), 'utf8'), html);
  } finally { rmSync(dir, { recursive: true }); }
});
