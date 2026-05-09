import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:5174';

async function runSimulation() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 }
  });
  const page = await context.newPage();

  try {
    console.log('🚀 Navigating to app...');
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Click on Random Walk Sim tab
    console.log('🔄 Clicking Random Walk Sim tab...');
    const randomWalkTab = await page.locator('text=Random Walk Sim').first();
    await randomWalkTab.click();
    await page.waitForTimeout(3000);

    // Look for ALL buttons
    console.log('🔍 Scanning for buttons...');
    const buttons = await page.locator('button').all();
    console.log(`Found ${buttons.length} buttons:`);
    for (let i = 0; i < Math.min(buttons.length, 20); i++) {
      const text = await buttons[i].textContent().catch(() => '');
      const disabled = await buttons[i].isDisabled().catch(() => false);
      console.log(`  ${i}: "${text.trim()}" ${disabled ? '[disabled]' : ''}`);
    }

    // Try Initialize first
    const initButton = await page.locator('button:has-text("Initialize"), button:has-text("Reset"), button:has-text("Init")').first();
    if (await initButton.isVisible().catch(() => false)) {
      console.log('🔄 Clicking Initialize...');
      await initButton.click({ force: true });
      await page.waitForTimeout(3000);
      
      await page.screenshot({ 
        path: 'screenshots/02-random-walk-after-init.png',
        fullPage: true 
      });
      console.log('✅ 02-random-walk-after-init.png');
    }

    // Now try Start
    const startButton = await page.locator('button:has-text("Start"), button:has-text("▶")').first();
    if (await startButton.isVisible().catch(() => false)) {
      console.log('▶️ Force-clicking Start...');
      await startButton.click({ force: true });
      
      console.log('⏱️ Running for 5 seconds...');
      await page.waitForTimeout(5000);
      
      await page.screenshot({ 
        path: 'screenshots/02-random-walk-running.png',
        fullPage: true 
      });
      console.log('✅ 02-random-walk-running.png');
    }

    console.log('\n📊 Done');
    
  } catch (e) {
    console.error('❌ Error:', e.message);
    await page.screenshot({ path: 'screenshots/02-random-walk-error.png' });
  } finally {
    await browser.close();
  }
}

runSimulation();