// compare.mjs: the before/after table. Runs tools/perf/measure.mjs against the old build and the new one in turn
// (old, new, old, new ...), so the network's and the machine's ups and downs fall on both alike, and prints one
// table per size and GPU. Every run's numbers are kept in docs/perf/compare-<size>-<gpu>.json.
//   node tools/perf/compare.mjs --old http://localhost:8731/ --new http://localhost:8732/ [--rounds 5] [--configs desktop:nvidia,phone:nvidia,desktop:amd]
// The old build: a checkout of the commit before the rebuild (git worktree add ../sigil-cat-old 797fbb7), served
// with tools/serve.py on another port. Needs PW_FROM like measure.mjs.
import { execFileSync } from 'child_process';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const here = dirname(fileURLToPath(import.meta.url)), root = join(here, '../..');
const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const urls = { old: opt('old', 'http://localhost:8731/'), new: opt('new', 'http://localhost:8732/') };
const rounds = Number(opt('rounds', 5)), configs = opt('configs', 'desktop:nvidia,phone:nvidia,desktop:amd').split(',').map((c) => c.split(':'));
const median = (a) => { const s = a.slice().sort((x, y) => x - y); return s[Math.floor((s.length - 1) / 2)]; };
const run = (api, size, gpu, only) => JSON.parse(execFileSync('node', [join(here, 'measure.mjs'), urls[api], '--api', api, '--size', size, '--gpu', gpu, '--runs', '1', '--only', only], { encoding: 'utf8', maxBuffer: 1e8 }));

mkdirSync(join(root, 'docs/perf'), { recursive: true });
for (const [size, gpu] of configs) {
  const R = { old: [], new: [] };
  let gpuName = '';
  for (let i = 0; i < rounds; i++) for (const api of i % 2 ? ['new', 'old'] : ['old', 'new']) {
    const r = run(api, size, gpu, 'load,rest,eggs'); gpuName = r.gpu;
    R[api].push({ firstCatMs: r.load.firstCatMs, bytes: r.load.bytes, requests: r.load.requests, restMeanMs: r.rest.meanMs, restP95Ms: r.rest.p95Ms,
      startup: r.longestFrameMs.startup.worst, bolt: r.longestFrameMs.bolt.worst, butterman: r.longestFrameMs.butterman.worst, galaxy: r.longestFrameMs.galaxy.worst });
    process.stderr.write(`${size} ${gpu} round ${i + 1} ${api}: ${JSON.stringify(R[api][R[api].length - 1])}\n`);
  }
  writeFileSync(join(root, `docs/perf/compare-${size}-${gpu}.json`), JSON.stringify({ size, gpu: gpuName, rounds, when: new Date().toISOString(), old: R.old, new: R.new }, null, 1));
  const col = (api, k) => R[api].map((x) => x[k]);
  const row = (label, k, fmt = (v) => String(Math.round(v))) => `| ${label} | ${fmt(median(col('old', k)))} (${fmt(Math.min(...col('old', k)))}-${fmt(Math.max(...col('old', k)))}) | ${fmt(median(col('new', k)))} (${fmt(Math.min(...col('new', k)))}-${fmt(Math.max(...col('new', k)))}) |`;
  const mb = (v) => (v / 1e6).toFixed(2), ms = (v) => v.toFixed(2);
  console.log(`\n**${size}, ${gpuName.replace(/^ANGLE \(|, OpenGL.*$/g, '')}** (median of ${rounds}, lowest-highest in brackets)\n`);
  console.log('| | before | after |\n|---|---|---|');
  console.log([row('time to first cat, ms', 'firstCatMs'), row('MB before first frame', 'bytes', mb), row('frame time at rest, ms', 'restMeanMs', ms),
    row('longest frame, his first 7 s, ms', 'startup'), row('longest frame, first bolt, ms', 'bolt'), row('longest frame, first Butterman, ms', 'butterman'), row('longest frame, first galaxy, ms', 'galaxy')].join('\n'));
}
