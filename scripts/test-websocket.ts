import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:5174';

async function testWebSocket() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  const wsErrors = [];
  const wsMessages = [];
  
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('WebSocket') || text.includes('ws://')) {
      wsMessages.push({ type: msg.type(), text });
    }
  });
  
  page.on('pageerror', err => {
    if (err.message.includes('WebSocket') || err.message.includes('ws://')) {
      wsErrors.push(err.message);
    }
  });
  
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(5000);
  
  console.log('WebSocket messages:');
  wsMessages.forEach(m => console.log(`  [${m.type}] ${m.text.substring(0, 150)}`));
  
  console.log('\nWebSocket errors:');
  wsErrors.forEach(e => console.log(`  ${e.substring(0, 150)}`));
  
  await browser.close();
}

testWebSocket().catch(console.error);
