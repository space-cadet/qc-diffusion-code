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
    await page.waitForTimeout(3000);

    // Click on Random Walk Sim tab
    console.log('🔄 Clicking Random Walk Sim tab...');
    const randomWalkTab = await page.locator('text=Random Walk Sim').first();
    await randomWalkTab.click();
    await page.waitForTimeout(3000);

    // Check console logs for errors
    const logs = await page.evaluate(() => {
      return (window as any).consoleLogs || [];
    });
    console.log('Console logs so far:', logs.slice(0, 10));

    // Check if simulator exists
    const hasSimulator = await page.evaluate(() => {
      return !!(window as any).simulator;
    });
    console.log('Simulator exists:', hasSimulator);

    // Check particle manager
    const pmInfo = await page.evaluate(() => {
      const sim = (window as any).simulator;
      if (!sim) return null;
      const pm = sim.getParticleManager?.();
      return {
        hasPM: !!pm,
        particleCount: pm?.getAllParticles?.().length || 0,
      };
    });
    console.log('Particle manager info:', pmInfo);

    // Take screenshot
    await page.screenshot({ 
      path: 'screenshots/02-random-walk-debug.png',
      fullPage: true 
    });
    console.log('✅ 02-random-walk-debug.png');

    // Click Initialize
    console.log('🔄 Clicking Initialize...');
    const initButton = await page.locator('button:has-text("Initialize")').first();
    await initButton.click({ force: true });
    await page.waitForTimeout(3000);

    // Check again after init
    const pmInfoAfter = await page.evaluate(() => {
      const sim = (window as any).simulator;
      if (!sim) return null;
      const pm = sim.getParticleManager?.();
      return {
        hasPM: !!pm,
        particleCount: pm?.getAllParticles?.().length || 0,
      };
    });
    console.log('Particle manager after init:', pmInfoAfter);

    await page.screenshot({ 
      path: 'screenshots/02-random-walk-after-init-debug.png',
      fullPage: true 
    });
    console.log('✅ 02-random-walk-after-init-debug.png');

    console.log('\n📊 Done');
    
  } catch (e) {
    console.error('❌ Error:', e.message);
  } finally {
    await browser.close();
  }
}

runSimulation();