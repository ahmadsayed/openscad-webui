import puppeteer from 'puppeteer';

// Helper function to replace waitForTimeout
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

describe('OpenSCAD WebUI E2E Tests', () => {
  let browser;
  let page;

  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: false,
      slowMo: 50,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    page = await browser.newPage();
    await page.setViewport({ width: 1080, height: 1024 });
  });

  afterAll(async () => {
    if (page) {
      await page.close();
    }
    if (browser) {
      await browser.close();
    }
  });

  test('should navigate to simple editor and create 3D model', async () => {
    // Navigate to the main page
    console.log('Navigating to http://localhost:3000...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });

    // Wait for the page to load and find the "Launch SCAD Editor" button
    console.log('Waiting for Launch SCAD Editor button...');
    await page.waitForSelector('.launch-button', { timeout: 10000 });
    
    // Get the href attribute to see where it's supposed to navigate
    const href = await page.$eval('.launch-button', el => el.href);
    console.log('Button href:', href);

    // Click the button and wait for navigation
    console.log('Clicking Launch SCAD Editor button...');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }),
      page.click('.launch-button')
    ]);

    console.log('Navigation completed successfully!');
    console.log('Current URL:', page.url());

    // Wait for the simple.html page to load completely
    await delay(2000);

    // Click File menu to ensure clean state
    console.log('Clicking File menu...');
    await page.waitForSelector('.nav-item a[href="#"]', { timeout: 10000 });
    await page.click('.nav-item a[href="#"]'); // Click "File" menu

    // Wait for dropdown to appear and click "New"
    console.log('Clicking New option...');
    await page.waitForSelector('.dropdown a[onclick*="newDesign"]', { timeout: 5000 });
    await page.click('.dropdown a[onclick*="newDesign"]');

    console.log('Clicked File → New to ensure clean state');
    
    // Wait a moment for the new design to initialize
    await delay(1000);

    // Wait for the chat editor to be available
    console.log('Waiting for chat editor...');
    await page.waitForSelector('#simpleChatEditor', { timeout: 10000 });

    // Click on the chat editor to focus it
    console.log('Clicking on chat editor...');
    await page.click('#simpleChatEditor');

    // Type the text "replace cube with sphere"
    console.log('Typing: "replace cube with sphere"...');
    await page.type('#simpleChatEditor .ace_text-input', 'replace cube with sphere');

    // Wait for the Create 3D Model button to be available
    console.log('Waiting for Create 3D Model button...');
    await page.waitForSelector('#simpleChatSubmit', { timeout: 10000 });

    // Click the Create 3D Model button
    console.log('Clicking Create 3D Model button...');
    await page.click('#simpleChatSubmit');

    // Wait for the button to change state (processing)
    console.log('Waiting for button to show processing state...');
    await page.waitForSelector('#simpleChatSubmit.processing', { timeout: 5000 });
    console.log('Button is now in processing state');

    // Wait for the button to return to normal state (Create 3D Model)
    console.log('Waiting for button to return to normal state...');
    await page.waitForFunction(
      () => {
        const button = document.querySelector('#simpleChatSubmit');
        return button && !button.classList.contains('processing') && 
               button.querySelector('.button-text').textContent.trim() === 'Create 3D Model';
      },
      { timeout: 60000 } // Wait up to 60 seconds for processing to complete
    );

    console.log('Button has returned to "Create 3D Model" state - processing complete!');

    // Wait a bit to see the result
    await delay(2000);

    // Verify that the processing completed successfully
    const buttonText = await page.$eval('#simpleChatSubmit .button-text', el => el.textContent.trim());
    expect(buttonText).toBe('Create 3D Model');
  }, 120000); // 2 minute timeout for this test

  test('should navigate to advanced mode and verify code changes', async () => {
    // Now click on "Advanced Mode" link
    console.log('Looking for Advanced Mode link...');
    await page.waitForSelector('a[href="main.html"]', { timeout: 10000 });
    
    console.log('Clicking Advanced Mode link...');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }),
      page.click('a[href="main.html"]')
    ]);

    console.log('Successfully navigated to Advanced Mode!');
    console.log('Current URL:', page.url());

    // Wait for the advanced mode interface to load
    await delay(3000);

    // Check if the code editor contains "sphere" instead of "cube"
    console.log('Checking code editor content...');
    await page.waitForSelector('#editor', { timeout: 10000 });
    
    // Get the content of the code editor
    const editorContent = await page.evaluate(() => {
      // Try to get content from ACE editor if it's initialized
      if (window.ace && window.ace.edit) {
        try {
          const editor = window.ace.edit('editor');
          return editor.getValue();
        } catch (e) {
          // Fallback to DOM content if ACE is not ready
          return document.getElementById('editor').textContent || document.getElementById('editor').innerText;
        }
      } else {
        // Fallback to DOM content
        return document.getElementById('editor').textContent || document.getElementById('editor').innerText;
      }
    });

    console.log('Code editor content:', editorContent);

    // Check if the content contains "sphere" and not "cube"
    const containsSphere = editorContent.toLowerCase().includes('sphere');
    const containsCube = editorContent.toLowerCase().includes('cube');

    if (containsSphere && !containsCube) {
      console.log('✅ SUCCESS: Code editor contains "sphere" instead of "cube"');
    } else if (containsSphere && containsCube) {
      console.log('⚠️  PARTIAL: Code editor contains both "sphere" and "cube"');
    } else if (!containsSphere && containsCube) {
      console.log('❌ FAILED: Code editor still contains "cube" but no "sphere"');
    } else {
      console.log('❓ UNKNOWN: Code editor contains neither "sphere" nor "cube"');
    }

    // Jest assertions
    expect(containsSphere).toBe(true);
    expect(containsCube).toBe(false);

    // Wait a bit more to see the final result
    await delay(2000);
  }, 30000); // 30 second timeout for this test
});
