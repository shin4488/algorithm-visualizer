import { spawnSync } from 'node:child_process';

import { ESLINT_PACKAGES } from './lib/eslint-packages.mjs';

const args = process.argv.slice(2);

if (args.length === 0) {
  process.exit(0);
}

const npxArgs = ['--yes'];
for (const pkg of ESLINT_PACKAGES) {
  npxArgs.push('-p', pkg);
}
npxArgs.push('eslint', '--format', 'unix', ...args);

const result = spawnSync('npx', npxArgs, {
  encoding: 'utf8',
});

if (result.error) {
  throw result.error;
}

if (result.status !== 0 && result.status !== 1) {
  process.stderr.write(result.stderr ?? '');
  process.exit(result.status ?? 1);
}

const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
process.stdout.write(output);
process.exit(0);
