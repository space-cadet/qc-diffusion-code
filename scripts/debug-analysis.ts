import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:5174';

async function debugLoading() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // Track console
  page.on('console', msg => {
    console.log(`[${msg.type()}] ${msg.text().substring(0, 200)}`);
  });
  
  page.on('pageerror', err => {
    console.log(`❌ PageError: ${err.message}`);
  });
  
  // Track request failures
  page.on('requestfailed', req => {
    console.log(`❌ Request failed: ${req.url()} | ${req.failure()?.errorText}`);
  });
  
  console.log('🚀 Navigating...');
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  
  console.log('\n📸 Clicking Analysis...');
  await page.getByText('Analysis').click();
  
  // Wait and check for errors
  await page.waitForTimeout(3000);
  
  // Check if Suspense is still showing
  const suspense = await page.locator('text=Loading...').count();
  console.log(`\nSuspense fallback showing: ${suspense > 0 ? 'YES' : 'NO'}`);
  
  // Try to find if component rendered at all
  const hasDashboard = await page.locator('text=Analysis Dashboard').count();
  console.log(`Analysis Dashboard found: ${hasDashboard > 0 ? 'YES' : 'NO'}`);
  
  // Check for any error UI
  const hasError = await page.locator('text=Error').count();
  console.log(`Error UI found: ${hasError > 0 ? 'YES' : 'NO'}`);
  
  // Now try Memory Bank
  console.log('\n📸 Clicking Memory Bank...');
  await page.getByText('Memory Bank').click();
  await page.waitForTimeout(3000);
  
  const mbSuspense = await page.locator('text=Loading...').count();
  console.log(`\nSuspense fallback showing: ${mbSuspense > 0 ? 'YES' : 'NO'}`);
  
  const hasWelcome = await page.locator('text=Welcome to Memory Bank').count();
  console.log(`Welcome message found: ${hasWelcome > 0 ? 'YES' : 'NO'}`);
  
  await browser.close();
}

debugLoading().catch(console.error);
