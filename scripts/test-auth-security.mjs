import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createHmac } from 'node:crypto';
import ts from 'typescript';

// Run the real TypeScript modules with request cookies and database access
// replaced. No production credentials, customer records or database are used.
const require = createRequire(import.meta.url);
const root = path.resolve(import.meta.dirname, '..');
const denied = new Error('AUTH_REQUIRED');
let checks = 0;
function environment({ allow = false } = {}) {
  let now = 1_800_000_000_000;
  const env = { NODE_ENV: 'production', AUTH_USERNAME: 'synthetic-user', SESSION_SECRET: 'synthetic-test-secret-never-used-in-production-123456' };
  const cookieValues = new Map();
  const writes = [];
  const cache = new Map();
  let guardCalls = 0;
  let dbCalls = 0;
  const jar = {
    get: name => cookieValues.has(name) ? { value: cookieValues.get(name) } : undefined,
    set: (name, value, options) => { writes.push({ name, value, options }); cookieValues.set(name, value); },
    delete: name => cookieValues.delete(name),
  };
  const db = { getDb: () => { dbCalls++; throw new Error('UNEXPECTED_DATABASE_ACCESS'); } };
  const actionSession = { requireSession: async () => { guardCalls++; if (!allow) throw denied; return { username: env.AUTH_USERNAME, exp: now / 1000 + 3600 }; } };
  const queryStub = new Proxy({}, { get: (_, name) => async () => { dbCalls++; if (name === 'getMortgageCaseById') return { id: 'synthetic-id' }; throw new Error('UNEXPECTED_QUERY'); } });
  function load(file, actionMocks = false) {
    const absolute = path.resolve(root, file);
    const key = `${absolute}:${actionMocks}`;
    if (cache.has(key)) return cache.get(key).exports;
    const loadedModule = { exports: {} };
    cache.set(key, loadedModule);
    const source = readFileSync(absolute, 'utf8');
    const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
    function resolve(id) {
      if (id === 'next/headers') return { cookies: async () => jar };
      if (id === 'next/navigation') return { redirect: () => { throw denied; } };
      if (id === 'next/cache') return { revalidatePath: () => {} };
      if (id === '@/db') return db;
      if (actionMocks && id === '@/lib/auth/session') return actionSession;
      if (actionMocks && id.startsWith('@/db/queries/')) return queryStub;
      if (id === '@/lib/auth/session' && file.startsWith('src/db/queries')) return actionSession;
      if (id.startsWith('@/') || id.startsWith('.')) {
        let target = id.startsWith('@/') ? path.join(root, 'src', id.slice(2)) : path.resolve(path.dirname(absolute), id);
        if (!existsSync(target + '.ts')) target = path.join(target, 'index');
        return load(path.relative(root, target + '.ts'), actionMocks);
      }
      return require(id);
    }
    const context = { module: loadedModule, exports: loadedModule.exports, require: resolve, Buffer, URL, Response, Request, FormData, File, console, process: { env }, Date: class extends Date { static now() { return now; } } };
    vm.runInNewContext(output, context, { filename: absolute });
    return loadedModule.exports;
  }
  return { load, env, cookieValues, writes, advance: milliseconds => { now += milliseconds; }, now: () => now, guardCalls: () => guardCalls, dbCalls: () => dbCalls };
}
async function check(name, run) { await run(); checks++; console.log(`PASS ${name}`); }

await check('all protected server actions reject before validation or database access', async () => {
  let count = 0;
  for (const file of ['mortgage-actions.ts', 'advisor-actions.ts', 'excel-import-actions.ts', 'lender-actions.ts']) {
    const e = environment();
    for (const action of Object.values(e.load(`src/lib/${file}`, true))) {
      if (typeof action !== 'function') continue;
      await assert.rejects(() => action(), error => error === denied);
      count++;
    }
    assert.equal(e.dbCalls(), 0);
  }
  assert.equal(count, 17);
});
await check('every exported database query rejects before database access', async () => {
  let count = 0;
  for (const file of readdirSync(path.join(root, 'src/db/queries')).filter(f => f.endsWith('.ts'))) {
    const e = environment();
    for (const query of Object.values(e.load(`src/db/queries/${file}`))) {
      if (typeof query !== 'function' || /^class\s/.test(Function.prototype.toString.call(query))) continue;
      await assert.rejects(() => query(), error => error === denied);
      count++;
    }
    assert.equal(e.dbCalls(), 0);
  }
  assert.equal(count, 32);
});
await check('authenticated dossier load still reaches the existing query', async () => {
  const e = environment({ allow: true });
  const result = await e.load('src/lib/mortgage-actions.ts', true).loadMortgageCaseAction('synthetic-id');
  assert.equal(result.id, 'synthetic-id');
  assert.equal(e.guardCalls(), 1);
  assert.equal(e.dbCalls(), 1);
});
await check('one-hour signed secure cookie; legacy ten-hour cookies rejected', async () => {
  const e = environment();
  const session = e.load('src/lib/auth/session.ts');
  e.cookieValues.set('dba_session', 'legacy-cookie');
  assert.equal(await session.getSession(), null);
  const legacyPayload = Buffer.from(JSON.stringify({ username: e.env.AUTH_USERNAME, exp: e.now() / 1000 + 3500 })).toString('base64url');
  const legacySignature = createHmac('sha256', e.env.SESSION_SECRET).update(legacyPayload).digest('base64url');
  e.cookieValues.set('dba_session_v2', `${legacyPayload}.${legacySignature}`);
  assert.equal(await session.getSession(), null, 'renaming a legacy cookie cannot bypass the migration');
  const expiresAt = await session.createSession(e.env.AUTH_USERNAME);
  assert.equal(expiresAt, e.now() + 3600000);
  assert.equal(e.cookieValues.has('dba_session'), false);
  const cookie = e.writes.at(-1);
  assert.equal(cookie.name, 'dba_session_v2');
  assert.equal(cookie.options.maxAge, 3600);
  assert.equal(cookie.options.secure, true);
  assert.equal(cookie.options.httpOnly, true);
  assert.equal(cookie.options.sameSite, 'lax');
  e.advance(3599000);
  assert.ok(await session.getSession());
  e.advance(1000);
  assert.equal(await session.getSession(), null);
});
await check('tampering, extra token segments, invalid expiration and retired username rejected', async () => {
  const e = environment();
  const session = e.load('src/lib/auth/session.ts');
  await session.createSession(e.env.AUTH_USERNAME);
  const valid = e.cookieValues.get('dba_session_v2');
  for (const value of ['garbage', `${valid}.extra`, valid.slice(0, -4) + 'fake']) {
    e.cookieValues.set('dba_session_v2', value);
    assert.equal(await session.getSession(), null);
  }
  for (const exp of [null, 'future', e.now() / 1000 + 3601, e.now() / 1000, 1e100]) {
    const payload = Buffer.from(JSON.stringify({ version: 2, username: e.env.AUTH_USERNAME, exp })).toString('base64url');
    const signature = createHmac('sha256', e.env.SESSION_SECRET).update(payload).digest('base64url');
    e.cookieValues.set('dba_session_v2', `${payload}.${signature}`);
    assert.equal(await session.getSession(), null);
  }
  e.cookieValues.set('dba_session_v2', valid);
  e.env.AUTH_USERNAME = 'retired-user';
  assert.equal(await session.getSession(), null);
});
await check('session inspection never renews and renewal cannot revive expired sessions', async () => {
  const e = environment();
  const session = e.load('src/lib/auth/session.ts');
  const route = e.load('src/app/api/session/route.ts');
  assert.equal((await route.GET()).status, 401);
  await session.createSession(e.env.AUTH_USERNAME);
  const writesBefore = e.writes.length;
  e.advance(1800000);
  const before = await (await route.GET()).json();
  assert.equal(before.expiresAt, e.now() + 1800000);
  assert.equal(e.writes.length, writesBefore);
  for (const origin of ['https://other.example', null, 'null']) {
    const request = new Request('https://dashboard.example/api/session', { method: 'POST', headers: origin === null ? {} : { origin } });
    assert.equal((await route.POST(request)).status, 403);
  }
  assert.equal(e.writes.length, writesBefore);
  const request = () => new Request('https://dashboard.example/api/session', { method: 'POST', headers: { origin: 'https://dashboard.example' } });
  const response = await route.POST(request());
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal((await response.json()).expiresAt, e.now() + 3600000);
  e.advance(3600000);
  const expiredWrites = e.writes.length;
  assert.equal((await route.POST(request())).status, 401);
  assert.equal(e.writes.length, expiredWrites);
  await assert.rejects(() => session.requireSession(), error => error === denied);
});
await check('logout removes current cookie and old cookie', async () => {
  const e = environment();
  const session = e.load('src/lib/auth/session.ts');
  await session.createSession(e.env.AUTH_USERNAME);
  e.cookieValues.set('dba_session', 'legacy');
  await session.destroySession();
  assert.equal(e.writes.at(-1).options.maxAge, 0);
  assert.equal(await session.getSession(), null);
  assert.equal(e.cookieValues.has('dba_session'), false);
});
console.log(`${checks} security scenarios passed (17 actions and 32 query boundaries).`);
