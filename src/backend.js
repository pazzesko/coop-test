import { firebaseConfig, emulatorConfig } from './config.js';

const ROOT = 'v1';
const SDK = 'https://www.gstatic.com/firebasejs/13.1.0/';

export class Backend {
  constructor(events) {
    this.events = events;
    this.connected = false;
    this.generation = 0;
    this.session = crypto.randomUUID();
    this.offset = 0;
    this.busy = false;
    this.working = false;
    this.name = '';
  }

  now() { return Date.now() + this.offset; }

  async init() {
    if (!firebaseConfig.apiKey || !firebaseConfig.databaseURL || !firebaseConfig.projectId) {
      throw new Error('Online setup pending: add the Firebase web config to src/config.js. Offline practice is ready.');
    }
    const [appSDK, authSDK, dbSDK] = await Promise.all([
      import(SDK + 'firebase-app.js'),
      import(SDK + 'firebase-auth.js'),
      import(SDK + 'firebase-database.js'),
    ]);
    this.sdk = dbSDK;
    const app = appSDK.initializeApp(firebaseConfig);
    const auth = authSDK.getAuth(app);
    const emulate = emulatorConfig && ['localhost', '127.0.0.1'].includes(location.hostname);
    if (emulate) authSDK.connectAuthEmulator(auth, `http://127.0.0.1:${emulatorConfig.auth}`, { disableWarnings: true });
    await auth.authStateReady();
    const user = auth.currentUser || (await authSDK.signInAnonymously(auth)).user;
    this.uid = user.uid;
    this.db = dbSDK.getDatabase(app);
    if (emulate) dbSDK.connectDatabaseEmulator(this.db, '127.0.0.1', emulatorConfig.database);
    dbSDK.onValue(this.ref('.info/serverTimeOffset', false), s => { this.offset = s.val() || 0; });
    dbSDK.onValue(this.ref('.info/connected', false), async s => {
      this.connected = s.val() === true;
      this.events.connection(this.connected);
      if (!this.connected) return;
      try {
        const presence = this.ref(`presence/${this.uid}/${this.session}`);
        await dbSDK.onDisconnect(presence).remove();
        await dbSDK.set(presence, true);
      } catch (error) { this.events.error(error); }
    });
    dbSDK.onValue(this.ref('presence'), s => this.events.count(s.size), error => this.events.error(error));
    // Anonymous auth is persisted by Firebase. Multiple tabs share an identity,
    // but each has its own presence connection; the counter counts unique UIDs.
    this.channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('coop-test-session') : null;
    this.channel?.addEventListener('message', event => {
      if (event.data === 'claim-session' && this.busy) {
        this.cancel().catch(error => this.events.error(error));
        this.events.displaced();
      }
    });
  }

  ref(path, root = true) { return this.sdk.ref(this.db, root ? `${ROOT}/${path}` : path); }

  async search(name) {
    if (!this.connected) throw new Error('Not connected to matchmaking. Check your internet connection.');
    await this.cancel();
    this.channel?.postMessage('claim-session');
    const generation = ++this.generation;
    this.busy = true;
    this.name = name;
    const token = crypto.randomUUID();
    this.ownToken = token;
    const own = this.ref(`tickets/${this.uid}`);
    const ticket = { token, name, state: 'waiting', createdAt: this.now(), expiresAt: this.now() + 90000 };
    try {
      await this.sdk.onDisconnect(own).remove();
      await this.sdk.set(own, ticket);
      if (generation !== this.generation) { await this.removeOwn(token); return; }
      this.unwatchOwn = this.sdk.onValue(own, snapshot => {
        const value = snapshot.val();
        if (generation !== this.generation || !value || value.token !== token) return;
        if (value.claim && value.state === 'waiting') {
          this.finish({ host: true, hostUid: this.uid, token, peerUid: value.claim.uid, peerName: value.claim.name });
        }
      }, error => this.events.error(error));
      const query = this.sdk.query(this.ref('tickets'), this.sdk.orderByChild('createdAt'), this.sdk.limitToLast(30));
      this.unwatchQueue = this.sdk.onValue(query, snapshot => {
        this.candidates = [];
        snapshot.forEach(child => {
          const value = child.val();
          if (child.key !== this.uid && value.state === 'waiting' && !value.claim && value.expiresAt > this.now() + 5000) {
            this.candidates.push({ uid: child.key, ...value });
          }
        });
        this.tryClaim(generation).catch(error => this.events.error(error));
      }, error => this.events.error(error));
      this.poll = setInterval(() => this.tryClaim(generation).catch(error => this.events.error(error)), 1200);
      this.refresh = setInterval(() => {
        this.sdk.runTransaction(own, value => {
          if (!value || value.token !== token || value.claim) return;
          return { ...value, expiresAt: this.now() + 90000 };
        }, { applyLocally: false }).catch(error => this.events.error(error));
      }, 25000);
    } catch (error) {
      await this.cancel();
      throw error;
    }
  }

  async tryClaim(generation) {
    if (this.working || !this.busy || this.match || generation !== this.generation || !this.connected || document.hidden) return;
    const candidates = this.candidates || [];
    if (!candidates.length) return;
    this.working = true;
    const ownToken = this.ownToken;
    const target = candidates[Math.floor(Math.random() * candidates.length)];
    try {
      // Random delay breaks symmetry when several browsers join together.
      await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 600));
      if (generation !== this.generation) return;
      // Lock our own ticket first. Otherwise A→B and B→A could both succeed,
      // or a third player could claim us while we claim someone else.
      const lock = await this.sdk.runTransaction(this.ref(`tickets/${this.uid}`), value => {
        if (!value || value.token !== ownToken || value.claim || value.state !== 'waiting' || generation !== this.generation) return;
        return { ...value, state: 'claiming' };
      }, { applyLocally: false });
      if (!lock.committed || generation !== this.generation) return;
      const targetRef = this.ref(`tickets/${target.uid}/claim`);
      let result;
      try {
        result = await this.sdk.runTransaction(targetRef, value => {
          if (value || generation !== this.generation) return;
          return { uid: this.uid, name: this.name, token: target.token };
        }, { applyLocally: false });
      } catch (error) {
        // Permission denied usually means another player claimed or canceled it.
        if (!/permission[_ -]?denied/i.test(`${error.code} ${error.message}`)) throw error;
      }
      if (result?.committed) {
        const match = { host: false, hostUid: target.uid, token: target.token, peerUid: target.uid, peerName: target.name };
        if (generation !== this.generation) { await this.removeClaim(match); return; }
        await this.removeOwn(ownToken);
        this.finish(match);
      }
    } finally {
      if (generation === this.generation && !this.match) {
        await this.sdk.runTransaction(this.ref(`tickets/${this.uid}`), value => {
          if (!value || value.token !== ownToken || value.claim) return;
          return { ...value, state: 'waiting' };
        }, { applyLocally: false });
      }
      this.working = false;
    }
  }

  finish(match) {
    if (!this.busy || this.match) return;
    this.stopWatching();
    this.match = match;
    this.events.match(match);
  }

  stopWatching() {
    this.unwatchOwn?.(); this.unwatchQueue?.();
    this.unwatchOwn = this.unwatchQueue = null;
    clearInterval(this.poll); clearInterval(this.refresh);
    this.candidates = [];
  }

  async removeOwn(token) {
    if (!token) return;
    await this.sdk.runTransaction(this.ref(`tickets/${this.uid}`), value => {
      if (!value || value.token !== token) return;
      return null;
    }, { applyLocally: false });
  }

  async removeClaim(match) {
    await this.sdk.runTransaction(this.ref(`tickets/${match.hostUid}/claim`), value => {
      if (!value || value.uid !== this.uid || value.token !== match.token) return;
      return null;
    }, { applyLocally: false });
  }

  async cancel() {
    ++this.generation;
    this.busy = false;
    this.stopWatching();
    const match = this.match;
    const ownToken = this.ownToken;
    this.match = null; this.ownToken = null;
    if (!this.sdk) return;
    const jobs = [this.removeOwn(ownToken)];
    if (ownToken) jobs.push(this.sdk.onDisconnect(this.ref(`tickets/${this.uid}`)).cancel());
    if (match) {
      jobs.push(this.sdk.remove(this.ref(`signals/${match.hostUid}/${match.token}/${this.uid}`)));
      if (!match.host) jobs.push(this.removeClaim(match));
      else jobs.push(this.sdk.remove(this.ref(`signals/${match.hostUid}/${match.token}`)));
    }
    await Promise.all(jobs);
  }

  async signaling(match, callback) {
    const base = `signals/${match.hostUid}/${match.token}`;
    const outgoing = this.ref(`${base}/${this.uid}`);
    await this.sdk.onDisconnect(outgoing).remove();
    const unwatch = this.sdk.onChildAdded(this.ref(`${base}/${match.peerUid}`), snapshot => {
      try { callback(JSON.parse(snapshot.val())); }
      catch (error) { this.events.error(error); }
    }, error => this.events.error(error));
    return {
      send: message => this.sdk.push(outgoing, JSON.stringify(message)),
      close: unwatch,
    };
  }
}
