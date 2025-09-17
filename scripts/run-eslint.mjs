import { spawnSync } from 'node:child_process';

import { ESLINT_PACKAGES } from './lib/eslint-packages.mjs';

const args = process.argv.slice(2);
const env = { ...process.env };
if (!env.NODE_ENV) {
  env.NODE_ENV = 'development';
}

const npxArgs = ['--yes'];
for (const pkg of ESLINT_PACKAGES) {
  npxArgs.push('-p', pkg);
}
npxArgs.push('eslint', ...args);

const result = spawnSync('npx', npxArgs, {
  stdio: 'inherit',
  env,
});

process.exit(result.status ?? 1);
