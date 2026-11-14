// Checks only: keep Chromium off the intermittent system/browser CDN DNS path.
// The original HTTPS URLs, TLS hostnames and pinned dependency versions stay intact.
import { Resolver } from 'node:dns/promises';
import { isIP } from 'node:net';
import { pathToFileURL } from 'node:url';
import { setTimeout } from 'node:timers/promises';

export async function cdnAddress() {
  if (process.env.SC_CHECK_CDN_IP) {
    if (isIP(process.env.SC_CHECK_CDN_IP) !== 4) throw Error('SC_CHECK_CDN_IP must be an IPv4 address');
    return process.env.SC_CHECK_CDN_IP;
  }
  const resolver = new Resolver({ timeout: 2000, tries: 1 });
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const addresses = await resolver.resolve4('cdn.jsdelivr.net');
      const address = addresses.find(a => isIP(a) === 4);
      if (!address) throw Error('no IPv4 answers');
      console.error(`CDN cdn.jsdelivr.net -> ${address} (DNS attempt ${attempt})`);
      return address;
    } catch (error) {
      if (attempt === 3) throw Error('Could not resolve cdn.jsdelivr.net after 3 attempts', { cause: error });
      console.error(`CDN DNS attempt ${attempt}: ${error.code || error.message}; retrying`);
      await setTimeout(attempt * 250);
    }
  }
}

export async function cdnArgs() {
  return [`--host-resolver-rules=MAP cdn.jsdelivr.net ${await cdnAddress()}`];
}

// run-all resolves once and shares the answer with every isolated browser process.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log(await cdnAddress());
}
