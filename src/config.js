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

function normalizePath(p, defaultPath) {
  if (!p || typeof p !== 'string') return defaultPath;
  let trimmed = p.trim();
  if (!trimmed) return defaultPath;
  if (!trimmed.startsWith('/')) trimmed = `/${trimmed}`;
  if (!trimmed.endsWith('/')) trimmed = `${trimmed}/`;
  return trimmed;
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

  // Customizable paths (optional)
  accountPath: normalizePath(process.env.ACCOUNT_PATH, '/my-account/'),
  cartPath: normalizePath(process.env.CART_PATH, '/cart/'),
  checkoutPath: normalizePath(process.env.CHECKOUT_PATH, '/checkout/'),

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
 * Loads site configuration from monitor.config.js
 * Strictly preserves runtime environment variables and only applies site-level metadata/scenarios.
 */
export async function loadSiteConfig() {
  const configFile = path.resolve(process.cwd(), 'monitor.config.js');
  if (fs.existsSync(configFile)) {
    try {
      const module = await import(pathToFileURL(configFile).href);
      const siteConfig = module.default || module;
      if (typeof siteConfig === 'object' && siteConfig !== null) {
        if (siteConfig.siteName) config.siteName = siteConfig.siteName;
        if (siteConfig.scenarios) config.scenarios = siteConfig.scenarios;
        if (siteConfig.scenariosDir) config.scenariosDir = path.resolve(process.cwd(), siteConfig.scenariosDir);
        if (siteConfig.accountPath && !process.env.ACCOUNT_PATH) config.accountPath = normalizePath(siteConfig.accountPath, '/my-account/');
        if (siteConfig.cartPath && !process.env.CART_PATH) config.cartPath = normalizePath(siteConfig.cartPath, '/cart/');
        if (siteConfig.checkoutPath && !process.env.CHECKOUT_PATH) config.checkoutPath = normalizePath(siteConfig.checkoutPath, '/checkout/');
      }
    } catch (err) {
      throw new Error(`Syntax or loading error in monitor.config.js: ${err.message}`);
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
      `❌ Missing required environment variables:\n` +
      missing.map((m) => `   - ${m}`).join('\n') +
      `\nPlease set them in your .env file or environment.`
    );
  }

  try {
    const siteUrl = new URL(config.siteUrl);
    if (!['http:', 'https:'].includes(siteUrl.protocol)) {
      throw new Error('SITE_URL must start with http:// or https://');
    }
  } catch {
    throw new Error('SITE_URL is invalid; provide a valid URL like https://example.com');
  }

  if (!/^\d+$/.test(String(config.testProductId))) {
    throw new Error('TEST_PRODUCT_ID must be a numeric WooCommerce product ID.');
  }

  if (!Number.isInteger(config.timeoutMs) || config.timeoutMs < 1000) {
    throw new Error('TIMEOUT_MS must be an integer >= 1000.');
  }

  if ((config.tgToken && !config.tgChat) || (!config.tgToken && config.tgChat)) {
    throw new Error('Both TG_TOKEN and TG_CHAT must be provided for Telegram notifications.');
  }
}
