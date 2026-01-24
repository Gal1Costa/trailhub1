# Frontend Testing Guide

This document describes the testing setup for TrailHub frontend, including unit tests and end-to-end tests.

## Overview

- **Unit Tests**: Vitest + React Testing Library
- **E2E Tests**: Playwright
- **Coverage**: Component rendering, user interactions, form validation, API integration

## Quick Start

### Install Dependencies
```bash
npm install
```

### Run Tests

#### Unit Tests
```bash
# Run in watch mode (interactive)
npm run test

# Run with UI (interactive dashboard)
npm run test:ui

# Run once (CI mode)
npm run test:run

# Generate coverage report
npm run test:coverage
```

#### E2E Tests
```bash
# Run all tests
npm run e2e

# Run with UI (interactive mode)
npm run e2e:ui

# Debug mode (browser visible, step-by-step)
npm run e2e:debug

# Run specific test file
npx playwright test e2e/auth.spec.js
```

## Test Structure

### Unit Tests (`src/__tests__/`)

Tests for individual components and utilities:

- **AuthModal.test.jsx** - Login/register form, validation, error handling
- **HikeCard.test.jsx** - Hike display, click handlers, difficulty badges
- **EditProfileModal.test.jsx** - Profile form, validation, submission

**Running specific unit test:**
```bash
npm run test -- AuthModal.test.jsx
```

### E2E Tests (`e2e/`)

Full user journey tests:

- **auth.spec.js** - User registration, login, error handling
- **hikes.spec.js** - Hike creation, editing, deletion, booking
- **search-and-filter.spec.js** - Search, filtering, sorting, pagination

**Running specific E2E test:**
```bash
npx playwright test e2e/auth.spec.js
```

## Configuration Files

### `vitest.config.js`
- Configures Vitest with jsdom environment
- Sets up test setup file for mocks and globals
- Defines coverage reporting

### `playwright.config.js`
- Configures Playwright test runner
- Sets browser options (Chromium, Firefox, WebKit)
- Defines test directory and reporting

## Writing Tests

### Unit Test Template (Vitest)
```javascript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

describe('ComponentName', () => {
  it('should render correctly', () => {
    render(<Component />);
    expect(screen.getByText('text')).toBeInTheDocument();
  });
});
```

### E2E Test Template (Playwright)
```javascript
import { test, expect } from '@playwright/test';

test('user can perform action', async ({ page }) => {
  await page.goto('/');
  await page.click('button:has-text("Login")');
  await expect(page.locator('text=Welcome')).toBeVisible();
});
```

## Debugging

### Debug Unit Tests
```bash
npm run test -- --inspect-brk
```

### Debug E2E Tests
```bash
npm run e2e:debug
```

This opens the Playwright Inspector with browser visible for step-by-step debugging.

### View Test Report
After running tests, open the HTML report:
```bash
npx playwright show-report
```

## CI/CD Integration

Tests are designed to run in CI environments:

```bash
# Run all tests in CI mode
npm run test:run
npm run e2e
```

The following environment variables can control test behavior:
- `CI=true` - Runs tests in CI mode (single worker, 2 retries)
- `DEBUG=pw:api` - Enables Playwright debug logging

## Coverage Goals

- Components: 80%+ coverage
- Critical paths: 100% (auth, booking, search)
- UI interactions: All major user flows tested

## Common Issues

### Tests hang or timeout
- Ensure backend is running (`npm run dev` in root)
- Check that Vite dev server is running (`npm run dev` in frontend)
- Increase timeout in individual tests: `await page.waitForTimeout(10000)`

### Selectors not found
- Use browser DevTools to inspect elements
- Use `page.pause()` in E2E tests to stop and inspect
- Try more specific selectors or use `data-testid` attributes

### Mocks not working
- Ensure `setup.js` is being loaded
- Check mock paths are relative to the test file
- Use `vi.clearAllMocks()` between tests

## Next Steps

1. **Add more unit tests** for remaining components
2. **Expand E2E tests** with role-based scenarios
3. **Set up CI/CD pipeline** to run tests on every commit
4. **Add visual regression tests** with Playwright
5. **Performance testing** with Lighthouse integration

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Best Practices](https://testingjavascript.com/)
