import { Selectors } from './selectors.js';

/**
 * Standard Customer Login helper
 * @param {import('playwright').Page} page
 * @param {object} ctx
 * @param {object} [options]
 * @returns {Promise<{ name: string, ok: boolean, durationMs: number, message: string }>}
 */
export async function loginCustomer(page, ctx, options = {}) {
  const startTime = Date.now();
  const name = options.name || 'ورود کاربر (Login)';
  const { config } = ctx;
  const username = options.username || config.testUser;
  const password = options.password || config.testPass;
  const loginUrl = options.url || `${config.siteUrl}/my-account/`;

  try {
    console.log(`🔹 شروع فرآیند لاگین: هدایت به ${loginUrl}...`);

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
        message: 'کاربر از قبل لاگین است (نشست فعال).',
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
      throw new Error(`خطای ووکامرس در هنگام ورود: ${errorText}`);
    }

    // Verify dashboard indicator
    await logoutLink.waitFor({ state: 'visible', timeout: config.timeoutMs });

    return {
      name,
      ok: true,
      durationMs: Date.now() - startTime,
      message: 'ورود کاربر با موفقیت انجام شد و پنل کاربری مشاهده شد.',
    };
  } catch (err) {
    return {
      name,
      ok: false,
      durationMs: Date.now() - startTime,
      message: `شکست در فرآیند لاگین: ${err.message}`,
      error: err,
    };
  }
}

/**
 * Standard Add Product to Cart helper
 * @param {import('playwright').Page} page
 * @param {object} ctx
 * @param {object} [options]
 * @returns {Promise<{ name: string, ok: boolean, durationMs: number, message: string }>}
 */
export async function addProductToCart(page, ctx, options = {}) {
  const startTime = Date.now();
  const name = options.name || 'افزودن به سبد خرید (Add to Cart)';
  const { config } = ctx;
  const productId = options.productId || config.testProductId;

  try {
    console.log(`🔹 افزودن محصول تست (ID: ${productId}) به سبد خرید...`);

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
      throw new Error(`خطای ووکامرس در افزودن به سبد خرید: ${errorText}`);
    }

    // Verify cart page
    const cartUrl = options.cartUrl || `${config.siteUrl}/cart/`;
    await page.goto(cartUrl, {
      waitUntil: 'domcontentloaded',
      timeout: config.timeoutMs,
    });

    const emptyNotice = page.locator(Selectors.cart.emptyNotice).first();
    if (await emptyNotice.count() > 0 && await emptyNotice.isVisible()) {
      throw new Error('سبد خرید پس از درخواست افزودن محصول، همچنان خالی است.');
    }

    // A visible cart wrapper alone is not enough: empty carts often render
    // the same wrapper. Require at least one visible cart item.
    const cartItem = page.locator(Selectors.cart.item).first();
    await cartItem.waitFor({ state: 'visible', timeout: config.timeoutMs });

    return {
      name,
      ok: true,
      durationMs: Date.now() - startTime,
      message: 'محصول با موفقیت به سبد خرید افزوده شد.',
    };
  } catch (err) {
    return {
      name,
      ok: false,
      durationMs: Date.now() - startTime,
      message: `شکست در افزودن به سبد خرید: ${err.message}`,
      error: err,
    };
  }
}

/**
 * Standard Checkout and Payment Gateways check helper
 * @param {import('playwright').Page} page
 * @param {object} ctx
 * @param {object} [options]
 * @returns {Promise<{ name: string, ok: boolean, durationMs: number, message: string }>}
 */
export async function verifyCheckoutAndGateways(page, ctx, options = {}) {
  const startTime = Date.now();
  const name = options.name || 'صفحه تسویه‌حساب و درگاه‌ها (Checkout & Gateways)';
  const { config } = ctx;
  const checkoutUrl = options.url || `${config.siteUrl}/checkout/`;

  try {
    console.log(`🔹 بررسی صفحه تسویه‌حساب و درگاه‌های پرداخت: ${checkoutUrl}...`);

    await page.goto(checkoutUrl, {
      waitUntil: 'domcontentloaded',
      timeout: config.timeoutMs,
    });

    // Check errors
    const errorNotice = page.locator(Selectors.notices.error);
    if (await errorNotice.count() > 0 && await errorNotice.first().isVisible()) {
      const errorText = (await errorNotice.first().innerText()).trim();
      throw new Error(`خطای ووکامرس در صفحه تسویه‌حساب: ${errorText}`);
    }

    // Verify form
    const checkoutForm = page.locator(Selectors.checkout.form).first();
    await checkoutForm.waitFor({ state: 'visible', timeout: config.timeoutMs });

    // Verify payment section
    const paymentSection = page.locator(Selectors.checkout.paymentSection).first();
    await paymentSection.waitFor({ state: 'visible', timeout: config.timeoutMs });

    // Locate payment methods. Count only visible methods; hidden template
    // nodes must not make a broken checkout look healthy.
    let gatewayCount = 0;
    for (const sel of Selectors.checkout.paymentCandidateSelectors) {
      const loc = page.locator(sel);
      try {
        const count = await loc.count();
        for (let i = 0; i < count; i += 1) {
          if (await loc.nth(i).isVisible()) gatewayCount += 1;
        }
        if (gatewayCount > 0) {
          break;
        }
      } catch {}
    }

    if (gatewayCount === 0) {
      const fallbackLoc = page.locator(Selectors.checkout.paymentFallback).first();
      await fallbackLoc.waitFor({ state: 'attached', timeout: config.timeoutMs });
      const fallbackCount = await page.locator(Selectors.checkout.paymentFallback).count();
      for (let i = 0; i < fallbackCount; i += 1) {
        if (await page.locator(Selectors.checkout.paymentFallback).nth(i).isVisible()) gatewayCount += 1;
      }
    }

    if (gatewayCount === 0) {
      throw new Error('هیچ درگاه یا روش پرداختی در صفحه تسویه‌حساب یافت نشد.');
    }

    // Check no-gateways notice
    const noGatewayNotice = page.locator(Selectors.checkout.noGatewaysNotice).first();
    if (await noGatewayNotice.count() > 0 && await noGatewayNotice.isVisible()) {
      throw new Error('پیام عدم دسترسی به روش‌های پرداخت در صفحه تسویه‌حساب مشاهده شد.');
    }

    return {
      name,
      ok: true,
      durationMs: Date.now() - startTime,
      message: `صفحه تسویه‌حساب و ${gatewayCount} روش پرداخت با موفقیت رندر شدند.`,
    };
  } catch (err) {
    return {
      name,
      ok: false,
      durationMs: Date.now() - startTime,
      message: `شکست در بررسی صفحه تسویه‌حساب/درگاه‌ها: ${err.message}`,
      error: err,
    };
  }
}
