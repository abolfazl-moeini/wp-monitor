import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { config, loadSiteConfig, validateConfig } from './config.js';
import { loadScenarios } from './loader.js';
import { Reporter } from './reporter.js';
import { Notifier } from './notifier.js';

function sanitizeForFileName(str) {
  const sanitized = String(str).replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
  return sanitized.replace(/^_+|_+$/g, '') || 'scenario';
}

async function captureFailureScreenshot(page, reporter, config, scenarioId) {
  if (!page || page.isClosed()) return;

  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const cleanName = sanitizeForFileName(scenarioId);
    const screenshotPath = path.join(config.artifactsDir, `failure-${timestamp}-${cleanName}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    reporter.setScreenshot(screenshotPath);
    console.log(`📸 Failure screenshot captured: ${screenshotPath}`);
  } catch (screenErr) {
    console.error(`⚠️ Failed to capture screenshot: ${screenErr.message}`);
  }
}

/**
 * Runs the monitoring engine against loaded scenarios
 * @param {object} [customOptions]
 * @returns {Promise<{ isSuccess: boolean, reporter: Reporter }>}
 */
export async function runMonitoringEngine(customOptions = {}) {
  console.log('🚀 Starting WooCommerce E2E Monitor Core Engine...');

  // 1. Merge site config and validate
  await loadSiteConfig();
  if (customOptions.config) {
    Object.assign(config, customOptions.config);
  }
  validateConfig();

  // 2. Ensure artifacts directory exists
  if (!fs.existsSync(config.artifactsDir)) {
    fs.mkdirSync(config.artifactsDir, { recursive: true });
  }

  // 3. Load Scenarios
  const scenarios = customOptions.scenarios || (await loadScenarios(config));
  if (!scenarios || scenarios.length === 0) {
    throw new Error('No scenarios found to execute.');
  }

  const reporter = new Reporter(config);
  let browser = null;
  let context = null;
  let page = null;

  try {
    // 4. Launch Playwright
    browser = await chromium.launch({
      headless: config.headless,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });

    const extraHeaders = {};
    if (config.monitorKey) {
      extraHeaders['X-Monitor-Key'] = config.monitorKey;
      console.log('🛡️ Security header X-Monitor-Key added to requests.');
    }

    context = await browser.newContext({
      viewport: { width: 1366, height: 768 },
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      extraHTTPHeaders: extraHeaders,
      locale: 'en-US',
      timezoneId: 'UTC',
    });

    page = await context.newPage();
    page.setDefaultTimeout(config.timeoutMs);
    page.setDefaultNavigationTimeout(config.timeoutMs);

    const ctx = { config, reporter, browser, context, page };
    let hasFailed = false;

    // 5. Execute Chain of Responsibility
    for (let i = 0; i < scenarios.length; i++) {
      const sc = scenarios[i];

      if (hasFailed) {
        reporter.addResult({
          name: sc.name,
          ok: false,
          skipped: true,
          durationMs: 0,
          message: 'Skipped due to previous step failure.',
        });
        continue;
      }

      console.log(`\n⏳ Running scenario [${i + 1}/${scenarios.length}]: ${sc.name}...`);

      let result;
      try {
        result = await sc.run(page, ctx);
        if (!result || typeof result.ok !== 'boolean') {
          throw new Error('Scenario must return an object with a boolean ok property.');
        }
      } catch (scenarioErr) {
        result = {
          name: sc.name,
          ok: false,
          durationMs: 0,
          message: `Unhandled scenario error: ${scenarioErr.message}`,
          error: scenarioErr,
        };
      }

      reporter.addResult(result);

      if (!result.ok) {
        hasFailed = true;
        console.error(`❌ Scenario ${sc.name} failed: ${result.message}`);

        await captureFailureScreenshot(page, reporter, config, sc.id || `step_${i + 1}`);
      }
    }
  } catch (fatalErr) {
    console.error(`💥 Unexpected error in monitoring engine: ${fatalErr.message}`);

    // If page is open when fatal error occurs, capture screenshot
    if (page && !page.isClosed()) {
      await captureFailureScreenshot(page, reporter, config, 'fatal_error');
    }

    reporter.addResult({
      name: 'Engine Initialization',
      ok: false,
      durationMs: 0,
      message: fatalErr.message,
      error: fatalErr,
    });
  } finally {
    if (page) await page.close().catch(() => {});
    if (context) await context.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});

    reporter.finish();
    reporter.printConsole();

    await Notifier.sendReport(reporter, config);
  }

  return {
    isSuccess: reporter.isSuccess,
    reporter,
  };
}
