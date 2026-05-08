const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5174';
const SCREENSHOT_DIR = '/root/.openclaw/workspace/code/qc-diffusion-code/screenshots';

async function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function takeScreenshot(page, name, waitMs = 2000) {
  await page.waitForTimeout(waitMs);
  const filePath = path.join(SCREENSHOT_DIR, `${name}.png`);
  await page.screenshot({ path: filePath, fullPage: true });
  console.log(`✅ Screenshot: ${name}.png`);
  return filePath;
}

async function captureTab(page, tabName, tabSelector, waitMs = 3000) {
  console.log(`\n📸 Capturing ${tabName}...`);
  try {
    await page.click(tabSelector);
    await page.waitForTimeout(waitMs);
    await takeScreenshot(page, tabName.toLowerCase().replace(/\s+/g, '-'));
  } catch (e) {
    console.log(`⚠️ ${tabName} tab not found or failed: ${e.message}`);
  }
}

(async () => {
  await ensureDir(SCREENSHOT_DIR);
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // Capture console errors
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
      console.log(`❌ Console error: ${msg.text()}`);
    }
  });
  
  console.log('🚀 Starting screenshot capture...');
  
  // 1. Homepage / PDE Simulation
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await takeScreenshot(page, '01-pde-simulation', 3000);
  
  // 2. Random Walk Sim
  await captureTab(page, 'Random Walk Sim', 'text=Random Walk Sim');
  
  // 3. Quantum Walk
  await captureTab(page, 'Quantum Walk', 'text=Quantum Walk');
  
  // 4. Simplicial Growth
  await captureTab(page, 'Simplicial Growth', 'text=Simplicial Growth');
  
  // 5. Memory Bank
  await captureTab(page, 'Memory Bank', 'text=Memory Bank');
  
  // 6. Analysis
  await captureTab(page, 'Analysis', 'text=Analysis');
  
  console.log('\n📊 Summary:');
  console.log(`Screenshots saved to: ${SCREENSHOT_DIR}`);
  console.log(`Console errors captured: ${errors.length}`);
  if (errors.length > 0) {
    console.log('Errors:', errors.slice(0, 5));
  }
  
  await browser.close();
})();
