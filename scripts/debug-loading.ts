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
  
  // Track ALL console messages
  const logs = [];
  page.on('console', msg => {
    const text = msg.text();
    logs.push({ type: msg.type(), text });
    if (msg.type() === 'error') {
      console.log(`❌ Console error: ${text}`);
    } else if (msg.type() === 'warning') {
      console.log(`⚠️ Warning: ${text}`);
    }
  });
  
  page.on('pageerror', err => {
    const text = err.message;
    logs.push({ type: 'pageerror', text });
    console.log(`❌ Page error: ${text}`);
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
  
  // Capture Memory Bank with extended wait and logging
  console.log('\n📸 Memory Bank - checking for errors...');
  const tab = page.getByText('Memory Bank').first();
  if (await tab.isVisible().catch(() => false)) {
    await tab.click();
    await page.waitForTimeout(3000);
    
    // Check if still loading
    const loadingCount = await page.locator('text=Loading...').count();
    console.log(`  Loading indicators found: ${loadingCount}`);
    
    // Dump all console logs so far
    console.log('\n  Console logs for Memory Bank:');
    const mbLogs = logs.filter(l => l.text.includes('memory') || l.text.includes('Memory') || l.type === 'error');
    mbLogs.forEach(l => console.log(`    ${l.type}: ${l.text.substring(0, 100)}`));
    
    await screenshot('05-memory-bank-debug');
  }
  
  // Capture Analysis with extended wait and logging
  console.log('\n📸 Analysis - checking for errors...');
  const analysisTab = page.getByText('Analysis').first();
  if (await analysisTab.isVisible().catch(() => false)) {
    await analysisTab.click();
    await page.waitForTimeout(3000);
    
    const loadingCount = await page.locator('text=Loading...').count();
    console.log(`  Loading indicators found: ${loadingCount}`);
    
    console.log('\n  Console logs for Analysis:');
    const analysisLogs = logs.filter(l => l.text.includes('analysis') || l.text.includes('Analysis') || l.type === 'error');
    analysisLogs.forEach(l => console.log(`    ${l.type}: ${l.text.substring(0, 100)}`));
    
    await screenshot('06-analysis-debug');
  }
  
  console.log('\n📊 All logs:');
  logs.filter(l => l.type === 'error' || l.type === 'pageerror').forEach(l => {
    console.log(`  ${l.type}: ${l.text.substring(0, 150)}`);
  });
  
  await browser.close();
}

captureAllTabs().catch(console.error);
