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
      status: result.status || (result.skipped ? 'blocked' : (result.ok ? 'passed' : 'failed')),
      skipped: Boolean(result.skipped),
      durationMs: Math.round(result.durationMs || 0),
      message: result.message || (result.ok ? 'Completed successfully' : 'Execution failed'),
      reasonCode: result.reasonCode || null,
      evidence: result.evidence || null,
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
    console.log('\n' + '='.repeat(60));
    console.log(`📊 WooCommerce Monitor Report${siteTitle}: ${this.config.siteUrl || ''}`);
    console.log(`⏱ Total Duration: ${totalSec}s | Date: ${new Date().toISOString()}`);
    console.log('='.repeat(60));

    for (const r of this.results) {
      const sec = (r.durationMs / 1000).toFixed(2);
      let icon = '✅';
      let statusText = 'PASSED';
      if (r.skipped) {
        icon = '⏭️';
        statusText = 'SKIPPED';
      } else if (!r.ok) {
        icon = '❌';
        statusText = 'FAILED';
      }

      console.log(`${icon} [${statusText}] ${r.name} (${sec}s)`);
      if (r.message && (!r.ok || r.skipped)) {
        console.log(`   ↳ Details: ${r.message}`);
      }
    }

    console.log('='.repeat(60));
    if (this.isSuccess) {
      console.log('🎉 Final Result: All monitoring scenarios passed successfully.');
    } else {
      console.log('💥 Final Result: Monitoring failed.');
      if (this.screenshotPath) {
        console.log(`📸 Failure screenshot saved at: ${this.screenshotPath}`);
      }
    }
    console.log('='.repeat(60) + '\n');
  }

  formatTelegramMessage() {
    const totalSec = (this.totalDurationMs / 1000).toFixed(1);
    const overallIcon = this.isSuccess ? '✅' : '🚨';
    const siteTitle = this.config.siteName ? ` [${escapeHtml(this.config.siteName)}]` : '';
    const statusHeader = this.isSuccess
      ? `<b>WooCommerce Monitor${siteTitle}: All Systems Operational</b>`
      : `<b>Alert: WooCommerce Monitoring Failed${siteTitle}</b>`;

    const dateStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

    let message = `${overallIcon} ${statusHeader}\n\n`;
    message += `🌐 <b>Site:</b> <code>${escapeHtml(this.config.siteUrl)}</code>\n`;
    message += `📅 <b>Timestamp:</b> <code>${dateStr} UTC</code>\n`;
    message += `⏱ <b>Duration:</b> <code>${totalSec}s</code>\n\n`;
    message += `📋 <b>Scenario Status:</b>\n`;

    let failedStep = null;

    for (const r of this.results) {
      const stepSec = (r.durationMs / 1000).toFixed(1);
      const resultName = escapeHtml(r.name);
      if (r.skipped) {
        message += `  ⏭️ <i>${resultName}</i> (Skipped)\n`;
      } else if (r.ok) {
        message += `  ✅ <b>${resultName}</b> (<code>${stepSec}s</code>)\n`;
      } else {
        message += `  ❌ <b>${resultName}</b> (<code>${stepSec}s</code>) — <b>Failed</b>\n`;
        if (!failedStep) failedStep = r;
      }
    }

    if (failedStep) {
      message += `\n⚠️ <b>Failure Details [${escapeHtml(failedStep.name)}]:</b>\n`;
      const sanitizedError = escapeHtml(failedStep.message || 'Unknown error');
      message += `<code>${sanitizedError.substring(0, 500)}</code>\n`;

      if (this.screenshotPath) {
        const relativePath = path.relative(process.cwd(), this.screenshotPath) || this.screenshotPath;
        message += `\n📸 <b>Screenshot Path:</b> <code>${escapeHtml(relativePath)}</code>`;
      }
    }

    return message;
  }
}
