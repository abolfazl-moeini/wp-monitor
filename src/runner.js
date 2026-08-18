import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { config, loadSiteConfig, validateConfig } from './config.js';
import { loadScenarios } from './loader.js';
import { Reporter } from './reporter.js';
import { Notifier } from './notifier.js';

function sanitizeForFileName(str) {
  return str.replace(/[^a-zA-Z0-9_\u0600-\u06FF-]/g, '_').toLowerCase();
}

/**
 * Runs the monitoring engine against loaded scenarios
 * @param {object} [customOptions]
 * @returns {Promise<{ isSuccess: boolean, reporter: Reporter }>}
 */
export async function runMonitoringEngine(customOptions = {}) {
  console.log('🚀 شروع فرآیند موتور مانیتورینگ E2E ووکامرس (Core Engine)...');

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
    throw new Error('هیچ سناریویی برای اجرا یافت نشد.');
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
      console.log('🛡️ هدر امنیتی X-Monitor-Key به درخواست‌ها اضافه شد.');
    }

    context = await browser.newContext({
      viewport: { width: 1366, height: 768 },
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 (WooCommerce E2E Monitor Core)',
      extraHTTPHeaders: extraHeaders,
      locale: 'fa-IR',
      timezoneId: 'Asia/Tehran',
    });

    page = await context.newPage();
    page.setDefaultTimeout(config.timeoutMs);
    page.setDefaultNavigationTimeout(config.timeoutMs);

    const ctx = { config, reporter, browser, context };
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
          message: 'به دلیل خطای مرحله قبل اجرا نشد (Skipped).',
        });
        continue;
      }

      console.log(`\n⏳ اجرای سناریوی [${i + 1}/${scenarios.length}]: ${sc.name}...`);
      const result = await sc.run(page, ctx);
      reporter.addResult(result);

      if (!result.ok) {
        hasFailed = true;
        console.error(`❌ شکست در سناریوی ${sc.name}: ${result.message}`);

        try {
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const cleanName = sanitizeForFileName(sc.id || `step_${i + 1}`);
          const screenshotFileName = `failure-${timestamp}-${cleanName}.png`;
          const screenshotPath = path.join(config.artifactsDir, screenshotFileName);

          await page.screenshot({ path: screenshotPath, fullPage: true });
          reporter.setScreenshot(screenshotPath);
          console.log(`📸 اسکرین‌شات از وضعیت خطا ثبت شد: ${screenshotPath}`);
        } catch (screenErr) {
          console.error(`⚠️ خطا در گرفتن اسکرین‌شات: ${screenErr.message}`);
        }
      }
    }
  } catch (fatalErr) {
    console.error(`💥 خطای غیرمنتظره در موتور مانیتورینگ: ${fatalErr.message}`);
    reporter.addResult({
      name: 'راه‌اندازی مانیتورینگ',
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
