import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { loginCustomer, addProductToCart, verifyCheckoutAndGateways } from './helpers/woocommerce.js';

/**
 * Loads site-specific scenarios from scenarios/ directory or monitor.config.js
 * @param {object} config
 * @returns {Promise<Array<{ id: string, name: string, run: Function }>>}
 */
export async function loadScenarios(config) {
  let allScenarios = [];

  // 1. Check if monitor.config.js explicitly defines scenarios
  if (Array.isArray(config.scenarios) && config.scenarios.length > 0) {
    console.log(`📂 Loading ${config.scenarios.length} scenarios from monitor.config.js`);
    allScenarios = config.scenarios.map((sc, idx) => ({
      id: sc.id || `scenario_${idx + 1}`,
      name: sc.name || `Scenario ${idx + 1}`,
      run: typeof sc.run === 'function' ? sc.run : sc,
    }));
  } else {
    // 2. Discover scenario files from scenarios directory
    const scenariosDir = config.scenariosDir;
    if (fs.existsSync(scenariosDir)) {
      const files = fs
        .readdirSync(scenariosDir)
        .filter((f) => f.endsWith('.js') || f.endsWith('.mjs'))
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

      if (files.length > 0) {
        console.log(`📂 Discovered ${files.length} scenarios in ${path.relative(process.cwd(), scenariosDir)}:`);
        const loaded = [];

        for (const file of files) {
          const fullPath = path.join(scenariosDir, file);
          const fileUrl = pathToFileURL(fullPath).href;
          try {
            const mod = await import(fileUrl);
            const runFn = mod.run || (typeof mod.default === 'function' ? mod.default : null);
            const name = mod.name || mod.title || file.replace(/^[0-9]+[-_]?/, '').replace(/\.js$/, '');

            if (typeof runFn !== 'function') {
              console.warn(`⚠️ File ${file} does not export an async run function; skipped.`);
              continue;
            }

            console.log(`   ↳ [${loaded.length + 1}] ${name} (${file})`);
            loaded.push({
              id: file.replace(/\.js$/, ''),
              name: name,
              run: runFn,
            });
          } catch (err) {
            throw new Error(`Failed to load scenario ${file}: ${err.message}`);
          }
        }

        if (loaded.length > 0) {
          allScenarios = loaded;
        }
      }
    }
  }

  // 3. Fallback to default built-in WooCommerce checks if nothing found
  if (allScenarios.length === 0) {
    console.log('ℹ️ No custom scenarios found; using default built-in WooCommerce checks...');
    allScenarios = [
      { id: 'login', name: 'Customer Login', run: loginCustomer },
      { id: 'addToCart', name: 'Add to Cart', run: addProductToCart },
      { id: 'checkout', name: 'Checkout & Payment Gateways', run: verifyCheckoutAndGateways },
    ];
  }

  // 4. Apply scenario filtering if specified via config or SCENARIO_IDS
  const filter = config.scenarioFilter || process.env.SCENARIO_IDS;
  if (filter) {
    const filterList = Array.isArray(filter)
      ? filter.map((s) => String(s).trim().toLowerCase())
      : String(filter)
          .split(',')
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean);

    if (filterList.length > 0) {
      const filtered = allScenarios.filter((sc) => {
        const idLower = sc.id.toLowerCase();
        // Exact or prefix match only; avoid broad includes() that would match "01" inside "10-..."
        return filterList.some(
          (f) => idLower === f || idLower.startsWith(f + '-') || idLower.startsWith(f + '.')
        );
      });

      if (filtered.length === 0) {
        throw new Error(`Scenario filter "${filter}" matched 0 scenarios.`);
      }

      console.log(`🎯 Filtered execution to ${filtered.length} scenario(s): ${filtered.map((s) => s.id).join(', ')}`);
      return filtered;
    }
  }

  return allScenarios;
}
