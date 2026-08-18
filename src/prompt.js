import readline from 'readline';

/**
 * Resolves the target environment URL either via CLI arguments, environment variables,
 * or an interactive prompt before monitoring execution.
 *
 * Defaults to 'production' (https://nikamooz.com).
 *
 * @param {object} siteConfig
 * @returns {Promise<{ envKey: string, url: string, name: string }>}
 */
export async function resolveEnvironment(siteConfig = {}) {
  const envs = siteConfig.environments || {
    production: 'https://nikamooz.com',
    staging: 'https://staging.nikamooz.com',
  };

  const defaultKey = siteConfig.defaultEnvironment || 'production';

  // 1. Check CLI arguments (e.g. --env=staging, --staging, --prod, --env=production, --url=...)
  const args = process.argv.slice(2);
  for (const arg of args) {
    if (arg === '--staging' || arg === '-s') {
      return { envKey: 'staging', url: envs.staging || 'https://staging.nikamooz.com', name: 'Staging' };
    }
    if (arg === '--prod' || arg === '--production' || arg === '-p') {
      return { envKey: 'production', url: envs.production || 'https://nikamooz.com', name: 'Production' };
    }
    if (arg.startsWith('--env=')) {
      const val = arg.split('=')[1].trim().toLowerCase();
      if (val === 'staging' || val === 'stage') {
        return { envKey: 'staging', url: envs.staging || 'https://staging.nikamooz.com', name: 'Staging' };
      }
      if (val === 'production' || val === 'prod') {
        return { envKey: 'production', url: envs.production || 'https://nikamooz.com', name: 'Production' };
      }
      if (envs[val]) {
        return { envKey: val, url: envs[val], name: val };
      }
    }
    if (arg.startsWith('--url=')) {
      const customUrl = arg.split('=')[1].trim();
      return { envKey: 'custom', url: customUrl, name: 'Custom URL' };
    }
  }

  // 2. Check process.env.TARGET_ENV
  if (process.env.TARGET_ENV) {
    const val = process.env.TARGET_ENV.trim().toLowerCase();
    if (val === 'staging' || val === 'stage') {
      return { envKey: 'staging', url: envs.staging || 'https://staging.nikamooz.com', name: 'Staging' };
    }
    if (val === 'production' || val === 'prod') {
      return { envKey: 'production', url: envs.production || 'https://nikamooz.com', name: 'Production' };
    }
    if (envs[val]) {
      return { envKey: val, url: envs[val], name: val };
    }
  }

  // 3. If running in an interactive terminal (TTY) and no explicit CLI flag was passed:
  if (process.stdin.isTTY && !process.env.CI && process.env.NODE_ENV !== 'test') {
    console.log('\n========================================================');
    console.log('🌐 SELECT TARGET ENVIRONMENT FOR MONITORING');
    console.log('========================================================');
    console.log(`  [1] Production (${envs.production || 'https://nikamooz.com'}) [Default]`);
    console.log(`  [2] Staging    (${envs.staging || 'https://staging.nikamooz.com'})`);
    console.log('--------------------------------------------------------');

    const choice = await new Promise((resolve) => {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      rl.question('👉 Select environment [1/2] (Press Enter for Production): ', (answer) => {
        rl.close();
        resolve(answer.trim().toLowerCase());
      });
    });

    if (choice === '2' || choice === 'staging' || choice === 'stage' || choice === 's') {
      console.log(`🎯 Target Environment Selected: STAGING (${envs.staging || 'https://staging.nikamooz.com'})\n`);
      return { envKey: 'staging', url: envs.staging || 'https://staging.nikamooz.com', name: 'Staging' };
    }

    console.log(`🎯 Target Environment Selected: PRODUCTION (${envs.production || 'https://nikamooz.com'})\n`);
    return { envKey: 'production', url: envs.production || 'https://nikamooz.com', name: 'Production' };
  }

  // 4. Default fallback: Production or SITE_URL from env
  const fallbackUrl = process.env.SITE_URL || envs[defaultKey] || 'https://nikamooz.com';
  return { envKey: defaultKey, url: fallbackUrl, name: defaultKey === 'production' ? 'Production' : defaultKey };
}
