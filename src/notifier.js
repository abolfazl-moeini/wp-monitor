import fs from 'fs';
import path from 'path';
import { Blob } from 'buffer';

export class Notifier {
  static async parseResponse(response) {
    const body = await response.text();
    let data;
    try {
      data = JSON.parse(body);
    } catch {
      throw new Error(`Invalid response from Telegram API (HTTP ${response.status})`);
    }

    if (!response.ok || !data.ok) {
      throw new Error(`Telegram API Error: [${data.error_code || response.status}] ${data.description || body}`);
    }
    return data;
  }

  /**
   * Sends the final monitoring report to Telegram
   * @param {import('./reporter.js').Reporter} reporter
   * @param {object} config
   */
  static async sendReport(reporter, config) {
    if (!config.tgToken || !config.tgChat) {
      console.log('ℹ️ Telegram settings (TG_TOKEN or TG_CHAT) missing; skipping notification.');
      return;
    }

    if (reporter.isSuccess && config.quietOnSuccess) {
      console.log('ℹ️ All scenarios passed and QUIET_ON_SUCCESS is enabled; skipping Telegram message.');
      return;
    }

    const messageText = reporter.formatTelegramMessage();
    const screenshot = reporter.screenshotPath;

    try {
      if (!reporter.isSuccess && screenshot && fs.existsSync(screenshot)) {
        await Notifier.sendPhoto(screenshot, messageText, config);
      } else {
        await Notifier.sendMessage(messageText, config);
      }
      console.log('📬 Monitoring report sent to Telegram successfully.');
    } catch (err) {
      console.error(`⚠️ Failed to send report to Telegram: ${err.message}`);
    }
  }

  static async sendMessage(text, config) {
    const url = `https://api.telegram.org/bot${config.tgToken}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: config.tgChat,
        text: text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
      signal: AbortSignal.timeout(10000),
    });
    return Notifier.parseResponse(response);
  }

  static async sendPhoto(filePath, caption, config) {
    const url = `https://api.telegram.org/bot${config.tgToken}/sendPhoto`;
    const fileBuffer = fs.readFileSync(filePath);
    const blob = new Blob([fileBuffer], { type: 'image/png' });

    // Send the photo caption as plain text so truncating it cannot break
    // Telegram's HTML parser in the middle of a tag.
    const plainCaption = caption.replace(/<[^>]*>/g, '');
    const separateMessageNeeded = plainCaption.length > 1024;
    const trimmedCaption = separateMessageNeeded
      ? `${plainCaption.slice(0, 1021)}...`
      : plainCaption;

    const formData = new FormData();
    formData.append('chat_id', config.tgChat);
    formData.append('photo', blob, path.basename(filePath));
    formData.append('caption', trimmedCaption);

    const response = await fetch(url, {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(10000),
    });

    let data;
    try {
      data = await Notifier.parseResponse(response);
    } catch (err) {
      console.warn(`⚠️ Photo upload failed (${err.message}); falling back to plain text message...`);
      await Notifier.sendMessage(caption, config);
      return;
    }

    if (separateMessageNeeded) {
      await Notifier.sendMessage(caption, config);
    }

    return data;
  }
}
