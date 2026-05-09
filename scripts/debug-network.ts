import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:5174';

async function debugLoading() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // Track network requests
  page.on('request', req => {
    if (req.url().includes('.js') || req.url().includes('chunk')) {
      console.log(`📡 Request: ${req.url().substring(0, 100)}`);
    }
  });
  
  page.on('response', res => {
    if (res.url().includes('.js') || res.url().includes('chunk')) {
      console.log(`📥 Response: ${res.status()} | ${res.url().substring(0, 100)}`);
    }
  });
  
  // Track console
  page.on('console', msg => {
    console.log(`[${msg.type()}] ${msg.text().substring(0, 150)}`);
  });
  
  page.on('pageerror', err => {
    console.log(`❌ PageError: ${err.message}`);
  });
  
  console.log('🚀 Navigating...');
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  
  console.log('\n📸 Clicking Memory Bank...');
  await page.getByText('Memory Bank').click();
  await page.waitForTimeout(5000);
  
  // Check for loading state
  const loading = await page.locator('text=Loading...').count();
  console.log(`\nLoading indicators: ${loading}`);
  
  // Check if any content appeared
  const hasMemoryContent = await page.locator('text=Welcome to Memory Bank').count();
  console.log(`Memory Bank content found: ${hasMemoryContent}`);
  
  console.log('\n📸 Clicking Analysis...');
  await page.getByText('Analysis').click();
  await page.waitForTimeout(5000);
  
  const analysisLoading = await page.locator('text=Loading...').count();
  console.log(`\nLoading indicators: ${analysisLoading}`);
  
  const hasAnalysisContent = await page.locator('text=Analysis Dashboard').count();
  console.log(`Analysis content found: ${hasAnalysisContent}`);
  
  await browser.close();
}

debugLoading().catch(console.error);
