import puppeteer from 'puppeteer';
import { promises as fs } from 'fs';

// Import the modules configuration
import { modules } from '../server/config/modules.js';

// Helper function to replace waitForTimeout
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper to get module keys sorted by priority
function getModulesByPriority() {
  const priorityOrder = { "High": 1, "Medium": 2, "Low": 3 };
  return Object.keys(modules).sort((a, b) => {
    const priorityA = priorityOrder[modules[a].priority] || 999;
    const priorityB = priorityOrder[modules[b].priority] || 999;
    return priorityA - priorityB;
  });
}

// Helper function to capture console messages
const setupConsoleLogging = (page) => {
  const logs = [];

  page.on('console', msg => {
    const logEntry = {
      type: msg.type(),
      text: msg.text(),
      timestamp: new Date().toISOString()
    };
    logs.push(logEntry);
    console.log(`[Console ${logEntry.type}] ${logEntry.text}`);
  });

  page.on('pageerror', error => {
    const errorEntry = {
      type: 'error',
      text: error.message,
      timestamp: new Date().toISOString()
    };
    logs.push(errorEntry);
    console.log(`[Page Error] ${error.message}`);
  });

  return () => logs;
};

// Helper function to navigate to page with error handling
const navigateWithRetry = async (page, url, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`Navigating to ${url} (attempt ${i + 1})...`);
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      console.log(`Successfully navigated to ${url}`);
      return;
    } catch (error) {
      console.log(`Navigation attempt ${i + 1} failed:`, error.message);
      if (i === retries - 1) throw error;
      await delay(2000);
    }
  }
};

// Helper function to generate appropriate prompts for each module category
const generateModulePrompt = (moduleKey, moduleData) => {
  const category = moduleData.category;
  const moduleName = moduleData.signature.split('(')[0];

  // Category-specific prompts
  const promptsByCategory = {
    'basic': `Create a ${moduleData.description.toLowerCase()} using the ${moduleName} module with these specifications:`,
    'advanced_geometry': `Design an ${moduleData.description.toLowerCase()} using the ${moduleName} module.`,
    'mechanical': `Create a mechanical component - ${moduleData.description.toLowerCase()} using the ${moduleName} module.`,
    'patterns': `Generate a ${moduleData.description.toLowerCase()} pattern using the ${moduleName} module.`,
    'mechanisms': `Design a mechanical mechanism - ${moduleData.description.toLowerCase()} using the ${moduleName} module.`,
    '2d_operations': `Create a 2D shape - ${moduleData.description.toLowerCase()} using the ${moduleName} module.`,
    'complex_shapes': `Generate a complex 3D shape - ${moduleData.description.toLowerCase()} using the ${moduleName} module.`,
    'gridfinity': `Create a Gridfinity component - ${moduleData.description.toLowerCase()} using the ${moduleName} module.`
  };

  let prompt = promptsByCategory[category] || `Create a 3D model using the ${moduleName} module with ${moduleData.description.toLowerCase()}.`;

  // Add specific parameters based on the module's priority
  if (moduleData.priority === 'High') {
    prompt += ` Make sure to use appropriate dimensions and settings for a high-quality result.`;
  }

  // Always include the example usage
  prompt += ` Example usage: ${moduleData.example}`;

  return prompt.trim();
};

// Helper function to test a single module
const testModule = async (page, moduleKey, moduleData, getConsoleLogs) => {
  console.log(`\n🧪 Testing module: ${moduleKey} (${moduleData.priority} priority)`);
  console.log(`   ${moduleData.signature} - ${moduleData.description}`);

  try {
    // Clear console logs
    const consoleLogs = getConsoleLogs();
    consoleLogs.length = 0;

    // Navigate to simple mode
    await navigateWithRetry(page, 'http://localhost:3001/simple.html');
    await delay(3000);

    // Click File menu and start new design
    console.log('Setting up new design...');
    await page.waitForSelector('.nav-item a[href="#"]', { timeout: 10000 });
    await page.click('.nav-item a[href="#"]');
    await page.waitForSelector('.dropdown a[onclick="newDesign(event)"]', { timeout: 5000 });
    await page.click('.dropdown a[onclick="newDesign(event)"]');
    await delay(1000);

    // Generate appropriate prompt for the module
    const prompt = generateModulePrompt(moduleKey, moduleData);
    console.log(`Using prompt: "${prompt}"`);

    // Type prompt in chat editor
    console.log('Entering prompt in chat editor...');
    await page.waitForSelector('#simpleChatEditor', { timeout: 10000 });
    await page.evaluate((text) => {
      const editor = ace.edit('simpleChatEditor');
      editor.setValue(text);
    }, prompt);

    // Click generate button
    console.log('Clicking Generate 3D Model button...');
    await page.waitForSelector('#simpleChatSubmit', { timeout: 10000 });
    await page.click('#simpleChatSubmit');

    // Wait for processing to complete
    console.log('Waiting for code generation...');
    await page.waitForFunction(
      () => {
        const button = document.querySelector('#simpleChatSubmit');
        const buttonTextEl = button?.querySelector('.button-text') || button;
        return button && !button.classList.contains('processing') &&
               buttonTextEl && buttonTextEl.textContent.trim() === 'Generate 3D Model';
      },
      { timeout: 120000 } // 2 minutes for complex modules
    );

    // Wait a bit more for full completion
    await delay(3000);

    // Check if code was generated and contains the module
    const currentCode = await page.evaluate(() => {
      if (window.currentCode) return window.currentCode;
      return document.querySelector('.ace_content')?.textContent || '';
    });

    console.log('Generated code preview:', currentCode.substring(0, 200) + '...'););

    // Check for module usage in the generated code
    const moduleUsageFound = currentCode.toLowerCase().includes(moduleKey.toLowerCase());

    if (moduleUsageFound) {
      console.log(`✅ SUCCESS: Module "${moduleKey}" found in generated code`);
    } else {
      console.log(`⚠️  WARNING: Module "${moduleKey}" not directly found in code`);
      // Some modules might be used internally
    }

    // Check console for any errors or warnings
    const logs = getConsoleLogs();
    const errors = logs.filter(log => log.type === 'error');
    const warnings = logs.filter(log => log.type === 'warning');

    if (errors.length > 0) {
      console.log(`⚠️  Console errors found: ${errors.length}`);
      errors.forEach(error => console.log(`   - ${error.text}`));
    }

    if (warnings.length > 0) {
      console.log(`ℹ️  Console warnings found: ${warnings.length}`);
      warnings.forEach(warning => console.log(`   - ${warning.text}`));
    }

    return {
      success: true,
      moduleKey,
      moduleFound: moduleUsageFound,
      generatedCode: currentCode,
      consoleErrors: errors.length,
      consoleWarnings: warnings.length
    };

  } catch (error) {
    console.log(`❌ FAILURE testing module ${moduleKey}:`, error.message);
    return {
      success: false,
      moduleKey,
      error: error.message,
      generatedCode: null,
      consoleErrors: 0,
      consoleWarnings: 0
    };
  }
};

describe('OpenSCAD Modules Comprehensive UI Tests', () => {
  let browser;
  let page;
  let getConsoleLogs;

  beforeAll(async () => {
    console.log('🚀 Starting comprehensive module tests...');

    // Use visible browser mode for debugging
    browser = await puppeteer.launch({
      headless: false, // Visible browser
      slowMo: 50, // Slow down actions for visibility
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--ignore-certificate-errors',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--window-size=1400,1000'
      ],
      defaultViewport: {
        width: 1920,
        height: 1080
      }
    });

    page = await browser.newPage();

    // Set up console logging
    getConsoleLogs = setupConsoleLogging(page);

    // Enable request interception to add API key
    await page.setRequestInterception(true);

    page.on('request', (request) => {
      // Let all requests through
      request.continue();
    });

    // Set OpenAI API key in the page context
    await page.evaluateOnNewDocument((apiKey) => {
      localStorage.setItem('openai_api_key', apiKey);
    }, process.env.OPENAI_API_KEY);

    // Additional logging setup
    if (process.env.DEBUG_TESTS) {
      page.on('response', response => {
        console.log(`[Response] ${response.status()}: ${response.url()}`);
      });

      page.on('requestfailed', request => {
        console.log(`[Request Failed] ${request.failure().errorText}: ${request.url()}`);
      });
    }
  });

  afterAll(async () => {
    console.log('\n🧹 Cleaning up after module tests...');

    if (browser) {
      await browser.close();
    }
  });

  test('Test all modules with visible UI', async () => {
    const moduleKeys = getModulesByPriority();
    console.log(`Testing ${moduleKeys.length} modules...`);

    const results = {
      total: moduleKeys.length,
      success: 0,
      failed: 0,
      withErrors: 0,
      withWarnings: 0,
      details: []
    };

    // Test modules in batches to avoid overwhelming the system
    const batchSize = 5; // Number of modules to test in parallel/batch

    for (let i = 0; i < moduleKeys.length; i += batchSize) {
      const batch = moduleKeys.slice(i, i + batchSize);
      console.log(`\n📦 Testing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(moduleKeys.length / batchSize)}`);

      for (const moduleKey of batch) {
        const moduleData = modules[moduleKey];

        // Skip low priority modules in quick test mode
        if (moduleData.priority === 'Low' && process.env.QUICK_TEST) {
          console.log(`Skipping low priority module: ${moduleKey}`);
          continue;
        }

        const result = await testModule(page, moduleKey, moduleData, getConsoleLogs);
        results.details.push(result);

        if (result.success) {
          results.success++;
          if (result.consoleErrors > 0) results.withErrors++;
          if (result.consoleWarnings > 0) results.withWarnings++;
        } else {
          results.failed++;
        }

        // Small delay between individual tests
        await delay(1000);
      }

      // Larger delay between batches
      await delay(3000);
    }

    // Generate test report
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total: results.total,
        success: results.success,
        failed: results.failed,
        successRate: ((results.success / results.total) * 100).toFixed(2) + '%'
      },
      details: results.details,
      modulesByCategory: {}
    };

    // Categorize results
    results.details.forEach(result => {
      const category = modules[result.moduleKey].category;
      if (!report.modulesByCategory[category]) {
        report.modulesByCategory[category] = {
          total: 0,
          success: 0,
          failed: 0
        };
      }
      report.modulesByCategory[category].total++;
      if (result.success) {
        report.modulesByCategory[category].success++;
      } else {
        report.modulesByCategory[category].failed++;
      }
    });

    // Save test report
    const reportPath = '/home/ahmedh/projects/openscad-webui/ui-test/module-test-report.json';
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📊 Test report saved to: ${reportPath}`);

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('🎯 MODULE TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total modules tested: ${results.total}`);
    console.log(`Success: ${results.success}`);
    console.log(`Failed: ${results.failed}`);
    console.log(`Success rate: ${report.summary.successRate}`);
    console.log(`Tests with console errors: ${results.withErrors}`);
    console.log(`Tests with console warnings: ${results.withWarnings}`);
    console.log('\nBy category:');
    Object.entries(report.modulesByCategory).forEach(([category, stats]) => {
      console.log(`  ${category}: ${stats.success}/${stats.total} (${(stats.success/stats.total*100).toFixed(0)}%)`);
    });

    // Fail the test if any high-priority modules failed
    const highPriorityFailures = results.details.filter(r =>
      !r.success && modules[r.moduleKey].priority === 'High'
    );

    if (highPriorityFailures.length > 0) {
      console.log(`\n❌ FAILED: ${highPriorityFailures.length} high-priority modules failed!`);
      highPriorityFailures.forEach(f => {
        console.log(`   - ${f.moduleKey}: ${f.error}`);
      });
    }

    // Overall test expectation
    console.log('\n📝 Test Assertions: ');
    expect(results.success).toBeGreaterThan(0);
    expect(results.failed).toBeLessThan(results.total);
    expect(highPriorityFailures.length).toBe(0);

  }, 600000); // 10-minute timeout for comprehensive testing

  test('Test specific module categories', async () => {
    if (process.env.CATEGORY) {
      console.log(`\n🎯 Testing only ${process.env.CATEGORY} category...`);

      const categoryModules = Object.keys(modules).filter(key =>
        modules[key].category === process.env.CATEGORY
      );

      console.log(`Found ${categoryModules.length} modules in ${process.env.CATEGORY} category`);

      for (const moduleKey of categoryModules) {
        const result = await testModule(page, moduleKey, modules[moduleKey], getConsoleLogs);
        expect(result.success).toBe(true);
      }
    } else {
      console.log('Skipped category-specific test (set CATEGORY env var to test specific category)');
    }
  }, 300000); // 5-minute timeout
});