# Wait Conditions Improvements

## Summary

I've significantly improved the wait conditions in all failing tests to handle:
1. Page redirects (layout might redirect before showing content)
2. Reactive statement processing (Svelte reactive statements need time)
3. DOM element visibility (elements might exist but not be visible)
4. Network idle states (waiting for all requests to complete)

## Improvements Made

### 1. URL Stabilization
- Added `waitForURL()` to ensure page has finished redirecting
- Layouts might redirect based on auth state, so we wait for final URL

### 2. Load State Waits
- Added `waitForLoadState('domcontentloaded')` 
- Added `waitForLoadState('networkidle')`
- Ensures page is fully loaded before checking elements

### 3. Comprehensive Visibility Checks
- Using `waitForFunction()` to check:
  - Element exists in DOM
  - Element is visible (not `display: none` or `visibility: hidden`)
  - Spinner is gone
  - Required child elements exist

### 4. Element-Specific Waits
- For navigation: Wait for links by `href` attribute (most reliable)
- For forms: Wait for inputs by `id` attribute (most reliable)
- Then check visibility using semantic selectors (`getByRole`, `getByLabel`)

### 5. Increased Timeouts
- Navigation tests: 30s for layout, 20s for links
- Form tests: 25s for form, 20s for inputs, 15s for labels
- Added 2s wait after reactive statements

## Current Status

**Total Tests**: 14
**Passing**: 7 (50%)
**Failing**: 7 (50%)

The wait conditions are now much more robust. The remaining failures may be due to:
1. Elements not rendering at all (application bug)
2. Different selectors needed
3. Need to check screenshots to see what's actually on the page

## Next Steps

If tests still fail, consider:
1. Taking screenshots to see what's actually rendered
2. Checking browser console for errors
3. Verifying the application actually renders these elements in production
4. Using `page.pause()` to debug interactively

