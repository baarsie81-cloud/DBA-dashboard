import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as jsxRuntime from 'react/jsx-runtime';

// Execute the actual component's hooks, timers and event handlers against a
// deterministic clock and session service. No browser or database is needed.
const hour = 3600000;
const source = readFileSync(new URL('../src/components/auth/SessionActivity.tsx', import.meta.url), 'utf8');
const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
function setup(shared = { now: 1800000000000, exp: 1800000000000 + hour }) {
  const initialExpiresAt = shared.exp;
  let effect;
  let state = null;
  let cleanup;
  let left = false;
  let offline = false;
  let posts = 0;
  let gets = 0;
  const listeners = new Map();
  const refs = { current: () => {} };
  const timers = [];
  const add = (name, fn) => listeners.set(name, fn);
  const remove = name => listeners.delete(name);
  const window = { addEventListener: add, removeEventListener: remove, setInterval: fn => { timers.push(fn); return 1; }, clearInterval: () => {}, location: { replace: url => { assert.equal(url, '/login'); left = true; } } };
  const document = { visibilityState: 'visible', addEventListener: add, removeEventListener: remove };
  const loadedModule = { exports: {} };
  const fakeFetch = async (_, options) => {
    if (offline) throw new Error('Offline');
    if (options.method === 'POST') posts++; else gets++;
    if (shared.now >= shared.exp) return Response.json({}, { status: 401 });
    if (options.method === 'POST') shared.exp = shared.now + hour;
    return Response.json({ expiresAt: shared.exp });
  };
  vm.runInNewContext(output, {
    module: loadedModule, exports: loadedModule.exports,
    require: id => id === 'react/jsx-runtime' ? jsxRuntime : { useState: () => [state, value => { state = value; }], useRef: () => refs, useEffect: fn => { effect = fn; } },
    window, document, fetch: fakeFetch, AbortSignal, Date: class extends Date { static now() { return shared.now; } },
  });
  const render = () => loadedModule.exports.SessionActivity({ initialExpiresAt });
  render();
  cleanup = effect();
  const flush = () => new Promise(resolve => setImmediate(resolve));
  return { shared, render, cleanup, window, document,
    advance: async ms => { shared.now += ms; for (const timer of timers) timer(); await flush(); },
    activity: async (name = 'keydown', trusted = true) => { listeners.get(name)?.({ isTrusted: trusted }); await flush(); },
    pressContinue: async () => { const banner = render(); banner.props.children.at(-1).props.onClick(); await flush(); },
    offline: value => { offline = value; },
    state: () => ({ left, posts, gets, warning: state, listeners: listeners.size }),
  };
}
let checks = 0;
async function check(name, run) { await run(); checks++; console.log(`PASS ${name}`); }
await check('no heartbeat renewal, five-minute warning and idle logout', async () => {
  const app = setup();
  await app.advance(55 * 60000);
  assert.equal(app.state().posts, 0);
  assert.equal(app.state().warning, 5);
  assert.ok(app.render());
  await app.advance(5 * 60000);
  assert.equal(app.state().left, true);
  assert.equal(app.state().posts, 0);
});
await check('real interaction keeps active work signed in beyond two hours', async () => {
  const app = setup();
  for (let i = 0; i < 4; i++) {
    await app.advance(40 * 60000);
    await app.activity();
    assert.equal(app.shared.exp, app.shared.now + hour);
    assert.equal(app.state().left, false);
  }
  assert.equal(app.state().posts, 4);
  await app.activity('pointermove');
  assert.equal(app.state().posts, 4, 'continuous input is throttled');
});
await check('warning button renews; synthetic and hidden-tab events do not', async () => {
  const app = setup();
  await app.advance(55 * 60000);
  await app.activity('keydown', false);
  assert.equal(app.state().posts, 0);
  app.document.visibilityState = 'hidden';
  await app.activity();
  assert.equal(app.state().posts, 0);
  app.document.visibilityState = 'visible';
  await app.pressContinue();
  assert.equal(app.state().posts, 1);
  assert.equal(app.state().warning, null);
});
await check('a session renewed in another tab is inspected without extending idle time', async () => {
  const first = setup();
  const second = setup(first.shared);
  await first.advance(40 * 60000);
  await first.activity();
  await second.advance(21 * 60000);
  assert.equal(second.state().gets, 1);
  assert.equal(second.state().posts, 0);
  assert.equal(second.state().left, false);
  await second.advance(40 * 60000);
  assert.equal(second.state().left, true);
});
await check('network failure does not discard work; actual activity retries', async () => {
  const app = setup();
  await app.advance(30 * 60000);
  app.offline(true);
  await app.activity();
  assert.equal(app.state().left, false);
  app.offline(false);
  await app.activity();
  assert.equal(app.state().posts, 0, "failed requests are throttled too");
  await app.advance(30000);
  await app.activity();
  assert.equal(app.state().posts, 1);
  assert.equal(app.shared.exp, app.shared.now + hour);
  app.cleanup();
  assert.equal(app.state().listeners, 0);
});
console.log(`${checks} activity scenarios passed with deterministic clocks.`);
