// Validation-only DNS repair. Optional historical source/browser for diagnosis.
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const { chromium } = createRequire(process.env.HOME+'/command-hq/scripts/shot/package.json')('playwright-core');
const launch = chromium.launch.bind(chromium);
chromium.launch = async options => {
 const browser = await launch({ ...options, ...(process.env.SC_CHECK_CHROME ? {executablePath:process.env.SC_CHECK_CHROME} : {}),
   args:[...(options.args || []),'--host-resolver-rules=MAP cdn.jsdelivr.net 151.101.129.229'] });
 if (process.env.SC_GALAXY_BASELINE) {
   const source=readFileSync(process.env.SC_GALAXY_BASELINE,'utf8'), make=browser.newContext.bind(browser);
   browser.newContext=async options=>{const context=await make(options);await context.route('**/src/eggs/galaxy.js',route=>route.fulfill({contentType:'text/javascript',body:source}));return context;};
 }
 return browser;
};
