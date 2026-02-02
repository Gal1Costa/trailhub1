import { test, expect } from './fixtures/auth.fixtures';

test.describe('Authentication Flow', () => {
  test('should sign up new user', async ({ page, testUser }) => {
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
    expect(page.url()).toContain('/explore');
  });

  test('should reject invalid email format', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Log In/i }).click();
    await page.waitForSelector('form.auth-form', { timeout: 5000 });
    
    await page.getByRole('button', { name: /Sign Up/i }).click();
    await page.waitForSelector('input[placeholder="Your name"]', { timeout: 5000 });

    await page.locator('input[placeholder="Your name"]').fill('Test User');
    await page.locator('input[type="email"]').fill('invalid-email');
    await page.locator('input[type="password"]').fill('TestPassword123!');
    await page.locator('.role-card').first().click();

    // Try to submit - should show validation error
    await page.locator('button.auth-submit').click();
    
    const error = page.locator('.auth-error');
    await expect(error).toBeVisible({ timeout: 3000 });
  });

  test('should require password', async ({ page, testUser }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Log In/i }).click();
    await page.waitForSelector('form.auth-form', { timeout: 5000 });
    
    await page.getByRole('button', { name: /Sign Up/i }).click();
    await page.waitForSelector('input[placeholder="Your name"]', { timeout: 5000 });

    await page.locator('input[placeholder="Your name"]').fill(testUser.name);
    await page.locator('input[type="email"]').fill(testUser.email);
    // Leave password empty

    await page.locator('.role-card').first().click();
    await page.locator('button.auth-submit').click();

    // Should show validation error
    const error = page.locator('.auth-error');
    await expect(error).toBeVisible({ timeout: 3000 });
  });
});
