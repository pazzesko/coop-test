# Coop Test

A tiny two-player pixel-art boss fight. Original code and pixel artwork; no Pokémon game code or assets are included.

**Play:** https://pazzesko.github.io/coop-test/

## Features

- First-visit player name, saved locally; editable from the menu.
- Live online counter and player-name roster, deduplicated by anonymous browser identity across tabs. Your own entry appears first.
- Automatic pairing with a random eligible waiting player; cancel anytime.
- Two-player arena with WASD/arrow keys, collision, and mobile touch joystick.
- The joystick appears at the initial touch position and **stays anchored until release**.
- Portrait-first, full-height play area with a player-following camera; bottom-left touch pad and top-right fullscreen/exit icon buttons.
- Compact FPS/ping labels inside the play area. Fullscreen toggles where the browser supports it; unsupported browsers keep working normally.
- Smooth remote movement, application round-trip ping, and local rendering FPS.
- Adaptive movement traffic: up to 20 updates/second while moving, one/second while idle, and three final-position sends after stopping.
- Three saved class choices: barbarian (axe cleave, high health), mage (fireball), and archer (rapid arrows).
- Hold-to-attack and directional dodge controls, with independent multi-touch input and a visible dodge cooldown.
- Grokk, a large orc with a mace, boss health bar, three telegraphed attack patterns, and an enraged phase below 45% health.
- No respawns: a fallen hero watches their ally. Defeat only when the entire party falls; victory when the boss dies.
- The same boss fight is available offline as a solo run, even before Firebase is configured.
- Original cartoon-brawler fantasy art: expressive faces, rounded silhouettes, dark outlines, saturated costumes, chunky paving and animated braziers. No copied characters or sprites.
- Authored attack poses: axe anticipation/swing/recovery, staff lift/cast, bow draw/release, low dodge silhouettes, and the orc's mace lift/overhead hold/slam/recovery.
- Shaking paving and lifting rubble warn of attacks; impacts throw little rocks, dust and smoke, leaving temporary cracked ground instead of artificial circle markers. Hit flashes, weapon trails, fireball tails, damage numbers and dodge afterimages add punch.

## How to play

Choose a class in camp, then **Play online** for an automatically matched co-op run, or **Fight solo**.

- **Mobile:** bottom-left stick to move; hold **Attack** at bottom-right. Tap **Dodge** while moving to roll in that direction (or in your last movement direction when stationary).
- **Desktop:** WASD/arrows to move, hold **J / Space** to attack, **Shift / K** to dodge.
- Attacks automatically aim at the orc. Barbarian needs to get close; mage and archer can attack at range. There is no friendly fire. A brief class-specific wind-up releases the actual hit/projectile on the strike frame; falling during wind-up cancels that attack.
- Cracked ground trembles, stones lift and dust leaks out before impact; cracks brighten as the strike approaches. Move clear of the disturbed paving or time a dodge for its brief invulnerability window.
- Dodge recharges in 1.8 seconds. If you fall, you remain dead for that run. Return to camp after victory/defeat to start a new run.

### Pixel-art consistency

All world assets use **one source pixel per world unit**. Hero sprites (96×104 source pixels), the much larger hand-drawn orc (160×164), stone tiles, warnings, projectiles, particles and world lettering are rendered onto the same native pixel grid. Shaped silhouettes use integer scanline polygons, not antialiased vectors. The canvas picks a single integer CSS enlargement (2× on desktop, 1× on most phones), uses nearest-neighbor rendering, and integer camera/sprite coordinates. Odd viewport sizes crop at most a couple of edge pixels rather than stretching the grid. No per-sprite scaling, antialiased world text, or arbitrarily rotated/resampled sprites are used. Left/right poses are cached lossless pixel reflections. HUD/menu text and touch-control chrome remain normal accessible HTML.

Effects never pause the simulation or alter hitboxes. Host-authored effect IDs travel in the existing bounded fight snapshots; clients deduplicate them and catch up late arrivals instead of replaying old explosions. Optional source IDs keep warning and impact rubble layouts consistent. Pools are capped at 180 particles, 36 smoke puffs, 8 ground scars and 12 floating numbers. Sprite/tint/torch art and ground-crack rasters are cached; smoke draws behind actors to keep silhouettes readable. `prefers-reduced-motion: reduce` disables screen shake, ground tremors, dodge afterimages, bright hit tints and ambient embers, and reduces impact particles; readable attack poses and disturbed-ground warnings remain.

## Stack

Plain JavaScript ES modules + Canvas. No frontend build step.

GitHub Pages serves static files. Firebase Authentication (anonymous) and Realtime Database handle presence, matchmaking, and WebRTC signaling. Movement travels over WebRTC, not through the database. Firebase SDK modules load from Google's CDN; analytics is not enabled.

## Firebase setup

Use your own Firebase project, currently intended to be `coop-test-3d2ba`:

1. Project settings → General → Your apps → add a **Web** app named **Coop Test**. Firebase Hosting is not required.
2. Authentication → Sign-in method → enable **Anonymous**.
3. Authentication → Settings → Authorized domains → add `pazzesko.github.io` and `localhost` if needed. Enter the hostname, not `/coop-test/`.
4. Build → **Realtime Database** (not Firestore) → Create database → choose a nearby region → start in **locked mode**.
5. Copy the web-app configuration into `src/config.js`. Include the exact `databaseURL` shown by Realtime Database; don't guess its region or hostname.
6. Realtime Database → Rules → paste **`database.rules.json`** and publish. These replace rules for this prototype database; don't overwrite a database shared with other apps.
7. Commit/push the public web configuration. Never commit service-account keys, admin credentials, or permanent TURN secrets.

Firebase web configuration/API keys identify the app; they are not admin credentials. Database rules are the security boundary.

**Upgrading from the counter-only MVP:** publish the current `database.rules.json` again, then refresh clients. Named presence now stores `{ name }` instead of just `true`. Until the rules are updated, the app falls back to the old presence format so matchmaking still works, but other players appear as **Guest** and the menu shows a setup note. Names from older tabs remain Guest until those tabs refresh.

### Data layout

```text
v1/
  presence/{uid}/{tabId}: { name }  # legacy clients may still write true
  tickets/{uid}: { token, name, state, createdAt, expiresAt, claim? }
  signals/{hostUid}/{matchToken}/{senderUid}/{messageId}: JSON string
```

Presence installs `onDisconnect()` before marking a connection online. Queue tickets have a short lease and are refreshed while waiting. Matching first transactionally locks your own ticket, then claims another ticket; this prevents reciprocal matches and double booking. A unique token isolates each signaling session. Failed connection attempts return to matchmaking; a disconnect during gameplay returns to the menu.

The initial queue watches only the latest 30 tickets and chooses randomly among eligible entries. This is a **small-scale prototype**, not a production matchmaking service. Active matches retain a ticket for signaling authorization; a larger deployment should separate waiting tickets from match records and add server-side cleanup/fairness.

### Movement synchronization

Local movement stays immediate. Movement packets include sequence numbers, a sender-relative timestamp, and moving/stopped state. Remote rendering interpolates a short snapshot history about 100 ms behind the estimated sender timeline, which smooths uneven delivery without requiring synchronized device clocks. It holds the latest position if packets stop rather than predicting through walls. Movement restarts after an idle period do not interpolate across the entire idle heartbeat gap.

Idle position traffic is reduced from approximately 20 packets/second to one/second (95% fewer position packets, not 95% less total connection traffic). After stopping, the final position is sent three times over the unreliable movement channel; the idle heartbeat also repairs a lost final position. The movement decoder tolerates missing timestamps, but the boss-fight protocol requires both players to refresh to the same supported version.

### Fight authority

The room initiator is the authoritative **host** for boss AI, telegraph deadlines, projectiles, health, attack/dodge cooldowns, deaths and the outcome. Each browser still owns its immediate movement. Guest action requests are sequenced and cooldown-checked by the host; guests cannot report damage or declare victory. The guest predicts attack/dodge animation and reconciles against acknowledged host snapshots. Compact fight snapshots travel over the reliable WebRTC control channel about 10 times/second; movement stays on the independent unreliable channel. Boss/projectile rendering is smoothed between snapshots. No gameplay updates go through Firebase.

When the host is suspended, a guest freezes its local fight after a short stale-snapshot timeout instead of freely attacking frozen enemies. There is no host migration. This is not a trusted-server anti-cheat architecture: a malicious host or forged movement is still outside the prototype's security scope.

### WebRTC and TURN limitations

The MVP uses public STUN servers. Direct connections work on many networks, but restrictive NAT/firewalls may require **TURN**, which is not configured yet. Connection failures show a useful message and retry; they do not fall back to streaming movement through Firebase.

For reliable public release, add a TURN provider/self-hosted TURN with temporary credentials issued by a trusted backend. Don't put permanent TURN credentials into the public JavaScript. Direct WebRTC may reveal each player's IP address to their partner; the menu discloses this before Play. Relay-only TURN offers stronger peer IP privacy at a bandwidth cost.

## Run locally

From the repository:

```sh
python3 -m http.server 8080 --bind 127.0.0.1
```

Open http://127.0.0.1:8080. Do not open `index.html` with `file://`.

To simulate two distinct players, use **two browser profiles, separate browsers, or separate devices**. Two ordinary tabs share one Firebase identity and cannot match each other. New online searches take over an existing online session in another tab.

To test touch controls on a phone using the deployed HTTPS URL is easiest. Portrait mode uses the available height with a player-following camera, rather than shrinking the entire wide arena. The map and movement rules remain identical across devices. Drag in the bottom-left control pad to move; the joystick stays anchored throughout the drag (adjusted inward near edges to stay visible). Fullscreen and Leave are top-right icon buttons, respecting safe-area insets; Leave uses a red exit arrow. Rotation and browser viewport changes resize the play area automatically. Fullscreen requires browser support; some iPhone browsers do not expose it for arbitrary elements.

## Deploy to GitHub Pages

Repository Settings → Pages → Source → **GitHub Actions**. Push to `main`.

`.github/workflows/pages.yml` runs `python3 tools/build_site.py` to stage only `index.html`, `style.css`, and `src/`; tests, dependencies, and Firebase tooling are not published. CSS and the complete local JavaScript module graph live under a content-hashed asset directory, so a refresh cannot mix an old cached stylesheet/module with a new release. Asset URLs are relative so project Pages URLs work. Local development still has no frontend build step.

## Tests

Node.js 22+ is recommended for development tests; players only need a browser.

```sh
npm ci
npm test
npx playwright install --with-deps chromium
npm run test:browser
```

The default browser run tests solo combat, persistent classes, attack/dodge cooldowns, two-thumb touch input, fullscreen, and the anchored joystick. Online tests cover pairing, synchronized boss health, rejection of guest-forged victory, and the no-respawn party defeat rule. They are skipped unless explicitly enabled, and **never use the production Firebase project**.

For rules and online end-to-end tests, install Firebase CLI and Java 21+, then run the emulator commands below. The online tests inject demo config and use real WebRTC between isolated browser contexts.

```sh
npx firebase-tools emulators:exec --only auth,database --project demo-coop-test 'npm run test:rules'
npx firebase-tools emulators:exec --only auth,database --project demo-coop-test 'COOP_EMULATOR_TESTS=1 npm run test:browser'
```

For manual emulator testing, set `emulatorConfig` in a local copy of `src/config.js` to `{ auth: 9099, database: 9000 }`, use demo web config with `projectId: 'demo-coop-test'` and `databaseURL: 'https://demo-coop-test.firebaseio.com'`, and run:

```sh
npx firebase-tools emulators:start --only auth,database --project demo-coop-test
```

Emulator routing is ignored outside `localhost` / `127.0.0.1`. Restore production config before committing.

## Scope and safety

- An online player is a connected anonymous identity, not a verified human. Abrupt disconnects may take time for Firebase to detect.
- Presence is visible to authenticated users and includes opaque UIDs and display names. The menu shows online names even before you queue. No chat or email addresses are collected.
- Searches cancel if the tab becomes hidden. During gameplay, no banner is shown just for backgrounding; browsers may suspend the page or connection, so actual connection interruption and timeout notices remain enabled.
- Clients own their own movement. Bounds and packet shapes are checked, but this is **not an anti-cheat system**.
- Authentication and rules restrict access, but are not rate limiting. Before promoting publicly, add App Check/abuse protections, usage alerts, TURN, and trusted matchmaking if needed.
- The full online counter downloads minimal presence state; replace it with an aggregated counter at larger scale.

## License

MIT. See `LICENSE`.
