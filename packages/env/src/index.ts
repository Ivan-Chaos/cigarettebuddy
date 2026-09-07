import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';

/**
 * Env files are layered, most specific first:
 *
 *   1. real environment variables  (Docker, CI, `FOO=bar pnpm dev`)
 *   2. <appDir>/.env               (this app's own settings)
 *   3. <repo root>/.env            (values genuinely shared by every workspace)
 *
 * dotenv keeps the first definition it encounters and never overwrites a
 * variable that is already set, so passing the paths in that order gives
 * exactly this precedence.
 */

const WORKSPACE_MARKER = 'pnpm-workspace.yaml';

/** Walk up from `from` looking for the pnpm workspace root. */
export function findRepoRoot(from: string): string | undefined {
  let dir = path.resolve(from);

  for (;;) {
    if (fs.existsSync(path.join(dir, WORKSPACE_MARKER))) return dir;

    const parent = path.dirname(dir);
    if (parent === dir) return undefined;
    dir = parent;
  }
}

export interface LoadEnvOptions {
  /**
   * Directory holding the app's own `.env`, usually derived from
   * `import.meta.url`. Omit it for tooling that should only see shared values.
   */
  appDir?: string;
}

/**
 * Populate `process.env` from the layered env files. Missing files are skipped,
 * which is the normal case in a container where configuration is injected.
 *
 * @returns the files that were actually loaded, most specific first.
 */
export function loadEnv({ appDir }: LoadEnvOptions = {}): string[] {
  const candidates: string[] = [];

  if (appDir) candidates.push(path.join(appDir, '.env'));

  const repoRoot = findRepoRoot(appDir ?? process.cwd());
  if (repoRoot) candidates.push(path.join(repoRoot, '.env'));

  const files = candidates.filter((file) => fs.existsSync(file));
  if (files.length > 0) config({ path: files, quiet: true });

  return files;
}

/**
 * Resolve an app root from a module's `import.meta.url`.
 *
 * One level up holds for both `src/env.ts` (→ the app directory) and a bundle at
 * `dist/index.js` (→ the deployed app directory), so callers do not need
 * separate development and production paths.
 */
export function appDirFrom(moduleUrl: string, upLevels = 1): string {
  const dir = path.dirname(fileURLToPath(moduleUrl));
  const up = Array.from({ length: upLevels }, () => '..');
  return path.resolve(dir, ...up);
}
