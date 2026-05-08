import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:5174';
const SCREENSHOT_DIR = '/root/.openclaw/workspace/code/qc-diffusion-code/screenshots';

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function captureAllTabs() {
  ensureDir(SCREENSHOT_DIR);
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // Track console errors
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push({ text: msg.text(), location: msg.location() });
    }
  });
  
  page.on('pageerror', err => {
    errors.push({ text: err.message, type: 'pageerror' });
  });
  
  console.log('🚀 Navigating to app...');
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  
  // Screenshot function
  const screenshot = async (name) => {
    const filePath = path.join(SCREENSHOT_DIR, `${name}.png`);
    await page.screenshot({ path: filePath, fullPage: true });
    console.log(`✅ ${name}.png`);
    return filePath;
  };
  
  // Capture each tab by clicking
  const tabSelectors = [
    { name: '01-pde-simulation', text: 'PDE Simulation', waitFor: null },
    { name: '02-random-walk', text: 'Random Walk', waitFor: null },
    { name: '03-quantum-walk', text: 'Quantum Walk', waitFor: null },
    { name: '04-simplicial-growth', text: 'Simplicial Growth', waitFor: null },
    { name: '05-memory-bank', text: 'Memory Bank', waitFor: 'Welcome to Memory Bank' },
    { name: '06-analysis', text: 'Analysis', waitFor: 'Analysis Dashboard' },
  ];
  
  for (const { name, text, waitFor } of tabSelectors) {
    try {
      console.log(`\n📸 ${name}...`);
      const tab = page.getByText(text).first();
      if (await tab.isVisible().catch(() => false)) {
        await tab.click();
        
        // Wait for content to appear
        if (waitFor) {
          try {
            await page.waitForSelector(`text=${waitFor}`, { timeout: 15000 });
            console.log(`  ✅ Content loaded: ${waitFor}`);
          } catch (e) {
            console.log(`  ⚠️ Timeout waiting for: ${waitFor}`);
          }
        } else {
          await page.waitForTimeout(3000);
        }
        
        await screenshot(name);
      } else {
        console.log(`⚠️ Tab "${text}" not visible`);
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
