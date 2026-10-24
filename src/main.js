import { Backend } from './backend.js';
import { Connection } from './network.js';
import { Game } from './game.js';

const $ = id => document.getElementById(id);
const game = new Game({ arena: $('arena'), joystick: $('joystick'), knob: $('joystick-knob'), fps: $('fps') });
let name = '';
try { name = cleanName(localStorage.getItem('coop-test-name') || ''); } catch { /* Private browsing may disable storage. */ }
let phase = 'menu';
let connected = false;
let connection = null;
let bootError = '';
let retry = null;
let attempt = 0;

function cleanName(value) {
  return String(value).replace(/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g, '').trim().slice(0, 20);
}

function message(text) { $('status').textContent = text; }

function updateMenu() {
  $('player-name').textContent = name;
  $('name-form').hidden = Boolean(name);
  $('lobby').hidden = !name;
  $('play').disabled = !connected || phase !== 'menu';
  $('play').hidden = phase === 'searching' || phase === 'connecting';
  $('cancel').hidden = !['searching', 'connecting'].includes(phase);
  $('practice').disabled = phase !== 'menu';
  $('edit-name').disabled = phase !== 'menu';
  $('status-dot').classList.toggle('connected', connected);
}

const backend = new Backend({
  connection(value) {
    connected = value;
    if (!value) $('online-count').textContent = 'Offline';
    if (phase === 'menu') message(value ? 'Ready. Find a partner and explore the arena.' : 'Connecting to online services…');
    if (!value && phase === 'searching') {
      cancelSearch('Connection lost. Reconnect, then try again.');
    }
    updateMenu();
  },
  count(value) { $('online-count').textContent = `${value} player${value === 1 ? '' : 's'} online`; },
  error(error) {
    console.error(error);
    if (['searching', 'connecting'].includes(phase)) cancelSearch(friendlyError(error));
    else if (phase === 'menu') { bootError = friendlyError(error); message(bootError); }
  },
  displaced() {
    cancelSearch('Online play moved to another tab.');
  },
  match: match => connectMatch(match),
});

function friendlyError(error) {
  const code = `${error.code || ''} ${error.message || ''}`;
  if (/permission/i.test(code)) return 'Database access denied. Publish database.rules.json in your Firebase Realtime Database rules.';
  if (/operation-not-allowed|admin-restricted/i.test(code)) return 'Enable Anonymous sign-in in Firebase Authentication.';
  if (/unauthorized-domain/i.test(code)) return 'Add this website domain to Firebase Authentication → Settings → Authorized domains.';
  return error.message || 'Online service unavailable. You can still try movement offline.';
}

function cleanup() {
  ++attempt;
  clearTimeout(retry);
  connection?.close();
  connection = null;
  game.stop();
  backend.cancel().catch(error => console.warn('Cleanup:', error));
}

function showMenu(text) {
  $('menu').hidden = false;
  $('game').hidden = true;
  phase = 'menu';
  message(text || bootError || (connected ? 'Ready. Find a partner and explore the arena.' : 'Online services disconnected. Offline practice is available.'));
  updateMenu();
}

function cancelSearch(text) {
  cleanup();
  showMenu(text);
}

async function search() {
  if (!name || !connected || phase !== 'menu') return;
  const id = ++attempt;
  phase = 'searching';
  message('Looking for a random partner… You can cancel anytime.');
  updateMenu();
  try { await backend.search(name); }
  catch (error) { if (id === attempt) cancelSearch(friendlyError(error)); }
}

async function connectMatch(match) {
  if (phase !== 'searching') return;
  const id = attempt;
  phase = 'connecting';
  message(`Found ${match.peerName}. Connecting browsers…`);
  updateMenu();
  const peer = new Connection({
    position: position => game.receive(position),
    ping: value => { $('ping').textContent = `PING ${value} ms`; },
    status: text => { $('game-notice').textContent = text; },
    ready() {
      if (id !== attempt) return;
      phase = 'playing';
      $('menu').hidden = true;
      $('game').hidden = false;
      $('ping').textContent = 'PING …';
      $('fps').textContent = 'FPS …';
      $('game-notice').textContent = '';
      $('connection-label').textContent = `Online with ${match.peerName}`;
      game.start({ name, peerName: match.peerName, host: match.host, connection: peer });
    },
    error(error) {
      if (id !== attempt) return;
      const wasConnecting = phase === 'connecting';
      cleanup();
      showMenu(error.message);
      if (wasConnecting && connected && !document.hidden) {
        phase = 'searching';
        message(`${error.message} Searching again shortly…`);
        updateMenu();
        retry = setTimeout(() => { phase = 'menu'; search(); }, 2500);
      }
    },
  });
  connection = peer;
  try { await peer.open(match, backend); }
  catch (error) { peer.fail(error); }
}

$('name-form').addEventListener('submit', event => {
  event.preventDefault();
  const value = cleanName($('name-input').value);
  if (!value) { $('name-input').setCustomValidity('Enter at least one visible character.'); $('name-input').reportValidity(); return; }
  name = value;
  try { localStorage.setItem('coop-test-name', name); } catch { /* Name works for this session. */ }
  updateMenu();
});
$('name-input').addEventListener('input', () => $('name-input').setCustomValidity(''));
$('edit-name').addEventListener('click', () => {
  $('name-input').value = name;
  name = '';
  updateMenu();
  $('name-input').focus();
});
$('play').addEventListener('click', search);
$('cancel').addEventListener('click', () => cancelSearch());
$('practice').addEventListener('click', () => {
  cleanup();
  phase = 'practice';
  $('menu').hidden = true;
  $('game').hidden = false;
  $('ping').textContent = 'PING —';
  $('fps').textContent = 'FPS …';
  $('connection-label').textContent = 'Offline practice';
  $('game-notice').textContent = '';
  game.start({ name });
});
$('leave').addEventListener('click', () => { cleanup(); showMenu(); });
document.addEventListener('visibilitychange', () => {
  connection?.sendControl({ type: 'hidden', value: document.hidden });
  if (document.hidden && ['searching', 'connecting'].includes(phase)) cancelSearch('Search paused because this tab became inactive. Press Play online to search again.');
});
window.addEventListener('pagehide', () => {
  cleanup();
  if (backend.sdk) backend.sdk.goOffline(backend.db);
});
window.addEventListener('pageshow', event => {
  if (event.persisted) {
    if (backend.sdk) backend.sdk.goOnline(backend.db);
    showMenu();
  }
});

showMenu();
backend.init().catch(error => {
  connected = false;
  bootError = friendlyError(error);
  $('online-count').textContent = 'Online setup needed';
  message(bootError);
  updateMenu();
});
