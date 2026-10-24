# Coop Test

A tiny two-player browser co-op sandbox. Original code and geometric artwork; no Pokémon game code or assets are included.

**Play:** https://pazzesko.github.io/coop-test/

## Features

- First-visit player name, saved locally; editable from the menu.
- Live online counter, deduplicated by anonymous browser identity across tabs.
- Automatic pairing with a random eligible waiting player; cancel anytime.
- Two-player arena with WASD/arrow keys, collision, and mobile touch joystick.
- The joystick appears at the initial touch position and **stays anchored until release**.
- Smooth remote movement, application round-trip ping, and local rendering FPS.
- Offline movement practice, even before Firebase is configured.

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

### Data layout

```text
v1/
  presence/{uid}/{tabId}: true
  tickets/{uid}: { token, name, state, createdAt, expiresAt, claim? }
  signals/{hostUid}/{matchToken}/{senderUid}/{messageId}: JSON string
```

Presence installs `onDisconnect()` before marking a connection online. Queue tickets have a short lease and are refreshed while waiting. Matching first transactionally locks your own ticket, then claims another ticket; this prevents reciprocal matches and double booking. A unique token isolates each signaling session. Failed connection attempts return to matchmaking; a disconnect during gameplay returns to the menu.

The initial queue watches only the latest 30 tickets and chooses randomly among eligible entries. This is a **small-scale prototype**, not a production matchmaking service. Active matches retain a ticket for signaling authorization; a larger deployment should separate waiting tickets from match records and add server-side cleanup/fairness.

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

To test touch controls on a phone using the deployed HTTPS URL is easiest. The whole arena stays visible in portrait or landscape; landscape gives more room.

## Deploy to GitHub Pages

Repository Settings → Pages → Source → **GitHub Actions**. Push to `main`.

`.github/workflows/pages.yml` deploys only `index.html`, `style.css`, and `src/`; tests, dependencies, and Firebase tooling are not published. Asset URLs are relative so project Pages URLs work.

## Tests

Node.js 22+ is recommended for development tests; players only need a browser.

```sh
npm ci
npm test
npx playwright install --with-deps chromium
npm run test:browser
```

The default browser run tests offline practice and the anchored touch joystick. Online tests are skipped unless explicitly enabled, and **never use the production Firebase project**.

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
- Presence is visible to authenticated users and includes opaque UIDs; waiting player names are visible in the queue. No chat or email addresses are collected.
- Searches cancel if the tab becomes hidden. During gameplay, backgrounding reports a notice; browsers may suspend the page or connection.
- Clients own their own movement. Bounds and packet shapes are checked, but this is **not an anti-cheat system**.
- Authentication and rules restrict access, but are not rate limiting. Before promoting publicly, add App Check/abuse protections, usage alerts, TURN, and trusted matchmaking if needed.
- The full online counter downloads minimal presence state; replace it with an aggregated counter at larger scale.

## License

MIT. See `LICENSE`.
