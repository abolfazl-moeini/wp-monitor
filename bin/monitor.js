#!/usr/bin/env node

import { runMonitoringEngine } from '../src/runner.js';

runMonitoringEngine()
  .then(({ isSuccess }) => {
    process.exit(isSuccess ? 0 : 1);
  })
  .catch((err) => {
    console.error('Fatal execution error:', err);
    process.exit(1);
  });
