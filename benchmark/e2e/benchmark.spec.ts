import { test, expect } from '@playwright/test';

// Mock response for benchmark API
const mockBenchmarkResult = {
  sessionId: 'mock-session-123',
  success: true,
  finalResponse: 'Task completed successfully. I processed all items.',
  toolCalls: [
    {
      name: 'read_file',
      args: { path: 'input.txt' },
      result: { content: 'test content' },
      durationMs: 5,
    },
    {
      name: 'write_file',
      args: { path: 'output.txt', content: 'processed content' },
      result: { success: true },
      durationMs: 3,
    },
  ],
  tokenUsage: {
    input: 1500,
    output: 200,
    total: 1700,
  },
  cost: {
    input: 0.0045,
    output: 0.003,
    total: 0.0075,
  },
  durationMs: 2345,
};

const mockErrorResult = {
  sessionId: 'mock-session-error',
  success: false,
  finalResponse: '',
  toolCalls: [],
  tokenUsage: { input: 0, output: 0, total: 0 },
  durationMs: 100,
  error: 'API rate limit exceeded',
};

test.describe('Benchmark App', () => {
  
  test('page loads with correct structure', async ({ page }) => {
    await page.goto('/');
    
    // Take screenshot to verify page loaded
    await page.screenshot({ path: 'e2e/screenshots/01-initial-load.png', fullPage: true });
    
    // Verify we're on the right page by checking visible text
    const pageContent = await page.textContent('body');
    
    // These should be visible on the benchmark page
    expect(pageContent).toContain('MDZ Benchmark Runner');
    expect(pageContent).toContain('Case');
    expect(pageContent).toContain('Test');
    expect(pageContent).toContain('Run Benchmark');
    
    // Verify the selectors exist and are interactive
    const caseSelect = page.locator('#case-select');
    const testSelect = page.locator('#test-select');
    const runBtn = page.locator('#run-btn');
    
    // Check they're actually visible and enabled
    await expect(caseSelect).toBeVisible();
    await expect(caseSelect).toBeEnabled();
    await expect(testSelect).toBeVisible();
    await expect(testSelect).toBeEnabled();
    await expect(runBtn).toBeVisible();
    await expect(runBtn).toBeEnabled();
    
    // Verify case select has the expected test case
    const caseOptions = await caseSelect.locator('option').allTextContents();
    console.log('Available cases:', caseOptions);
    expect(caseOptions.length).toBeGreaterThan(0);
    expect(caseOptions.some(opt => opt.includes('for-each-basic'))).toBe(true);
    
    // Verify test select is populated based on selected case
    const testOptions = await testSelect.locator('option').allTextContents();
    console.log('Available tests:', testOptions);
    expect(testOptions.length).toBeGreaterThan(0);
  });

  test('results section is hidden initially', async ({ page }) => {
    await page.goto('/');
    
    // Results section should not be visible before running - check for empty state instead
    const emptyState = page.locator('.empty-state');
    await expect(emptyState).toBeVisible();
    
    // Take screenshot showing no results
    await page.screenshot({ path: 'e2e/screenshots/02-no-results-initially.png', fullPage: true });
  });

  test('successful benchmark run displays all stats correctly', async ({ page }) => {
    // Set up route interception BEFORE navigating
    await page.route('**/api/run', async route => {
      console.log('Intercepted API call:', route.request().url());
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockBenchmarkResult),
      });
    });
    
    await page.goto('/');
    
    // Screenshot before clicking
    await page.screenshot({ path: 'e2e/screenshots/03-before-run.png', fullPage: true });
    
    // Click run and wait for results
    await page.locator('#run-btn').click();
    
    // Wait for results section to become visible
    const results = page.locator('#results');
    await expect(results).toBeVisible({ timeout: 15000 });
    
    // Screenshot after results appear
    await page.screenshot({ path: 'e2e/screenshots/04-after-run-success.png', fullPage: true });
    
    // Now verify the actual content displayed
    const resultsText = await results.textContent();
    console.log('Results section content:', resultsText);
    
    // Verify stats are displayed with correct values
    // Status should show checkmark
    const statusEl = page.locator('#stat-status');
    const statusText = await statusEl.textContent();
    console.log('Status text:', statusText);
    expect(statusText).toBe('✓');
    
    // Duration should be formatted correctly (2345ms -> 2.35s)
    const durationEl = page.locator('#stat-duration');
    const durationText = await durationEl.textContent();
    console.log('Duration text:', durationText);
    expect(durationText).toBe('2.35s');
    
    // Tool calls count
    const toolsEl = page.locator('#stat-tools');
    const toolsText = await toolsEl.textContent();
    console.log('Tools text:', toolsText);
    expect(toolsText).toBe('2');
    
    // Token count
    const tokensEl = page.locator('#stat-tokens');
    const tokensText = await tokensEl.textContent();
    console.log('Tokens text:', tokensText);
    expect(tokensText).toBe('1700');
    
    // Cost
    const costEl = page.locator('#stat-cost');
    const costText = await costEl.textContent();
    console.log('Cost text:', costText);
    expect(costText).toBe('$0.0075');
    
    // Verify tool calls are listed
    const toolCallsSection = page.locator('#tool-calls');
    const toolCallsText = await toolCallsSection.textContent();
    console.log('Tool calls content:', toolCallsText);
    expect(toolCallsText).toContain('read_file');
    expect(toolCallsText).toContain('write_file');
    
    // Verify response text
    const responseEl = page.locator('#response');
    const responseText = await responseEl.textContent();
    console.log('Response text:', responseText);
    expect(responseText).toContain('Task completed successfully');
  });

  test('failed benchmark run displays error correctly', async ({ page }) => {
    await page.route('**/api/run', async route => {
      console.log('Intercepted API call (error case):', route.request().url());
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockErrorResult),
      });
    });
    
    await page.goto('/');
    await page.locator('#run-btn').click();
    
    // Wait for results
    const results = page.locator('#results');
    await expect(results).toBeVisible({ timeout: 15000 });
    
    // Screenshot of error state
    await page.screenshot({ path: 'e2e/screenshots/05-after-run-error.png', fullPage: true });
    
    // Verify error indicator
    const statusEl = page.locator('#stat-status');
    const statusText = await statusEl.textContent();
    console.log('Error status text:', statusText);
    expect(statusText).toBe('✗');
    
    // Verify error section is visible with correct message
    const errorSection = page.locator('#error-section');
    await expect(errorSection).toBeVisible();
    
    const errorMsg = page.locator('#error-msg');
    const errorText = await errorMsg.textContent();
    console.log('Error message:', errorText);
    expect(errorText).toContain('API rate limit exceeded');
  });

  test('run button disabled during execution', async ({ page }) => {
    let resolveRoute: () => void;
    const routePromise = new Promise<void>(resolve => {
      resolveRoute = resolve;
    });
    
    await page.route('**/api/run', async route => {
      // Hold the response until we've checked the button state
      await routePromise;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockBenchmarkResult),
      });
    });
    
    await page.goto('/');
    
    const runBtn = page.locator('#run-btn');
    
    // Verify button is enabled before click
    await expect(runBtn).toBeEnabled();
    
    // Click and immediately check state
    await runBtn.click();
    
    // Screenshot while running
    await page.screenshot({ path: 'e2e/screenshots/06-during-run.png', fullPage: true });
    
    // Button should be disabled
    await expect(runBtn).toBeDisabled();
    
    // Button text should show running state
    const btnText = await runBtn.textContent();
    console.log('Button text:', btnText);
    expect(btnText).toContain('Running');
    
    // Release the response
    resolveRoute!();
    
    // Wait for completion and verify button re-enabled
    await expect(runBtn).toBeEnabled({ timeout: 15000 });
    
    // Screenshot after completion
    await page.screenshot({ path: 'e2e/screenshots/07-after-completion.png', fullPage: true });
  });

  test('network error handled gracefully', async ({ page }) => {
    await page.route('**/api/run', async route => {
      await route.abort('failed');
    });
    
    await page.goto('/');
    await page.locator('#run-btn').click();
    
    // Wait for error to appear - with the new UI, errors appear in the error panel
    const errorSection = page.locator('#error-section');
    await expect(errorSection).toBeVisible({ timeout: 15000 });
    
    // Screenshot of network error
    await page.screenshot({ path: 'e2e/screenshots/08-network-error.png', fullPage: true });
    
    const errorMsg = page.locator('#error-msg');
    const errorText = await errorMsg.textContent();
    console.log('Network error text:', errorText);
    expect(errorText).toBeTruthy();
    
    // Button should be re-enabled
    const runBtn = page.locator('#run-btn');
    await expect(runBtn).toBeEnabled();
  });

  test('API receives correct request payload', async ({ page }) => {
    let capturedRequest: { casePath: string; testName: string } | null = null;
    
    await page.route('**/api/run', async route => {
      capturedRequest = route.request().postDataJSON();
      console.log('Captured request:', capturedRequest);
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockBenchmarkResult),
      });
    });
    
    await page.goto('/');
    
    // Get the selected values before clicking
    const caseSelect = page.locator('#case-select');
    const testSelect = page.locator('#test-select');
    const selectedCase = await caseSelect.inputValue();
    const selectedTest = await testSelect.inputValue();
    console.log('Selected case:', selectedCase);
    console.log('Selected test:', selectedTest);
    
    await page.locator('#run-btn').click();
    
    // Wait for request to complete
    await expect(page.locator('#results')).toBeVisible({ timeout: 15000 });
    
    // Verify request payload matches UI selection
    expect(capturedRequest).not.toBeNull();
    expect(capturedRequest!.casePath).toBe(selectedCase);
    expect(capturedRequest!.testName).toBe(selectedTest);
    
    // Screenshot confirming data flow
    await page.screenshot({ path: 'e2e/screenshots/09-request-verified.png', fullPage: true });
  });
});
