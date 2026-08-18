# wp-monitor

Reusable core engine for E2E monitoring of WordPress & WooCommerce stores powered by Node.js and Playwright.

This repository is designed to be consumed as a **Git submodule** inside individual site repositories. Site-specific test flows belong in each store's repository, keeping this core strictly reusable.

---

## 🏛 Core Responsibilities

- **Playwright Lifecycle**: Headless/headful browser launch, viewport & timeout configuration, and custom `X-Monitor-Key` header injection for WAF bypass.
- **Chain of Responsibility**: Sequential scenario execution with automatic skipping of downstream steps upon the first failure.
- **Diagnostics**: Step timing calculation, formatted console summary, and full-page failure screenshot capture.
- **Notifications**: Robust Telegram reporting (HTML alert formatting and photo uploads).
- **WooCommerce Helpers**: Battle-tested helpers for customer login, add to cart (with product page fallback), and checkout payment gateway rendering (handling AJAX updates).
- **Dynamic Scenario Discovery**: Automatic discovery and ordering of scenario files from the consumer repo's `scenarios/` directory.

---

## ✍️ Scenario Contract

Every scenario file in `scenarios/` must export a `name` and an async `run` function:

```javascript
export const name = 'My Custom Scenario';

/**
 * @param {import('playwright').Page} page - Active Playwright page
 * @param {object} ctx - { config, reporter, browser, context, page }
 * @returns {Promise<{ name: string, ok: boolean, durationMs: number, message: string }>}
 */
export async function run(page, ctx) {
  const startedAt = Date.now();
  try {
    // Custom Playwright actions...
    return {
      name,
      ok: true,
      durationMs: Date.now() - startedAt,
      message: 'Step completed successfully',
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

## 🚀 Adding Core to a Site Repository

```bash
# Add as submodule
git submodule add https://github.com/abolfazl-moeini/wp-monitor.git core
git submodule update --init --recursive

# Install dependencies and Playwright Chromium
npm ci
npx playwright install chromium

# Run monitor
npm start
```

---

## 📄 Configuration

Configuration is loaded from the consumer repository's `.env` file. See [`.env.example`](./.env.example) for all available options.

---

## 🔄 Publishing & Updating Core

```bash
# 1. Commit and push in wp-monitor
git add .
git commit -m "fix(core): improve checkout payment gateway wait"
git push origin main

# 2. Update submodule in each site repo
cd /path/to/site-repo
git submodule update --remote core
git add core
git commit -m "chore: bump wp-monitor core submodule"
git push
```
