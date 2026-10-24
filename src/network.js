import { iceServers } from './config.js';
import { validPosition } from './world.js';

export class Connection {
  constructor(events) {
    this.events = events;
    this.closed = false;
    this.remoteReady = false;
    this.localReady = false;
    this.lastSequence = -1;
    this.pendingIce = [];
    this.pendingPings = new Map();
    this.lastReceived = performance.now();
  }

  async open(match, backend) {
    this.match = match;
    this.pc = new RTCPeerConnection({ iceServers });
    this.pc.onicecandidate = event => {
      if (event.candidate && !this.closed) this.signal?.send({ type: 'ice', data: event.candidate.toJSON() }).catch(error => this.fail(error));
    };
    this.pc.onconnectionstatechange = () => {
      if (this.pc.connectionState === 'failed') this.fail(new Error('Peer connection failed. Try another network; some networks need TURN.'));
      if (this.pc.connectionState === 'disconnected') this.events.status('Connection interrupted…');
    };
    this.pc.ondatachannel = event => this.wire(event.channel);
    this.signalChain = Promise.resolve();
    let resolveSignal;
    const signalReady = new Promise(resolve => { resolveSignal = resolve; });
    const signal = await backend.signaling(match, message => {
      this.signalChain = this.signalChain.then(async () => {
        await signalReady;
        await this.receiveSignal(message);
      }).catch(error => this.fail(error));
    });
    if (this.closed) { signal.close(); return; }
    this.signal = signal;
    resolveSignal();
    // Ensure callbacks for existing signaling messages run after this.signal exists.
    await Promise.resolve();
    this.timeout = setTimeout(() => this.fail(new Error('Connection timed out. Retrying matchmaking. Some networks require TURN.')), 22000);
    if (match.host) {
      this.wire(this.pc.createDataChannel('control', { ordered: true }));
      this.wire(this.pc.createDataChannel('movement', { ordered: false, maxRetransmits: 0 }));
      const offer = await this.pc.createOffer();
      if (this.closed) return;
      await this.pc.setLocalDescription(offer);
      await this.signal.send({ type: 'offer', data: this.pc.localDescription.toJSON() });
    }
  }

  async receiveSignal(message) {
    if (this.closed || !message || !['offer', 'answer', 'ice'].includes(message.type)) return;
    if (message.type === 'ice') {
      if (this.pc.remoteDescription) await this.pc.addIceCandidate(message.data);
      else if (this.pendingIce.length < 100) this.pendingIce.push(message.data);
      return;
    }
    if ((message.type === 'offer') === this.match.host || this.pc.remoteDescription) return;
    await this.pc.setRemoteDescription(message.data);
    for (const ice of this.pendingIce) await this.pc.addIceCandidate(ice);
    this.pendingIce = [];
    if (!this.match.host) {
      const answer = await this.pc.createAnswer();
      await this.pc.setLocalDescription(answer);
      await this.signal.send({ type: 'answer', data: this.pc.localDescription.toJSON() });
    }
  }

  wire(channel) {
    if (!['movement', 'control'].includes(channel.label)) { channel.close(); return; }
    this[channel.label] = channel;
    channel.onopen = () => this.ready();
    channel.onclose = () => { if (!this.closed) this.fail(new Error('Your partner disconnected.')); };
    channel.onmessage = event => {
      if (typeof event.data !== 'string' || event.data.length > 2048) return;
      let message;
      try { message = JSON.parse(event.data); } catch { return; }
      if (!message || typeof message !== 'object') return;
      this.lastReceived = performance.now();
      if (this.waiting) { this.waiting = false; this.events.status(''); }
      if (channel.label === 'movement') {
        if (validPosition(message) && message.seq > this.lastSequence) {
          this.lastSequence = message.seq;
          this.events.position(message);
        }
      } else {
        if (message.type === 'ready') { this.remoteReady = true; this.ready(); }
        if (message.type === 'leave') this.fail(new Error('Your partner left the arena.'));
        if (message.type === 'hidden') this.events.status(message.value ? 'Your partner is in another tab.' : '');
        if (message.type === 'ping' && Number.isSafeInteger(message.id)) this.sendControl({ type: 'pong', id: message.id });
        if (message.type === 'pong' && this.pendingPings.has(message.id)) {
          const rtt = performance.now() - this.pendingPings.get(message.id);
          this.pendingPings.delete(message.id);
          this.ping = this.ping === undefined ? rtt : this.ping * 0.7 + rtt * 0.3;
          this.events.ping(Math.round(this.ping));
        }
      }
    };
  }

  ready() {
    if (this.closed || this.started || this.control?.readyState !== 'open' || this.movement?.readyState !== 'open') return;
    if (!this.localReady) {
      this.localReady = true;
      this.sendControl({ type: 'ready' });
    }
    if (!this.remoteReady) return;
    this.started = true;
    clearTimeout(this.timeout);
    this.lastReceived = performance.now();
    this.events.ready();
    this.pingId = 0;
    this.pingTimer = setInterval(() => {
      const now = performance.now();
      for (const [id, sent] of this.pendingPings) if (now - sent > 10000) this.pendingPings.delete(id);
      if (now - this.lastReceived > 5000) { this.waiting = true; this.events.status('Waiting for partner…'); }
      if (now - this.lastReceived > 20000 && !document.hidden) { this.fail(new Error('Your partner stopped responding.')); return; }
      const id = ++this.pingId;
      this.pendingPings.set(id, now);
      this.sendControl({ type: 'ping', id });
    }, 1000);
  }

  sendPosition(position) {
    if (this.movement?.readyState !== 'open' || this.movement.bufferedAmount >= 16000) return false;
    try { this.movement.send(JSON.stringify(position)); return true; }
    catch { return false; }
  }

  sendControl(message) {
    if (this.control?.readyState === 'open' && this.control.bufferedAmount < 16000) this.control.send(JSON.stringify(message));
  }

  fail(error) {
    if (this.closed) return;
    this.close();
    this.events.error(error);
  }

  close() {
    if (this.closed) return;
    this.sendControl({ type: 'leave' });
    this.closed = true;
    clearTimeout(this.timeout); clearInterval(this.pingTimer);
    this.signal?.close();
    this.control?.close(); this.movement?.close(); this.pc?.close();
  }
}
