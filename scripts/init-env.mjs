// Copies every .env.example to a sibling .env, leaving existing files alone.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const targets = ['.', 'apps/api', 'apps/web'].map((dir) => ({
  example: path.join(repoRoot, dir, '.env.example'),
  env: path.join(repoRoot, dir, '.env'),
  label: dir === '.' ? '.env' : `${dir}/.env`,
}));

for (const { example, env, label } of targets) {
  if (!fs.existsSync(example)) continue;

  if (fs.existsSync(env)) {
    console.log(`skip    ${label} (already exists)`);
    continue;
  }

  fs.copyFileSync(example, env);
  console.log(`created ${label}`);
}
