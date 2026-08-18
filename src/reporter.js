import path from 'path';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export class Reporter {
  constructor(config = {}) {
    this.config = config;
    this.results = [];
    this.startTime = Date.now();
    this.endTime = null;
    this.screenshotPath = null;
  }

  addResult(result) {
    this.results.push({
      name: result.name,
      ok: Boolean(result.ok),
      skipped: Boolean(result.skipped),
      durationMs: Math.round(result.durationMs || 0),
      message: result.message || (result.ok ? 'با موفقیت انجام شد' : 'خطا در اجرا'),
      error: result.error || null,
    });
  }

  setScreenshot(filePath) {
    this.screenshotPath = filePath;
  }

  finish() {
    this.endTime = Date.now();
  }

  get isSuccess() {
    return this.results.length > 0 && this.results.every((r) => r.ok && !r.skipped);
  }

  get totalDurationMs() {
    return (this.endTime || Date.now()) - this.startTime;
  }

  printConsole() {
    const totalSec = (this.totalDurationMs / 1000).toFixed(2);
    const siteTitle = this.config.siteName ? ` (${this.config.siteName})` : '';
    console.log('\n' + '='.repeat(55));
    console.log(`📊 گزارش مانیتورینگ فروشگاه${siteTitle}: ${this.config.siteUrl || ''}`);
    console.log(`⏱ زمان کل: ${totalSec} ثانیه | تاریخ: ${new Date().toLocaleString('fa-IR')}`);
    console.log('='.repeat(55));

    for (const r of this.results) {
      const sec = (r.durationMs / 1000).toFixed(2);
      let icon = '✅';
      let statusText = 'موفق';
      if (r.skipped) {
        icon = '⏭️';
        statusText = 'رد شد (Skipped)';
      } else if (!r.ok) {
        icon = '❌';
        statusText = 'خطا';
      }

      console.log(`${icon} [${statusText}] ${r.name} (${sec}s)`);
      if (r.message && (!r.ok || r.skipped)) {
        console.log(`   ↳ جزئیات: ${r.message}`);
      }
    }

    console.log('='.repeat(55));
    if (this.isSuccess) {
      console.log('🎉 نتیجه نهایی: تمامی سناریوهای مانیتورینگ با موفقیت پاس شدند.');
    } else {
      console.log('💥 نتیجه نهایی: مانیتورینگ با شکست مواجه شد.');
      if (this.screenshotPath) {
        console.log(`📸 اسکرین‌شات خطا ذخیره شد در: ${this.screenshotPath}`);
      }
    }
    console.log('='.repeat(55) + '\n');
  }

  formatTelegramMessage() {
    const totalSec = (this.totalDurationMs / 1000).toFixed(1);
    const overallIcon = this.isSuccess ? '✅' : '🚨';
    const siteTitle = this.config.siteName ? ` [${escapeHtml(this.config.siteName)}]` : '';
    const statusHeader = this.isSuccess
      ? `<b>مانیتورینگ ووکامرس${siteTitle}: همه چیز مرتب است</b>`
      : `<b>هشدار: اختلال در فرآیندهای ووکامرس${siteTitle}</b>`;

    const dateStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

    let message = `${overallIcon} ${statusHeader}\n\n`;
    message += `🌐 <b>سایت:</b> <code>${escapeHtml(this.config.siteUrl)}</code>\n`;
    message += `📅 <b>زمان:</b> <code>${dateStr} UTC</code>\n`;
    message += `⏱ <b>مدت زمان کل:</b> <code>${totalSec}s</code>\n\n`;
    message += `📋 <b>وضعیت سناریوها:</b>\n`;

    let failedStep = null;

    for (const r of this.results) {
      const stepSec = (r.durationMs / 1000).toFixed(1);
      const resultName = escapeHtml(r.name);
      if (r.skipped) {
        message += `  ⏭️ <i>${resultName}</i> (رد شد)\n`;
      } else if (r.ok) {
        message += `  ✅ <b>${resultName}</b> (<code>${stepSec}s</code>)\n`;
      } else {
        message += `  ❌ <b>${resultName}</b> (<code>${stepSec}s</code>) — <b>خطا</b>\n`;
        if (!failedStep) failedStep = r;
      }
    }

    if (failedStep) {
      message += `\n⚠️ <b>علت خطا در مرحله [${escapeHtml(failedStep.name)}]:</b>\n`;
      const sanitizedError = escapeHtml(failedStep.message || 'نامشخص');
      message += `<code>${sanitizedError.substring(0, 500)}</code>\n`;

      if (this.screenshotPath) {
        const relativePath = path.relative(process.cwd(), this.screenshotPath) || this.screenshotPath;
        message += `\n📸 <b>مسیر اسکرین‌شات:</b> <code>${escapeHtml(relativePath)}</code>`;
      }
    }

    return message;
  }
}
