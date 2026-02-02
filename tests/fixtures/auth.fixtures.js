import { test as base } from '@playwright/test';

/**
 * Extended fixtures with auth
 * Usage:
 *   test('my test', async ({ page, testUser }) => { ... })
 *   test('my test', async ({ authenticatedPage }) => { ... })
 */
export const test = base.extend({
  // Create a new unique test user object
  testUser: async ({}, use) => {
    const timestamp = Date.now();
    const user = {
      email: `testuser${timestamp}@trailhub.local`,
      password: 'TestPassword123!',
      name: 'Test User',
    };
    await use(user);
  },

  // Pre-authenticated page with logged-in user (creates real DB records)
  authenticatedPage: async ({ page }, use) => {
    const timestamp = Date.now();
    const user = {
      email: `testuser${timestamp}@trailhub.local`,
      password: 'TestPassword123!',
      name: 'Test User',
    };

    // Sign up
    await page.goto('/');
    await page.getByRole('button', { name: /Log In/i }).click();
    await page.waitForSelector('form.auth-form', { timeout: 5000 });
    
    await page.getByRole('button', { name: /Sign Up/i }).click();
    await page.waitForSelector('input[placeholder="Your name"]', { timeout: 5000 });

    await page.locator('input[placeholder="Your name"]').fill(user.name);
    await page.locator('input[type="email"]').fill(user.email);
    await page.locator('input[type="password"]').fill(user.password);

    // Select Hiker role
    await page.locator('.role-card').first().click();

    // Submit
    await page.locator('button.auth-submit').click();

    // Wait for successful redirect
    await page.waitForURL('**/explore', { timeout: 10000 });

    await use(page);
  },
});

export { expect } from '@playwright/test';
