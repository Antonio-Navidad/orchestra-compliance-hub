import { test, expect } from '@playwright/test';

const DEMO_PAGES = [
  { name: 'Auth (login screen)', path: '/auth' },
  { name: 'Shipment Intake', path: '/intake' },
  { name: 'OFAC Review Queue', path: '/ofac' },
  { name: 'Product Classification', path: '/classify' },
  { name: 'Document Intelligence', path: '/doc-intel' },
];

test.describe('Investor Demo — Smoke Tests', () => {
  for (const { name, path } of DEMO_PAGES) {
    test(`${name} loads without crashing`, async ({ page }) => {
      const jsErrors: string[] = [];
      page.on('pageerror', (err) => jsErrors.push(err.message));

      await page.goto(path);
      await page.waitForLoadState('networkidle');

      const bodyText = (await page.textContent('body')) || '';
      expect(bodyText.toLowerCase()).not.toContain('page not found');
      expect(bodyText.toLowerCase()).not.toContain('404');

      expect(jsErrors, `JS errors: ${jsErrors.join(', ')}`).toEqual([]);
    });
  }

  test('App entry point redirects somewhere valid', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const url = page.url();
    expect(url).toMatch(/auth|welcome|validate|intake|ofac|classify|doc-intel/);
  });
});