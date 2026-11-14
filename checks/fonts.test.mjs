import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cacheCheckFonts } from './fonts.mjs';

test('font requests share the original response across concurrent loads and reload', async () => {
  let handle, fetches = 0;
  await cacheCheckFonts({ route(pattern, handler) {
    assert.ok(pattern.test('https://fonts.gstatic.com/example.woff2'));
    assert.ok(!pattern.test('https://cdn.jsdelivr.net/example.js'));
    handle = handler;
  } });
  const response = {}, delivered = [];
  const route = {
    request: () => ({ url: () => 'https://fonts.gstatic.com/example.woff2' }),
    fetch: async () => { fetches++; return response; },
    fulfill: async value => delivered.push(value.response),
    abort: () => assert.fail('unexpected fallback'),
  };
  await Promise.all([handle(route), handle(route)]);
  await handle(route);
  assert.equal(fetches, 1);
  assert.deepEqual(delivered, [response, response, response]);
});

test('a first-navigation font failure retains the same fallback on reload', async () => {
  let handle, fetches = 0, aborts = 0;
  await cacheCheckFonts({ route: (_, handler) => { handle = handler; } });
  const route = {
    request: () => ({ url: () => 'https://fonts.googleapis.com/css2?family=Archivo' }),
    fetch: async () => { if (++fetches === 1) throw Error('temporary DNS failure'); return {}; },
    fulfill: () => assert.fail('reload must not switch to a different font'),
    abort: async reason => { assert.equal(reason, 'failed'); aborts++; },
  };
  await handle(route);
  await handle(route);
  assert.equal(fetches, 1);
  assert.equal(aborts, 2);
});
