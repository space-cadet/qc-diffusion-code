import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:5174';

async function testMemoryBank() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  page.on('console', msg => {
    console.log(`[${msg.type()}] ${msg.text().substring(0, 200)}`);
  });
  
  page.on('pageerror', err => {
    console.log(`❌ PageError: ${err.message}`);
  });
  
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  
  console.log('\n📸 Clicking Memory Bank...');
  await page.getByText('Memory Bank').click();
  
  // Wait much longer - 15 seconds
  console.log('Waiting 15 seconds for lazy load...');
  await page.waitForTimeout(15000);
  
  // Check state
  const loading = await page.locator('text=Loading...').count();
  const welcome = await page.locator('text=Welcome to Memory Bank').count();
  const sidebar = await page.locator('text=Memory Bank').count();
  
  console.log(`\nAfter 15s:`);
  console.log(`  Loading indicators: ${loading}`);
  console.log(`  Welcome message: ${welcome}`);
  console.log(`  Sidebar elements: ${sidebar}`);
  
  // Take screenshot
  await page.screenshot({ path: '/root/.openclaw/workspace/code/qc-diffusion-code/screenshots/05-memory-bank.png', fullPage: true });
  console.log('✅ Screenshot saved');
  
  await browser.close();
}

testMemoryBank().catch(console.error);
