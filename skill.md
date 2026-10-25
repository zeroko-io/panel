---
name: zeroko
description: Deploy small HTTP services (websites, APIs, webhooks, backends) as JavaScript modules to Zeroko at {{BASE}}, with a SQL database, file storage, background jobs, crons and realtime connections.
---

# Zeroko

Zeroko runs JavaScript HTTP services. Each service gets its own address
(the `url` the API returns: `https://<name>.<domain>`, or
`https://<name>--<domain>` on some hosts) and, if it declares them,
bindings: `db` (SQLite),
`files`, `jobs` and `realtime` for state, `assets` for its static files and
`service:<name>` to call another service. The service's process keeps nothing
between requests: put every piece of state in a binding.

API base: `{{BASE}}/api`. Every request takes `Authorization: Bearer <token>`.
The same API is an MCP server at `{{BASE}}/mcp` (Streamable HTTP), with the
same token: a client that speaks MCP can use its tools instead of these
calls.
Errors are `{"error": {"code": "...", "message": "..."}}`.

## Write a service

A service is ES modules. The main module's default export is an object with
a `fetch` handler and, optionally, `job` and `message` handlers:

```js
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === "/api/notes" && request.method === "POST") {
      const { text } = await request.json();
      const { lastRowId } = await env.DB.run("INSERT INTO notes (text) VALUES (?)", text);
      return Response.json({ id: lastRowId }, { status: 201 });
    }
    return Response.json(await env.DB.query("SELECT * FROM notes ORDER BY id DESC LIMIT 50"));
  },
  async job(job, env, ctx) {},       // runs jobs and crons
  async message(event, env, ctx) {}, // receives WebSocket messages
};
```

The runtime is workerd (the Cloudflare Workers runtime): the web platform
APIs (`fetch`, `Request`, `Response`, streams, `crypto.subtle`, `URL`,
`TextEncoder`, …) and `node:*` modules (`node:crypto`, `node:buffer`, …).

- Files are modules by extension: `.js`/`.mjs` are ES modules; `.json`
  imports as data; `.txt .html .htm .css .md .svg .xml .csv` as strings;
  `.wasm` as a `WebAssembly.Module`; anything else as an `ArrayBuffer`.
  Import them with relative paths: `import page from "./index.html"`.
- JavaScript only, with no build step or npm installs: write plain modules,
  or bundle and compile TypeScript yourself and deploy the output.
- Files under `public/` are not modules: the `assets` binding serves them as
  they are, when your code passes it a request. Put HTML, CSS, browser
  JavaScript, images and fonts there. Every service has code: a static site
  is `index.js` with `export default { fetch: (req, env) => env.ASSETS.fetch(req) }`
  and `"bindings": {"ASSETS": "assets"}`.
- `request.url` has the public host; the client's address is in
  `X-Forwarded-For`.
- Outbound `fetch` and `connect()` reach public internet addresses only, and
  only the hosts the service is allowed (any, unless set with `PATCH`
  below). A refused request answers `403` and a failed one (DNS, connection,
  timeout) `502`, both with an `X-Zeroko-Egress` header (`blocked` or
  `error`) and the reason in the body. Each one is in the logs.
- Each service has a {{HEAP_MB}} MB heap. A request that keeps the CPU busy
  for {{CPU_SECONDS}} seconds restarts the service and fails the requests in
  flight. Idle services stop and start again on the next request in a few
  milliseconds.
- A service's databases and files share a disk quota ({{DISK_MB}} MB unless
  set otherwise); a write past it fails with "the service's disk quota … is
  full".
- WebSockets created in the service (`new WebSocketPair()`) do not work: use
  the `realtime` binding.

## Deploy

```
POST {{BASE}}/api/services/<name>/deployments
{
  "main": "src/index.js",
  "files": {
    "src/index.js": "export default { … }",
    "src/page.html": "<!doctype html>…",
    "logo.png": {"base64": "iVBORw0KGgo…"}
  },
  "bindings": {"DB": "db", "UPLOADS": "files", "JOBS": "jobs", "LIVE": "realtime"},
  "crons": [{"schedule": "0 * * * *", "payload": {"task": "cleanup"}}],
  "vars": {"GREETING": "hello"}
}
```

- `<name>`: 1 to 40 lowercase letters, digits and hyphens. The first
  deployment creates the service, at the `url` in the answer.
- `files`: path → content, a string or `{"base64": "…"}`. Every deployment
  sends every file: up to 2000 files, 50 MB.
- `main`: defaults to `index.js`, `src/index.js`, `worker.js` or `main.js`.
- `bindings`: env name → `db`, `files`, `jobs`, `realtime`, `assets` or
  `service:<name>`. Data belongs to the service and the binding's name:
  renaming a binding starts it empty.
- `vars`: plain strings in `env`. Use secrets for credentials. Vars set on
  the service (below) go over these.

`201` returns `{"deployment": {...}, "url": "..."}`: the new version serves
every request from now on. `422` returns the deployment with
`status: "failed"` and the error (a syntax error, a missing import, an
exception at the top level); the previous version keeps serving. `400` is an
invalid request.

## Bindings

### db: SQLite

```js
const rows = await env.DB.query("SELECT * FROM users WHERE email = ?", email); // [{...}, ...]
const { changes, lastRowId } = await env.DB.run("UPDATE users SET name = ? WHERE id = ?", name, id);
const results = await env.DB.batch([ // one transaction: all or none
  ["INSERT INTO orders (user_id) VALUES (?)", userId],
  ["UPDATE stock SET n = n - 1 WHERE item = ?", item],
]); // [{rows, changes, lastRowId}, ...]
```

- Parameters: strings, numbers, booleans (stored as 0/1), `null`,
  `Uint8Array` or `ArrayBuffer` (blobs, returned as `Uint8Array`), `Date`
  (an ISO string).
- Create the schema from the service: `CREATE TABLE IF NOT EXISTS …` on first
  use, or a `version` table you check. `run` takes several statements
  separated by `;` (a schema script).
- Transactions are only `batch()`. `BEGIN`, `COMMIT`, `ATTACH` and pragmas
  that change storage are refused.
- Statements run one at a time per database, up to 30 seconds each. A
  database holds up to 1 GB; a result up to 100,000 rows or 32 MB.

Reading a row, changing it in code and writing it back loses changes when
requests do it at once. Do it under a lock: the function runs alone among
those that lock the same key, in the order they asked.

```js
const room = await env.DB.lock(`room:${code}`, async () => {
  const [row] = await env.DB.query("SELECT state FROM rooms WHERE code = ?", code);
  const room = JSON.parse(row.state);
  room.players.push(player);
  await env.DB.run("UPDATE rooms SET state = ? WHERE code = ?", JSON.stringify(room), code);
  return room; // lock returns what the function returns
});
```

A key is up to 256 bytes, per binding. A lock is released when the function
ends or throws, and after 30 seconds in any case; a caller waits up to 30
seconds for its turn, then `lock` throws. Locking a key again inside its own
lock waits for itself: don't.

### files: file storage

```js
await env.UPLOADS.put("avatars/42.png", request.body, { type: "image/png" }); // {key, size, type, etag, uploaded}
const res = await env.UPLOADS.get("avatars/42.png");   // a streamed Response, or null
return res ?? new Response("Not found", { status: 404 });
const meta = await env.UPLOADS.head("avatars/42.png"); // {key, size, type, etag, uploaded} or null
await env.UPLOADS.delete("avatars/42.png");            // true if it existed
const { files, cursor } = await env.UPLOADS.list({ prefix: "avatars/", limit: 100, cursor });
```

`get(key, request)` applies the request's `Range` and conditional headers
(pass the request, its headers or an object like `{range: "bytes=0-1023"}`):
it returns a `206` with that part, a `304` or a `416`, as is to return, which
is what audio and video need. `put` takes a string, `ArrayBuffer`, typed
array, `Blob` or `ReadableStream`. Keys are up to 1024 bytes; files up to 5 GB. `list`
returns keys in order, up to 1000; pass `cursor` back while it is set.

### jobs: background work and crons

```js
await env.JOBS.send({ email: "a@b.c" });                          // {id}
await env.JOBS.send({ report: 7 }, { delay: 3600, attempts: 5 }); // seconds; 3 attempts by default
await env.JOBS.send({ order: 42 }, { key: "receipt:42" });       // {id, duplicate: true} if one is pending
await env.JOBS.cancel(id);                                       // or cancel("receipt:42"): true if it was queued
```

A `key` (up to 256 bytes) makes a job the only one with it while it is
queued, running or dead: sending another returns that job's id with
`duplicate: true` and queues nothing. Once it is done or deleted, the key is
free again. `cancel` deletes a queued job; a running one finishes.

Each job calls the service's `job(job, env, ctx)` with
`{id, payload, attempt, cron}`. A handler that throws is retried with backoff
(10 s, 20 s, 40 s, … up to an hour) until it runs out of attempts; then the
job is `dead`. A job runs up to 15 minutes, up to 4 at once per service.
Delivery is at least once: make handlers safe to repeat.

`crons` in the deployment queue a job each time the schedule matches (five
fields, UTC: `*/15 * * * *`, `0 9 * * 1-5`), with `payload` and `cron` set.
Cron jobs have one attempt.

### realtime: live updates

```js
// In fetch: turn this request into a live connection on some channels.
if (url.pathname === "/live") {
  const user = await authenticate(request); // your check
  return env.LIVE.subscribe([`room:${room}`], { meta: { user } });
}
await env.LIVE.publish(`room:${room}`, { text: "hello" }); // {delivered: n}; objects go as JSON
await env.LIVE.send(connectionId, "only you");              // true if connected
await env.LIVE.connections(`room:${room}`);               // [{connection, meta}]: who is there, up to 1000
```

Clients connect with `new EventSource("/live?room=1")` (Server-Sent Events,
server to client) or `new WebSocket("wss://…/live?room=1")` (both ways); the
same route serves both. Zeroko holds the connections: the service may stop
between messages and they stay open.

WebSocket messages call `message(event, env, ctx)`, one at a time per
connection, with `{type: "message", connection, channels, meta, data}`, and
`{type: "close", …}` when a connection closes, WebSocket or Server-Sent
Events. `meta` is what you passed to `subscribe`. Messages are text, up to
1 MB.

### assets: static files

```js
return env.ASSETS.fetch(request); // the file of public/ at the request's path, or a 404
```

`/x` serves `public/x`, `public/x.html` or `public/x/index.html`; a path
ending in `/` its `index.html`. The request's range and conditions apply
(206, 304), with `ETag` and `Cache-Control: no-cache`. Your code decides the
rest: a single-page app answers paths that are no file with the app:

```js
const res = await env.ASSETS.fetch(request);
return res.status === 404 && request.method === "GET" ? env.ASSETS.fetch(new URL("/", request.url)) : res;
```

### service:<name>: calling another service

```js
const res = await env.API.fetch("https://api/orders?id=7", { method: "POST", body }); // "API": "service:api"
```

The request reaches that service as one to its URL would (only the path and
query of the URL count), without leaving Zeroko: no egress rules apply and
nothing goes over the internet. It arrives with `X-Zeroko-From: <caller>`,
which requests from outside cannot carry, so a service can keep routes for
the services that call it. It shows in that service's logs and metrics.
HTTP only: realtime connections come from clients.

## Secrets

```
PUT    {{BASE}}/api/services/<name>/secrets/<NAME>  {"value": "..."} → 204
GET    {{BASE}}/api/services/<name>/secrets                         → [{name, updated_at}]
DELETE {{BASE}}/api/services/<name>/secrets/<NAME>                  → 204
```

Secrets appear in `env` as strings and apply to the running version at
once. The service must exist (deploy first). Values are never returned.

## Vars without a deployment

```
PUT    {{BASE}}/api/services/<name>/vars/<NAME>  {"value": "..."} → 204
GET    {{BASE}}/api/services/<name>/vars                         → [{name, value, updated_at}]
DELETE {{BASE}}/api/services/<name>/vars/<NAME>                  → 204
```

Plain strings in `env`, over the deployment's var of the same name, applied
at once like secrets; deleting one brings the deployment's back. A name is
a var or a secret, not both.

## Inspect and operate

Under `{{BASE}}/api`:

```
GET    /services                              → [{name, url, status, ...}]
POST   /services                              {"name": "..."} → a service with no deployment; without a name, one is picked
GET    /services/<name>                       → status, active deployment, manifest, bindings, usage, quota, process
PATCH  /services/<name>                       {"name": "new-name", "egress": ["api.example.com", "*.github.com"], "disk_mb": 2048}: any of them
POST   /services/<name>/stop | /start         → a stopped service answers 503 and runs no jobs
DELETE /services/<name>                       → deletes the service and all its data

GET    /services/<name>/logs?limit=200        → [{id, ts, source, level, message, deployment}], oldest first
GET    /services/<name>/logs?after=<id>&wait=30  → waits up to 30 s for entries after id
GET    /services/<name>/metrics?period=24h    → requests, 5xx, exceptions, p50/p95, outbound (1h, 24h, 7d, 30d)

GET    /services/<name>/deployments           → newest first; the last 10 are kept
POST   /services/<name>/deployments/<id>/activate  → roll back or forward to a ready deployment
GET    /services/<name>/deployments/<id>/source    → {main, files} as deployed
GET    /services/<name>/deployments/<id>/bundle    → the body that deploys it again

POST   /services/<name>/db/<BINDING>/query    {"sql": "...", "params": [...]} → [{rows, columns, changes, lastRowId}]
GET    /services/<name>/db/<BINDING>/tables   → [{name, sql, rows}]
GET    /services/<name>/files/<BINDING>?prefix=  → {files, cursor}
GET|PUT|DELETE /services/<name>/files/<BINDING>/file?key=<key>
GET    /services/<name>/jobs?status=dead      → queued, running or dead
POST   /services/<name>/jobs                  {"payload": ..., "delay": 0, "key": ""} → 201, or 200 with the pending job of that key
DELETE /services/<name>/jobs/<id>             → deletes a job in any state
POST   /services/<name>/jobs/<id>/retry       → a dead job, with fresh attempts
POST   /services/<name>/crons/run             {"schedule": "0 * * * *"} → queues that cron's job now
POST   /services/<name>/realtime/publish      {"channel": "...", "data": ...}

GET    /services/<name>/storage               → [{type, binding, bytes, count, bound}]
DELETE /services/<name>/storage/<type>/<BINDING>  → empties one store
GET    /services/<name>/export                → all its data as .tar.gz
POST   /services/<name>/import                (the .tar.gz) → replaces the stores it holds

GET    /system/backup                         → the whole instance as .tar.gz, secrets' key included
POST   /system/restore                        (the .tar.gz) → 202; Zeroko restarts on the backup
```

Each log entry has a `source`: `request` (method, path, status, duration),
`console` (`console.*` output and uncaught exceptions), `fetch` (outbound
requests) or `runtime` (the process: starts, stops and why, restarts, failed
deployments and workerd's errors). A service's status is
`running` (it serves its code; the process sleeps when idle and starts on
the next request), `stopped` or `not_deployed`.

## Workflow

1. Write the service; keep it to a few modules.
2. Deploy. On `422`, read `deployment.error`, fix it and deploy again.
3. Request the URL and read the logs to check it works.
4. Set secrets; they apply at once.
5. For an error at runtime, read the logs, fix and deploy again. Roll back
   with `activate` if a new version misbehaves.
