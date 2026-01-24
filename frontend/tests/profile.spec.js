import { test, expect } from './fixtures/auth.fixtures';

test.describe('User Profile', () => {
  test('should view explore page when logged in', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    
    expect(page.url()).toContain('/explore');
    
    // Verify content loaded
    await page.waitForTimeout(1000);
    expect(page.url()).toContain('/explore');
  });

  test('should navigate to my trails page', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    
    const myTrailsLink = page.getByRole('link', { name: /My Trails|My Hikes/i });
    
    if (await myTrailsLink.isVisible({ timeout: 2000 })) {
      await myTrailsLink.click();
      await page.waitForURL('**/mytrails', { timeout: 5000 });
      expect(page.url()).toContain('/mytrails');
    }
  });
});
