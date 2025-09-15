import { mkdirSync, copyFileSync } from 'fs';
import { resolve } from 'path';

const srcDir = resolve('src');
const outDir = resolve('public');

mkdirSync(outDir, { recursive: true });

for (const file of ['index.html', 'styles.css']) {
  copyFileSync(resolve(srcDir, file), resolve(outDir, file));
}
