/**
 * Resilient CSS / Text selectors for WooCommerce and WordPress elements
 */
export const Selectors = {
  login: {
    username: [
      'input#username',
      'input[name="username"]',
      'input[autocomplete="username"]',
      'input#user_login',
      'input[name="log"]',
      'form.woocommerce-form-login input[type="text"]',
      'form.login input[type="text"]',
      'input[type="email"]',
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
      'button:has-text("ورود")',
      'button:has-text("Log in")',
      'button:has-text("Sign in")',
    ].join(', '),

    loggedInIndicators: [
      '.woocommerce-MyAccount-navigation',
      '.woocommerce-MyAccount-content',
      'a[href*="customer-logout"]',
      'a[href*="action=logout"]',
      '.woocommerce-MyAccount-navigation-link--customer-logout',
      'a:has-text("خروج")',
      'a:has-text("Log out")',
    ].join(', '),
  },

  cart: {
    singleAddToCartButton: (productId) => [
      'button.single_add_to_cart_button',
      'button[name="add-to-cart"]',
      'form.cart button[type="submit"]',
      productId ? `a[data-product_id="${productId}"]` : null,
      'button:has-text("افزودن به سبد خرید")',
      'button:has-text("Add to cart")',
    ].filter(Boolean).join(', '),

    emptyNotice: [
      '.cart-empty',
      '.wc-empty-cart-message',
      ':text("سبد خرید شما در حال حاضر خالی است")',
      ':text("Your cart is currently empty")',
    ].join(', '),

    cartContent: [
      'form.woocommerce-cart-form',
      'table.shop_table.cart',
      '.cart_item',
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

    noGatewaysNotice: [
      ':text("هیچ روش پرداختی وجود ندارد")',
      ':text("روشی برای پرداخت در دسترس نیست")',
      ':text("No payment methods are available")',
      ':text("There are no payment methods available")',
    ].join(', '),
  },

  notices: {
    error: '.woocommerce-error, [role="alert"].woocommerce-error, .woocommerce-notices-wrapper .woocommerce-error',
    success: '.woocommerce-message, .woocommerce-notices-wrapper .woocommerce-message',
  },
};
