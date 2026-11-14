import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Resolver } from 'node:dns/promises';
import { cdnAddress, cdnArgs } from './cdn.mjs';

function setAddress(t, value) {
  const previous = process.env.SC_CHECK_CDN_IP;
  process.env.SC_CHECK_CDN_IP = value;
  t.after(() => {
    if (previous === undefined) delete process.env.SC_CHECK_CDN_IP;
    else process.env.SC_CHECK_CDN_IP = previous;
  });
}

test('CDN resolver retries a transient failure and pins only jsDelivr', async t => {
  setAddress(t, '');
  let calls = 0;
  t.mock.method(Resolver.prototype, 'resolve4', async host => {
    assert.equal(host, 'cdn.jsdelivr.net');
    if (++calls === 1) throw Object.assign(Error('temporary DNS failure'), { code: 'EAI_AGAIN' });
    return ['192.0.2.10'];
  });
  assert.deepEqual(await cdnArgs(), ['--host-resolver-rules=MAP cdn.jsdelivr.net 192.0.2.10']);
  assert.equal(calls, 2);
});

test('suite answer bypasses repeated DNS and rejects resolver-rule injection', async t => {
  setAddress(t, '192.0.2.11');
  t.mock.method(Resolver.prototype, 'resolve4', async () => assert.fail('unexpected DNS request'));
  assert.equal(await cdnAddress(), '192.0.2.11');
  process.env.SC_CHECK_CDN_IP = '192.0.2.11, MAP * 127.0.0.1';
  await assert.rejects(cdnAddress(), /must be an IPv4 address/);
});

test('persistent DNS failure stops after three attempts', async t => {
  setAddress(t, '');
  let calls = 0;
  t.mock.method(Resolver.prototype, 'resolve4', async () => { calls++; throw Error('DNS unavailable'); });
  await assert.rejects(cdnAddress(), /after 3 attempts/);
  assert.equal(calls, 3);
});
