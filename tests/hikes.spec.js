import { test, expect } from './fixtures/auth.fixtures';

test.describe('Hikes & Trails', () => {
  test('should be on explore page when logged in', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    
    expect(page.url()).toContain('/explore');
  });

  test('should navigate to hike details from explore', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    
    expect(page.url()).toContain('/explore');
    
    // Try to click on a hike link if available
    const hikeLink = page.locator('a[href*="/hikes/"]');
    
    if (await hikeLink.isVisible({ timeout: 2000 }).catch(() => false)) {
      await hikeLink.first().click();
      await page.waitForURL('**/hikes/*', { timeout: 5000 });
      expect(page.url()).toMatch(/\/hikes\/\d+|\/hikes\/.+/);
    }
  });
});
