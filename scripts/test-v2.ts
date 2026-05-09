import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Capture ALL console logs
  const logs: string[] = [];
  page.on('console', msg => {
    const text = msg.text();
    logs.push(`[${msg.type()}] ${text}`);
    console.log(`[${msg.type()}] ${text}`);
  });

  try {
    await page.goto('http://localhost:5176', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    // Click Random Walk Sim tab
    const tab = await page.locator('button:has-text("Random Walk Sim")').first();
    if (await tab.isVisible().catch(() => false)) {
      await tab.click();
      await page.waitForTimeout(2000);
    }

    // Take screenshot of initial state
    await page.screenshot({ path: 'screenshots/08-v2-initial.png', fullPage: false });
    console.log('Initial screenshot saved');

    // Click Start button
    const startBtn = await page.locator('button:has-text("Start")').first();
    if (await startBtn.isVisible().catch(() => false)) {
      await startBtn.click();
      console.log('Start clicked');
      
      // Wait and take screenshot
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'screenshots/08-v2-running.png', fullPage: false });
      console.log('Running screenshot saved');
    }

    // Dump all logs
    console.log('\n=== ALL LOGS ===');
    logs.forEach(log => console.log(log));

  } catch (e) {
    console.error('Test failed:', e);
  } finally {
    await browser.close();
  }
})();
