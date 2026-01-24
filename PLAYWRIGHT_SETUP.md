# Playwright E2E Test Suite - TrailHub

## Setup Complete ✅

### Configuration
- **baseURL**: `http://localhost:5173` (configured in `playwright.config.js`)
- **Browsers**: Chromium, Firefox, WebKit
- **Reporter**: HTML report at `playwright-report/`

### Fixtures
- **testUser**: Generates unique test user with unique email each run
- **authenticatedPage**: Pre-authenticated page with logged-in user

## Test Files

### 1. **auth.spec.js** - Authentication & Signup
Tests authentication flow including:
- ✅ Sign up new user
- ✅ Duplicate email rejection
- ✅ Login with existing credentials
- ✅ Invalid email format validation
- ✅ Required password validation

**Run:**
```bash
npx playwright test tests/auth.spec.js
npx playwright test tests/auth.spec.js --headed  # See browser
```

### 2. **profile.spec.js** - User Profile & Navigation
Tests user profile interactions:
- ✅ Access user profile page
- ✅ View my trails
- ✅ Logout functionality
- ✅ Navigate to explore page

**Run:**
```bash
npx playwright test tests/profile.spec.js --headed
```

### 3. **hikes.spec.js** - Hikes & Trails Features
Tests core hiking/trail features:
- ✅ View explore page with trails
- ✅ Navigate to hike details
- ✅ Create hike page navigation
- ✅ Search for trails
- ✅ Filter/sort trails
- ✅ View trail details

**Run:**
```bash
npx playwright test tests/hikes.spec.js --headed
```

### 4. **admin.spec.js** - Admin Access
Tests admin-specific features:
- ✅ Access admin dev login
- ✅ Non-admin user access restrictions

**Run:**
```bash
npx playwright test tests/admin.spec.js --headed
```

### 5. **login.spec.js** - Simple Login Test
Basic sign up test using fixtures.

## Running All Tests

```bash
# Run all tests
npx playwright test

# Run with headed mode (see browser)
npx playwright test --headed

# Run specific test file
npx playwright test tests/auth.spec.js

# Run single test
npx playwright test tests/auth.spec.js -g "should sign up"

# Debug mode (interactive inspector)
npx playwright test --debug

# Generate new tests with codegen
npx playwright codegen http://localhost:5173
```

## Test Results

View HTML report:
```bash
npx playwright show-report
```

## Best Practices Used

✅ **baseURL** - No hardcoded URLs  
✅ **Fixtures** - Reusable auth setup  
✅ **Unique test data** - Timestamps prevent conflicts  
✅ **Role-based selectors** - `getByRole()` for accessibility  
✅ **Proper waits** - `waitForURL()`, `waitForSelector()`  
✅ **Error handling** - Timeout values set appropriately  
✅ **Type safety** - JSDoc comments for IDE support  

## Troubleshooting

### Tests timeout
- Ensure dev server is running: `npm run dev`
- Check if elements are visible before interaction
- Increase timeout: `await page.waitForURL('...', { timeout: 15000 })`

### Selectors not found
- Use `npx playwright codegen` to generate accurate selectors
- Run with `--debug` to inspect elements
- Check browser console for errors

### Database issues
- Tests create unique users to avoid conflicts
- Old test data won't interfere
- No cleanup needed between runs

## Next Steps (Optional)

1. Add Percy/visual regression testing
2. Add performance monitoring
3. Set up CI/CD pipeline (GitHub Actions)
4. Add API mocking with MSW
5. Create test data factories for more complex scenarios
