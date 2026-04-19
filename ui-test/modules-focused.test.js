import puppeteer from 'puppeteer';
import { promises as fs } from 'fs';

// Import the modules configuration
import { modules } from '../server/config/modules.js';

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Focus on high-priority modules first
const highPriorityModules = Object.keys(modules).reduce((acc, key) => {
  if (modules[key].priority === 'High') {
    acc[key] = modules[key];
  }
  return acc;
}, {});

// Helper to capture console logs
const setupConsoleCapture = (page) => {
  const logs = [];

  page.on('console', msg => {
    logs.push({
      type: msg.type(),
      text: msg.text(),
      timestamp: Date.now()
    });
  });

  page.on('pageerror', error => {
    logs.push({
      type: 'error',
      text: error.message,
      stack: error.stack,
      timestamp: Date.now()
    });
  });

  return {
    getLogs: () => logs,
    getErrors: () => logs.filter(log => log.type === 'error' || log.type === 'pageerror'),
    getWarnings: () => logs.filter(log => log.type === 'warning')
  };
};

// Natural language prompt generator
const naturalLanguagePrompts = {
  rounded_cube: "I need a cube with smooth, rounded edges instead of sharp corners. Should look like a dice that's been tumbled.",
  rounded_cylinder: "Make a cylinder where the top and bottom edges are smoothed out, not sharp.",
  torus: "Create a donut shape, like a ring or bagel.",
  tube: "I need a hollow pipe, like a piece of plumbing pipe with a hole through the center.",
  gear: "Make a mechanical gear with teeth around the edge, like you'd find in a clock.",
  bolt: "Create a bolt with a hexagonal head and threaded shaft, like you'd buy at a hardware store.",
  nut: "Make a hexagonal nut with threads inside, should fit the bolt I just made.",
  washer: "I need a thin flat ring, like a washer that goes between a bolt and a surface.",
  frame_plain: "Create a hollow rectangular frame, like a picture frame without the fancy edges."
};

const quickPrompt = (moduleName) => naturalLanguagePrompts[moduleName] || `Create a ${moduleName} module in OpenSCAD.`;

describe('OpenSCAD High-Priority Modules Test Suite', () => {
  let browser;
  let page;
  let consoleCapture;

  beforeAll(async () => {
    console.log('🚀 Starting high-priority modules test suite...');
    console.log('📊 Testing', Object.keys(highPriorityModules).length, 'high-priority modules');

    // Launch visible browser for development/debugging
    browser = await puppeteer.launch({
      headless: false,
      devtools: true, // Show devtools to monitor console
      slowMo: 50,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--window-size=1920,1080'
      ]
    });

    page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    // Set OpenAI API key
    if (process.env.OPENAI_API_KEY) {
      await page.evaluateOnNewDocument((key) => {
        localStorage.setItem('openai_api_key', key);
      }, process.env.OPENAI_API_KEY);
    }
  });

  afterAll(async () => {
    await browser.close();

    // Generate test report
    const testResults = {
      timestamp: new Date().toISOString(),
      total_modules: Object.keys(highPriorityModules).length,
      tested_modules: Object.keys(highPriorityModules).length,
      results: []
    };

    await fs.writeFile('/tmp/module-test-results.json', JSON.stringify(testResults, null, 2));
  });

  test('should test all high-priority modules successfully', async () => {
    const results = [];

    for (const [moduleKey, moduleData] of Object.entries(highPriorityModules)) {
      console.log(`\n🧪 Testing ${moduleKey} (${moduleData.priority} priority)`);
      console.log(`   Signature: ${moduleData.signature}`);

      // Reset console capture
      const logs = setupConsoleCapture(page);
      consoleCapture = logs;

      try {
        console.log('   Navigating to simple UI...');
        await page.goto('http://localhost:3001/simple.html', { waitUntil: 'networkidle2' });
        await delay(2000);

        // Start new design
        console.log('   Starting new design...');
        await page.click('.nav-item a[href="#"]');
        await page.click('.dropdown a[onclick="newDesign(event)"]');
        await delay(1000);

        // Find and click chat editor
        console.log('   Setting up prompt...');
        await page.waitForSelector('#simpleChatEditor', { timeout: 10000 });
        await delay(500);

        // Clear and enter prompt - Let AI infer without examples
        const prompt = quickPrompt(moduleKey);
        await page.evaluate((text) => {
          const editor = ace.edit('simpleChatEditor');
          editor.setValue(text);
          editor.clearSelection();
        }, prompt);

        // Generate model
        console.log('   Generating model...');
        await page.click('#simpleChatSubmit');

        // Wait for processing
        const startTime = Date.now();
        await page.waitForFunction(
          () => {
            const btn = document.querySelector('#simpleChatSubmit');
            return btn && !btn.classList.contains('processing') &&
                   btn.querySelector('.button-text').textContent === 'Generate 3D Model';
          },
          { timeout: 30000 }
        );
        const generationTime = Date.now() - startTime;

        await delay(1000); // Brief pause

        // Check results
        const generatedCode = await page.evaluate(() => window.currentCode || '');
        const moduleName = moduleKey.replace(/_/g, ' ');
        const success = generatedCode.length > 0;
        const foundModule = generatedCode.toLowerCase().includes(moduleName.toLowerCase());

        const errorCount = logs.getErrors().length;
        const warningCount = logs.getWarnings().length;

        console.log('   ✅ Generation completed in', (generationTime/1000).toFixed(1)+'s');
        console.log('   📄 Code length:', generatedCode.length, 'chars');
        console.log('   🔍 Module pattern found:', foundModule);

        if (errorCount > 0) {
          console.log('   ⚠️  Console errors:', errorCount);
        }
        if (warningCount > 0) {
          console.log('   ℹ️  Console warnings:', warningCount);
        }

        // Capture screenshot for high-value tests
        if (errorCount === 0 && success) {
          const screenshotPath = `/tmp/module-test-${moduleKey}-${Date.now()}.png`;
          await page.screenshot({ path: screenshotPath, fullPage: true });
          console.log('   📸 Screenshot saved:', screenshotPath);
        }

        results.push({
          module: moduleKey,
          success,
          foundModule,
          generationTime,
          errorCount,
          warningCount,
          codePreview: generatedCode.substring(0, 100) + '...'
        });

        // Assertions
        expect(success).toBe(true);
        expect(errorCount).toBe(0);

      } catch (error) {
        console.log('   ❌ Test failed:', error.message);

        const errors = logs.getErrors();
        if (errors.length > 0) {
          console.log('   Console errors:');
          errors.forEach((err, idx) => {
            console.log(`     ${idx + 1}.`, err.text);
          });
        }

        results.push({
          module: moduleKey,
          success: false,
          error: error.message,
          consoleErrors: logs.getErrors()
        });

        // Don't fail entire suite for one module
        // Just log the failure
        console.log(`   ⚠️  Module ${moduleKey} failed but continuing...`);
      }

      // Small delay between tests
      await delay(1000);
    }

    // Final report
    console.log('\n' + '='.repeat(60));
    console.log('📊 HIGH-PRIORITY MODULES TEST SUMMARY');
    console.log('='.repeat(60));

    const successfulTests = results.filter(r => r.success).length;
    const failedTests = results.filter(r => !r.success).length;
    const avgGenerationTime = results
      .filter(r => r.generationTime)
      .reduce((acc, r) => acc + r.generationTime, 0) / successfulTests || 0;

    console.log(`Total modules: ${results.length}`);
    console.log(`Successful: ${successfulTests}`);
    console.log(`Failed: ${failedTests}`);
    console.log(`Success rate: ${((successfulTests / results.length) * 100).toFixed(1)}%`);
    console.log(`Average generation time: ${(avgGenerationTime / 1000).toFixed(1)}s`);

    // Show failed modules
    if (failedTests > 0) {
      console.log('\n❌ Failed modules:');
      results.filter(r => !r.success).forEach(r => {
        console.log(`   - ${r.module}: ${r.error}`);
      });
    }

    // Save results
    await fs.writeFile('/tmp/module-test-results.json', JSON.stringify(results, null, 2));

    // Final expectation - at least 80% of modules should succeed
    expect(successfulTests / results.length).toBeGreaterThan(0.8);
  }, 300000); // 5 minute timeout
});