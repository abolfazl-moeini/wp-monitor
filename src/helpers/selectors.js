/**
 * Resilient CSS / Text selectors for WooCommerce and WordPress elements
 */
export const Selectors = {
  login: {
    username: [
      'form.woocommerce-form-login input[autocomplete="username"]',
      'form.login input[autocomplete="username"]',
      'form.woocommerce-form-login input[name="username"]',
      'form.login input[name="username"]',
      'input#username',
      'input[name="username"]',
      'input[autocomplete="username"]',
      'input#user_login',
      'input[name="log"]',
      'form.woocommerce-form-login input[type="text"]',
      'form.login input[type="text"]',
      'form.woocommerce-form-login input[type="email"]',
      'form.login input[type="email"]',
    ].join(', '),

    password: [
      'input#password',
      'input[name="password"]',
      'input[autocomplete="current-password"]',
      'input#user_pass',
      'input[name="pwd"]',
      'form.woocommerce-form-login input[type="password"]',
      'form.login input[type="password"]',
    ].join(', '),

    submit: [
      'button[name="login"]',
      'form.woocommerce-form-login button[type="submit"]',
      'form.login button[type="submit"]',
      'form.woocommerce-form-login input[type="submit"]',
      'button:has-text("Log in")',
      'button:has-text("Sign in")',
    ].join(', '),

    loggedInIndicators: [
      '.woocommerce-MyAccount-navigation',
      '.woocommerce-MyAccount-content',
      'a[href*="customer-logout"]',
      'a[href*="action=logout"]',
      '.woocommerce-MyAccount-navigation-link--customer-logout',
      'a:has-text("Log out")',
    ].join(', '),
  },

  cart: {
    item: [
      '.cart_item',
      '.woocommerce-cart-form__cart-item',
      '.wc-block-cart-item',
      '.wc-block-cart-items__row',
    ].join(', '),

    singleAddToCartButton: (productId) => {
      const safeProductId = String(productId || '').replace(/[^0-9]/g, '');
      return [
      safeProductId ? `form.cart button[name="add-to-cart"][value="${safeProductId}"]` : null,
      safeProductId ? `form.cart input[name="add-to-cart"][value="${safeProductId}"]` : null,
      safeProductId ? `a[data-product_id="${safeProductId}"]` : null,
      'button.single_add_to_cart_button',
      'button[name="add-to-cart"]',
      'form.cart button[type="submit"]',
      'button:has-text("Add to cart")',
      ].filter(Boolean).join(', ');
    },

    emptyNotice: [
      '.cart-empty',
      '.wc-empty-cart-message',
      ':text("Your cart is currently empty")',
    ].join(', '),

    cartContent: [
      'form.woocommerce-cart-form',
      'table.shop_table.cart',
      '.wc-block-cart',
      '.woocommerce-cart',
    ].join(', '),
  },

  checkout: {
    form: [
      'form.checkout',
      'form.woocommerce-checkout',
      '#customer_details',
      '.wc-block-checkout',
      '.woocommerce-checkout',
    ].join(', '),

    paymentSection: [
      '#payment',
      'ul.wc_payment_methods',
      'ul.payment_methods',
      '.woocommerce-checkout-payment',
      '.wc-block-checkout__payment-methods',
      '.wc-block-components-checkout-payment-methods',
    ].join(', '),

    paymentCandidateSelectors: [
      'ul.wc_payment_methods > li.wc_payment_method',
      'ul.payment_methods > li',
      'input[name="payment_method"]',
      '.wc-block-checkout__payment-method',
      '.wc-block-components-radio-control__option',
    ],

    paymentFallback: 'input[name="payment_method"], ul.wc_payment_methods li, .wc-block-checkout__payment-method, .wc-block-components-radio-control__option',

    noGatewaysNotice: [
      ':text("No payment methods are available")',
      ':text("There are no payment methods available")',
    ].join(', '),
  },

  notices: {
    error: '.woocommerce-error, [role="alert"].woocommerce-error, .woocommerce-notices-wrapper .woocommerce-error',
    success: '.woocommerce-message, .woocommerce-notices-wrapper .woocommerce-message',
  },
};
