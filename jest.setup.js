import puppeteer from 'puppeteer';

// Global setup for jest-puppeteer
beforeAll(async () => {
  global.browser = await puppeteer.launch({
    headless: false,
    slowMo: 50,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
});

afterAll(async () => {
  if (global.browser) {
    await global.browser.close();
  }
});
