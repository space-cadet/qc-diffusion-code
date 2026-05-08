const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5174';
const SCREENSHOT_DIR = '/root/.openclaw/workspace/code/qc-diffusion-code/screenshots';

async function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function captureAllTabs() {
  await ensureDir(SCREENSHOT_DIR);
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // Track console errors
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push({ text: msg.text(), location: msg.location() });
    }
  });
  
  // Track page errors
  page.on('pageerror', err => {
    errors.push({ text: err.message, type: 'pageerror' });
  });
  
  console.log('🚀 Navigating to app...');
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  
  // Get all tab names
  const tabs = await page.$$eval('[role="tab"], button, a', els => 
    els.filter(e => e.textContent.trim()).map(e => ({
      text: e.textContent.trim(),
      tag: e.tagName,
      visible: e.offsetParent !== null
    }))
  );
  console.log('Found tabs:', tabs.map(t => t.text).slice(0, 10));
  
  // Screenshot function
  const screenshot = async (name) => {
    const filePath = path.join(SCREENSHOT_DIR, `${name}.png`);
    await page.screenshot({ path: filePath, fullPage: true });
    console.log(`✅ ${name}.png`);
    return filePath;
  };
  
  // Capture each tab by clicking
  const tabNames = [
    { name: '01-pde-simulation', selector: 'text=PDE Simulation' },
    { name: '02-random-walk', selector: 'text=Random Walk' },
    { name: '03-quantum-walk', selector: 'text=Quantum Walk' },
    { name: '04-simplicial-growth', selector: 'text=Simplicial Growth' },
    { name: '05-memory-bank', selector: 'text=Memory Bank' },
    { name: '06-analysis', selector: 'text=Analysis' },
  ];
  
  for (const { name, selector } of tabNames) {
    try {
      console.log(`\n📸 ${name}...`);
      const tab = await page.locator(selector).first();
      if (await tab.isVisible().catch(() => false)) {
        await tab.click();
        await page.waitForTimeout(3000);
        await screenshot(name);
      } else {
        console.log(`⚠️ Tab ${selector} not visible`);
      }
    } catch (e) {
      console.log(`❌ ${name} failed: ${e.message}`);
    }
  }
  
  console.log('\n📊 Summary:');
  console.log(`Total errors: ${errors.length}`);
  if (errors.length > 0) {
    console.log('Errors:', errors.slice(0, 5).map(e => e.text));
  }
  
  await browser.close();
}

captureAllTabs().catch(console.error);
