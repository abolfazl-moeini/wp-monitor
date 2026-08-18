# ⚡ WooCommerce Multi-Site Monitor — TL;DR Quickstart Guide

A lightweight, zero-bloat E2E monitoring system for WooCommerce powered by **Node.js + Playwright + Telegram Alerts**.

---

## 🏗 Architecture in 10 Seconds

- **`core/` (Git Submodule)**: The reusable monitoring engine (Playwright launcher, Telegram notifier, WAF bypass, error screenshot capture, WooCommerce standard helpers).
- **`scenarios/` (Site Repository)**: Site-specific test scenarios (`01-login.js`, `02-addToCart.js`, `03-checkout.js`).
- **`.env` (Site Repository)**: Target site credentials and Telegram bot config.

```
site-repo/
├── core/                  <- Git Submodule (Shared Engine)
├── scenarios/             <- Site-specific test steps (Customizable)
├── monitor.config.js      <- Site name & settings
└── .env                   <- Site credentials
```

---

## 🚀 Setup a New Site in 4 Steps

### Step 1: Create Site Repo & Add Core Submodule
```bash
mkdir site-monitor-repo && cd site-monitor-repo
git init
git submodule add <CORE_GIT_REPO_URL> core
```

### Step 2: Create `scenarios/` Folder & Define Steps
Create files numbered in execution order inside `scenarios/`:

```javascript
// scenarios/01-login.js
import { loginCustomer } from '../core/src/index.js';

export const name = 'Customer Login';
export async function run(page, ctx) {
  return await loginCustomer(page, ctx);
}
```

```javascript
// scenarios/02-addToCart.js
import { addProductToCart } from '../core/src/index.js';

export const name = 'Add to Cart';
export async function run(page, ctx) {
  return await addProductToCart(page, ctx);
}
```

```javascript
// scenarios/03-checkout.js
import { verifyCheckoutAndGateways } from '../core/src/index.js';

export const name = 'Checkout & Payment Gateways';
export async function run(page, ctx) {
  return await verifyCheckoutAndGateways(page, ctx);
}
```

### Step 3: Configure `.env`
```bash
cp core/.env.example .env
```
Fill in the mandatory variables:
```ini
SITE_URL=https://your-store.com
TEST_USER=monitor_customer
TEST_PASS=YourSecretPassword123!
TEST_PRODUCT_ID=12345
TG_TOKEN=123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ
TG_CHAT=-1001234567890
MONITOR_KEY=my_secure_waf_bypass_key
```

### Step 4: Run
```bash
npm install
npm start
```

---

## 💻 Commands Cheat Sheet

| Task | Command |
| :--- | :--- |
| **Run Headless Monitor** | `npm start` |
| **Run with Visible Browser (Debug)** | `HEADLESS=false npm start` |
| **Run in Isolated Docker** | `docker compose run --rm monitor` |
| **Run Fast Unit Tests** | `npm test` |
| **Run Full Playwright Simulation** | `npm run test:e2e` |

---

## 🔗 Git Submodule Cheat Sheet

```bash
# Clone a site repository including Core submodule
git clone --recurse-submodules <SITE_REPO_URL>

# If already cloned without submodules:
git submodule update --init --recursive

# Update Core engine to latest version across site repos:
git submodule update --remote core
git commit -am "chore: update monitor core engine"
git push
```

---

## ✍️ Custom Scenario Writing

Every scenario file in `scenarios/` must export a `run` function matching this signature:

```javascript
/**
 * @param {import('playwright').Page} page - Active Playwright page
 * @param {object} ctx - { config, reporter, browser, context }
 * @returns {Promise<{ name: string, ok: boolean, durationMs: number, message: string }>}
 */
export const name = 'My Custom Step';

export async function run(page, ctx) {
  const startTime = Date.now();
  try {
    await page.goto(`${ctx.config.siteUrl}/custom-page/`);
    // Custom Playwright actions...
    
    return {
      name,
      ok: true,
      durationMs: Date.now() - startTime,
      message: 'Step completed successfully',
    };
  } catch (err) {
    return {
      name,
      ok: false,
      durationMs: Date.now() - startTime,
      message: err.message,
      error: err,
    };
  }
}
```

---

## 🤖 GitHub Actions Workflow Checklist

In GitHub Repository Settings (**Settings > Secrets and variables > Actions**), set:
- `SITE_URL`
- `TEST_USER`
- `TEST_PASS`
- `TEST_PRODUCT_ID`
- `TG_TOKEN`
- `TG_CHAT`
- `MONITOR_KEY`

The workflow automatically:
1. Checks out repository + Core submodule (`submodules: recursive`).
2. Runs daily at `06:00 UTC` (or on demand via `workflow_dispatch`).
3. Sends Telegram report.
4. Uploads failure screenshots to Artifacts with 7 days retention.
