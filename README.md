# CigaretteBuddy

Anonymous one-to-one video rooms on native WebRTC, in a pnpm monorepo:
**SvelteKit** frontend, **Express** API (REST + signaling WebSocket),
**Postgres** via **Drizzle ORM**. See [Video rooms](#video-rooms).

## Layout

```
apps/
  web/      SvelteKit 2 + Svelte 5 (adapter-node): lobby + /room/[[id]] page,
            Tailwind v4 + shadcn-svelte (src/lib/components/ui),
            WebRTC client in src/lib/rtc + Dockerfile
  api/      Express 5 + TypeScript, zod-validated env, pino logging,
            room signaling over `ws` (src/signaling) + ICE/TURN config
            + Dockerfile (also provides the migrate entrypoint)
packages/
  shared/   Zod schemas & types shared by web and api (the API contract)
  db/       Drizzle schema (empty for now), client, migrations
  env/      Layered .env loading (shared root file + per-app file)
```

`packages/*` are "internal packages": they export raw TypeScript via their
`exports` field, so there is no build/watch step between them. Vite compiles them
for the web app, `tsx` for the API in dev, and `tsup` bundles them into
`apps/api/dist` for production.

## Prerequisites

- Node >= 22
- pnpm 11 (`corepack enable pnpm`)
- Docker (for local Postgres) — or point `DATABASE_URL` at any Postgres instance

## Getting started

```bash
pnpm install
pnpm env:init             # copies every .env.example to a .env (see Configuration)
pnpm db:up                # start Postgres in Docker
pnpm db:migrate           # apply the committed migrations
pnpm dev                  # api on :3000, web on :5173
```

Prefer containers? Skip straight to [Running it all in Docker](#running-it-all-in-docker).

Open http://localhost:5173. The dev server proxies `/api/*` to the API, so the
browser never needs a cross-origin request.

## Configuration

Each app owns its own configuration. There are three files, and each variable
lives in exactly one of them:

| File            | Holds                                                                                                                                            | Read by                                     |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------- |
| `.env`          | Only what is genuinely shared: `NODE_ENV`, `LOG_LEVEL`, the database credentials, the Compose host ports, and the `STUN_*`/`TURN_*` ICE settings | every workspace, plus Compose interpolation |
| `apps/api/.env` | `API_PORT`, `API_HOST`, `CORS_ORIGIN`                                                                                                            | the API only                                |
| `apps/web/.env` | `API_URL`, `PUBLIC_*` (including `PUBLIC_SIGNALING_URL`), `PORT`, `ORIGIN`, `WEB_DEV_PORT`                                                       | the web app only                            |

`pnpm env:init` creates all three from their `.env.example` siblings and leaves
any that already exist untouched.

### Precedence

Most specific wins:

```
real environment variables  >  <app>/.env  >  .env
```

So an app can override a shared default, and a real environment variable
overrides both — which is exactly how Compose, CI, and `FOO=bar pnpm dev`
configure things without touching any file.

### How each runtime gets there

- **API** — `apps/api/src/env.ts` calls `loadEnv()` from `@cigbuddy/env`, then
  validates the result with Zod and exits with a readable error if anything is
  missing. The app directory is derived from `import.meta.url`, which resolves
  to `apps/api` when running from source _and_ to the deploy directory when
  running from `dist` — one code path, no environment switch.
- **Web, development** — `vite.config.ts` calls the same `loadEnv()`. Vite's
  `envDir` stays at `apps/web`, which is also the only place SvelteKit looks
  for `PUBLIC_*` variables, so those must live in the app file.
- **Web, production** — `adapter-node` reads `process.env` and nothing else, so
  the `start` script hands the files to Node itself:
  `node --env-file-if-exists=../../.env --env-file-if-exists=.env`. Later flags
  win, hence root first — the same precedence as everywhere else.
- **Containers** — no `.env` file is ever copied into an image. Compose passes
  configuration as real environment variables, which outrank every file. The
  per-app files hold host-oriented values (`127.0.0.1`, `localhost` origins)
  that would be wrong inside the network anyway.

### Why `DATABASE_URL` stays in the root file

It is the one value that must not diverge. `drizzle-kit` and the migration
scripts read **only** the root `.env` (`packages/db/src/env.ts` calls
`loadEnv()` with no app directory), so it is impossible to migrate one database
while the API talks to another. If you do need the API pointed elsewhere, the
commented-out override in `apps/api/.env.example` works — but `pnpm db:migrate`
will still follow the root file, and that asymmetry is deliberate.

## Running it all in Docker

Everything — Postgres, the API, the web app — comes up with one command:

```bash
pnpm env:init
pnpm docker:up          # docker compose up -d --build
```

Open http://localhost:8080. Compose brings the stack up in order:

```
postgres  ──healthy──▶  migrate  ──exit 0──▶  api  ──healthy──▶  web
```

`migrate` is a one-shot container that applies pending Drizzle migrations and
exits; `api` will not start until it succeeds, so a deploy can never serve
traffic against an un-migrated database. `api` and `migrate` share the same
image (`cigbuddy/api`), which is built once and run with a different command.

| Command               | What it does                                                     |
| --------------------- | ---------------------------------------------------------------- |
| `pnpm docker:up`      | Build (if needed) and start the whole stack detached             |
| `pnpm docker:build`   | Build the images without starting anything                       |
| `pnpm docker:logs`    | Tail the `api` and `web` logs                                    |
| `pnpm docker:migrate` | Run the migration container on its own                           |
| `pnpm docker:down`    | Stop the stack, keep the database volume                         |
| `pnpm docker:reset`   | Stop it and **drop the database volume**                         |
| `pnpm docker:prod:up` | Same stack plus Caddy/TLS — see [Deploying](#deploying-to-a-vps) |

Ports (override in `.env`): web `WEB_PORT` → 8080, API `API_PORT` → 3000,
Postgres `POSTGRES_PORT` → 5432.

### How the images are built

Both Dockerfiles take **the repo root as build context** and are multi-stage:

1. **deps** — copies only the manifests and runs
   `pnpm install --frozen-lockfile --filter "@cigbuddy/<app>..."`, so the layer
   caches until a `package.json` changes, and each image installs only its own
   dependency subtree.
2. **build** — copies sources and builds the one app.
3. **runtime** — a bare `node:22-alpine` running as the unprivileged `node`
   user, with a `HEALTHCHECK`.

The two runtimes get self-contained differently, and it's worth knowing which is which:

- **api** uses `pnpm deploy --prod --legacy`, which prunes to production
  dependencies and hard-copies the workspace packages, so the output directory
  depends on nothing outside itself. The SQL migrations are copied to
  `dist/migrations`, where `migrator.ts` resolves them relative to its own
  module URL — the same code path works from source and from the bundle.
- **web** needs no `node_modules` at all: `adapter-node` bundles what it uses,
  and the only dependency (`@cigbuddy/shared`) is raw TypeScript that Vite
  inlines.

One consequence worth remembering: because `tsup` inlines `@cigbuddy/db` into
the API bundle, `drizzle-orm` and `postgres` are listed in
`apps/api/package.json` directly. They are genuinely the bundle's own imports,
and a pruned production install won't hoist them into place otherwise.

### If a port is already taken

`ports are not available: … bind: address already in use` means something on
your machine holds that port. Only the host side of the mapping needs to move —
the containers always talk to each other on 3000 — so an override is enough:

```bash
API_PORT=3001 pnpm docker:up     # or set API_PORT in .env
```

### Docker vs. `pnpm dev`

They differ in one place only — how the web app reaches the API:

|               | `pnpm dev`                                | Docker                                               |
| ------------- | ----------------------------------------- | ---------------------------------------------------- |
| Web → API     | Vite proxies `/api/*` to `127.0.0.1:3000` | SSR calls `http://api:3000` over the Compose network |
| Browser → WS  | Vite proxies `/api/ws` too (`ws: true`)   | `PUBLIC_SIGNALING_URL` points at the API's host port |
| Postgres host | `localhost` (from `.env`)                 | `postgres` (set by Compose)                          |

HTTP calls never leave the browser cross-origin: the SvelteKit server does the
fetching, and mutations go through form actions. The one exception is the room
signaling WebSocket, which the browser opens itself — through the Vite proxy in
development, and straight to the API in Compose (the API only accepts upgrades
whose `Origin` is listed in `CORS_ORIGIN` when running in production).

## Scripts

| Command                               | What it does                                                             |
| ------------------------------------- | ------------------------------------------------------------------------ |
| `pnpm dev`                            | Runs API and web together                                                |
| `pnpm dev:api` / `pnpm dev:web`       | Runs one of them                                                         |
| `pnpm build`                          | Builds both apps (`apps/api/dist`, `apps/web/build`)                     |
| `pnpm start`                          | Runs both production builds                                              |
| `pnpm check`                          | Typechecks every workspace (`tsc` / `svelte-check`)                      |
| `pnpm lint` / `pnpm format`           | ESLint / Prettier across the repo                                        |
| `pnpm test`                           | Vitest in every workspace                                                |
| `pnpm db:up` / `db:down` / `db:reset` | Docker Postgres lifecycle (`db:reset` drops the volume)                  |
| `pnpm db:generate`                    | Diff the Drizzle schema into a new SQL migration                         |
| `pnpm db:migrate`                     | Apply pending migrations                                                 |
| `pnpm db:push`                        | Push the schema straight to the DB (fast prototyping, no migration file) |
| `pnpm db:studio`                      | Drizzle Studio                                                           |

## API

| Method | Path                | Notes                                            |
| ------ | ------------------- | ------------------------------------------------ |
| GET    | `/api/health/live`  | Liveness — process only                          |
| GET    | `/api/health/ready` | Readiness — also pings Postgres, 503 if down     |
| GET    | `/api/ice`          | ICE servers browsers get, for debugging TURN     |
| WS     | `/api/ws`           | Room signaling — see [Video rooms](#video-rooms) |

That is the whole surface: nothing is stored yet, so there are no resource
routes. The Postgres pipeline stays in place for the first real table.

Errors always come back as `{ error: { message, code, details? } }` — see
`apiErrorSchema` in `packages/shared`.

## Video rooms

The web app is an anonymous one-to-one video chat built on native WebRTC —
`RTCPeerConnection`, `getUserMedia` and an `RTCDataChannel` for text chat. No
accounts, no database: rooms live in the API's memory and vanish when empty.

- `/` is the lobby: a single **Join room** button. It navigates to `/room`,
  which asks the server for a random match: any room that currently has one
  person in it (picked at random when several qualify), or a fresh room when
  none is open. Once assigned, the URL is rewritten to `/room/<id>`.
- `/room/<id>` rejoins that specific room, so a refresh puts you back with your
  peer. Rooms are not meant to be shared and the UI offers no link, but a
  direct URL still works. Ids are 4–32 chars of `a-z`, `0-9` and `-`
  (`roomIdSchema` in `packages/shared`). A third visitor is turned away with
  "room full".
- Rooms are matched purely by occupancy: anyone waiting alone in a room is
  matchable, however they got there.
- A pairing is one cigarette: ten minutes (`CHAT_DURATION_MS` in
  `packages/shared`) from the moment the room fills. The server owns the
  clock and sends both peers `timer { remainingMs, lit, wantsAnother }`
  whenever it changes; clients count down from `remainingMs` on their own
  clock, so skew never matters.
- **Light another one** is a vote. Once _both_ peers have voted the clock
  resets to ten minutes, `lit` goes up by one and the ashtray shows another
  butt. A peer leaving clears the clock and the votes.
- When the clock hits zero the server sends `expired` to both, closes the
  sockets with code `4004` and deletes the room. Each side keeps its camera and
  gets a **Next one** button.
- **Next one** leaves and asks for a random match again, sending the room just
  left as `avoidRoomId` so you are never re-seated with the same person. The id
  comes from `localStorage["cb:last-room"]`, which is written on every join and
  every exit. It is best-effort: it stops _you_ re-entering the room _you_
  left, not the survivor being matched into the fresh room you moved to.
- **Leave and report** sends `report` before leaving. For now the API only
  logs `{ roomId, reporterId, reportedId }`; nothing is stored.
- A refresh is a leave and a join, so the cigarette starts over.
- Chat messages travel peer to peer over the data channel, so they never touch
  the server and only work once the two browsers are connected.
- Camera access requires `localhost` or HTTPS — plain `http://` on a LAN IP will
  not get a `getUserMedia` prompt.

**How a call is set up.** The browser opens the signaling WebSocket
(`/api/ws`), sends `join` (a specific id) or `join-random` (let the server
pick), and gets back `joined` with the room id, a peer id, its role, and the
ICE servers. Matching happens in `RoomManager.joinRandom` on the API's single
thread, so two people clicking at the same moment end up together rather than
in two half-empty rooms. The peer already in the room is the _polite_ side; the
newcomer initiates the offer and creates the chat channel. Negotiation follows
the spec's "perfect negotiation" pattern, so glare resolves itself and a
survivor becomes polite again when a new peer arrives. The server relays
`offer`, `answer` and `ice-candidate` messages verbatim, and on top of that
speaks `timer` / `expired` (its clock) and accepts `light-another` / `report`;
the message shapes are the Zod schemas in `packages/shared/src/signaling.ts`.

**TURN.** Peers behind symmetric NAT need a relay. Point the API at yours with
the `STUN_URLS` / `TURN_*` variables in the root `.env` (see `.env.example`).
Two coturn auth modes are supported:

```ini
# (a) static credentials — turnserver.conf
lt-cred-mech
user=cigbuddy:some-long-password
#    .env: TURN_URLS=turn:turn.example.com:3478  TURN_USERNAME=cigbuddy  TURN_CREDENTIAL=some-long-password

# (b) shared secret — turnserver.conf
use-auth-secret
static-auth-secret=some-long-secret
#    .env: TURN_URLS=turn:turn.example.com:3478  TURN_SECRET=some-long-secret
```

With a shared secret the API mints a fresh `expiry:user` / HMAC-SHA1 credential
for every peer that joins (`apps/api/src/ice.ts`), valid for
`TURN_TTL_SECONDS`. Keep that longer than your longest call — coturn checks
the expiry again on allocation refresh. `GET /api/ice` shows exactly what
browsers receive, and `chrome://webrtc-internals` will show a `relay`
candidate pair once the TURN server is actually in use.

**Trying it.** Run `pnpm dev`, open http://localhost:5173 in two tabs (or two
browsers) and click **Find a Buddy** in both. They land in the same
`/room/<id>`, both videos should appear, chat should flow both ways and the
cigarette should start burning down from 10:00. Click **Light another one** in
one tab and the other lights up with "They want another one"; click it there
too and both clocks reset with one butt in the ashtray. A third tab clicking
**Find a Buddy** gets a fresh room; pasting the first room's URL into it
instead shows "room full". **Next one** in one tab puts the other back into
"waiting" and seats the first somewhere else. To watch a cigarette burn out
without waiting, pass a short `chatDurationMs` to `attachSignaling` in
`apps/api/src/index.ts`.

**Known limitation.** A browser that vanishes without closing its socket
(network drop, killed process) keeps its seat until the WebSocket heartbeat
reaps it, up to twice `heartbeatMs` (30 s by default). Someone matched into
that room in the meantime sits at "Connecting to peer…" until the ghost is
removed, then drops back to "waiting" and is matchable again.

## UI (Tailwind + shadcn-svelte)

`apps/web` uses **Tailwind CSS v4** (via `@tailwindcss/vite`, no config file —
the theme lives in CSS) and **shadcn-svelte**, whose components are _vendored_
into the repo rather than imported from a package:

```
apps/web/
  components.json            CLI config: aliases, style (vega), icon library
  src/lib/utils.ts           cn() + the prop helper types the components use
  src/lib/components/ui/     the generated components -- yours to edit
```

Add a component with the CLI (it writes into `src/lib/components/ui`, then run
`pnpm install` for any new peer deps):

```bash
pnpm --filter @cigbuddy/web exec shadcn-svelte add <name>
pnpm install
```

If you ever re-run `init`, pass `--preset bd1gAJJg` to reproduce the generated
half of the stylesheet (vega / zinc / Lucide / Inter, default radius) — then
re-apply the two edits below the comment banner in `src/app.css`, since `init`
overwrites the font line and knows nothing about our palette.

### Theming

The site is an **old-web-revival design**: warm paper ground, hard 1px ink
borders, square corners, hard offset shadows, no gradients anywhere.
**It is light-only** — there is no `.dark` class on `<html>` any more.

Four faces, two of them webfonts:

| Token          | Face                       | Used for                       |
| -------------- | -------------------------- | ------------------------------ |
| `--font-serif` | Fraunces Variable (`wonk`) | headings and the logotype      |
| `--font-sans`  | Trebuchet MS (system)      | body and UI                    |
| `--font-mono`  | Courier New (system)       | ids, data rows, small captions |
| `--font-pixel` | Silkscreen                 | counter digits, widget strips  |

Headings set `font-variation-settings: 'WONK' 1`, which swaps in Fraunces'
quirky alternates. That axis is the entire reason the face is there rather than
Georgia, which read sterile. Only the `wonk` subset is imported — 36 KB against
118 KB for the all-axes file.

**Colour is confined to title strips, tags, badges and step numbers.** Panel
bodies stay paper and every border stays ink; keeping the structure monochrome
is what stops six hues reading as noise. Links are blue and underlined, visited
purple, with ember reserved for hover, focus and the cigarette.

`src/app.css` has two halves, split by a comment banner:

1. **Above the line** — the blocks `shadcn-svelte init` generated (`:root`,
   `.dark`, `@theme inline`), kept byte-identical so re-running the CLI stays a
   clean operation. The one exception is the `--font-sans` line.
2. **Below the line** — ours. A `@theme` block with the palette, the four font
   stacks and the hard `--shadow-*` scale, then a `:root` block re-pointing the
   shadcn token names (`--background`, `--card`, `--primary`, `--border`, …) at
   that palette, so the vendored components inherit the look without being
   edited. `--radius: 0rem` collapses the whole `--radius-*` calc chain, which
   is what squares every corner from one declaration.

Two contrast rules the palette must obey, both measured and commented in the
file: never `--color-ink-soft` on `--color-putty` (4.33:1, fails AA), and
`--color-ember-hot` is screen-only or non-text (3.10:1 on paper).

### The two extra stylesheets

- `src/lib/styles/retro.css` — the kit's recipe classes (`.rt-panel`,
  `.rt-press`, `.rt-columns`, …) in `@layer components`, so Tailwind utilities
  still beat them and `<Panel class="bg-putty">` works.
- `src/lib/styles/shadcn-skin.css` — in `@layer skin`, which `app.css` declares
  **after** `utilities`, so it outranks every utility. This is the only way to
  restyle the vendored components from the outside: the vega style draws their
  edges with `ring-1 ring-foreground/10` and their corners with `rounded-xl`,
  and no token retune turns a 10%-alpha ring into a hard ink hairline. The cost
  is that `<Card class="rounded-lg">` no longer wins, so this file only touches
  the four properties vega hardcodes and we have to fight.

Do not remove `@custom-variant dark` or the `tw-animate-css` import even though
the site is light-only and animations are suppressed: files under `ui/` still
reference `dark:` and `animate-in` utilities, and dropping either is a build
error.

### Components

`src/lib/components/retro/` is the hand-written kit — 23 components, flat, one
barrel. Import from `$lib/components/retro`. Rule of thumb: if a consumer might
want to override it, it belongs in `retro.css` or a utility; if it is a keyframe
or a component's internal geometry, it belongs in that component's scoped
`<style>`.

`src/lib/components/ui/` is excluded from ESLint and Prettier: the CLI owns the
formatting, and re-running `add` would otherwise churn the diff. The kit wraps
`bits-ui` through those vendored wrappers where it needs real behavior (dropdown
menu, dialog, tooltip) and hand-rolls everything presentational.

Two SSR traps worth knowing, both already handled and commented:

- **bits-ui builds portal containers as it initialises**, which a server render
  does not produce, so wrapping content in a `Tooltip` during the first client
  render fails to hydrate. `Tooltip` renders its bare trigger until after mount.
- **Anything derived from `Date.now()` or `toLocaleTimeString` differs between
  server and client.** `CigaretteTimer` takes a `progress` prop for drawing a
  lit cigarette that is not a clock, and `ChatPanel` holds timestamps back until
  mount.

## Conventions worth keeping

- **The contract lives in `packages/shared`.** Add a Zod schema there, then use
  it to validate in the API _and_ in SvelteKit form actions. Types are inferred,
  never hand-written twice.
- **Database rows are not wire types.** When the first table lands, map the
  Drizzle row (with `Date`s) to the shared Zod shape (ISO strings) in one
  place inside the route, and never export a row type from the API.
- **Env is parsed once.** `apps/api/src/env.ts` validates `process.env` at boot
  and exits with a readable error if something is missing.
- **A variable belongs to one owner.** If only one app reads it, it goes in that
  app's `.env`; the root file is for things that are actually shared. Add it to
  the matching `.env.example` in the same commit, or the next person's
  `pnpm env:init` won't produce a working setup.
- **Adding a table:** edit `packages/db/src/schema.ts`, run `pnpm db:generate`,
  then `pnpm db:migrate`. Commit the generated SQL.
- **Adding a workspace:** create `packages/<name>` with
  `"exports": { ".": "./src/index.ts" }`, then depend on it with
  `"@cigbuddy/<name>": "workspace:*"`.

## Deploying to a VPS

`docker-compose.prod.yml` layers a production setup over the base Compose
file: **Caddy** in front terminating TLS for `DOMAIN`, the Postgres/API/web
host ports removed, origins pointed at `https://$DOMAIN`, the API trusting one
proxy hop, and container logs capped. HTTPS is not a nicety here — browsers
refuse `getUserMedia` outside a secure context, so the app does not work over
plain `http://` at all.

Caddy makes the site a single origin: `/api/*` is proxied to the API (including
the WebSocket upgrade) and everything else to the SvelteKit server. The browser
therefore derives `wss://$DOMAIN/api/ws` on its own and `PUBLIC_SIGNALING_URL`
stays empty.

```
browser ──https/wss──▶ caddy:443 ──┬── /api/*  ──▶ api:3000 ──▶ postgres
                                   └── /*      ──▶ web:3000 ──▶ api:3000 (SSR)
```

### First deploy

1. Ubuntu 24.04 (or similar) with Docker Engine and the Compose plugin; point
   an A record for your domain at it. Open **22, 80, 443** in the firewall and
   nothing else from this stack.
2. Clone the repo at the release tag and create the root `.env` **by hand** —
   never copy the one from your laptop:

   ```ini
   NODE_ENV=production
   LOG_LEVEL=info
   DOMAIN=chat.example.com
   POSTGRES_USER=cigbuddy
   POSTGRES_PASSWORD=<long random string>
   POSTGRES_DB=cigbuddy
   # TURN — see "TURN" under Video rooms. Strongly recommended for a public site.
   TURN_URLS=turn:turn.example.com:3478
   TURN_SECRET=<coturn static-auth-secret>
   ```

   `DATABASE_URL` is not needed: Compose builds it from the `POSTGRES_*` values.
   The per-app `.env` files are not used by the containers either.

3. Bring it up:

   ```bash
   pnpm docker:prod:up      # docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
   pnpm docker:prod:logs
   ```

   Order is the same as locally — `postgres → migrate → api → web → caddy` —
   so traffic is never served against an un-migrated database. Caddy requests
   the certificate on first start; give it a few seconds.

4. Verify: `curl https://$DOMAIN/api/health/ready` returns `{"status":"ok"}`;
   open the site in two browsers, one of them on mobile data, and check
   `chrome://webrtc-internals` shows a `relay` candidate pair — that is the
   proof TURN works. Without TURN, peers behind carrier-grade or symmetric NAT
   simply never connect.

### Updating

```bash
git fetch --tags && git checkout v1.x.y
pnpm docker:prod:up
```

The images are rebuilt only where sources changed, `migrate` applies anything
new, and Caddy keeps serving throughout.

### Running without Compose

- `apps/api` bundles to a single ESM file — `node dist/index.js`.
- `apps/web` builds with `adapter-node` — `node build/index.js` (set `PORT`).
- Set `API_URL` and `ORIGIN` for the web server and `CORS_ORIGIN` and
  `TRUST_PROXY` for the API to match your proxy — as real environment
  variables, not files. `ORIGIN` is not optional behind a proxy: `adapter-node`
  rejects form POSTs whose origin doesn't match it.
- Run migrations as a release step — `pnpm db:migrate` on a host, or the
  `migrate` container in Compose, Kubernetes, or ECS.
- The images take no build args and read all configuration from the
  environment, so the same `cigbuddy/api` and `cigbuddy/web` tags promote
  unchanged from staging to production.

### Abuse limits

The API refuses more than eight open signaling sockets per client address
(`maxConnectionsPerIp` in `attachSignaling`; lifted in development, where the
Vite proxy would make every socket look like one client). Behind a proxy the
address comes from `X-Forwarded-For`, which is why `TRUST_PROXY` must match
the real hop count — too high and a client can forge its address, too low and
every visitor shares the proxy's.
