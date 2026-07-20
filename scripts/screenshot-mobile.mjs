import { chromium } from 'playwright';

const VIEWPORT = { width: 375, height: 812 };

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize(VIEWPORT);

  // Navigate to login page (no auth needed)
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});

  await page.screenshot({ path: '/tmp/mobile-login.png', fullPage: true });
  console.log('✓ Captured /tmp/mobile-login.png at 375×812');

  // Check the app renders
  const bodyText = await page.locator('body').innerText().catch(() => 'empty');
  console.log('Page body text sample:', bodyText.slice(0, 200));

  // Check responsive classes
  const hasMobileNav = await page.locator('.nav-pill').isVisible().catch(() => false);
  console.log('Bottom nav pill visible:', hasMobileNav);

  const hasHeader = await page.locator('header[role="banner"]').isVisible().catch(() => false);
  console.log('Header visible:', hasHeader);

  // Check header elements at 375px
  const headerButtons = await page.locator('header button').count().catch(() => 0);
  console.log('Header buttons count:', headerButtons);

  // Log header text content
  const headerText = await page.locator('header').innerText().catch(() => '');
  console.log('Header text:', headerText.trim());

  // Scroll down to check layout
  await page.evaluate(() => window.scrollTo(0, 500));
  await page.waitForTimeout(500);
  await page.screenshot({ path: '/tmp/mobile-scrolled.png', fullPage: false });
  console.log('✓ Captured /tmp/mobile-scrolled.png');

  await browser.close();
  console.log('Done.');
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
