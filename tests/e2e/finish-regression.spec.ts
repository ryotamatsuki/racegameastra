import { test, expect } from '@playwright/test';
test('four-lap oval lane cycle from countdown through actual finish', async ({ page }, info) => {
  test.setTimeout(240000);
  await page.setViewportSize({ width: 960, height: 640 });
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('response', r => { if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); });
  await page.goto('./');
  await page.locator('.settings>summary').click();
  await page.locator('.settings select').selectOption('low');
  await page.locator('.settings>summary').click();
  await page.getByRole('button', { name: 'ワークショップを開く' }).click();
  await page.getByRole('button', { name: 'コースを選ぶ' }).click();
  await page.getByRole('button', { name: 'この構成で走る' }).click();
  await page.screenshot({ path: info.outputPath('oval-start-lanes.png'), timeout: 60000 });
  const result = page.getByRole('heading', { name: '走りが、答えになった。' });
  let pauses = 0;
  for (let i = 0; i < 160 && !(await result.isVisible()); i++) {
    const resume = page.getByRole('button', { name: '走行を再開', exact: true });
    if (await resume.isVisible()) { pauses++; await resume.click(); }
    await page.waitForTimeout(500);
  }
  await expect(result).toBeVisible();
  await expect(page.locator('tbody tr')).toHaveCount(4);
  for (const row of await page.locator('tbody tr').all()) await expect(row).toContainText('完走');
  await expect(page.getByRole('columnheader', { name: 'LAP 4' })).toBeVisible();
  await page.screenshot({ path: info.outputPath('oval-finish.png'), timeout: 60000 });
  await info.attach('environment.json', { body: JSON.stringify({ url: page.url(), viewport: page.viewportSize(), quality: 'low', pauses, errors }), contentType: 'application/json' });
  expect(errors).toEqual([]);
});
