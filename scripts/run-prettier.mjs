import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
const npxArgs = ['--yes', '-p', 'prettier@3.3.3', 'prettier', ...args];

const result = spawnSync('npx', npxArgs, {
  stdio: 'inherit',
  env: process.env,
});

process.exit(result.status ?? 1);
