# @wpdev/monitor-core

Enterprise-grade, zero-bloat E2E monitoring engine for WordPress & WooCommerce stores powered by **Node.js + Playwright + Telegram Alerts**.

This repository is the core engine package, consumed directly via npm Git dependencies in store monitoring projects (such as `nikamooz-monitor`).

---

## 🏛 Core Responsibilities

- **Playwright Lifecycle**: Headless/headful browser launch, viewport & timeout configuration, and custom `X-Monitor-Key` header injection for WAF bypass.
- **Chain of Responsibility**: Sequential scenario execution with automatic skipping of downstream steps upon the first failure.
- **Diagnostics**: Step timing calculation, formatted console summary, and full-page failure screenshot capture.
- **Notifications**: Robust Telegram reporting (HTML alert formatting and photo uploads).
- **WooCommerce Helpers**: Battle-tested helpers for customer login, add to cart (with product page fallback), and checkout payment gateway rendering (handling AJAX updates).
- **Dynamic Scenario Discovery**: Automatic discovery and ordering of scenario files from the consumer repo's `scenarios/` directory.
- **CLI Executable**: Ships with the `wp-monitor` command for direct terminal and CI execution.

---

## 📦 Installation

In any WordPress/WooCommerce site monitoring repository:

```bash
npm install @wpdev/monitor-core@git+https://github.com/abolfazl-moeini/wp-monitor.git#main playwright dotenv
```

*(For SSH authentication: `npm install @wpdev/monitor-core@git+ssh://git@github.com/abolfazl-moeini/wp-monitor.git#main`)*

---

## 🚀 Usage

### 1. Package Scripts
Add the CLI to your `package.json`:

```json
{
  "type": "module",
  "scripts": {
    "start": "wp-monitor",
    "start:prod": "wp-monitor --env=production",
    "start:staging": "wp-monitor --env=staging"
  }
}
```

### 2. Scenario Authoring
Create sequential scenarios in `scenarios/` importing helpers directly from `@wpdev/monitor-core`:

```javascript
// scenarios/01-login.js
import { loginCustomer } from '@wpdev/monitor-core';

export const name = 'Customer Login';

export async function run(page, ctx) {
  return await loginCustomer(page, ctx, { name });
}
```

```javascript
// scenarios/02-cart.js
import { addProductToCart } from '@wpdev/monitor-core';

export const name = 'Add to Cart';

export async function run(page, ctx) {
  return await addProductToCart(page, ctx, { name });
}
```

```javascript
// scenarios/03-checkout.js
import { verifyCheckoutAndGateways } from '@wpdev/monitor-core';

export const name = 'Checkout';

export async function run(page, ctx) {
  return await verifyCheckoutAndGateways(page, ctx, { name });
}
```

### 3. Custom Scenarios
Every scenario file in `scenarios/` must export a `name` and an async `run(page, ctx)` function:

```javascript
export const name = 'Custom Check';

/**
 * @param {import('playwright').Page} page - Active Playwright page
 * @param {object} ctx - { config, reporter, browser, context, page }
 * @returns {Promise<{ name: string, ok: boolean, durationMs: number, message: string }>}
 */
export async function run(page, ctx) {
  const startedAt = Date.now();
  try {
    await page.goto(`${ctx.config.siteUrl}/custom-page/`);
    // Custom assertions...
    return {
      name,
      ok: true,
      durationMs: Date.now() - startedAt,
      message: 'Check passed successfully',
    };
  } catch (error) {
    return {
      name,
      ok: false,
      durationMs: Date.now() - startedAt,
      message: error.message,
      error,
    };
  }
}
```

---

## 🧩 Public API Exports

`@wpdev/monitor-core` exports:

```javascript
import {
  // Scenario Runner & Core Engine
  runMonitoringEngine,
  loadScenarios,
  resolveEnvironment,
  loadConfig,
  validateConfig,
  Reporter,
  sendTelegramReport,

  // WooCommerce Helpers
  loginCustomer,
  addProductToCart,
  verifyCheckoutAndGateways,
  Selectors,

  // Utilities
  waitForVisible,
  countVisible,
} from '@wpdev/monitor-core';
```

---

## 📄 Configuration Reference

Configuration is loaded from the consumer repository's `.env` file:

| Variable | Required | Default | Description |
| :--- | :--- | :--- | :--- |
| `SITE_URL` | Yes | — | Base URL of the target store |
| `TEST_USER` | Yes | — | Test customer username / email |
| `TEST_PASS` | Yes | — | Test customer password |
| `TEST_PRODUCT_ID`| Yes | — | Test product ID for cart addition |
| `TG_TOKEN` | Optional | — | Telegram Bot API token |
| `TG_CHAT` | Optional | — | Telegram chat ID for alert delivery |
| `MONITOR_KEY` | Optional | — | Secret key forwarded as `X-Monitor-Key` header |
| `TIMEOUT_MS` | Optional | `30000` | Timeout per step in milliseconds |
| `HEADLESS` | Optional | `true` | Run browser in headless mode |
| `QUIET_ON_SUCCESS`| Optional | `false` | Send alerts only on failure |

---

## 🔄 Publishing Updates

When updates are committed to this repository's `main` branch:

```bash
# In the consumer repository:
npm update @wpdev/monitor-core
```
