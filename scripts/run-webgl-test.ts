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

  page.on('pageerror', err => {
    logs.push(`[ERROR] ${err.message}`);
    console.log(`[ERROR] ${err.message}`);
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

    // Take screenshot
    await page.screenshot({ path: 'screenshots/03-webgl-test.png', fullPage: false });

    // Check if canvas exists
    const canvas = await page.locator('canvas').first();
    const hasCanvas = await canvas.isVisible().catch(() => false);
    console.log(`Canvas visible: ${hasCanvas}`);

    // Get canvas styles
    if (hasCanvas) {
      const styles = await canvas.evaluate(el => {
        const computed = window.getComputedStyle(el);
        return {
          width: computed.width,
          height: computed.height,
          backgroundColor: computed.backgroundColor,
          display: computed.display,
        };
      });
      console.log('Canvas styles:', styles);
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
