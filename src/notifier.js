import fs from 'fs';
import path from 'path';
import { Blob } from 'buffer';

export class Notifier {
  /**
   * Sends the final monitoring report to Telegram
   * @param {import('./reporter.js').Reporter} reporter
   * @param {object} config
   */
  static async sendReport(reporter, config) {
    if (!config.tgToken || !config.tgChat) {
      console.log('ℹ️ تنظیمات تلگرام (TG_TOKEN یا TG_CHAT) وجود ندارد؛ ارسال پیام نادیده گرفته شد.');
      return;
    }

    if (reporter.isSuccess && config.quietOnSuccess) {
      console.log('ℹ️ سناریوها موفق بودند و QUIET_ON_SUCCESS فعال است؛ پیامی به تلگرام ارسال نشد.');
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
      console.log('📬 گزارش با موفقیت به تلگرام ارسال شد.');
    } catch (err) {
      console.error(`⚠️ خطا در ارسال گزارش به تلگرام: ${err.message}`);
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
    });

    const data = await response.json();
    if (!data.ok) {
      throw new Error(`Telegram API Error: [${data.error_code}] ${data.description}`);
    }
    return data;
  }

  static async sendPhoto(filePath, caption, config) {
    const url = `https://api.telegram.org/bot${config.tgToken}/sendPhoto`;
    const fileBuffer = fs.readFileSync(filePath);
    const blob = new Blob([fileBuffer], { type: 'image/png' });

    let trimmedCaption = caption;
    let separateMessageNeeded = false;
    if (trimmedCaption.length > 1000) {
      trimmedCaption = caption.substring(0, 990) + '...';
      separateMessageNeeded = true;
    }

    const formData = new FormData();
    formData.append('chat_id', config.tgChat);
    formData.append('photo', blob, path.basename(filePath));
    formData.append('caption', trimmedCaption);
    formData.append('parse_mode', 'HTML');

    const response = await fetch(url, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();
    if (!data.ok) {
      console.warn(`⚠️ ارسال عکس ناموفق بود (${data.description})؛ ارسال به صورت پیام متنی ساده...`);
      await Notifier.sendMessage(caption, config);
      return;
    }

    if (separateMessageNeeded) {
      await Notifier.sendMessage(caption, config);
    }

    return data;
  }
}
