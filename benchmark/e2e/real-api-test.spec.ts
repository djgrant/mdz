import { test, expect } from '@playwright/test';

/**
 * Real API Integration Test
 * 
 * This test actually calls the Vercel AI Gateway API.
 * Run sparingly to conserve API credits.
 */
test.describe('Real API Integration', () => {
  test.setTimeout(120000); // 2 minute timeout for real API calls

  test('run benchmark with real Vercel AI Gateway', async ({ page }) => {
    // Navigate to the app (uses baseURL from playwright config which is 4399)
    await page.goto('/');
    
    // Take initial screenshot
    await page.screenshot({ path: 'e2e/screenshots/real-01-initial.png', fullPage: true });
    console.log('Screenshot 1: Initial load');
    
    // Verify page loaded
    await expect(page.locator('h1')).toContainText('MDZ Benchmark Runner');
    
    // Verify dropdowns are populated
    const caseSelect = page.locator('#case-select');
    const testSelect = page.locator('#test-select');
    
    await expect(caseSelect).toBeVisible();
    await expect(testSelect).toBeVisible();
    
    // Select the test case
    await caseSelect.selectOption('cases/unit/for-each-basic');
    await testSelect.selectOption('simple');
    
    // Take screenshot before running
    await page.screenshot({ path: 'e2e/screenshots/real-02-before-run.png', fullPage: true });
    console.log('Screenshot 2: Before run (case selected)');
    
    // Click run button
    const runBtn = page.locator('#run-btn');
    await expect(runBtn).toBeEnabled();
    
    console.log('Clicking Run Benchmark...');
    await runBtn.click();
    
    // Verify button shows running state
    await expect(runBtn).toContainText('Running');
    
    // Take screenshot during execution
    await page.screenshot({ path: 'e2e/screenshots/real-03-running.png', fullPage: true });
    console.log('Screenshot 3: Running state');
    
    // Wait for results (up to 90 seconds for real API)
    const results = page.locator('#results');
    await expect(results).toBeVisible({ timeout: 90000 });
    
    // Take screenshot of results
    await page.screenshot({ path: 'e2e/screenshots/real-04-results.png', fullPage: true });
    console.log('Screenshot 4: Results displayed');
    
    // Capture and log the result details
    const statusEl = page.locator('#stat-status');
    const statusText = await statusEl.textContent();
    console.log('Status:', statusText);
    
    const durationEl = page.locator('#stat-duration');
    const durationText = await durationEl.textContent();
    console.log('Duration:', durationText);
    
    const toolsEl = page.locator('#stat-tools');
    const toolsText = await toolsEl.textContent();
    console.log('Tool calls:', toolsText);
    
    const tokensEl = page.locator('#stat-tokens');
    const tokensText = await tokensEl.textContent();
    console.log('Tokens:', tokensText);
    
    const costEl = page.locator('#stat-cost');
    const costText = await costEl.textContent();
    console.log('Cost:', costText);
    
    // Check for errors
    const errorSection = page.locator('#error-section');
    const hasError = await errorSection.isVisible();
    if (hasError) {
      const errorMsg = await page.locator('#error-msg').textContent();
      console.log('ERROR:', errorMsg);
      await page.screenshot({ path: 'e2e/screenshots/real-05-error.png', fullPage: true });
    }
    
    // Get the response
    const responseEl = page.locator('#response');
    const responseText = await responseEl.textContent();
    console.log('Response preview:', responseText?.slice(0, 200) + '...');
    
    // Verify we got actual results
    expect(statusText).toBeTruthy();
    expect(durationText).toBeTruthy();
    
    // If successful, verify we have tool calls (the skill should read 3 files)
    if (statusText === '✓') {
      expect(parseInt(toolsText || '0')).toBeGreaterThanOrEqual(3);
      expect(parseInt(tokensText || '0')).toBeGreaterThan(0);
    }
    
    console.log('\n=== Test Complete ===');
    console.log('Success:', statusText === '✓');
  });
});
