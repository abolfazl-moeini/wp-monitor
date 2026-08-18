# wp-monitor

هسته‌ی reusable برای مانیتورینگ E2E سایت‌های WordPress/WooCommerce با Node.js و Playwright. این repository به‌عنوان Git submodule داخل مخزن هر سایت مصرف می‌شود؛ سناریوهای سایت نباید داخل core قرار بگیرند.

## مسئولیت‌های core

- اجرای browser/context و ارسال هدر `X-Monitor-Key`
- اجرای زنجیره‌ای scenarioها و skip کردن مراحل بعد از اولین failure
- ثبت زمان، نتیجه و پیام هر مرحله
- گرفتن screenshot در failure و ارسال گزارش Telegram
- helperهای عمومی login، cart و checkout ووکامرس
- کشف scenarioها از دایرکتوری `scenarios/` مخزن والد

## قرارداد سناریو

```js
export const name = 'My scenario';

export async function run(page, ctx) {
  const startedAt = Date.now();
  try {
    // site-specific Playwright steps
    return {
      name,
      ok: true,
      durationMs: Date.now() - startedAt,
      message: 'Scenario completed',
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

`ctx` شامل `config`, `reporter`, `browser`, `context` و `page` است. core اجرای scenario را نیز در برابر throw شدن یا خروجی بدون `ok` مقاوم می‌کند.

## مصرف به‌عنوان submodule

```bash
git submodule add https://github.com/abolfazl-moeini/wp-monitor.git core
git submodule update --init --recursive
```

مخزن والد باید dependencyهای package خود را نصب کند و از CLI زیر اجرا شود:

```bash
npm ci
npm start
```

## تنظیمات

تنظیمات از `.env` در ریشه‌ی مخزن والد خوانده می‌شوند. نمونه‌ی کامل در [`core/.env.example`](./.env.example) قرار دارد. مقادیر credential، Telegram token و WAF key نباید commit شوند.

## انتشار core

پس از تغییر core، ابتدا در همین repository commit و push کنید؛ سپس در هر مخزن سایت اشاره‌گر submodule را update و commit کنید:

```bash
git add .
git commit -m "fix: improve monitor core"
git push origin main

# در مخزن سایت
git submodule update --remote core
git add core
git commit -m "chore: update wp-monitor core"
git push
```
