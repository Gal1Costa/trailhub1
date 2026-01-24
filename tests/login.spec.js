import { test, expect } from './fixtures/auth.fixtures';

test('Sign up and verify login to TrailHub dashboard', async ({ page, testUser }) => {
  await page.goto('/');

  await page.getByRole('button', { name: /Log In/i }).click();

  await page.waitForSelector('form.auth-form', { timeout: 5000 });
  
  await page.getByRole('button', { name: /Sign Up/i }).click();

  await page.waitForSelector('input[placeholder="Your name"]', { timeout: 5000 });

  const fullNameInput = page.locator('input[placeholder="Your name"]');
  const emailInput = page.locator('input[type="email"]');
  const passwordInput = page.locator('input[type="password"]');

  await fullNameInput.fill(testUser.name);
  await emailInput.fill(testUser.email);
  await passwordInput.fill(testUser.password);

  await page.locator('.role-card').first().click();

  await page.locator('button.auth-submit').click();

  await page.waitForURL('**/explore', { timeout: 10000 });
  
  expect(page.url()).toContain('/explore');
});
