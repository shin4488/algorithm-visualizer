import { spawnSync } from 'node:child_process';

const files = process.argv.slice(2);

if (files.length === 0) {
  process.exit(0);
}

const result = spawnSync(
  'npx',
  ['--yes', '-p', 'prettier@3.3.3', 'prettier', '--list-different', ...files],
  {
    encoding: 'utf8',
  },
);

if (result.error) {
  throw result.error;
}

if (result.status !== 0 && result.status !== 1) {
  process.stderr.write(result.stderr ?? '');
  process.exit(result.status ?? 1);
}

const diffOutput = (result.stdout ?? '').split('\n').map((line) => line.trim()).filter(Boolean);

if (diffOutput.length === 0) {
  process.exit(0);
}

const diagnostics = diffOutput.map((file) => ({
  message: 'Prettier formatting differs from project style.',
  location: {
    path: file,
    range: {
      start: { line: 1, column: 1 },
      end: { line: 1, column: 1 },
    },
  },
}));

process.stdout.write(
  JSON.stringify(
    {
      source: { name: 'prettier' },
      severity: 'ERROR',
      diagnostics,
    },
    null,
    2,
  ),
);
process.exit(0);
