import { Selectors } from './selectors.js';

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function countVisible(locator) {
  let visibleCount = 0;
  const count = await locator.count();
  for (let index = 0; index < count; index += 1) {
    if (await locator.nth(index).isVisible()) visibleCount += 1;
  }
  return visibleCount;
}

async function waitForVisible(locator, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await countVisible(locator) > 0) return true;
    await delay(Math.min(100, Math.max(1, deadline - Date.now())));
  }
  return countVisible(locator) > 0;
}

/**
 * Standard Customer Login helper
 * @param {import('playwright').Page} page
 * @param {object} ctx
 * @param {object} [options]
 * @returns {Promise<{ name: string, ok: boolean, durationMs: number, message: string }>}
 */
export async function loginCustomer(page, ctx, options = {}) {
  const startTime = Date.now();
  const name = options.name || 'Customer Login';
  const { config } = ctx;
  const username = options.username || config.testUser;
  const password = options.password || config.testPass;
  const loginUrl = options.url || `${config.siteUrl}${config.accountPath || '/my-account/'}`;

  try {
    console.log(`🔹 Starting customer login: navigating to ${loginUrl}...`);

    await page.goto(loginUrl, {
      waitUntil: 'domcontentloaded',
      timeout: config.timeoutMs,
    });

    // Check if already logged in
    const logoutLink = page.locator(Selectors.login.loggedInIndicators).first();
    if (await logoutLink.count() > 0 && await logoutLink.isVisible()) {
      return {
        name,
        ok: true,
        durationMs: Date.now() - startTime,
        message: 'Customer is already logged in (active session).',
      };
    }

    const userLoc = page.locator(options.usernameSelector || Selectors.login.username).first();
    const passLoc = page.locator(options.passwordSelector || Selectors.login.password).first();

    await userLoc.waitFor({ state: 'visible', timeout: config.timeoutMs });
    await passLoc.waitFor({ state: 'visible', timeout: config.timeoutMs });

    await userLoc.fill(username);
    await passLoc.fill(password);

    const submitLoc = page.locator(options.submitSelector || Selectors.login.submit).first();

    // Some themes submit through AJAX and do not navigate. Waiting after the
    // click keeps both classic forms and AJAX forms supported.
    await submitLoc.click();
    await page.waitForLoadState('domcontentloaded').catch(() => {});

    // Check for errors
    const errorNotice = page.locator(Selectors.notices.error);
    if (await errorNotice.count() > 0 && await errorNotice.first().isVisible()) {
      const errorText = (await errorNotice.first().innerText()).trim();
      throw new Error(`WooCommerce login error notice: ${errorText}`);
    }

    // Verify dashboard indicator
    await logoutLink.waitFor({ state: 'visible', timeout: config.timeoutMs });

    return {
      name,
      ok: true,
      durationMs: Date.now() - startTime,
      message: 'Customer login successful; account dashboard displayed.',
    };
  } catch (err) {
    return {
      name,
      ok: false,
      durationMs: Date.now() - startTime,
      message: `Customer login failed: ${err.message}`,
      error: err,
    };
  }
}

/**
 * Standard Add Product to Cart helper
 * Supports direct URL parameter (?add-to-cart=ID) with fallback to single product page button click.
 * @param {import('playwright').Page} page
 * @param {object} ctx
 * @param {object} [options]
 * @returns {Promise<{ name: string, ok: boolean, durationMs: number, message: string }>}
 */
export async function addProductToCart(page, ctx, options = {}) {
  const startTime = Date.now();
  const name = options.name || 'Add to Cart';
  const { config } = ctx;
  const productId = options.productId || config.testProductId;
  const cartUrl = options.cartUrl || `${config.siteUrl}${config.cartPath || '/cart/'}`;

  try {
    console.log(`🔹 Adding test product (ID: ${productId}) to cart...`);

    const addUrl = options.url || `${config.siteUrl}/?add-to-cart=${productId}`;
    await page.goto(addUrl, {
      waitUntil: 'domcontentloaded',
      timeout: config.timeoutMs,
    });

    // Check if on product page with add to cart button
    const singleButton = page.locator(Selectors.cart.singleAddToCartButton(productId)).first();
    if (await singleButton.count() > 0 && await singleButton.isVisible()) {
      await singleButton.click();
      await page.waitForLoadState('domcontentloaded').catch(() => {});
    }

    // Check error notices
    const errorNotice = page.locator(Selectors.notices.error);
    if (await errorNotice.count() > 0 && await errorNotice.first().isVisible()) {
      const errorText = (await errorNotice.first().innerText()).trim();
      throw new Error(`WooCommerce error while adding to cart: ${errorText}`);
    }

    // Verify cart page
    await page.goto(cartUrl, {
      waitUntil: 'domcontentloaded',
      timeout: config.timeoutMs,
    });

    const emptyNotice = page.locator(Selectors.cart.emptyNotice).first();
    const isCartEmpty = (await emptyNotice.count() > 0) && (await emptyNotice.isVisible());
    const cartItem = page.locator(Selectors.cart.item).first();
    const hasVisibleCartItem = !isCartEmpty
      && await waitForVisible(page.locator(Selectors.cart.item), Math.min(config.timeoutMs, 3000));

    // Fallback: If cart is empty after direct URL, try visiting single product page
    if (isCartEmpty || !hasVisibleCartItem) {
      console.log(`   ↳ Direct URL did not populate cart; trying single product page (?p=${productId})...`);
      const productPageUrl = `${config.siteUrl}/?p=${productId}`;
      await page.goto(productPageUrl, {
        waitUntil: 'domcontentloaded',
        timeout: config.timeoutMs,
      });

      const fallbackButton = page.locator(Selectors.cart.singleAddToCartButton(productId)).first();
      if (await fallbackButton.count() > 0 && await fallbackButton.isVisible()) {
        await fallbackButton.click();
        await page.waitForLoadState('domcontentloaded').catch(() => {});
      } else {
        throw new Error(`Add to cart button not found on product page (?p=${productId}).`);
      }

      await page.goto(cartUrl, {
        waitUntil: 'domcontentloaded',
        timeout: config.timeoutMs,
      });

      if ((await emptyNotice.count() > 0 && await emptyNotice.isVisible())
        || (await countVisible(page.locator(Selectors.cart.item)) === 0)) {
        throw new Error('Cart remains empty after trying both direct URL and product page button clicks.');
      }
    }

    // A visible cart wrapper alone is not enough: empty carts often render
    // the same wrapper. Require at least one visible cart item.
    await cartItem.waitFor({ state: 'visible', timeout: config.timeoutMs });

    return {
      name,
      ok: true,
      durationMs: Date.now() - startTime,
      message: 'Product successfully added to cart.',
    };
  } catch (err) {
    return {
      name,
      ok: false,
      durationMs: Date.now() - startTime,
      message: `Failed to add product to cart: ${err.message}`,
      error: err,
    };
  }
}

/**
 * Standard Checkout and Payment Gateways check helper
 * Waits for AJAX order review settlement and verifies available payment methods.
 * @param {import('playwright').Page} page
 * @param {object} ctx
 * @param {object} [options]
 * @returns {Promise<{ name: string, ok: boolean, durationMs: number, message: string }>}
 */
export async function verifyCheckoutAndGateways(page, ctx, options = {}) {
  const startTime = Date.now();
  const name = options.name || 'Checkout & Payment Gateways';
  const { config } = ctx;
  const checkoutUrl = options.url || `${config.siteUrl}${config.checkoutPath || '/checkout/'}`;

  try {
    console.log(`🔹 Verifying checkout page and payment gateways: ${checkoutUrl}...`);

    await page.goto(checkoutUrl, {
      waitUntil: 'domcontentloaded',
      timeout: config.timeoutMs,
    });

    // Check errors
    const errorNotice = page.locator(Selectors.notices.error);
    if (await errorNotice.count() > 0 && await errorNotice.first().isVisible()) {
      const errorText = (await errorNotice.first().innerText()).trim();
      throw new Error(`WooCommerce error on checkout page: ${errorText}`);
    }

    // Verify form
    const checkoutForm = page.locator(Selectors.checkout.form).first();
    await checkoutForm.waitFor({ state: 'visible', timeout: config.timeoutMs });

    // Verify payment section
    const paymentSection = page.locator(Selectors.checkout.paymentSection).first();
    await paymentSection.waitFor({ state: 'visible', timeout: config.timeoutMs });

    const noGatewayNotice = page.locator(Selectors.checkout.noGatewaysNotice).first();
    const gatewayDeadline = Date.now() + config.timeoutMs;
    let gatewayCount = 0;

    // Poll for visible methods instead of waiting only for an attached node;
    // classic WooCommerce may render hidden templates before AJAX reveals the
    // actual methods.
    while (Date.now() < gatewayDeadline) {
      if (await noGatewayNotice.count() > 0 && await noGatewayNotice.isVisible()) {
        throw new Error('No payment methods available notice displayed on checkout page.');
      }

      for (const selector of Selectors.checkout.paymentCandidateSelectors) {
        const visibleCount = await countVisible(page.locator(selector));
        if (visibleCount > 0) {
          gatewayCount = visibleCount;
          break;
        }
      }

      if (gatewayCount > 0) break;
      await delay(Math.min(100, Math.max(1, gatewayDeadline - Date.now())));
    }

    if (gatewayCount === 0) {
      if (await noGatewayNotice.count() > 0 && await noGatewayNotice.isVisible()) {
        throw new Error('No payment methods available notice displayed on checkout page.');
      }
      throw new Error('No payment gateways or methods found on checkout page.');
    }

    return {
      name,
      ok: true,
      durationMs: Date.now() - startTime,
      message: `Checkout page and ${gatewayCount} payment method(s) rendered successfully.`,
    };
  } catch (err) {
    return {
      name,
      ok: false,
      durationMs: Date.now() - startTime,
      message: `Checkout / Gateways check failed: ${err.message}`,
      error: err,
    };
  }
}
