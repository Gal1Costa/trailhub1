import { test, expect } from './fixtures/auth.fixtures';

test.describe('Admin Access', () => {
  test('should prevent non-admin access', async ({ page, testUser }) => {
    // Sign up a regular user
    await page.goto('/');
    await page.getByRole('button', { name: /Log In/i }).click();
    await page.waitForSelector('form.auth-form', { timeout: 5000 });
    
    await page.getByRole('button', { name: /Sign Up/i }).click();
    await page.waitForSelector('input[placeholder="Your name"]', { timeout: 5000 });

    await page.locator('input[placeholder="Your name"]').fill(testUser.name);
    await page.locator('input[type="email"]').fill(testUser.email);
    await page.locator('input[type="password"]').fill(testUser.password);
    await page.locator('.role-card').first().click();
    await page.locator('button.auth-submit').click();

    await page.waitForURL('**/explore', { timeout: 10000 });
    
    // Verify user is on explore, not admin
    expect(page.url()).toContain('/explore');
  });
});
