// A reload must use the same font bytes (or the same network fallback) as its
// first navigation. Otherwise responsive reflow looks like lost saved positions.
// This cache belongs to one check context; production requests are untouched.
export async function cacheCheckFonts(context) {
  const responses = new Map();
  await context.route(/^https:\/\/fonts\.(?:googleapis|gstatic)\.com\//, async route => {
    const url = route.request().url();
    if (!responses.has(url)) {
      responses.set(url, route.fetch({ timeout: 10000, maxRetries: 1 }).catch(() => {
        console.warn(`FONT unavailable; retaining fallback for this check: ${url}`);
        return null;
      }));
    }
    const response = await responses.get(url);
    if (response) await route.fulfill({ response });
    else await route.abort('failed');
  });
}

export async function settleCheckFonts(page) {
  await page.evaluate(async () => {
    // Force font use before waiting; fonts.ready only covers requested faces.
    document.body.getBoundingClientRect();
    await document.fonts.ready;
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
}
