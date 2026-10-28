const { test, expect } = require('@playwright/test');
const hosts = require('../hosts.json');
const live = !!process.env.BASE;

test('page structure: count, new tab, size, no scroll', async ({ page }) => {
  await page.goto('/');
  const links = page.locator('a');
  await expect(links).toHaveCount(hosts.length);
  for (let i = 0; i < hosts.length; i++) {
    const a = links.nth(i);
    await expect(a).toHaveAttribute('href', `https://${hosts[i]}/`);
    await expect(a).toHaveAttribute('target', '_blank');
    await expect(a).toHaveAttribute('rel', /noopener/);
    await expect(a).toHaveText(hosts[i]);
    const b = await a.boundingBox();
    expect(b.height).toBeGreaterThanOrEqual(56);
    expect(b.width).toBeGreaterThanOrEqual(380);
    expect(parseFloat(await a.evaluate(e => getComputedStyle(e).fontSize))).toBeGreaterThanOrEqual(18);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(await page.evaluate(() => innerWidth)).toBe(390);
  expect((await page.locator('body').innerText()).split('\n').filter(Boolean)).toEqual(hosts);
  await expect(page.locator('img,header,footer,h1,p')).toHaveCount(0);
});

test('private: noindex, robots, not linked elsewhere', async ({ page, request, baseURL }) => {
  await page.goto('/');
  await expect(page.locator('meta[name=robots]')).toHaveAttribute('content', 'noindex,nofollow');
  const r = await request.get(baseURL + '/robots.txt');
  expect(r.status()).toBe(200);
  expect((await r.text()).trim().split('\n')).toEqual(['User-agent: *', 'Disallow: /']);
  expect((await request.get(baseURL + '/sitemap.xml')).status()).toBe(404);
  for (const h of hosts) {
    const res = await request.get(`https://${h}/`, { failOnStatusCode: false }).catch(() => null);
    if (res && res.ok()) expect(await res.text(), h).not.toContain('o.ufuk.ie');
  }
});

for (const h of hosts) {
  test(`opens ${h} in new tab with 200`, async ({ page, context }) => {
    await page.goto('/');
    let status = null;
    context.on('response', r => { if (r.request().isNavigationRequest() && new URL(r.url()).hostname === h && status === null) status = r.status(); });
    const [popup] = await Promise.all([context.waitForEvent('page'), page.locator('a', { hasText: new RegExp(`^${h.replace(/\./g, '\\.')}$`) }).click()]);
    await popup.waitForLoadState('domcontentloaded', { timeout: 30000 }).catch(() => {});
    await expect.poll(() => status, { timeout: 30000 }).not.toBeNull();
    expect(status).toBe(200);
    await expect.poll(() => popup.url(), { timeout: 15000 }).toContain('//' + h);
  });
}

test('live certificate valid', async ({ request }) => {
  test.skip(!live, 'live only');
  const r = await request.get('https://o.ufuk.ie/');
  expect(r.status()).toBe(200);
});
