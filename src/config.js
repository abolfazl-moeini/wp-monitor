import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { pathToFileURL } from 'url';

// Load .env from process.cwd() (the site repository root)
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config();
}

function parseBool(val, defaultValue) {
  if (val === undefined || val === null || val === '') return defaultValue;
  const normalized = String(val).trim().toLowerCase();
  return normalized === 'true' || normalized === '1' || normalized === 'yes';
}

function normalizeUrl(urlStr) {
  if (!urlStr) return '';
  let trimmed = urlStr.trim();
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    trimmed = `https://${trimmed}`;
  }
  return trimmed.replace(/\/+$/, '');
}

function parseTimeout(value, defaultValue = 30000) {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultValue;
}

export const config = {
  siteUrl: normalizeUrl(process.env.SITE_URL || ''),
  testUser: (process.env.TEST_USER || '').trim(),
  testPass: process.env.TEST_PASS || '',
  testProductId: (process.env.TEST_PRODUCT_ID || '').trim(),
  
  // Telegram
  tgToken: (process.env.TG_TOKEN || '').trim(),
  tgChat: (process.env.TG_CHAT || '').trim(),
  // Security / WAF
  monitorKey: (process.env.MONITOR_KEY || '').trim(),

  // Execution
  timeoutMs: parseTimeout(process.env.TIMEOUT_MS),
  headless: parseBool(process.env.HEADLESS, true),
  quietOnSuccess: parseBool(process.env.QUIET_ON_SUCCESS, false),

  // Paths
  rootDir: process.cwd(),
  artifactsDir: path.resolve(process.cwd(), 'artifacts'),
  scenariosDir: path.resolve(process.cwd(), process.env.SCENARIOS_DIR || 'scenarios'),
};

/**
 * Optionally loads monitor.config.js from the site repository root
 */
export async function loadSiteConfig() {
  const configFile = path.resolve(process.cwd(), 'monitor.config.js');
  if (fs.existsSync(configFile)) {
    try {
      const module = await import(pathToFileURL(configFile).href);
      const siteConfig = module.default || module;
      if (typeof siteConfig === 'object') {
        Object.assign(config, siteConfig);
      }
    } catch (err) {
      throw new Error(`خطا در خواندن monitor.config.js: ${err.message}`);
    }
  }
  config.siteUrl = normalizeUrl(config.siteUrl);
  config.artifactsDir = path.resolve(process.cwd(), config.artifactsDir || 'artifacts');
  config.scenariosDir = path.resolve(process.cwd(), config.scenariosDir || 'scenarios');
  return config;
}

export function validateConfig() {
  const missing = [];
  if (!config.siteUrl) missing.push('SITE_URL');
  if (!config.testUser) missing.push('TEST_USER');
  if (!config.testPass) missing.push('TEST_PASS');
  if (!config.testProductId) missing.push('TEST_PRODUCT_ID');

  if (missing.length > 0) {
    throw new Error(
      `❌ تنظیمات اجباری زیر در فایل .env یا Environment یافت نشدند:\n` +
      missing.map((m) => `   - ${m}`).join('\n') +
      `\nلطفاً فایل .env را در ریشه مخزن سایت طبق .env.example تنظیم کنید.`
    );
  }

  try {
    const siteUrl = new URL(config.siteUrl);
    if (!['http:', 'https:'].includes(siteUrl.protocol)) {
      throw new Error('SITE_URL باید با http:// یا https:// شروع شود.');
    }
  } catch {
    throw new Error('SITE_URL معتبر نیست؛ یک آدرس کامل مانند https://example.com وارد کنید.');
  }

  if (!/^\d+$/.test(String(config.testProductId))) {
    throw new Error('TEST_PRODUCT_ID باید شناسه عددی محصول ووکامرس باشد.');
  }

  if (!Number.isInteger(config.timeoutMs) || config.timeoutMs < 1000) {
    throw new Error('TIMEOUT_MS باید یک عدد صحیح حداقل 1000 باشد.');
  }

  if ((config.tgToken && !config.tgChat) || (!config.tgToken && config.tgChat)) {
    throw new Error('برای ارسال تلگرام، TG_TOKEN و TG_CHAT باید هر دو مقدار داشته باشند.');
  }
}
